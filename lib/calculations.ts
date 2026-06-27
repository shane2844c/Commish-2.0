import type { DailyEntry, MonthlySetup } from "@/lib/types";

export function calculateDashboardStats(setup: MonthlySetup, entries: DailyEntry[]) {
  const adjustedTarget =
    setup.fullTimeRosteredDays > 0
      ? (setup.fullTimeTarget * setup.userRosteredDays) / setup.fullTimeRosteredDays
      : 0;

  const dailySales = entries.reduce((sum, entry) => sum + Number(entry.sales || 0), 0);
  const dailyContacts = entries.reduce((sum, entry) => sum + Number(entry.contacts || 0), 0);
  const dailyGwpTotal = entries.reduce((sum, entry) => sum + Number(entry.gwpTotal || 0), 0);
  const dailySalesPoints = entries.reduce(
    (sum, entry) => sum + Number(entry.salesPoints || 0),
    0
  );

  const mtdSales = Number(setup.startingSales || 0) + dailySales;
  const mtdContacts = Number(setup.startingContacts || 0) + dailyContacts;
  const mtdGwpTotal = Number(setup.startingGwpTotal || 0) + dailyGwpTotal;
  const mtdSalesPoints = Number(setup.startingSalesPoints || 0) + dailySalesPoints;

  const uniqueWorkedDates = new Set(entries.map((entry) => entry.entryDate));
  const workedDaysSoFar = uniqueWorkedDates.size;

  const remainingRosteredDays = Math.max(Number(setup.userRosteredDays || 0) - workedDaysSoFar, 0);

  const averageGwp = mtdSales > 0 ? mtdGwpTotal / mtdSales : 0;

  const percentageToTarget = adjustedTarget > 0 ? (mtdSales / adjustedTarget) * 100 : 0;

  const salesNeeded = Math.max(adjustedTarget - mtdSales, 0);

  const salesNeededPerRemainingDay =
    remainingRosteredDays > 0 ? salesNeeded / remainingRosteredDays : salesNeeded;

  const conversionRate = mtdContacts > 0 ? (mtdSales / mtdContacts) * 100 : 0;

  return {
    adjustedTarget,
    mtdSales,
    mtdContacts,
    mtdGwpTotal,
    mtdSalesPoints,
    averageGwp,
    percentageToTarget,
    salesNeeded,
    workedDaysSoFar,
    remainingRosteredDays,
    salesNeededPerRemainingDay,
    conversionRate,
  };
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatCurrency(value: number): string {
  return value.toFixed(2);
}

export function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}
