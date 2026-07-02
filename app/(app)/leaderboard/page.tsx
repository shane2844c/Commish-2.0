import { AppPage } from "@/components/app";
import LeaderboardClient from "@/components/LeaderboardClient";
import { requireAppUser } from "@/lib/app/session";
import { fetchLeaderboardRows } from "@/lib/metrics/leaderboardQueries";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear } from "@/lib/types";

type LeaderboardPageProps = {
  searchParams: Promise<{ month?: string; year?: string }>;
};

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const supabase = await createClient();
  const user = await requireAppUser(supabase);

  const params = await searchParams;
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();

  const month = Number(params.month || currentMonth);
  const year = Number(params.year || currentYear);

  const leaderboardRows = await fetchLeaderboardRows(supabase, month, year);

  const monthLabel = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <AppPage
      title="Leaderboard"
      description="Ranked by final payable MTD commission after QA compliance. Supporting metrics explain each consultant's performance."
    >
      <LeaderboardClient
        rows={leaderboardRows}
        month={month}
        year={year}
        monthLabel={monthLabel}
        currentUserId={user.id}
      />
    </AppPage>
  );
}
