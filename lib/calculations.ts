import type {
  ConsultantMonthRow,
  ConsultantPerformanceStats,
  ContactTypeRow,
  DailyContactEntryRow,
  ManualContactAdjustmentRow,
  MonthlyContactBaselineRow,
} from "@/lib/types";
import {
  accumulateMtdConversionBreakdown,
  contactCountForConversion,
  createEmptyMtdConversionBreakdown,
  type MtdConversionBreakdown,
} from "@/lib/calculations/contactAggregation";
import { isCallbackContactType } from "@/lib/contactTypes/callback";
import { dedupeBaselineRowsByContactType } from "@/lib/manualInput/baselines";
import { calculateMonthlyKpis } from "@/lib/monthlyKpi/roster";
import { employmentTypeFromDb } from "@/lib/types";

export type { MtdConversionBreakdown };

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

type FormatCurrencyOptions = {
  decimals?: number;
  fallback?: string;
};

export function formatCurrency(
  value: number | null | undefined,
  options?: FormatCurrencyOptions
): string {
  const decimals = options?.decimals ?? 2;
  const fallback = options?.fallback ?? "$0.00";

  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback;
  }

  const formatted = Number(value).toLocaleString("en-AU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `$${formatted}`;
}

export function formatCurrencyNoDecimals(value: number | null | undefined): string {
  return formatCurrency(value, { decimals: 0 });
}

export function formatCurrencyPerPoint(value: number | null | undefined): string {
  return `${formatCurrency(value)} / point`;
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return (0).toFixed(decimals);
  }

  return Number(value).toLocaleString("en-AU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export type CommissionBracket = {
  points: number;
  dpp: number;
};

export const FULL_TIME_COMMISSION_BRACKETS: CommissionBracket[] = [
  { points: 45, dpp: 10 },
  { points: 55, dpp: 15 },
  { points: 65, dpp: 20 },
  { points: 70, dpp: 25 },
  { points: 75, dpp: 35 },
  { points: 80, dpp: 45 },
  { points: 85, dpp: 65 },
  { points: 90, dpp: 85 },
  { points: 100, dpp: 105 },
  { points: 110, dpp: 115 },
];

export const GWP_ACCELERATOR_BRACKETS = [
  { minAverageGwp: 3800, extraDpp: 40 },
  { minAverageGwp: 3500, extraDpp: 30 },
  { minAverageGwp: 3200, extraDpp: 20 },
] as const;

export function getAdjustedCommissionBrackets(monthSetup: {
  full_time_rostered_days?: number | null;
  total_rostered_days_this_month?: number | null;
}): CommissionBracket[] {
  const fullTimeRosteredDays = Number(monthSetup.full_time_rostered_days || 23);
  const totalRosteredDays = Number(
    monthSetup.total_rostered_days_this_month || fullTimeRosteredDays
  );

  const rosterFactor =
    fullTimeRosteredDays > 0 ? totalRosteredDays / fullTimeRosteredDays : 1;

  return FULL_TIME_COMMISSION_BRACKETS.map((bracket) => ({
    points: bracket.points * rosterFactor,
    dpp: bracket.dpp,
  }));
}

export function getDppForPoints(
  points: number,
  adjustedBrackets: CommissionBracket[]
): number {
  const safePoints = Number(points || 0);

  if (safePoints <= 0) {
    return 0;
  }

  const matchedBracket = [...adjustedBrackets]
    .sort((a, b) => b.points - a.points)
    .find((bracket) => safePoints >= bracket.points);

  return matchedBracket?.dpp ?? 0;
}

export function getConversionMultiplier(percentToTargetConversion: number): number {
  const safePercent = Number(percentToTargetConversion || 0);

  if (safePercent < 0.8) {
    return 0;
  }

  if (safePercent >= 1.2) {
    return 1.2;
  }

  return safePercent;
}

export function getGwpAcceleratorDpp(averageGwp: number): number {
  const safeAverageGwp = Number(averageGwp || 0);

  const matched = GWP_ACCELERATOR_BRACKETS.find(
    (bracket) => safeAverageGwp >= bracket.minAverageGwp
  );

  return matched?.extraDpp ?? 0;
}

function resolveTypeConfig(
  typeKey: string,
  dbTypes: ContactTypeRow[]
): { pointsPerSale: number; expectedConversionRate: number } {
  const dbType = dbTypes.find((item) => item.type_key === typeKey);
  if (dbType) {
    return {
      pointsPerSale: Number(dbType.points_per_sale),
      expectedConversionRate: Number(dbType.expected_conversion_rate),
    };
  }
  return { pointsPerSale: 0, expectedConversionRate: 0 };
}

function countDistinctContactEntryDates(
  dailyEntries: DailyContactEntryRow[],
  contactTypes: ContactTypeRow[]
): number {
  const dates = new Set<string>();

  dailyEntries.forEach((row) => {
    if (
      contactCountForConversion(
        row.contact_type_key,
        Number(row.contacts_count),
        contactTypes
      ) > 0
    ) {
      dates.add(row.entry_date);
    }
  });

  return dates.size;
}

export type ConsultantMonthMetricsInput = {
  consultantMonth: ConsultantMonthRow;
  baselines: MonthlyContactBaselineRow[];
  dailyEntries: DailyContactEntryRow[];
  manualAdjustments: ManualContactAdjustmentRow[];
  contactTypes: ContactTypeRow[];
  offDates?: string[];
};

export function calculateConsultantMonthMetrics(
  input: ConsultantMonthMetricsInput
): ConsultantPerformanceStats {
  const stats = calculateConsultantPerformanceFromRaw(
    input.consultantMonth,
    input.baselines,
    input.dailyEntries,
    input.manualAdjustments,
    input.contactTypes,
    input.offDates ?? []
  );

  console.log("Calculated dashboard metrics:", stats);
  return stats;
}

export function calculateConsultantPerformance(
  month: ConsultantMonthRow,
  baselines: MonthlyContactBaselineRow[],
  dailyEntries: DailyContactEntryRow[],
  adjustments: ManualContactAdjustmentRow[],
  contactTypes: ContactTypeRow[],
  offDates: string[] = []
): ConsultantPerformanceStats {
  return calculateConsultantMonthMetrics({
    consultantMonth: month,
    baselines,
    dailyEntries,
    manualAdjustments: adjustments,
    contactTypes,
    offDates,
  });
}

function calculateConsultantPerformanceFromRaw(
  month: ConsultantMonthRow,
  baselines: MonthlyContactBaselineRow[],
  dailyEntries: DailyContactEntryRow[],
  adjustments: ManualContactAdjustmentRow[],
  contactTypes: ContactTypeRow[],
  offDates: string[] = []
): ConsultantPerformanceStats {
  const uniqueBaselines = dedupeBaselineRowsByContactType(baselines);

  const totalsByType = new Map<
    string,
    { contacts: number; convertedSales: number; totalGwp: number }
  >();

  const addToType = (
    typeKey: string,
    contacts: number,
    convertedSales: number,
    totalGwp: number
  ) => {
    const current = totalsByType.get(typeKey) ?? { contacts: 0, convertedSales: 0, totalGwp: 0 };
    totalsByType.set(typeKey, {
      contacts: current.contacts + contacts,
      convertedSales: current.convertedSales + convertedSales,
      totalGwp: current.totalGwp + totalGwp,
    });
  };

  uniqueBaselines.forEach((row) => {
    addToType(
      row.contact_type_key,
      Number(row.total_contacts_so_far),
      Number(row.converted_sales_so_far),
      Number(row.total_gwp_so_far)
    );
  });

  dailyEntries.forEach((row) => {
    addToType(
      row.contact_type_key,
      Number(row.contacts_count),
      Number(row.converted_sales_count),
      Number(row.total_gwp)
    );
  });

  adjustments.forEach((row) => {
    addToType(
      row.contact_type_key,
      Number(row.contacts_delta),
      Number(row.converted_sales_delta),
      Number(row.total_gwp_delta)
    );
  });

  let eligibleContacts = 0;
  let mtdSales = 0;
  let mtdTotalGwp = 0;
  let mtdTotalSalesPoints = 0;
  let blendedNumerator = 0;
  const mtdConversionBreakdown = createEmptyMtdConversionBreakdown();

  totalsByType.forEach((totals, typeKey) => {
    const config = resolveTypeConfig(typeKey, contactTypes);
    const contactsForConversion = contactCountForConversion(typeKey, totals.contacts, contactTypes);

    accumulateMtdConversionBreakdown(
      mtdConversionBreakdown,
      typeKey,
      totals.contacts,
      totals.convertedSales,
      contactTypes
    );

    eligibleContacts += contactsForConversion;
    mtdSales += totals.convertedSales;
    mtdTotalGwp += totals.totalGwp;
    mtdTotalSalesPoints += totals.convertedSales * config.pointsPerSale;
    blendedNumerator += contactsForConversion * config.expectedConversionRate;
  });

  dailyEntries.forEach((row) => {
    if (isCallbackContactType(row.contact_type_key, contactTypes)) {
      mtdConversionBreakdown.callbackEntriesExcludedFromContacts += 1;
    }
  });

  const mtdConversionRate = eligibleContacts > 0 ? mtdSales / eligibleContacts : 0;
  const mtdTargetConversion = eligibleContacts > 0 ? blendedNumerator / eligibleContacts : 0;
  const percentToTargetConversion =
    mtdTargetConversion > 0 ? mtdConversionRate / mtdTargetConversion : 0;
  const conversionMultiplier = getConversionMultiplier(percentToTargetConversion);
  const averageGwp = mtdSales > 0 ? mtdTotalGwp / mtdSales : 0;

  const monthKpis = calculateMonthlyKpis({
    month: Number(month.month),
    year: Number(month.year),
    employmentType: employmentTypeFromDb(month.employment_type),
    fullTimePointsTarget: Number(month.full_time_points_target),
    offDates,
  });

  const pointsTarget = Number(month.adjusted_points_target ?? monthKpis.adjustedPointsTarget);

  const adjustedBrackets = getAdjustedCommissionBrackets({
    full_time_rostered_days: monthKpis.fullTimeRosteredDays,
    total_rostered_days_this_month: monthKpis.totalRosteredDaysThisMonth,
  });
  const mtdDpp = getDppForPoints(mtdTotalSalesPoints, adjustedBrackets);
  const gwpAcceleratorDpp = getGwpAcceleratorDpp(averageGwp);
  const hasMtdPayableBracket = mtdDpp > 0;
  const mtdBaseCommission = hasMtdPayableBracket
    ? mtdTotalSalesPoints * mtdDpp * conversionMultiplier
    : 0;
  const mtdGwpAccelerator = hasMtdPayableBracket
    ? mtdTotalSalesPoints * gwpAcceleratorDpp
    : 0;
  const mtdCommission = hasMtdPayableBracket ? mtdBaseCommission + mtdGwpAccelerator : 0;

  console.log("MTD Sales Points:", mtdTotalSalesPoints);
  console.log("MTD DPP:", mtdDpp);
  console.log("MTD GWP Accelerator:", gwpAcceleratorDpp);
  console.log("MTD Has Payable Bracket:", hasMtdPayableBracket);
  console.log("MTD Commission:", mtdCommission);

  const completedDays = monthKpis.completedRosteredDaysSoFar;
  const totalRosteredDays = monthKpis.totalRosteredDaysThisMonth;
  const distinctContactEntryDates = countDistinctContactEntryDates(dailyEntries, contactTypes);
  const projectionDays =
    completedDays > 0 ? completedDays : distinctContactEntryDates;

  const projectedTotalSalesPoints =
    projectionDays > 0
      ? (mtdTotalSalesPoints / projectionDays) * totalRosteredDays
      : 0;
  const projectedDpp = getDppForPoints(projectedTotalSalesPoints, adjustedBrackets);
  const projectedConversionMultiplier = getConversionMultiplier(percentToTargetConversion);
  const projectedGwpAcceleratorDpp = getGwpAcceleratorDpp(averageGwp);
  const hasProjectedPayableBracket = projectedDpp > 0;
  const projectedCommission = hasProjectedPayableBracket
    ? projectedTotalSalesPoints * projectedDpp * projectedConversionMultiplier +
      projectedTotalSalesPoints * projectedGwpAcceleratorDpp
    : 0;

  console.log("Projected Points:", projectedTotalSalesPoints);
  console.log("Projected DPP:", projectedDpp);
  console.log("Projected GWP Accelerator:", projectedGwpAcceleratorDpp);
  console.log("Projected Has Payable Bracket:", hasProjectedPayableBracket);
  console.log("Projected Commission:", projectedCommission);

  return {
    consultantMonthId: month.id,
    userId: month.user_id,
    month: Number(month.month),
    year: Number(month.year),
    eligibleContacts,
    mtdSales,
    mtdConversionRate,
    mtdTargetConversion,
    percentToTargetConversion,
    mtdConversionMultiplier: conversionMultiplier,
    mtdTotalSalesPoints,
    pointsTarget,
    mtdTotalGwp,
    averageGwp,
    mtdDpp,
    gwpAcceleratorDpp,
    mtdBaseCommission,
    mtdGwpAccelerator,
    mtdCommission,
    completedRosteredDaysSoFar: completedDays,
    totalRosteredDaysThisMonth: totalRosteredDays,
    projectionDays,
    projectedTotalSalesPoints,
    projectedDpp,
    projectedGwpAcceleratorDpp,
    projectedConversionMultiplier,
    projectedCommission,
    mtdConversionBreakdown,
  };
}
