import type { SupabaseClient } from "@supabase/supabase-js";
import { assertValidContactTypeKey } from "@/lib/contactTypes/keys";
import { calculateMonthlyKpis } from "@/lib/monthlyKpi/roster";
import { fetchRosteredDaysOff } from "@/lib/monthlyKpi/rosteredDaysOff";
import type {
  ConsultantMonthUpsert,
  ContactTypeRow,
  ManualContactAdjustmentInsert,
  MonthlyContactBaselineUpsert,
  PerformanceActionState,
} from "@/lib/types";
import { employmentTypeFromDb, employmentTypeToDb, totalGwpFromAverage } from "@/lib/types";
import { ensureParentUserRows, requireAuthenticatedUser } from "@/lib/supabase/ensureParentUser";
import { logSupabasePayload, logSupabaseError } from "@/lib/supabase/logPayload";
import { upsertConsultantMonthRecord } from "@/lib/manualInput/consultantMonthUpsert";
import { syncConsultantMonthMetrics } from "@/lib/metrics/syncConsultantMonthMetrics";

function parseNumber(value: FormDataEntryValue | null, fallback = 0): number {
  if (value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

async function fetchContactTypesForSave(supabase: SupabaseClient): Promise<ContactTypeRow[]> {
  const { data, error } = await supabase
    .from("contact_types")
    .select("type_key, display_name, points_per_sale, expected_conversion_rate, sort_order, created_at")
    .order("sort_order", { ascending: true });

  if (error) {
    logSupabaseError("contact_types", error);
    throw new Error(error.message);
  }

  return (data ?? []) as ContactTypeRow[];
}

async function upsertConsultantMonth(
  supabase: SupabaseClient,
  userId: string,
  formData: FormData
): Promise<{
  monthRow: { id: string } | null;
  consultantMonthPayload?: ConsultantMonthUpsert;
  error?: string;
}> {
  const month = parseNumber(formData.get("month"));
  const year = parseNumber(formData.get("year"));
  const employmentTypeForDb = employmentTypeToDb(String(formData.get("employmentType") ?? "Full-time"));
  const fullTimePointsTarget = parseNumber(formData.get("fullTimePointsTarget"));

  if (!month || !year || !fullTimePointsTarget) {
    return { monthRow: null, error: "Month, year, and full-time points target are required." };
  }

  const { data: existingMonth } = await supabase
    .from("consultant_months")
    .select("id")
    .eq("user_id", userId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  const offDates = existingMonth?.id
    ? await fetchRosteredDaysOff(supabase, existingMonth.id)
    : [];

  const kpis = calculateMonthlyKpis({
    month,
    year,
    employmentType: employmentTypeFromDb(employmentTypeForDb),
    fullTimePointsTarget,
    offDates,
  });

  const consultantMonthPayload: ConsultantMonthUpsert = {
    user_id: userId,
    month,
    year,
    employment_type: employmentTypeForDb,
    full_time_points_target: fullTimePointsTarget,
    full_time_rostered_days: kpis.fullTimeRosteredDays,
    base_rostered_days_this_month: kpis.baseRosteredDaysThisMonth,
    rostered_days_off: kpis.rosteredDaysOff,
    total_rostered_days_this_month: kpis.totalRosteredDaysThisMonth,
    adjusted_points_target: kpis.adjustedPointsTarget,
    completed_rostered_days_so_far: kpis.completedRosteredDaysSoFar,
  };

  console.log("Overwriting consultant month:", consultantMonthPayload);
  logSupabasePayload("consultant_months", consultantMonthPayload);

  const { data: monthRow, error: monthError } = await upsertConsultantMonthRecord(
    supabase,
    consultantMonthPayload
  );

  if (monthError || !monthRow) {
    return { monthRow: null, error: monthError?.message ?? "Failed to save consultant month." };
  }

  console.log("[supabase] consultant_months save success:", monthRow);
  return { monthRow, consultantMonthPayload };
}

async function resetMonthPerformanceData(
  supabase: SupabaseClient,
  consultantMonthId: string,
  userId: string
): Promise<{ error?: string }> {
  console.log("Resetting month data for consultant_month_id:", consultantMonthId);

  const { error: dailyError } = await supabase
    .from("daily_contact_entries")
    .delete()
    .eq("consultant_month_id", consultantMonthId)
    .eq("user_id", userId);

  if (dailyError) {
    logSupabaseError("daily_contact_entries (reset)", dailyError);
    return { error: dailyError.message };
  }

  console.log("Deleted old daily contacts");

  const { error: adjustmentsError } = await supabase
    .from("manual_contact_adjustments")
    .delete()
    .eq("consultant_month_id", consultantMonthId)
    .eq("user_id", userId);

  if (adjustmentsError) {
    logSupabaseError("manual_contact_adjustments (reset)", adjustmentsError);
    return { error: adjustmentsError.message };
  }

  console.log("Deleted old manual adjustments");

  const { error: baselinesError } = await supabase
    .from("monthly_contact_baselines")
    .delete()
    .eq("consultant_month_id", consultantMonthId)
    .eq("user_id", userId);

  if (baselinesError) {
    logSupabaseError("monthly_contact_baselines (reset)", baselinesError);
    return { error: baselinesError.message };
  }

  console.log("Deleted old monthly baselines");

  return {};
}

export async function persistManualBaseline(
  supabase: SupabaseClient,
  formData: FormData
): Promise<PerformanceActionState & { status?: number }> {
  const authResult = await requireAuthenticatedUser(supabase);
  if (!authResult.ok) {
    return { error: authResult.error, status: authResult.status };
  }

  const user = authResult.user;
  const parentResult = await ensureParentUserRows(supabase, user);
  if (!parentResult.ok) {
    return { error: parentResult.error, status: 400 };
  }

  const { monthRow, consultantMonthPayload, error: monthError } = await upsertConsultantMonth(
    supabase,
    user.id,
    formData
  );
  if (monthError || !monthRow) {
    return { error: monthError ?? "Failed to save consultant month.", status: 400 };
  }

  let contactTypes: ContactTypeRow[];
  try {
    contactTypes = await fetchContactTypesForSave(supabase);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to load contact types.",
      status: 400,
    };
  }

  if (contactTypes.length === 0) {
    return { error: "No contact types found in database.", status: 400 };
  }

  const baselinePayloads: MonthlyContactBaselineUpsert[] = [];

  for (const type of contactTypes) {
    const typeKey = type.type_key;

    try {
      assertValidContactTypeKey(typeKey);
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : `Invalid contact_type_key: ${typeKey}`,
        status: 400,
      };
    }

    const totalContactsSoFar = parseNumber(formData.get(`${typeKey}__totalContactsSoFar`));
    const convertedSalesSoFar = parseNumber(formData.get(`${typeKey}__convertedSalesSoFar`));
    const averageGwp = parseNumber(formData.get(`${typeKey}__averageGwp`));

    const baselinePayload: MonthlyContactBaselineUpsert = {
      consultant_month_id: monthRow.id,
      user_id: user.id,
      contact_type_key: typeKey,
      total_contacts_so_far: Number(totalContactsSoFar || 0),
      converted_sales_so_far: Number(convertedSalesSoFar || 0),
      total_gwp_so_far: Number(convertedSalesSoFar || 0) * Number(averageGwp || 0),
    };

    baselinePayloads.push(baselinePayload);
  }

  const resetResult = await resetMonthPerformanceData(supabase, monthRow.id, user.id);
  if (resetResult.error) {
    return { error: resetResult.error, status: 400 };
  }

  for (const baselinePayload of baselinePayloads) {
    console.log("Saving new manual baseline:", baselinePayload);
  }

  const { error } = await supabase.from("monthly_contact_baselines").insert(baselinePayloads);

  if (error) {
    logSupabaseError("monthly_contact_baselines", error);
    return { error: error.message, status: 400 };
  }

  console.log("[supabase] monthly_contact_baselines save success:", baselinePayloads.length, "rows");

  const syncResult = await syncConsultantMonthMetrics(supabase, monthRow.id);
  if (syncResult.error) {
    return { error: syncResult.error, status: 400 };
  }

  return { success: true, message: "Baseline saved." };
}

export async function persistManualAdjustment(
  supabase: SupabaseClient,
  formData: FormData
): Promise<PerformanceActionState & { status?: number }> {
  const authResult = await requireAuthenticatedUser(supabase);
  if (!authResult.ok) {
    return { error: authResult.error, status: authResult.status };
  }

  const user = authResult.user;
  const parentResult = await ensureParentUserRows(supabase, user);
  if (!parentResult.ok) {
    return { error: parentResult.error, status: 400 };
  }

  let consultantMonthId = String(formData.get("consultantMonthId") ?? "").trim();
  const adjustmentDate = String(formData.get("adjustmentDate") ?? "");
  const reason = String(formData.get("adjustmentReason") ?? "").trim();

  if (!adjustmentDate || !reason) {
    return { error: "Date and reason are required for manual adjustments.", status: 400 };
  }

  if (!consultantMonthId) {
    const { monthRow, error: monthError } = await upsertConsultantMonth(supabase, user.id, formData);
    if (monthError || !monthRow) {
      return { error: monthError ?? "Consultant month not found.", status: 400 };
    }
    consultantMonthId = monthRow.id;
  } else {
    const { data: month } = await supabase
      .from("consultant_months")
      .select("id")
      .eq("id", consultantMonthId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!month) {
      return { error: "Consultant month not found.", status: 400 };
    }
  }

  let contactTypes: ContactTypeRow[];
  try {
    contactTypes = await fetchContactTypesForSave(supabase);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to load contact types.",
      status: 400,
    };
  }

  const rowsToInsert: ManualContactAdjustmentInsert[] = [];

  for (const type of contactTypes) {
    const typeKey = type.type_key;

    try {
      assertValidContactTypeKey(typeKey);
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : `Invalid contact_type_key: ${typeKey}`,
        status: 400,
      };
    }

    const contactsDelta = parseNumber(formData.get(`${typeKey}__contactsDelta`));
    const convertedSalesDelta = parseNumber(formData.get(`${typeKey}__convertedSalesDelta`));
    const averageGwp = parseNumber(formData.get(`${typeKey}__averageGwp`));

    if (contactsDelta === 0 && convertedSalesDelta === 0 && averageGwp === 0) {
      continue;
    }

    rowsToInsert.push({
      consultant_month_id: consultantMonthId,
      user_id: user.id,
      adjustment_date: adjustmentDate,
      contact_type_key: typeKey,
      contacts_delta: contactsDelta,
      converted_sales_delta: convertedSalesDelta,
      total_gwp_delta: totalGwpFromAverage(convertedSalesDelta, averageGwp),
      reason,
    });
  }

  if (rowsToInsert.length === 0) {
    return { error: "Enter at least one non-zero adjustment row.", status: 400 };
  }

  for (const row of rowsToInsert) {
    logSupabasePayload("manual_contact_adjustments", row);
    const { error } = await supabase.from("manual_contact_adjustments").insert(row);
    if (error) {
      logSupabaseError("manual_contact_adjustments", error);
      return { error: error.message, status: 400 };
    }
  }

  console.log("[supabase] manual_contact_adjustments save success:", rowsToInsert.length, "rows");

  const syncResult = await syncConsultantMonthMetrics(supabase, consultantMonthId);
  if (syncResult.error) {
    return { error: syncResult.error, status: 400 };
  }

  return { success: true, message: "Manual adjustment saved." };
}
