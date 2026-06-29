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
  full_name: string | null;
  email: string | null;
  created_at: string;
};

export type ConsultantMonthRow = {
  id: string;
  user_id: string;
  month_start: string;
  employment_type: EmploymentTypeDb;
  full_time_points_target: number;
  full_time_rostered_days: number;
  user_rostered_days: number;
  completed_rostered_days: number;
  join_date?: string | null;
  baseline_completed_at?: string | null;
  created_at: string;
};

export type ContactTypeRow = {
  id: string;
  slug: string;
  name: string;
  points: number;
  expected_conversion_rate: number;
  sort_order: number;
  is_active: boolean;
};

export type ContactOutcomeRow = {
  id: string;
  slug: string;
  name: string;
  counts_for_conversion_denominator: boolean;
  counts_as_sale: boolean;
  is_excluded: boolean;
  is_misdisposition: boolean;
  sort_order: number;
  is_active: boolean;
};

export type PerformanceEntryRow = {
  id: string;
  consultant_month_id: string;
  entry_date: string | null;
  source: "baseline" | "daily" | "manual_adjustment";
  contact_type_id: string;
  outcome_id: string | null;
  contact_count: number;
  converted_sales_count: number;
  sales_points: number;
  average_gwp_input: number | null;
  hidden_total_gwp: number;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type DailyContactLogRow = {
  id: string;
  entry_date: string;
  created_at: string;
  contactTypeId: string;
  contactTypeName: string;
  contactTypePoints: number;
  outcomeId: string;
  outcomeName: string;
  salesPoints: number;
  saleGwp: number;
};

export type ManualInputDefaultValues = {
  month: number;
  year: number;
  employmentType: EmploymentTypeUi;
  fullTimePointsTarget: number;
  fullTimeRosteredDays: number;
  totalRosteredDays: number;
  completedRosteredDays: number;
  baselineByContactType: Record<
    string,
    {
      contacts: number;
      convertedSales: number;
      averageGwp: number;
    }
  >;
};

export type ConsultantPerformanceRow = {
  consultant_month_id: string;
  user_id: string;
  month_start: string;
  eligible_contacts: number;
  mtd_sales: number;
  mtd_conversion_rate: number;
  mtd_target_conversion: number;
  percent_to_target_conversion: number;
  mtd_conversion_multiplier: number;
  mtd_total_sales_points: number;
  points_target: number;
  mtd_total_gwp: number;
  average_gwp: number;
  base_dpp: number;
  gwp_payable_per_point: number;
  mtd_dpp: number;
  mtd_commission: number;
  completed_rostered_days: number;
  total_rostered_days: number;
  projected_total_sales_points: number;
  projected_dpp: number;
  projected_gwp_payable_per_point: number;
  projected_conversion_multiplier: number;
  projected_commission: number;
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
  baselineRows: Array<
    PerformanceEntryRow & { contact_type: Pick<ContactTypeRow, "slug" | "points"> | null }
  >
): ManualInputDefaultValues {
  const baselineByContactType: ManualInputDefaultValues["baselineByContactType"] = {};

  baselineRows.forEach((row) => {
    if (!row.contact_type) {
      return;
    }
    const convertedSales = Number(row.converted_sales_count);
    baselineByContactType[row.contact_type.slug] = {
      contacts: Number(row.contact_count),
      convertedSales,
      averageGwp: convertedSales > 0 ? Number(row.hidden_total_gwp) / convertedSales : 0,
    };
  });

  const { month, year } = fromMonthStart(monthRow.month_start);

  return {
    month,
    year,
    employmentType: employmentTypeFromDb(monthRow.employment_type),
    fullTimePointsTarget: Number(monthRow.full_time_points_target),
    fullTimeRosteredDays: Number(monthRow.full_time_rostered_days),
    totalRosteredDays: Number(monthRow.user_rostered_days),
    completedRosteredDays: Number(monthRow.completed_rostered_days ?? 0),
    baselineByContactType,
  };
}

export function toMonthStart(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function fromMonthStart(monthStart: string): { month: number; year: number } {
  const [yearPart, monthPart] = monthStart.split("-");
  return { month: Number(monthPart), year: Number(yearPart) };
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function getCurrentMonthStart(): string {
  const { month, year } = getCurrentMonthYear();
  return toMonthStart(month, year);
}
