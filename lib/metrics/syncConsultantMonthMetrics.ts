import type { SupabaseClient } from "@supabase/supabase-js";

import { applyComplianceToCommission } from "@/lib/compliance/calculate";

import { fetchComplianceMetricsForMonth } from "@/lib/compliance/queries";

import { calculateConsultantMonthMetrics } from "@/lib/calculations";

import { backfillDailyContactEntryCounts } from "@/lib/dailyContacts/backfillCounts";

import { fetchRosteredDaysOff } from "@/lib/monthlyKpi/rosteredDaysOff";

import { fetchContactTypes } from "@/lib/performance/queries";

import { logSupabaseError } from "@/lib/supabase/logPayload";

import { isMissingSchemaError } from "@/lib/supabase/schemaErrors";

import type {

  ComplianceMetrics,

  ConsultantMonthMetricsUpsert,

  ConsultantMonthRow,

  ConsultantPerformanceStats,

  DailyContactEntryRow,

  ManualContactAdjustmentRow,

  MonthlyContactBaselineRow,

} from "@/lib/types";



type LegacyConsultantMonthMetricsUpsert = Omit<

  ConsultantMonthMetricsUpsert,

  | "qa_calls_marked"

  | "qa_average"

  | "qa_complete"

  | "qa_passed"

  | "qa_failed"

  | "compliance_payable_rate"

  | "current_fail_streak"

  | "commission_ineligible"

  | "compliance_adjusted_mtd_commission"

  | "compliance_adjusted_projected_commission"

>;



export function performanceStatsToMetricsPayload(

  stats: ConsultantPerformanceStats,

  compliance: ComplianceMetrics

): ConsultantMonthMetricsUpsert {

  const adjusted = applyComplianceToCommission(

    stats.mtdCommission,

    stats.projectedCommission,

    compliance.compliancePayableRate

  );



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

    qa_calls_marked: compliance.qaCallsMarked,

    qa_average: compliance.qaAverage,

    qa_complete: compliance.qaComplete,

    qa_passed: compliance.qaPassed,

    qa_failed: compliance.qaFailed,

    compliance_payable_rate: compliance.compliancePayableRate,

    current_fail_streak: compliance.currentFailStreak,

    commission_ineligible: compliance.commissionIneligible,

    compliance_adjusted_mtd_commission: adjusted.complianceAdjustedMtdCommission,

    compliance_adjusted_projected_commission: adjusted.complianceAdjustedProjectedCommission,

    updated_at: new Date().toISOString(),

  };

}



function toLegacyMetricsPayload(payload: ConsultantMonthMetricsUpsert): LegacyConsultantMonthMetricsUpsert {
  return {
    consultant_month_id: payload.consultant_month_id,
    user_id: payload.user_id,
    month: payload.month,
    year: payload.year,
    mtd_target_conversion: payload.mtd_target_conversion,
    mtd_conversion_rate: payload.mtd_conversion_rate,
    percent_to_target_conversion: payload.percent_to_target_conversion,
    mtd_conversion_multiplier: payload.mtd_conversion_multiplier,
    mtd_total_sales_points: payload.mtd_total_sales_points,
    points_target: payload.points_target,
    average_gwp: payload.average_gwp,
    mtd_dpp: payload.mtd_dpp,
    gwp_accelerator_per_point: payload.gwp_accelerator_per_point,
    mtd_commission: payload.mtd_commission,
    projected_total_sales_points: payload.projected_total_sales_points,
    projected_dpp: payload.projected_dpp,
    projected_gwp_payable_per_point: payload.projected_gwp_payable_per_point,
    projected_conversion_multiplier: payload.projected_conversion_multiplier,
    projected_commission: payload.projected_commission,
    updated_at: payload.updated_at,
  };
}



async function upsertMetricsPayload(

  supabase: SupabaseClient,

  payload: ConsultantMonthMetricsUpsert | LegacyConsultantMonthMetricsUpsert

): Promise<{ error: { message: string; code?: string } | null }> {

  const { error } = await supabase

    .from("consultant_month_metrics")

    .upsert(payload, { onConflict: "user_id,month,year" });



  return { error };

}



export async function syncConsultantMonthMetrics(

  supabase: SupabaseClient,

  consultantMonthId: string

): Promise<{ metrics?: ConsultantPerformanceStats; error?: string }> {

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

  const contactTypes = await fetchContactTypes(supabase);

  const backfillResult = await backfillDailyContactEntryCounts(
    supabase,
    consultantMonthId,
    contactTypes
  );

  if (backfillResult.error) {
    console.warn("[metrics-sync] daily contact count backfill failed:", backfillResult.error);
  } else if (backfillResult.updated > 0) {
    console.log("[metrics-sync] backfilled daily contact counts:", backfillResult.updated);
  }

  const [baselinesResult, dailyResult, adjustmentsResult, offDates] = await Promise.all([
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



  const compliance = await fetchComplianceMetricsForMonth(

    supabase,

    monthRow.user_id,

    consultantMonthId,

    Number(monthRow.month),

    Number(monthRow.year)

  );



  const payload = performanceStatsToMetricsPayload(metrics, compliance);

  console.log("Upserting consultant month metrics:", payload);



  const fullResult = await upsertMetricsPayload(supabase, payload);

  if (!fullResult.error) {

    return { metrics };

  }



  if (!isMissingSchemaError(fullResult.error)) {

    logSupabaseError("consultant_month_metrics", fullResult.error);

    return { error: fullResult.error.message };

  }



  console.warn(

    "consultant_month_metrics compliance columns missing — saving legacy payload. Run supabase/migrations/add_compliance_call_scores.sql"

  );



  const legacyResult = await upsertMetricsPayload(supabase, toLegacyMetricsPayload(payload));

  if (!legacyResult.error) {

    return { metrics };

  }



  if (isMissingSchemaError(legacyResult.error)) {

    console.warn(

      "consultant_month_metrics table missing — skipping metrics sync. Run supabase/migrations/add_consultant_month_metrics.sql"

    );

    return { metrics };

  }



  logSupabaseError("consultant_month_metrics (legacy payload)", legacyResult.error);

  return { error: legacyResult.error.message };

}

