import type { SupabaseClient } from "@supabase/supabase-js";
import { formatCompliancePayableRateLabel } from "@/lib/compliance/calculate";
import type { ConsultantMonthMetricsRow, LeaderboardRow, Profile } from "@/lib/types";

export function resolveConsultantDisplayName(profile: Pick<Profile, "username"> | undefined): string {
  const username = profile?.username?.trim();
  if (username) {
    return username;
  }

  return "Unnamed Consultant";
}

export async function fetchLeaderboardRows(
  supabase: SupabaseClient,
  month: number,
  year: number
): Promise<LeaderboardRow[]> {
  const { data: metricRows, error: metricsError } = await supabase
    .from("consultant_month_metrics")
    .select("*")
    .eq("month", month)
    .eq("year", year);

  if (metricsError) {
    console.error("Failed to fetch consultant_month_metrics:", metricsError.message);
    return [];
  }

  const metrics = (metricRows ?? []) as ConsultantMonthMetricsRow[];
  console.log("Fetched leaderboard rows:", metrics);

  if (metrics.length === 0) {
    return [];
  }

  const userIds = metrics.map((row) => row.user_id);
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);

  const profileMap = new Map(
    (profileRows ?? []).map((profile) => [profile.id, profile as Pick<Profile, "id" | "username">])
  );

  return metrics.map((row) => {
    const qaComplete = Boolean(row.qa_complete);
    const commissionIneligible = Boolean(row.commission_ineligible);
    const compliancePayableRate = Number(row.compliance_payable_rate ?? 1);

    return {
      userId: row.user_id,
      consultantMonthId: row.consultant_month_id,
      name: resolveConsultantDisplayName(profileMap.get(row.user_id)),
      mtdTargetConversion: Number(row.mtd_target_conversion),
      mtdConversionRate: Number(row.mtd_conversion_rate),
      percentToTargetConversion: Number(row.percent_to_target_conversion),
      mtdConversionMultiplier: Number(row.mtd_conversion_multiplier),
      mtdTotalSalesPoints: Number(row.mtd_total_sales_points),
      pointsTarget: Number(row.points_target),
      averageGwp: Number(row.average_gwp),
      mtdDpp: Number(row.mtd_dpp),
      gwpAcceleratorPerPoint: Number(row.gwp_accelerator_per_point),
      mtdCommission: Number(row.mtd_commission),
      qaAverage: Number(row.qa_average ?? 0),
      compliancePayableRate,
      compliancePayableRateLabel: formatCompliancePayableRateLabel(
        compliancePayableRate,
        qaComplete,
        commissionIneligible
      ),
      complianceAdjustedMtdCommission: Number(row.compliance_adjusted_mtd_commission ?? row.mtd_commission),
      complianceAdjustedProjectedCommission: Number(
        row.compliance_adjusted_projected_commission ?? row.projected_commission
      ),
      projectedTotalSalesPoints: Number(row.projected_total_sales_points),
      projectedDpp: Number(row.projected_dpp),
      projectedGwpPayablePerPoint: Number(row.projected_gwp_payable_per_point),
      projectedConversionMultiplier: Number(row.projected_conversion_multiplier),
      projectedCommission: Number(row.projected_commission),
      position: 0,
    };
  });
}
