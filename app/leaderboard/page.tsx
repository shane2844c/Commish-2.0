import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import LeaderboardTable from "@/components/LeaderboardTable";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentMonthYear,
  type LeaderboardRow,
  type Profile,
} from "@/lib/types";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { month, year } = getCurrentMonthYear();

  const { data: performances } = await supabase
    .from("v_consultant_performance")
    .select("*")
    .eq("month", month)
    .eq("year", year);

  const performanceRows = performances ?? [];
  const userIds = performanceRows.map((row) => row.user_id);

  let profiles: Profile[] = [];

  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .in("id", userIds);

    profiles = profileRows ?? [];
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const leaderboardRows: LeaderboardRow[] = performanceRows
    .map((row) => {
      const userProfile = profileMap.get(row.user_id);

      return {
        userId: row.user_id,
        name: userProfile?.full_name || userProfile?.email || "Unknown",
        mtdCommission: Number(row.mtd_commission ?? 0),
        projectedCommission: Number(row.projected_commission ?? 0),
        mtdTotalSalesPoints: Number(row.mtd_total_sales_points ?? 0),
        mtdDpp: Number(row.mtd_dpp ?? 0),
        averageGwp: Number(row.average_gwp ?? 0),
        percentToTargetConversion: Number(row.percent_to_target_conversion ?? 0),
        rank: 0,
      };
    })
    .sort((a, b) => b.mtdCommission - a.mtdCommission)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const monthLabel = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardShell userName={profile?.full_name} activeItem="leaderboard">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-[var(--foreground)]">Leaderboard</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Ranked by MTD commission — {monthLabel}
        </p>
      </div>
      <LeaderboardTable rows={leaderboardRows} />
    </DashboardShell>
  );
}
