import LeaderboardClient from "@/components/LeaderboardClient";
import { fetchLeaderboardRows } from "@/lib/metrics/leaderboardQueries";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear } from "@/lib/types";
import { redirect } from "next/navigation";

type LeaderboardPageProps = {
  searchParams: Promise<{ month?: string; year?: string }>;
};

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-[var(--foreground)]">Leaderboard</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Ranked by current MTD commission. Supporting metrics explain each consultant&apos;s
          performance.
        </p>
      </div>
      <LeaderboardClient
        rows={leaderboardRows}
        month={month}
        year={year}
        monthLabel={monthLabel}
        currentUserId={user.id}
      />
    </>
  );
}
