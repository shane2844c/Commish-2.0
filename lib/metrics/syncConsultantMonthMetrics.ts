import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateConsultantMonthMetrics } from "@/lib/calculations";
import { fetchRosteredDaysOff } from "@/lib/monthlyKpi/rosteredDaysOff";
import { fetchContactTypes } from "@/lib/performance/queries";
import { logSupabaseError } from "@/lib/supabase/logPayload";
import type {
  ConsultantMonthMetricsUpsert,
  ConsultantMonthRow,
  ConsultantPerformanceStats,
  DailyContactEntryRow,
  ManualContactAdjustmentRow,
  MonthlyContactBaselineRow,
} from "@/lib/types";

export function performanceStatsToMetricsPayload(
  stats: ConsultantPerformanceStats
): ConsultantMonthMetricsUpsert {
  return {
    consultant_month_id: stats.consultantMonthId,
    user_id: stats.userId,
    month: stats.month,
    year: stats.year,
    mtd_target_conversion: stats.mtdTargetConversion,
    mtd_conversion_rate: stats.mtdConversionRate,
    percent_to_target_conversion: stats.percentToTargetConversion,
    mtd_conversion_multiplier: stats.mtdConversionMultiplier,
    mtd_total_sales_points: stats.mtdTotalSalesPoints,
    points_target: stats.pointsTarget,
    average_gwp: stats.averageGwp,
    mtd_dpp: stats.mtdDpp,
    gwp_accelerator_per_point: stats.gwpAcceleratorDpp,
    mtd_commission: stats.mtdCommission,
    projected_total_sales_points: stats.projectedTotalSalesPoints,
    projected_dpp: stats.projectedDpp,
    projected_gwp_payable_per_point: stats.projectedGwpAcceleratorDpp,
    projected_conversion_multiplier: stats.projectedConversionMultiplier,
    projected_commission: stats.projectedCommission,
    updated_at: new Date().toISOString(),
  };
}

export async function syncConsultantMonthMetrics(
  supabase: SupabaseClient,
  consultantMonthId: string
): Promise<{ error?: string }> {
  const { data: consultantMonth, error: monthError } = await supabase
    .from("consultant_months")
    .select("*")
    .eq("id", consultantMonthId)
    .maybeSingle();

  if (monthError) {
    logSupabaseError("consultant_months", monthError);
    return { error: monthError.message };
  }

  if (!consultantMonth) {
    return { error: "Consultant month not found." };
  }

  const monthRow = consultantMonth as ConsultantMonthRow;

  const [contactTypes, baselinesResult, dailyResult, adjustmentsResult, offDates] =
    await Promise.all([
      fetchContactTypes(supabase),
      supabase
        .from("monthly_contact_baselines")
        .select("*")
        .eq("consultant_month_id", consultantMonthId),
      supabase
        .from("daily_contact_entries")
        .select("*")
        .eq("consultant_month_id", consultantMonthId),
      supabase
        .from("manual_contact_adjustments")
        .select("*")
        .eq("consultant_month_id", consultantMonthId),
      fetchRosteredDaysOff(supabase, consultantMonthId),
    ]);

  if (baselinesResult.error) {
    logSupabaseError("monthly_contact_baselines", baselinesResult.error);
    return { error: baselinesResult.error.message };
  }

  if (dailyResult.error) {
    logSupabaseError("daily_contact_entries", dailyResult.error);
    return { error: dailyResult.error.message };
  }

  if (adjustmentsResult.error) {
    logSupabaseError("manual_contact_adjustments", adjustmentsResult.error);
    return { error: adjustmentsResult.error.message };
  }

  const metrics = calculateConsultantMonthMetrics({
    consultantMonth: monthRow,
    baselines: (baselinesResult.data ?? []) as MonthlyContactBaselineRow[],
    dailyEntries: (dailyResult.data ?? []) as DailyContactEntryRow[],
    manualAdjustments: (adjustmentsResult.data ?? []) as ManualContactAdjustmentRow[],
    contactTypes,
    offDates,
  });

  const payload = performanceStatsToMetricsPayload(metrics);
  console.log("Upserting consultant month metrics:", payload);

  const { error: upsertError } = await supabase
    .from("consultant_month_metrics")
    .upsert(payload, { onConflict: "user_id,month,year" });

  if (upsertError) {
    logSupabaseError("consultant_month_metrics", upsertError);
    return { error: upsertError.message };
  }

  return {};
}
