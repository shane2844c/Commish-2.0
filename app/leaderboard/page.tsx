import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import LeaderboardTable from "@/components/LeaderboardTable";
import { fetchLeaderboardPerformance } from "@/lib/performance/queries";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear, type LeaderboardRow, type Profile } from "@/lib/types";

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
  const performanceRows = await fetchLeaderboardPerformance(supabase, month, year);
  const userIds = performanceRows.map((row) => row.userId);

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
      const userProfile = profileMap.get(row.userId);
      return {
        userId: row.userId,
        name: userProfile?.full_name || userProfile?.email || "Unknown",
        mtdCommission: row.mtdCommission,
        projectedCommission: row.projectedCommission,
        mtdTotalSalesPoints: row.mtdTotalSalesPoints,
        mtdDpp: row.mtdDpp,
        averageGwp: row.averageGwp,
        percentToTargetConversion: row.percentToTargetConversion,
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
