import type {
  ConsultantMonthRow,
  ConsultantPerformanceStats,
  ContactTypeRow,
  DailyContactEntryRow,
  ManualContactAdjustmentRow,
  MonthlyContactBaselineRow,
} from "@/lib/types";

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatCurrency(value: number): string {
  return value.toFixed(2);
}

export function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

export type CommissionBracket = {
  minPoints: number;
  dpp: number;
};

export const DPP_COMMISSION_BRACKETS: CommissionBracket[] = [
  { minPoints: 250, dpp: 16 },
  { minPoints: 200, dpp: 14 },
  { minPoints: 150, dpp: 12 },
  { minPoints: 100, dpp: 10 },
];

export function getDppForPoints(
  points: number,
  brackets: CommissionBracket[] = DPP_COMMISSION_BRACKETS
): number {
  const safePoints = Number(points || 0);

  if (safePoints <= 0) {
    return 0;
  }

  const matchedBracket = brackets
    .filter((bracket) => safePoints >= bracket.minPoints)
    .sort((a, b) => b.minPoints - a.minPoints)[0];

  return matchedBracket?.dpp ?? 0;
}

function conversionMultiplier(percentToTarget: number): number {
  if (percentToTarget >= 1.2) return 1.2;
  if (percentToTarget >= 1.1) return 1.1;
  if (percentToTarget >= 1) return 1;
  if (percentToTarget >= 0.9) return 0.9;
  return 0.8;
}

function gwpPayablePerPoint(averageGwp: number): number {
  if (averageGwp >= 160) return 2.5;
  if (averageGwp >= 140) return 2;
  if (averageGwp >= 120) return 1.5;
  if (averageGwp >= 100) return 1;
  return 0;
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

export function calculateConsultantPerformance(
  month: ConsultantMonthRow,
  baselines: MonthlyContactBaselineRow[],
  dailyEntries: DailyContactEntryRow[],
  adjustments: ManualContactAdjustmentRow[],
  contactTypes: ContactTypeRow[]
): ConsultantPerformanceStats {
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

  baselines.forEach((row) => {
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

  totalsByType.forEach((totals, typeKey) => {
    const config = resolveTypeConfig(typeKey, contactTypes);
    eligibleContacts += totals.contacts;
    mtdSales += totals.convertedSales;
    mtdTotalGwp += totals.totalGwp;
    mtdTotalSalesPoints += totals.convertedSales * config.pointsPerSale;
    blendedNumerator += totals.contacts * config.expectedConversionRate;
  });

  const mtdConversionRate = eligibleContacts > 0 ? mtdSales / eligibleContacts : 0;
  const mtdTargetConversion = eligibleContacts > 0 ? blendedNumerator / eligibleContacts : 0;
  const percentToTargetConversion =
    mtdTargetConversion > 0 ? mtdConversionRate / mtdTargetConversion : 0;
  const mtdConversionMultiplier = conversionMultiplier(percentToTargetConversion);
  const averageGwp = mtdSales > 0 ? mtdTotalGwp / mtdSales : 0;

  const pointsTarget =
    Number(month.full_time_rostered_days) > 0
      ? (Number(month.full_time_points_target) * Number(month.total_rostered_days_this_month)) /
        Number(month.full_time_rostered_days)
      : 0;

  const base = getDppForPoints(mtdTotalSalesPoints);
  const gwpBonus = base > 0 ? gwpPayablePerPoint(averageGwp) : 0;
  const mtdDpp = base + gwpBonus;
  const mtdCommission = mtdTotalSalesPoints * mtdDpp * mtdConversionMultiplier;

  const completedDays = Number(month.completed_rostered_days_so_far);
  const totalRosteredDays = Number(month.total_rostered_days_this_month);
  const projectedTotalSalesPoints =
    completedDays > 0 ? (mtdTotalSalesPoints / completedDays) * totalRosteredDays : 0;
  const projectedBase = getDppForPoints(projectedTotalSalesPoints);
  const projectedGwpBonus = projectedBase > 0 ? gwpPayablePerPoint(averageGwp) : 0;
  const projectedDpp = projectedBase + projectedGwpBonus;
  const projectedConversionMultiplier = conversionMultiplier(percentToTargetConversion);
  const projectedCommission =
    projectedTotalSalesPoints * projectedDpp * projectedConversionMultiplier;

  console.log("MTD Sales Points:", mtdTotalSalesPoints);
  console.log("Adjusted Points Target:", pointsTarget);
  console.log("MTD DPP:", mtdDpp);
  console.log("Projected Points:", projectedTotalSalesPoints);
  console.log("Projected DPP:", projectedDpp);

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
    mtdConversionMultiplier,
    mtdTotalSalesPoints,
    pointsTarget,
    mtdTotalGwp,
    averageGwp,
    baseDpp: base,
    gwpPayablePerPoint: gwpBonus,
    mtdDpp,
    mtdCommission,
    completedRosteredDaysSoFar: completedDays,
    totalRosteredDaysThisMonth: totalRosteredDays,
    projectedTotalSalesPoints,
    projectedDpp,
    projectedGwpPayablePerPoint: projectedGwpBonus,
    projectedConversionMultiplier,
    projectedCommission,
  };
}
