import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateMonthlyKpis, validateRosteredDayOff } from "@/lib/monthlyKpi/roster";
import { syncConsultantMonthMetrics } from "@/lib/metrics/syncConsultantMonthMetrics";
import { logSupabaseError } from "@/lib/supabase/logPayload";
import { isMissingSchemaError } from "@/lib/supabase/schemaErrors";
import type {
  ConsultantMonthRow,
  ConsultantRosteredDayOffRow,
  PerformanceActionState,
  RosteredDayOffEntry,
} from "@/lib/types";
import { employmentTypeFromDb } from "@/lib/types";

export type RecalculatedMonthKpiPayload = {
  full_time_rostered_days: number;
  base_rostered_days_this_month: number;
  rostered_days_off: number;
  total_rostered_days_this_month: number;
  adjusted_points_target: number;
  completed_rostered_days_so_far: number;
};

export function mapRosteredDayOffRows(rows: ConsultantRosteredDayOffRow[]): RosteredDayOffEntry[] {
  return rows.map((row) => ({
    id: row.id,
    offDate: row.off_date,
    reason: row.reason,
  }));
}

export async function fetchRosteredDaysOff(
  supabase: SupabaseClient,
  consultantMonthId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("consultant_rostered_days_off")
    .select("off_date")
    .eq("consultant_month_id", consultantMonthId)
    .order("off_date", { ascending: true });

  if (error) {
    logSupabaseError("consultant_rostered_days_off", error);
    return [];
  }

  return (data ?? []).map((row) => row.off_date as string);
}

export function buildRecalculatedMonthKpiPayload(
  month: ConsultantMonthRow,
  offDates: string[]
): RecalculatedMonthKpiPayload {
  const kpis = calculateMonthlyKpis({
    month: Number(month.month),
    year: Number(month.year),
    employmentType: employmentTypeFromDb(month.employment_type),
    fullTimePointsTarget: Number(month.full_time_points_target),
    offDates,
  });

  return {
    full_time_rostered_days: kpis.fullTimeRosteredDays,
    base_rostered_days_this_month: kpis.baseRosteredDaysThisMonth,
    rostered_days_off: kpis.rosteredDaysOff,
    total_rostered_days_this_month: kpis.totalRosteredDaysThisMonth,
    adjusted_points_target: kpis.adjustedPointsTarget,
    completed_rostered_days_so_far: kpis.completedRosteredDaysSoFar,
  };
}

export async function recalculateAndUpdateMonthKpis(
  supabase: SupabaseClient,
  consultantMonthId: string
): Promise<{ payload: RecalculatedMonthKpiPayload | null; error?: string }> {
  const { data: month, error: monthError } = await supabase
    .from("consultant_months")
    .select("*")
    .eq("id", consultantMonthId)
    .maybeSingle();

  if (monthError) {
    logSupabaseError("consultant_months", monthError);
    return { payload: null, error: monthError.message };
  }

  if (!month) {
    return { payload: null, error: "Consultant month not found." };
  }

  const offDates = await fetchRosteredDaysOff(supabase, consultantMonthId);
  const payload = buildRecalculatedMonthKpiPayload(month as ConsultantMonthRow, offDates);

  const { error: updateError } = await supabase
    .from("consultant_months")
    .update(payload)
    .eq("id", consultantMonthId);

  if (updateError) {
    if (isMissingSchemaError(updateError)) {
      console.warn(
        "consultant_months KPI columns missing — skipping KPI persist. Run supabase/migrations/add_consultant_month_kpi_columns.sql"
      );
      console.log("Recalculated monthly KPI (in-memory only):", payload);
      return { payload };
    }

    logSupabaseError("consultant_months (KPI recalculation)", updateError);
    return { payload: null, error: updateError.message };
  }

  console.log("Recalculated monthly KPI:", payload);
  return { payload };
}

export async function addRosteredDayOff(
  supabase: SupabaseClient,
  userId: string,
  consultantMonthId: string,
  offDate: string,
  reason: string | null
): Promise<PerformanceActionState & { status?: number }> {
  const { data: month, error: monthError } = await supabase
    .from("consultant_months")
    .select("*")
    .eq("id", consultantMonthId)
    .eq("user_id", userId)
    .maybeSingle();

  if (monthError) {
    logSupabaseError("consultant_months", monthError);
    return { error: monthError.message, status: 400 };
  }

  if (!month) {
    return { error: "Consultant month not found.", status: 400 };
  }

  const employmentType = employmentTypeFromDb(month.employment_type);
  const validationError = validateRosteredDayOff(
    offDate,
    Number(month.month),
    Number(month.year),
    employmentType
  );

  if (validationError) {
    return { error: validationError, status: 400 };
  }

  const { data: existing } = await supabase
    .from("consultant_rostered_days_off")
    .select("id")
    .eq("consultant_month_id", consultantMonthId)
    .eq("off_date", offDate)
    .maybeSingle();

  if (existing) {
    return { error: "That rostered day off already exists for this month.", status: 400 };
  }

  const { error: insertError } = await supabase.from("consultant_rostered_days_off").insert({
    consultant_month_id: consultantMonthId,
    user_id: userId,
    off_date: offDate,
    reason,
  });

  if (insertError) {
    logSupabaseError("consultant_rostered_days_off", insertError);
    return { error: insertError.message, status: 400 };
  }

  console.log("Rostered day off added:", offDate);

  const recalc = await recalculateAndUpdateMonthKpis(supabase, consultantMonthId);
  if (recalc.error) {
    return { error: recalc.error, status: 400 };
  }

  const syncResult = await syncConsultantMonthMetrics(supabase, consultantMonthId);
  if (syncResult.error) {
    return { error: syncResult.error, status: 400 };
  }

  return { success: true, message: "Rostered day off added." };
}

export async function removeRosteredDayOff(
  supabase: SupabaseClient,
  userId: string,
  entryId: string
): Promise<PerformanceActionState & { status?: number; offDate?: string }> {
  const { data: existing, error: fetchError } = await supabase
    .from("consultant_rostered_days_off")
    .select("id, consultant_month_id, off_date")
    .eq("id", entryId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    logSupabaseError("consultant_rostered_days_off", fetchError);
    return { error: fetchError.message, status: 400 };
  }

  if (!existing) {
    return { error: "Rostered day off not found.", status: 400 };
  }

  const { error: deleteError } = await supabase
    .from("consultant_rostered_days_off")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (deleteError) {
    logSupabaseError("consultant_rostered_days_off", deleteError);
    return { error: deleteError.message, status: 400 };
  }

  console.log("Rostered day off removed:", existing.off_date);

  const recalc = await recalculateAndUpdateMonthKpis(supabase, existing.consultant_month_id);
  if (recalc.error) {
    return { error: recalc.error, status: 400, offDate: existing.off_date };
  }

  const syncResult = await syncConsultantMonthMetrics(supabase, existing.consultant_month_id);
  if (syncResult.error) {
    return { error: syncResult.error, status: 400, offDate: existing.off_date };
  }

  return { success: true, message: "Rostered day off removed.", offDate: existing.off_date };
}
