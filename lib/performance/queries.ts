import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateConsultantPerformance } from "@/lib/calculations";
import { backfillDailyContactEntryCounts } from "@/lib/dailyContacts/backfillCounts";
import { syncConsultantMonthMetrics } from "@/lib/metrics/syncConsultantMonthMetrics";
import { fetchRosteredDaysOff } from "@/lib/monthlyKpi/rosteredDaysOff";
import type {
  ConsultantMonthRow,
  ConsultantPerformanceStats,
  ContactTypeRow,
  DailyContactEntryRow,
  ManualContactAdjustmentRow,
  MonthlyContactBaselineRow,
} from "@/lib/types";

export async function fetchContactTypes(supabase: SupabaseClient): Promise<ContactTypeRow[]> {
  const { data } = await supabase
    .from("contact_types")
    .select(
      "type_key, display_name, points_per_sale, expected_conversion_rate, sort_order, is_callback, created_at"
    )
    .order("sort_order", { ascending: true });

  return (data ?? []) as ContactTypeRow[];
}

export async function fetchConsultantPerformanceForMonth(
  supabase: SupabaseClient,
  consultantMonthId: string
): Promise<ConsultantPerformanceStats | null> {
  const { data: month } = await supabase
    .from("consultant_months")
    .select("*")
    .eq("id", consultantMonthId)
    .maybeSingle();

  if (!month) {
    return null;
  }

  return fetchConsultantPerformance(supabase, month as ConsultantMonthRow);
}

async function calculateConsultantPerformanceFallback(
  supabase: SupabaseClient,
  month: ConsultantMonthRow
): Promise<ConsultantPerformanceStats> {
  const contactTypes = await fetchContactTypes(supabase);

  await backfillDailyContactEntryCounts(supabase, month.id, contactTypes);

  const [baselines, dailyEntries, adjustments, offDates] = await Promise.all([
    supabase
      .from("monthly_contact_baselines")
      .select("*")
      .eq("consultant_month_id", month.id)
      .then(({ data }) => (data ?? []) as MonthlyContactBaselineRow[]),
    supabase
      .from("daily_contact_entries")
      .select("*")
      .eq("consultant_month_id", month.id)
      .then(({ data }) => (data ?? []) as DailyContactEntryRow[]),
    supabase
      .from("manual_contact_adjustments")
      .select("*")
      .eq("consultant_month_id", month.id)
      .then(({ data }) => (data ?? []) as ManualContactAdjustmentRow[]),
    fetchRosteredDaysOff(supabase, month.id),
  ]);

  return calculateConsultantPerformance(
    month,
    baselines,
    dailyEntries,
    adjustments,
    contactTypes,
    offDates
  );
}

export async function fetchConsultantPerformance(
  supabase: SupabaseClient,
  month: ConsultantMonthRow
): Promise<ConsultantPerformanceStats> {
  const syncResult = await syncConsultantMonthMetrics(supabase, month.id);

  if (syncResult.metrics) {
    return syncResult.metrics;
  }

  if (syncResult.error) {
    console.warn("[performance] metrics sync failed, using live calculation:", syncResult.error);
  }

  return calculateConsultantPerformanceFallback(supabase, month);
}
