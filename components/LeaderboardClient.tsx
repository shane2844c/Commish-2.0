"use client";

import { useMemo } from "react";
import LeaderboardTable from "@/components/LeaderboardTable";
import { rankLeaderboardRows } from "@/lib/metrics/leaderboardSort";
import type { LeaderboardRow } from "@/lib/types";

type LeaderboardClientProps = {
  rows: LeaderboardRow[];
  month: number;
  year: number;
  monthLabel: string;
  currentUserId: string;
};

export default function LeaderboardClient({
  rows,
  month,
  year,
  monthLabel,
  currentUserId,
}: LeaderboardClientProps) {
  const rankedRows = useMemo(() => rankLeaderboardRows(rows), [rows]);

  return (
    <div className="space-y-6">
      <form
        method="get"
        className="flex flex-wrap items-end gap-4 rounded-xl border border-[var(--border)] bg-white p-4"
      >
        <label className="block text-sm font-semibold text-[var(--muted)]">
          Month
          <input
            type="number"
            name="month"
            min={1}
            max={12}
            defaultValue={month}
            className={filterInputClass}
          />
        </label>
        <label className="block text-sm font-semibold text-[var(--muted)]">
          Year
          <input
            type="number"
            name="year"
            min={2000}
            max={2100}
            defaultValue={year}
            className={filterInputClass}
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)]"
        >
          Apply
        </button>
      </form>

      <p className="text-sm text-[var(--muted)]">
        {rankedRows.length} consultant{rankedRows.length === 1 ? "" : "s"} ranked for {monthLabel}.
      </p>

      <LeaderboardTable rows={rankedRows} currentUserId={currentUserId} />
    </div>
  );
}

const filterInputClass =
  "mt-1 w-28 rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[#dbe9fb]";
