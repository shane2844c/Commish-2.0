import type { LeaderboardRow } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/calculations";

type LeaderboardTableProps = {
  rows: LeaderboardRow[];
  currentUserId: string;
};

function formatPerPoint(value: number): string {
  return `$${formatCurrency(value)} / point`;
}

function positionBadge(position: number): string | null {
  if (position === 1) return "#1";
  if (position === 2) return "#2";
  if (position === 3) return "#3";
  return null;
}

function rowClassName(row: LeaderboardRow, currentUserId: string): string {
  const isCurrentUser = row.userId === currentUserId;
  const classes = ["transition-colors"];

  if (row.position === 1) {
    classes.push("bg-[#fff8e6] hover:bg-[#fff3d4] ring-1 ring-inset ring-[#f0c040]/40");
  } else if (row.position <= 3) {
    classes.push("bg-[#f7fbff] hover:bg-[#eef6ff]");
  } else {
    classes.push("hover:bg-[#f8fbff]");
  }

  if (isCurrentUser) {
    classes.push("ring-2 ring-inset ring-[var(--brand)] bg-[#eef6ff]/80");
  }

  return classes.join(" ");
}

function formatQaAverage(value: number): string {
  if (value <= 0) {
    return "—";
  }
  return `${value.toFixed(1)}%`;
}

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
              const badge = positionBadge(row.position);
              const isCurrentUser = row.userId === currentUserId;

              return (
                <tr key={row.userId} className={rowClassName(row, currentUserId)}>
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-[var(--foreground)]">
                    <div className="flex items-center gap-2">
                      <span className={row.position === 1 ? "text-base font-bold text-[#b8860b]" : ""}>
                        {row.position}
                      </span>
                      {badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            row.position === 1
                              ? "bg-[#f0c040] text-[#5c4a00]"
                              : "bg-[var(--brand-soft)] text-[var(--brand)]"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-[var(--foreground)]">
                    <div className="flex items-center gap-2">
                      <span className={row.position === 1 ? "font-semibold" : ""}>{row.name}</span>
                      {isCurrentUser && (
                        <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatCurrency(row.mtdCommission)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatQaAverage(row.qaAverage)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {row.compliancePayableRateLabel}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-semibold text-[var(--brand)]">
                    {formatCurrency(row.complianceAdjustedMtdCommission)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-semibold text-[var(--brand)]">
                    {formatCurrency(row.complianceAdjustedProjectedCommission)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatCurrency(row.projectedCommission)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatCurrency(row.mtdTotalSalesPoints)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatCurrency(row.pointsTarget)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatPercent(row.mtdConversionRate)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatPercent(row.mtdTargetConversion)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatPercent(row.percentToTargetConversion)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatNumber(row.mtdConversionMultiplier, 2)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatCurrency(row.averageGwp)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatPerPoint(row.gwpAcceleratorPerPoint)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatPerPoint(row.mtdDpp)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatCurrency(row.projectedTotalSalesPoints)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
                    {formatPerPoint(row.projectedDpp)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-[var(--foreground)]">
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
