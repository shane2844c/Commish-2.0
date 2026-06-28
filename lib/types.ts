export type EmploymentType = "full-time" | "part-time";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

export type ConsultantMonthRow = {
  id: string;
  user_id: string;
  month: number;
  year: number;
  employment_type: EmploymentType;
  full_time_target: number;
  full_time_points_target: number;
  full_time_rostered_days: number;
  user_rostered_days: number;
  inbound_target: number;
  outbound_target: number;
  transfer_target: number;
  created_at: string;
};

export type DailyContactEntryRow = {
  id: string;
  consultant_month_id: string;
  entry_date: string | null;
  source: "baseline" | "daily" | "adjustment";
  inbound_contacts: number;
  outbound_contacts: number;
  transfer_contacts: number;
  created_at: string;
};

export type SalesEntryRow = {
  id: string;
  consultant_month_id: string;
  entry_date: string | null;
  source: "baseline" | "daily" | "adjustment";
  actual_sales: number;
  sales_points: number;
  gwp_amount: number;
  notes: string | null;
  created_at: string;
};

export type StartingDataInput = {
  month: number;
  year: number;
  employmentType: EmploymentType;
  fullTimeTarget: number;
  fullTimePointsTarget: number;
  fullTimeRosteredDays: number;
  userRosteredDays: number;
  inboundTarget: number;
  outboundTarget: number;
  transferTarget: number;
  startingInboundContacts: number;
  startingOutboundContacts: number;
  startingTransferContacts: number;
  startingActualSales: number;
  startingSalesPoints: number;
  startingAverageGwp: number;
};

export type ConsultantPerformanceRow = {
  consultant_month_id: string;
  user_id: string;
  month: number;
  year: number;
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

export function rowToStartingDataInput(
  monthRow: ConsultantMonthRow,
  baselineContacts: DailyContactEntryRow | null,
  baselineSales: SalesEntryRow | null
): StartingDataInput {
  const startingActualSales = Number(baselineSales?.actual_sales ?? 0);
  const startingGwpAmount = Number(baselineSales?.gwp_amount ?? 0);

  return {
    month: Number(monthRow.month),
    year: Number(monthRow.year),
    employmentType: monthRow.employment_type,
    fullTimeTarget: Number(monthRow.full_time_target),
    fullTimePointsTarget: Number(monthRow.full_time_points_target),
    fullTimeRosteredDays: Number(monthRow.full_time_rostered_days),
    userRosteredDays: Number(monthRow.user_rostered_days),
    inboundTarget: Number(monthRow.inbound_target),
    outboundTarget: Number(monthRow.outbound_target),
    transferTarget: Number(monthRow.transfer_target),
    startingInboundContacts: Number(baselineContacts?.inbound_contacts ?? 0),
    startingOutboundContacts: Number(baselineContacts?.outbound_contacts ?? 0),
    startingTransferContacts: Number(baselineContacts?.transfer_contacts ?? 0),
    startingActualSales,
    startingSalesPoints: Number(baselineSales?.sales_points ?? 0),
    startingAverageGwp: startingActualSales > 0 ? startingGwpAmount / startingActualSales : 0,
  };
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}
