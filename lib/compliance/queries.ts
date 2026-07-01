import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateComplianceMetrics,
  calculateQaFromScores,
  getPreviousMonths,
  mapComplianceCallScoreRows,
  type PreviousMonthCompliance,
} from "@/lib/compliance/calculate";
import { logSupabaseError } from "@/lib/supabase/logPayload";
import type { ComplianceCallScoreRow, ComplianceMetrics } from "@/lib/types";

export async function fetchComplianceCallScores(
  supabase: SupabaseClient,
  consultantMonthId: string
): Promise<ComplianceCallScoreRow[]> {
  const { data, error } = await supabase
    .from("compliance_call_scores")
    .select("*")
    .eq("consultant_month_id", consultantMonthId)
    .order("call_number", { ascending: true });

  if (error) {
    logSupabaseError("compliance_call_scores", error);
    return [];
  }

  return (data ?? []) as ComplianceCallScoreRow[];
}

async function fetchPreviousMonthCompliance(
  supabase: SupabaseClient,
  userId: string,
  month: number,
  year: number
): Promise<PreviousMonthCompliance> {
  const { data: consultantMonth } = await supabase
    .from("consultant_months")
    .select("id")
    .eq("user_id", userId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (!consultantMonth?.id) {
    return {
      month,
      year,
      qaComplete: false,
      qaAverage: 0,
      qaFailed: false,
    };
  }

  const scores = await fetchComplianceCallScores(supabase, consultantMonth.id);
  const mappedScores = mapComplianceCallScoreRows(scores);
  const qa = calculateQaFromScores(mappedScores);

  return {
    month,
    year,
    qaComplete: qa.qaComplete,
    qaAverage: qa.qaAverage,
    qaFailed: qa.qaFailed,
  };
}

export async function fetchComplianceMetricsForMonth(
  supabase: SupabaseClient,
  userId: string,
  consultantMonthId: string | null | undefined,
  month: number,
  year: number
): Promise<ComplianceMetrics> {
  const scores = consultantMonthId
    ? await fetchComplianceCallScores(supabase, consultantMonthId)
    : [];
  const previousMonthDates = getPreviousMonths(month, year, 3);
  const previousMonths = await Promise.all(
    previousMonthDates.map((entry) =>
      fetchPreviousMonthCompliance(supabase, userId, entry.month, entry.year)
    )
  );

  return calculateComplianceMetrics({
    scores: mapComplianceCallScoreRows(scores),
    previousMonths,
  });
}
