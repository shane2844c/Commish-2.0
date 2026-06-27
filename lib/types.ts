export type EmploymentType = "full-time" | "part-time";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

export type MonthlySetupRow = {
  id: string;
  user_id: string;
  month: number;
  year: number;
  employment_type: EmploymentType;
  full_time_target: number;
  full_time_rostered_days: number;
  user_rostered_days: number;
  gwp_target: number;
  conversion_target: number;
  starting_sales: number;
  starting_contacts: number;
  starting_gwp_total: number;
  starting_sales_points: number;
  created_at: string;
};

export type DailyEntryRow = {
  id: string;
  user_id: string;
  monthly_setup_id: string;
  entry_date: string;
  contacts: number;
  sales: number;
  gwp_total: number;
  sales_points: number;
  notes: string | null;
  created_at: string;
};

export type MonthlySetup = {
  fullTimeTarget: number;
  fullTimeRosteredDays: number;
  userRosteredDays: number;
  startingSales: number;
  startingContacts: number;
  startingGwpTotal: number;
  startingSalesPoints: number;
  gwpTarget: number;
};

export type DailyEntry = {
  entryDate: string;
  contacts: number;
  sales: number;
  gwpTotal: number;
  salesPoints: number;
};

export type DashboardStats = {
  adjustedTarget: number;
  mtdSales: number;
  mtdContacts: number;
  mtdGwpTotal: number;
  mtdSalesPoints: number;
  averageGwp: number;
  percentageToTarget: number;
  salesNeeded: number;
  workedDaysSoFar: number;
  remainingRosteredDays: number;
  salesNeededPerRemainingDay: number;
  conversionRate: number;
};

export type LeaderboardRow = {
  rank: number;
  userId: string;
  name: string;
  mtdSales: number;
  adjustedTarget: number;
  percentageToTarget: number;
  averageGwp: number;
  salesNeeded: number;
  salesNeededPerRemainingDay: number;
};

export function rowToMonthlySetup(row: MonthlySetupRow): MonthlySetup {
  return {
    fullTimeTarget: Number(row.full_time_target),
    fullTimeRosteredDays: Number(row.full_time_rostered_days),
    userRosteredDays: Number(row.user_rostered_days),
    startingSales: Number(row.starting_sales),
    startingContacts: Number(row.starting_contacts),
    startingGwpTotal: Number(row.starting_gwp_total),
    startingSalesPoints: Number(row.starting_sales_points),
    gwpTarget: Number(row.gwp_target),
  };
}

export function rowToDailyEntry(row: DailyEntryRow): DailyEntry {
  return {
    entryDate: row.entry_date,
    contacts: Number(row.contacts),
    sales: Number(row.sales),
    gwpTotal: Number(row.gwp_total),
    salesPoints: Number(row.sales_points),
  };
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}
