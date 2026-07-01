import type { SupabaseClient } from "@supabase/supabase-js";
import { assertValidContactTypeKey } from "@/lib/contactTypes/keys";
import type {
  ConsultantMonthUpsert,
  ContactTypeRow,
  ManualContactAdjustmentInsert,
  MonthlyContactBaselineUpsert,
  PerformanceActionState,
} from "@/lib/types";
import { employmentTypeToDb, totalGwpFromAverage } from "@/lib/types";
import { ensureParentUserRows, requireAuthenticatedUser } from "@/lib/supabase/ensureParentUser";
import { logSupabasePayload, logSupabaseError } from "@/lib/supabase/logPayload";

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
): Promise<{ monthRow: { id: string } | null; error?: string }> {
  const month = parseNumber(formData.get("month"));
  const year = parseNumber(formData.get("year"));
  const employmentTypeForDb = employmentTypeToDb(String(formData.get("employmentType") ?? "Full-time"));
  const fullTimePointsTarget = parseNumber(formData.get("fullTimePointsTarget"));
  const fullTimeRosteredDays = parseNumber(formData.get("fullTimeRosteredDays"));
  const totalRosteredDaysThisMonth = parseNumber(formData.get("totalRosteredDaysThisMonth"));
  const completedRosteredDaysSoFar = parseNumber(formData.get("completedRosteredDaysSoFar"));

  if (
    !month ||
    !year ||
    !fullTimePointsTarget ||
    !fullTimeRosteredDays ||
    !totalRosteredDaysThisMonth
  ) {
    return { monthRow: null, error: "Month setup fields are required." };
  }

  const consultantMonthPayload: ConsultantMonthUpsert = {
    user_id: userId,
    month,
    year,
    employment_type: employmentTypeForDb,
    full_time_points_target: fullTimePointsTarget,
    full_time_rostered_days: fullTimeRosteredDays,
    total_rostered_days_this_month: totalRosteredDaysThisMonth,
    completed_rostered_days_so_far: completedRosteredDaysSoFar,
  };

  logSupabasePayload("consultant_months", consultantMonthPayload);

  const { data: monthRow, error: monthError } = await supabase
    .from("consultant_months")
    .upsert(consultantMonthPayload, { onConflict: "user_id,month,year" })
    .select("id")
    .single();

  if (monthError) {
    logSupabaseError("consultant_months", monthError);
    return { monthRow: null, error: monthError.message };
  }

  console.log("[supabase] consultant_months save success:", monthRow);
  return { monthRow };
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

  const { monthRow, error: monthError } = await upsertConsultantMonth(supabase, user.id, formData);
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
    const totalGwpSoFar = Number(convertedSalesSoFar) * Number(averageGwp);

    const baselinePayload: MonthlyContactBaselineUpsert = {
      consultant_month_id: monthRow.id,
      user_id: user.id,
      contact_type_key: typeKey,
      total_contacts_so_far: totalContactsSoFar,
      converted_sales_so_far: convertedSalesSoFar,
      total_gwp_so_far: totalGwpSoFar,
    };

    logSupabasePayload("monthly_contact_baselines", baselinePayload);

    const { data: existing } = await supabase
      .from("monthly_contact_baselines")
      .select("id")
      .eq("consultant_month_id", monthRow.id)
      .eq("contact_type_key", typeKey)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("monthly_contact_baselines")
        .update(baselinePayload)
        .eq("id", existing.id)
        .eq("user_id", user.id);

      if (error) {
        logSupabaseError("monthly_contact_baselines", error);
        return { error: error.message, status: 400 };
      }
      console.log("[supabase] monthly_contact_baselines update success:", existing.id);
    } else {
      const { error } = await supabase.from("monthly_contact_baselines").insert(baselinePayload);
      if (error) {
        logSupabaseError("monthly_contact_baselines", error);
        return { error: error.message, status: 400 };
      }
      console.log("[supabase] monthly_contact_baselines insert success");
    }
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
  return { success: true, message: "Manual adjustment saved." };
}
