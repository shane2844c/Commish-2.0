import type { ComplianceCallScoreRow, ComplianceMetrics } from "@/lib/types";

export const QA_PASS_THRESHOLD = 80;
export const QA_CALLS_MIN = 4;
export const QA_CALLS_MAX = 5;

export type ComplianceScoreInput = {
  callNumber: number;
  score: number;
};

export function calculateQaFromScores(scores: ComplianceScoreInput[]): {
  qaCallsMarked: number;
  qaAverage: number;
  qaComplete: boolean;
  qaPassed: boolean;
  qaFailed: boolean;
} {
  const qaCallsMarked = scores.length;
  const qaAverage =
    qaCallsMarked > 0
      ? scores.reduce((sum, row) => sum + row.score, 0) / qaCallsMarked
      : 0;
  const qaComplete = qaCallsMarked >= QA_CALLS_MIN;
  const qaPassed = qaComplete && qaAverage >= QA_PASS_THRESHOLD;
  const qaFailed = qaComplete && qaAverage < QA_PASS_THRESHOLD;

  return { qaCallsMarked, qaAverage, qaComplete, qaPassed, qaFailed };
}

export function getQaResultLabel(metrics: {
  qaComplete: boolean;
  qaPassed: boolean;
  qaFailed: boolean;
}): ComplianceMetrics["qaResult"] {
  if (!metrics.qaComplete) {
    return "Pending";
  }
  if (metrics.qaPassed) {
    return "Pass";
  }
  return "Fail";
}

export type PreviousMonthCompliance = {
  month: number;
  year: number;
  qaComplete: boolean;
  qaAverage: number;
  qaFailed: boolean;
};

export function getPreviousMonths(
  month: number,
  year: number,
  count: number
): { month: number; year: number }[] {
  const result: { month: number; year: number }[] = [];
  let currentMonth = month;
  let currentYear = year;

  for (let index = 0; index < count; index++) {
    currentMonth -= 1;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear -= 1;
    }
    result.push({ month: currentMonth, year: currentYear });
  }

  return result;
}

export function countCurrentFailStreak(
  previousMonths: PreviousMonthCompliance[],
  currentMonth?: { qaComplete: boolean; qaFailed: boolean }
): number {
  let streak = 0;

  if (currentMonth?.qaComplete && currentMonth.qaFailed) {
    streak = 1;
  }

  for (const monthResult of previousMonths) {
    if (monthResult.qaComplete && monthResult.qaFailed) {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
}

export function arePreviousThreeMonthsAllFailed(
  previousMonths: PreviousMonthCompliance[]
): boolean {
  if (previousMonths.length < 3) {
    return false;
  }

  return previousMonths.slice(0, 3).every(
    (monthResult) => monthResult.qaComplete && monthResult.qaFailed
  );
}

export function calculateCompliancePayableRate(input: {
  qaComplete: boolean;
  qaPassed: boolean;
  previousThreeMonthsAllFailed: boolean;
}): number {
  if (input.previousThreeMonthsAllFailed) {
    return 0;
  }

  if (!input.qaComplete) {
    return 1;
  }

  if (input.qaPassed) {
    return 1;
  }

  return 0.6;
}

export function formatCompliancePayableRateLabel(
  rate: number,
  qaComplete: boolean,
  commissionIneligible: boolean
): string {
  if (commissionIneligible) {
    return "0%";
  }

  if (!qaComplete) {
    return "Pending (100%)";
  }

  if (rate >= 1) {
    return "100%";
  }

  if (rate <= 0) {
    return "0%";
  }

  return "60%";
}

export function buildNextMonthEligibilityWarning(input: {
  qaComplete: boolean;
  qaFailed: boolean;
  currentFailStreak: number;
  commissionIneligible: boolean;
}): string | null {
  if (input.commissionIneligible) {
    return "Not eligible for commission this month due to 3 consecutive failed QA months.";
  }

  if (input.qaComplete && input.qaFailed) {
    const projectedStreak = input.currentFailStreak + 1;
    if (projectedStreak === 2) {
      return "One more failed QA month in a row will make you ineligible for commission next month.";
    }
    if (projectedStreak >= 3) {
      return "This failed QA month contributes to a 3-month fail streak. Next month may be ineligible.";
    }
  }

  if (input.currentFailStreak === 2 && !input.qaComplete) {
    return "You have failed QA 2 months in a row. Another fail will make next month ineligible.";
  }

  return null;
}

export function calculateComplianceMetrics(input: {
  scores: ComplianceScoreInput[];
  previousMonths: PreviousMonthCompliance[];
}): ComplianceMetrics {
  const qa = calculateQaFromScores(input.scores);
  const currentFailStreak = countCurrentFailStreak(input.previousMonths, {
    qaComplete: qa.qaComplete,
    qaFailed: qa.qaFailed,
  });
  const previousThreeMonthsAllFailed = arePreviousThreeMonthsAllFailed(input.previousMonths);
  const commissionIneligible = previousThreeMonthsAllFailed;
  const compliancePayableRate = calculateCompliancePayableRate({
    qaComplete: qa.qaComplete,
    qaPassed: qa.qaPassed,
    previousThreeMonthsAllFailed,
  });

  const qaResult = getQaResultLabel(qa);

  return {
    qaCallsMarked: qa.qaCallsMarked,
    qaAverage: qa.qaAverage,
    qaComplete: qa.qaComplete,
    qaPassed: qa.qaPassed,
    qaFailed: qa.qaFailed,
    qaResult,
    compliancePayableRate,
    compliancePayableRateLabel: formatCompliancePayableRateLabel(
      compliancePayableRate,
      qa.qaComplete,
      commissionIneligible
    ),
    currentFailStreak,
    previousThreeMonthsAllFailed,
    commissionIneligible,
    nextMonthEligibilityWarning: buildNextMonthEligibilityWarning({
      qaComplete: qa.qaComplete,
      qaFailed: qa.qaFailed,
      currentFailStreak,
      commissionIneligible,
    }),
  };
}

export function applyComplianceToCommission(
  mtdCommission: number,
  projectedCommission: number,
  compliancePayableRate: number
): {
  complianceAdjustedMtdCommission: number;
  complianceAdjustedProjectedCommission: number;
} {
  return {
    complianceAdjustedMtdCommission: mtdCommission * compliancePayableRate,
    complianceAdjustedProjectedCommission: projectedCommission * compliancePayableRate,
  };
}

export function formatCallsMarkedLabel(qaCallsMarked: number): string {
  return `${qaCallsMarked}/${QA_CALLS_MAX}`;
}

export function parseMarkedComplianceScores(
  entries: { callNumber: number; score: string }[]
): ComplianceScoreInput[] {
  return entries
    .filter((entry) => entry.score.trim() !== "")
    .map((entry) => ({
      callNumber: entry.callNumber,
      score: Number(entry.score.trim()),
    }))
    .filter((entry) => !Number.isNaN(entry.score));
}

export function mapComplianceCallScoreRows(rows: ComplianceCallScoreRow[]): ComplianceScoreInput[] {
  return rows.map((row) => ({
    callNumber: Number(row.call_number),
    score: Number(row.score),
  }));
}

export function validateComplianceScore(raw: string): { ok: true; score: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Score is required." };
  }

  const score = Number(trimmed);
  if (Number.isNaN(score)) {
    return { ok: false, error: "Score must be a number." };
  }

  if (score < 0 || score > 100) {
    return { ok: false, error: "Score must be between 0 and 100." };
  }

  return { ok: true, score };
}
