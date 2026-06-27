import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import LeaderboardTable from "@/components/LeaderboardTable";
import { calculateDashboardStats } from "@/lib/calculations";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentMonthYear,
  rowToDailyEntry,
  rowToMonthlySetup,
  type LeaderboardRow,
  type MonthlySetupRow,
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

  const { data: setups } = await supabase
    .from("monthly_setups")
    .select("*")
    .eq("month", month)
    .eq("year", year);

  const setupList: MonthlySetupRow[] = setups ?? [];

  const setupIds = setupList.map((setup) => setup.id);
  const userIds = setupList.map((setup) => setup.user_id);

  let allEntries: { monthly_setup_id: string; entry_date: string; contacts: number; sales: number; gwp_total: number; sales_points: number }[] = [];

  if (setupIds.length > 0) {
    const { data: entries } = await supabase
      .from("daily_entries")
      .select("monthly_setup_id, entry_date, contacts, sales, gwp_total, sales_points")
      .in("monthly_setup_id", setupIds);

    allEntries = entries ?? [];
  }

  let profiles: Profile[] = [];

  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .in("id", userIds);

    profiles = profileRows ?? [];
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const leaderboardRows: LeaderboardRow[] = setupList
    .map((setup) => {
      const setupEntries = allEntries
        .filter((entry) => entry.monthly_setup_id === setup.id)
        .map((entry) =>
          rowToDailyEntry({
            id: "",
            user_id: setup.user_id,
            monthly_setup_id: setup.id,
            entry_date: entry.entry_date,
            contacts: entry.contacts,
            sales: entry.sales,
            gwp_total: entry.gwp_total,
            sales_points: entry.sales_points,
            notes: null,
            created_at: "",
          })
        );

      const stats = calculateDashboardStats(rowToMonthlySetup(setup), setupEntries);
      const userProfile = profileMap.get(setup.user_id);

      return {
        userId: setup.user_id,
        name: userProfile?.full_name || userProfile?.email || "Unknown",
        mtdSales: stats.mtdSales,
        adjustedTarget: stats.adjustedTarget,
        percentageToTarget: stats.percentageToTarget,
        averageGwp: stats.averageGwp,
        salesNeeded: stats.salesNeeded,
        salesNeededPerRemainingDay: stats.salesNeededPerRemainingDay,
        rank: 0,
      };
    })
    .sort((a, b) => b.percentageToTarget - a.percentageToTarget)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const monthLabel = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardShell userName={profile?.full_name}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">Leaderboard</h2>
        <p className="mt-1 text-sm text-gray-500">
          Ranked by % to adjusted target — {monthLabel}
        </p>
      </div>
      <LeaderboardTable rows={leaderboardRows} />
    </DashboardShell>
  );
}
