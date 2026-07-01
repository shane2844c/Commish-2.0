import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateConsultantPerformance } from "@/lib/calculations";
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
    .select("type_key, display_name, points_per_sale, expected_conversion_rate, sort_order, created_at")
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

export async function fetchConsultantPerformance(
  supabase: SupabaseClient,
  month: ConsultantMonthRow
): Promise<ConsultantPerformanceStats> {
  const [contactTypes, baselines, dailyEntries, adjustments] = await Promise.all([
    fetchContactTypes(supabase),
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
  ]);

  return calculateConsultantPerformance(month, baselines, dailyEntries, adjustments, contactTypes);
}

export async function fetchLeaderboardPerformance(
  supabase: SupabaseClient,
  month: number,
  year: number
): Promise<ConsultantPerformanceStats[]> {
  const { data: months } = await supabase
    .from("consultant_months")
    .select("*")
    .eq("month", month)
    .eq("year", year);

  if (!months || months.length === 0) {
    return [];
  }

  const contactTypes = await fetchContactTypes(supabase);
  const monthIds = months.map((item) => item.id);

  const [{ data: baselines }, { data: dailyEntries }, { data: adjustments }] = await Promise.all([
    supabase.from("monthly_contact_baselines").select("*").in("consultant_month_id", monthIds),
    supabase.from("daily_contact_entries").select("*").in("consultant_month_id", monthIds),
    supabase.from("manual_contact_adjustments").select("*").in("consultant_month_id", monthIds),
  ]);

  const baselinesByMonth = groupByConsultantMonth(
    (baselines ?? []) as MonthlyContactBaselineRow[]
  );
  const dailyByMonth = groupByConsultantMonth((dailyEntries ?? []) as DailyContactEntryRow[]);
  const adjustmentsByMonth = groupByConsultantMonth(
    (adjustments ?? []) as ManualContactAdjustmentRow[]
  );

  return (months as ConsultantMonthRow[]).map((monthRow) =>
    calculateConsultantPerformance(
      monthRow,
      baselinesByMonth.get(monthRow.id) ?? [],
      dailyByMonth.get(monthRow.id) ?? [],
      adjustmentsByMonth.get(monthRow.id) ?? [],
      contactTypes
    )
  );
}

function groupByConsultantMonth<T extends { consultant_month_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  rows.forEach((row) => {
    const list = map.get(row.consultant_month_id) ?? [];
    list.push(row);
    map.set(row.consultant_month_id, list);
  });
  return map;
}
