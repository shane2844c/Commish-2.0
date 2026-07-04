import { dedupeBaselineRowsByContactType } from "@/lib/manualInput/baselines";
import { calculateMonthlyKpis } from "@/lib/monthlyKpi/roster";

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
  display_name: string | null;
  username: string | null;
  created_at: string;
  updated_at?: string;
};

export type ConsultantMonthMetricsRow = {
  id: string;
  consultant_month_id: string;
  user_id: string;
  month: number;
  year: number;
  mtd_target_conversion: number;
  mtd_conversion_rate: number;
  percent_to_target_conversion: number;
  mtd_conversion_multiplier: number;
  mtd_total_sales_points: number;
  points_target: number;
  average_gwp: number;
  mtd_dpp: number;
  gwp_accelerator_per_point: number;
  mtd_commission: number;
  projected_total_sales_points: number;
  projected_dpp: number;
  projected_gwp_payable_per_point: number;
  projected_conversion_multiplier: number;
  projected_commission: number;
  qa_calls_marked: number;
  qa_average: number;
  qa_complete: boolean;
  qa_passed: boolean;
  qa_failed: boolean;
  compliance_payable_rate: number;
  current_fail_streak: number;
  commission_ineligible: boolean;
  compliance_adjusted_mtd_commission: number;
  compliance_adjusted_projected_commission: number;
  updated_at: string;
};

export type ConsultantMonthMetricsUpsert = Omit<ConsultantMonthMetricsRow, "id">;

export type ConsultantMonthRow = {
  id: string;
  user_id: string;
  month: number;
  year: number;
  employment_type: EmploymentTypeDb;
  full_time_points_target: number;
  full_time_rostered_days: number;
  base_rostered_days_this_month: number;
  rostered_days_off: number;
  total_rostered_days_this_month: number;
  adjusted_points_target: number;
  completed_rostered_days_so_far: number;
  created_at: string;
  updated_at?: string;
};

export type ConsultantRosteredDayOffRow = {
  id: string;
  consultant_month_id: string;
  user_id: string;
  off_date: string;
  reason: string | null;
  created_at: string;
};

export type RosteredDayOffEntry = {
  id: string;
  offDate: string;
  reason: string | null;
};

export type ConsultantMonthUpsert = {
  user_id: string;
  month: number;
  year: number;
  employment_type: EmploymentTypeDb;
  full_time_points_target: number;
  full_time_rostered_days: number;
  base_rostered_days_this_month: number;
  rostered_days_off: number;
  total_rostered_days_this_month: number;
  adjusted_points_target: number;
  completed_rostered_days_so_far: number;
};

export type ContactTypeRow = {
  type_key: string;
  display_name: string;
  points_per_sale: number;
  expected_conversion_rate: number;
  sort_order: number;
  is_callback?: boolean;
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
  rosteredDaysOffEntries: RosteredDayOffEntry[];
  fullTimeRosteredDays: number;
  baseRosteredDaysThisMonth: number;
  totalRosteredDaysThisMonth: number;
  adjustedPointsTarget: number;
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

export type ComplianceCallScoreRow = {
  id: string;
  consultant_month_id: string;
  user_id: string;
  call_number: number;
  score: number;
  notes: string | null;
  created_at: string;
  updated_at?: string;
};

export type ComplianceMetrics = {
  qaCallsMarked: number;
  qaAverage: number;
  qaComplete: boolean;
  qaPassed: boolean;
  qaFailed: boolean;
  qaResult: "Pending" | "Pass" | "Fail";
  compliancePayableRate: number;
  compliancePayableRateLabel: string;
  currentFailStreak: number;
  previousThreeMonthsAllFailed: boolean;
  commissionIneligible: boolean;
  nextMonthEligibilityWarning: string | null;
};

export type ComplianceCallFormEntry = {
  callNumber: number;
  score: string;
  notes: string;
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
  mtdConversionBreakdown?: {
    contactDenominator: number;
    salesNumerator: number;
    callbackEntriesExcludedFromContacts: number;
    callbackSalesIncludedInSales: number;
  };
  compliance?: ComplianceMetrics;
  complianceAdjustedMtdCommission?: number;
  complianceAdjustedProjectedCommission?: number;
};

export type LeaderboardProfileRow = {
  id: string;
  username: string | null;
};

export type LeaderboardRow = {
  position: number;
  userId: string;
  consultantMonthId: string;
  name: string;
  mtdTargetConversion: number;
  mtdConversionRate: number;
  percentToTargetConversion: number;
  mtdConversionMultiplier: number;
  mtdTotalSalesPoints: number;
  pointsTarget: number;
  averageGwp: number;
  mtdDpp: number;
  gwpAcceleratorPerPoint: number;
  mtdCommission: number;
  qaAverage: number;
  compliancePayableRate: number;
  compliancePayableRateLabel: string;
  complianceAdjustedMtdCommission: number;
  complianceAdjustedProjectedCommission: number;
  projectedTotalSalesPoints: number;
  projectedDpp: number;
  projectedGwpPayablePerPoint: number;
  projectedConversionMultiplier: number;
  projectedCommission: number;
};

export function rowToManualInputDefaults(
  monthRow: ConsultantMonthRow,
  baselineRows: MonthlyContactBaselineRow[],
  rosteredDaysOffEntries: RosteredDayOffEntry[] = []
): ManualInputDefaultValues {
  const offDates = rosteredDaysOffEntries.map((entry) => entry.offDate);
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
    rosteredDaysOffEntries,
    fullTimeRosteredDays: Number(monthRow.full_time_rostered_days),
    baseRosteredDaysThisMonth: Number(
      monthRow.base_rostered_days_this_month ?? monthRow.total_rostered_days_this_month
    ),
    totalRosteredDaysThisMonth: Number(monthRow.total_rostered_days_this_month),
    adjustedPointsTarget: Number(
      monthRow.adjusted_points_target ??
        calculateMonthlyKpis({
          month: Number(monthRow.month),
          year: Number(monthRow.year),
          employmentType: employmentTypeFromDb(monthRow.employment_type),
          fullTimePointsTarget: Number(monthRow.full_time_points_target),
          offDates,
        }).adjustedPointsTarget
    ),
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
