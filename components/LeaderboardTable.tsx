import type { LeaderboardRow } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/calculations";

type LeaderboardTableProps = {
  rows: LeaderboardRow[];
  currentUserId: string;
};

function formatPerPoint(value: number): string {
  return `$${formatCurrency(value)} / point`;
}

export function getLeaderboardRowClass(position: number): string {
  if (position === 1) {
    return "relative overflow-hidden border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 via-amber-100 to-yellow-50 shadow-[0_0_30px_rgba(245,158,11,0.45)]";
  }

  if (position === 2) {
    return "border border-slate-300 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50";
  }

  if (position === 3) {
    return "border border-orange-300 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100";
  }

  return "border border-slate-200 bg-white";
}

function positionRankIcon(position: number): string | null {
  if (position === 1) return "🏆";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return null;
}

function positionRankLabelClass(position: number): string {
  if (position === 1) return "text-sm font-bold text-yellow-900";
  if (position === 2) return "text-sm font-semibold text-slate-800";
  if (position === 3) return "text-sm font-semibold text-orange-950";
  return "text-sm font-medium text-[var(--foreground)]";
}

function rowClassName(row: LeaderboardRow, currentUserId: string): string {
  const isCurrentUser = row.userId === currentUserId;
  const classes = [getLeaderboardRowClass(row.position), "transition-colors"];

  if (isCurrentUser && row.position > 3) {
    classes.push("ring-2 ring-inset ring-[var(--brand)] hover:bg-[#f8fbff]");
  } else if (isCurrentUser && row.position <= 3) {
    classes.push("outline outline-2 outline-offset-[-2px] outline-[var(--brand)]/35");
  } else if (row.position > 3) {
    classes.push("hover:bg-[#f8fbff]");
  }

  return classes.join(" ");
}

function formatQaAverage(value: number): string {
  if (value <= 0) {
    return "—";
  }
  return `${value.toFixed(1)}%`;
}

const cellClass =
  "relative z-10 whitespace-nowrap px-3 py-3 text-sm text-[var(--foreground)]";

export default function LeaderboardTable({ rows, currentUserId }: LeaderboardTableProps) {
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
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Position
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Consultant
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                MTD Commission Before QA
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                QA Average
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Compliance Payable Rate
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Final Payable MTD Commission
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Projected Final Commission
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Projected Commission Before QA
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                MTD Total Sales Points
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Points Target
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                MTD Conversion Rate
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                MTD Target Conversion
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                % to Target Conversion
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                MTD Conversion Multiplier
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Average GWP
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                GWP Accelerator
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                MTD DPP
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Projected Total Sales Points
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Projected DPP
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                Projected Conversion Multiplier
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] bg-white">
            {rows.map((row) => {
              const isCurrentUser = row.userId === currentUserId;

              return (
                <tr key={row.userId} className={rowClassName(row, currentUserId)}>
                  <td className={`${cellClass} relative overflow-hidden font-medium`}>
                    {row.position === 1 && (
                      <div className="pointer-events-none absolute inset-0 z-0">
                        <span className="gold-sparkle absolute left-3 top-2 text-base text-yellow-400">
                          ✦
                        </span>
                        <span
                          className="gold-sparkle absolute right-4 top-3 text-base text-amber-400"
                          style={{ animationDelay: "0.35s" }}
                        >
                          ✨
                        </span>
                        <span
                          className="gold-sparkle absolute bottom-2 left-10 text-sm text-yellow-300"
                          style={{ animationDelay: "0.7s" }}
                        >
                          ✧
                        </span>
                        <span
                          className="gold-sparkle absolute bottom-3 right-16 text-sm text-amber-300"
                          style={{ animationDelay: "1.05s" }}
                        >
                          ✦
                        </span>
                      </div>
                    )}
                    <div className="relative z-10 flex items-center gap-2">
                      {positionRankIcon(row.position) && (
                        <span aria-hidden="true">{positionRankIcon(row.position)}</span>
                      )}
                      <span className={positionRankLabelClass(row.position)}>#{row.position}</span>
                    </div>
                  </td>
                  <td className={cellClass}>
                    <div className="flex items-center gap-2">
                      <span className={row.position <= 3 ? "font-semibold text-[var(--foreground)]" : ""}>
                        {row.name}
                      </span>
                      {isCurrentUser && (
                        <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`${cellClass} text-right`}>{formatCurrency(row.mtdCommission)}</td>
                  <td className={`${cellClass} text-right`}>{formatQaAverage(row.qaAverage)}</td>
                  <td className={`${cellClass} text-right`}>{row.compliancePayableRateLabel}</td>
                  <td className={`${cellClass} text-right font-semibold text-[var(--brand)]`}>
                    {formatCurrency(row.complianceAdjustedMtdCommission)}
                  </td>
                  <td className={`${cellClass} text-right font-semibold text-[var(--brand)]`}>
                    {formatCurrency(row.complianceAdjustedProjectedCommission)}
                  </td>
                  <td className={`${cellClass} text-right`}>{formatCurrency(row.projectedCommission)}</td>
                  <td className={`${cellClass} text-right`}>{formatCurrency(row.mtdTotalSalesPoints)}</td>
                  <td className={`${cellClass} text-right`}>{formatCurrency(row.pointsTarget)}</td>
                  <td className={`${cellClass} text-right`}>{formatPercent(row.mtdConversionRate)}</td>
                  <td className={`${cellClass} text-right`}>{formatPercent(row.mtdTargetConversion)}</td>
                  <td className={`${cellClass} text-right`}>{formatPercent(row.percentToTargetConversion)}</td>
                  <td className={`${cellClass} text-right`}>
                    {formatNumber(row.mtdConversionMultiplier, 2)}
                  </td>
                  <td className={`${cellClass} text-right`}>{formatCurrency(row.averageGwp)}</td>
                  <td className={`${cellClass} text-right`}>{formatPerPoint(row.gwpAcceleratorPerPoint)}</td>
                  <td className={`${cellClass} text-right`}>{formatPerPoint(row.mtdDpp)}</td>
                  <td className={`${cellClass} text-right`}>
                    {formatCurrency(row.projectedTotalSalesPoints)}
                  </td>
                  <td className={`${cellClass} text-right`}>{formatPerPoint(row.projectedDpp)}</td>
                  <td className={`${cellClass} text-right`}>
                    {formatNumber(row.projectedConversionMultiplier, 2)}
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
