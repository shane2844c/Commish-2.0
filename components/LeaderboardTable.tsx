import type { LeaderboardRow } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/calculations";

type LeaderboardTableProps = {
  rows: LeaderboardRow[];
};

export default function LeaderboardTable({ rows }: LeaderboardTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white p-8 text-center shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
        <p className="text-[var(--muted)]">No leaderboard data for this month yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
      <div className="h-1 bg-[var(--brand)]" />
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)]">
          <thead className="bg-[#f6f9ff]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Name
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                MTD Commission
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Projected Commission
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Sales Points
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                MTD DPP
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Avg GWP
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                % To Conv Target
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] bg-white">
            {rows.map((row) => {
              const topPerformer = row.rank <= 3;
              return (
                <tr
                  key={row.userId}
                  className={topPerformer ? "bg-[#f7fbff] hover:bg-[#eef6ff]" : "hover:bg-[#f8fbff]"}
                >
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-[var(--foreground)]">
                  {row.rank}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--foreground)]">{row.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--foreground)]">
                  {formatCurrency(row.mtdCommission)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--foreground)]">
                  {formatCurrency(row.projectedCommission)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--foreground)]">
                  {formatCurrency(row.mtdTotalSalesPoints)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--foreground)]">
                  {formatCurrency(row.mtdDpp)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--foreground)]">
                  {formatCurrency(row.averageGwp)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-[var(--brand)]">
                  {formatPercent(row.percentToTargetConversion)}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
