import { dedupeBaselineRowsByContactType } from "@/lib/manualInput/baselines";

export type EmploymentTypeDb = "full_time" | "part_time";
export type EmploymentTypeUi = "Full-time" | "Part-time";

export function employmentTypeToDb(value: string): EmploymentTypeDb {
  if (value === "Part-time" || value === "part-time" || value === "part_time") {
    return "part_time";
  }
  return "full_time";
}

export function employmentTypeFromDb(value: string): EmploymentTypeUi {
  if (value === "part_time" || value === "part-time") {
    return "Part-time";
  }
  return "Full-time";
}

export type PerformanceActionState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at?: string;
};

export type ConsultantMonthRow = {
  id: string;
  user_id: string;
  month: number;
  year: number;
  employment_type: EmploymentTypeDb;
  full_time_points_target: number;
  full_time_rostered_days: number;
  total_rostered_days_this_month: number;
  completed_rostered_days_so_far: number;
  created_at: string;
  updated_at?: string;
};

export type ConsultantMonthUpsert = {
  user_id: string;
  month: number;
  year: number;
  employment_type: EmploymentTypeDb;
  full_time_points_target: number;
  full_time_rostered_days: number;
  total_rostered_days_this_month: number;
  completed_rostered_days_so_far: number;
};

export type ContactTypeRow = {
  type_key: string;
  display_name: string;
  points_per_sale: number;
  expected_conversion_rate: number;
  sort_order: number;
  created_at: string;
};

export type MonthlyContactBaselineRow = {
  id: string;
  consultant_month_id: string;
  user_id: string;
  contact_type_key: string;
  total_contacts_so_far: number;
  converted_sales_so_far: number;
  total_gwp_so_far: number;
  created_at: string;
  updated_at?: string;
};

export type MonthlyContactBaselineUpsert = {
  consultant_month_id: string;
  user_id: string;
  contact_type_key: string;
  total_contacts_so_far: number;
  converted_sales_so_far: number;
  total_gwp_so_far: number;
};

export type ContactDispositionRow = {
  disposition_key: string;
  display_name: string;
  counts_as_contact_by_default: boolean;
  counts_as_sale: boolean;
  counts_as_contact_for_cli_only: boolean;
  requires_gwp: boolean;
  sort_order: number;
  created_at?: string;
};

export type DailyContactEntryRow = {
  id: string;
  consultant_month_id: string;
  user_id: string;
  entry_date: string;
  contact_type_key: string;
  disposition_key: string;
  contacts_count: number;
  converted_sales_count: number;
  total_gwp: number;
  notes: string | null;
  created_at: string;
  updated_at?: string;
};

export type DailyContactEntryInsert = {
  consultant_month_id: string;
  user_id: string;
  entry_date: string;
  contact_type_key: string;
  disposition_key: string;
  contacts_count: number;
  converted_sales_count: number;
  total_gwp: number;
  notes: string | null;
};

/** @deprecated Use DailyContactEntryInsert — daily contacts use insert-only for new rows. */
export type DailyContactEntryUpsert = DailyContactEntryInsert;

export type ManualContactAdjustmentRow = {
  id: string;
  consultant_month_id: string;
  user_id: string;
  adjustment_date: string;
  contact_type_key: string;
  contacts_delta: number;
  converted_sales_delta: number;
  total_gwp_delta: number;
  reason: string;
  created_at: string;
  updated_at?: string;
};

export type ManualContactAdjustmentInsert = {
  consultant_month_id: string;
  user_id: string;
  adjustment_date: string;
  contact_type_key: string;
  contacts_delta: number;
  converted_sales_delta: number;
  total_gwp_delta: number;
  reason: string;
};

export type ManualInputDefaultValues = {
  month: number;
  year: number;
  employmentType: EmploymentTypeUi;
  fullTimePointsTarget: number;
  fullTimeRosteredDays: number;
  totalRosteredDaysThisMonth: number;
  completedRosteredDaysSoFar: number;
  baselineByContactType: Record<
    string,
    {
      totalContactsSoFar: number;
      convertedSalesSoFar: number;
      totalGwpSoFar: number;
    }
  >;
};

export type AdjustmentHistoryRow = {
  id: string;
  adjustmentDate: string;
  reason: string;
  contactTypeName: string;
  contactsDelta: number;
  convertedSalesDelta: number;
  salesPointsDelta: number;
};

export type ConsultantPerformanceStats = {
  consultantMonthId: string;
  userId: string;
  month: number;
  year: number;
  eligibleContacts: number;
  mtdSales: number;
  mtdConversionRate: number;
  mtdTargetConversion: number;
  percentToTargetConversion: number;
  mtdConversionMultiplier: number;
  mtdTotalSalesPoints: number;
  pointsTarget: number;
  mtdTotalGwp: number;
  averageGwp: number;
  mtdDpp: number;
  gwpAcceleratorDpp: number;
  mtdBaseCommission: number;
  mtdGwpAccelerator: number;
  mtdCommission: number;
  completedRosteredDaysSoFar: number;
  totalRosteredDaysThisMonth: number;
  projectionDays: number;
  projectedTotalSalesPoints: number;
  projectedDpp: number;
  projectedGwpAcceleratorDpp: number;
  projectedConversionMultiplier: number;
  projectedCommission: number;
};

export type LeaderboardRow = {
  rank: number;
  userId: string;
  name: string;
  mtdCommission: number;
  projectedCommission: number;
  mtdTotalSalesPoints: number;
  mtdDpp: number;
  averageGwp: number;
  percentToTargetConversion: number;
};

export function rowToManualInputDefaults(
  monthRow: ConsultantMonthRow,
  baselineRows: MonthlyContactBaselineRow[]
): ManualInputDefaultValues {
  const baselineByContactType: ManualInputDefaultValues["baselineByContactType"] = {};

  dedupeBaselineRowsByContactType(baselineRows).forEach((row) => {
    baselineByContactType[row.contact_type_key] = {
      totalContactsSoFar: Number(row.total_contacts_so_far),
      convertedSalesSoFar: Number(row.converted_sales_so_far),
      totalGwpSoFar: Number(row.total_gwp_so_far),
    };
  });

  return {
    month: Number(monthRow.month),
    year: Number(monthRow.year),
    employmentType: employmentTypeFromDb(monthRow.employment_type),
    fullTimePointsTarget: Number(monthRow.full_time_points_target),
    fullTimeRosteredDays: Number(monthRow.full_time_rostered_days),
    totalRosteredDaysThisMonth: Number(monthRow.total_rostered_days_this_month),
    completedRosteredDaysSoFar: Number(monthRow.completed_rostered_days_so_far),
    baselineByContactType,
  };
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function averageGwpFromTotals(convertedSales: number, totalGwp: number): number {
  return convertedSales > 0 ? totalGwp / convertedSales : 0;
}

export function totalGwpFromAverage(convertedSales: number, averageGwp: number): number {
  return convertedSales * averageGwp;
}
