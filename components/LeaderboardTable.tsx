import type { LeaderboardRow } from "@/lib/types";
import {
  formatCurrency,
  formatCurrencyPerPoint,
  formatNumber,
  formatPercent,
} from "@/lib/calculations";

type LeaderboardTableProps = {
  rows: LeaderboardRow[];
  currentUserId: string;
};

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

const cellClass =
  "relative z-10 whitespace-nowrap px-3 py-3 text-sm text-[var(--foreground)]";

const headerClass =
  "px-3 py-3 text-xs font-medium uppercase tracking-wider text-[var(--brand)]";

const stickyHeaderClass = `${headerClass} sticky left-0 z-30 bg-[#f6f9ff]`;
const stickyHeaderClassSecond = `${headerClass} sticky left-[4.5rem] z-30 bg-[#f6f9ff] min-w-[10rem]`;

const stickyCellClass = `${cellClass} sticky left-0 z-20 bg-inherit`;
const stickyCellClassSecond = `${cellClass} sticky left-[4.5rem] z-20 bg-inherit min-w-[10rem]`;

type ColumnDef = {
  key: string;
  label: string;
  align: "left" | "right";
  sticky?: boolean;
  render: (row: LeaderboardRow) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

const COLUMNS: ColumnDef[] = [
  {
    key: "position",
    label: "Position",
    align: "left",
    sticky: true,
    headerClassName: stickyHeaderClass,
    cellClassName: stickyCellClass,
    render: (row) => (
      <>
        {row.position === 1 && (
          <div className="pointer-events-none absolute inset-0 z-0">
            <span className="gold-sparkle absolute left-3 top-2 text-base text-yellow-400">✦</span>
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
      </>
    ),
  },
  {
    key: "consultant",
    label: "Consultant",
    align: "left",
    sticky: true,
    headerClassName: stickyHeaderClassSecond,
    cellClassName: stickyCellClassSecond,
    render: (row) => row.name,
  },
  {
    key: "mtdTotalSalesPoints",
    label: "MTD Sales Points",
    align: "right",
    render: (row) => formatNumber(row.mtdTotalSalesPoints),
  },
  {
    key: "pointsTarget",
    label: "Points Target",
    align: "right",
    render: (row) => formatNumber(row.pointsTarget),
  },
  {
    key: "mtdConversionRate",
    label: "MTD Conversion Rate",
    align: "right",
    render: (row) => formatPercent(row.mtdConversionRate),
  },
  {
    key: "mtdTargetConversion",
    label: "MTD Target Conversion",
    align: "right",
    render: (row) => formatPercent(row.mtdTargetConversion),
  },
  {
    key: "percentToTargetConversion",
    label: "% to Con Target",
    align: "right",
    render: (row) => formatPercent(row.percentToTargetConversion),
  },
  {
    key: "mtdConversionMultiplier",
    label: "MTD Conversion Multiplier",
    align: "right",
    render: (row) => formatNumber(row.mtdConversionMultiplier, 2),
  },
  {
    key: "averageGwp",
    label: "Avg GWP",
    align: "right",
    render: (row) => formatCurrency(row.averageGwp),
  },
  {
    key: "gwpAcceleratorPerPoint",
    label: "GWP Accelerator",
    align: "right",
    render: (row) => formatCurrencyPerPoint(row.gwpAcceleratorPerPoint),
  },
  {
    key: "mtdDpp",
    label: "MTD DPP",
    align: "right",
    render: (row) => formatCurrencyPerPoint(row.mtdDpp),
  },
  {
    key: "complianceAdjustedMtdCommission",
    label: "MTD Commission",
    align: "right",
    render: (row) => (
      <span className="font-semibold text-[var(--brand)]">
        {formatCurrency(row.complianceAdjustedMtdCommission)}
      </span>
    ),
  },
  {
    key: "projectedTotalSalesPoints",
    label: "Projected Total Sales Points",
    align: "right",
    render: (row) => formatNumber(row.projectedTotalSalesPoints),
  },
  {
    key: "projectedDpp",
    label: "Projected DPP",
    align: "right",
    render: (row) => formatCurrencyPerPoint(row.projectedDpp),
  },
  {
    key: "complianceAdjustedProjectedCommission",
    label: "Projected Commission",
    align: "right",
    render: (row) => (
      <span className="font-semibold text-[var(--brand)]">
        {formatCurrency(row.complianceAdjustedProjectedCommission)}
      </span>
    ),
  },
  {
    key: "projectedConversionMultiplier",
    label: "Projected Conversion Multiplier",
    align: "right",
    render: (row) => formatNumber(row.projectedConversionMultiplier, 2),
  },
];

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
        <table className="min-w-max w-full divide-y divide-[var(--border)]">
          <thead className="bg-[#f6f9ff]">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={`${column.headerClassName ?? headerClass} ${
                    column.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] bg-white">
            {rows.map((row) => {
              const isCurrentUser = row.userId === currentUserId;

              return (
                <tr key={row.userId} className={rowClassName(row, currentUserId)}>
                  {COLUMNS.map((column) => {
                    const isConsultant = column.key === "consultant";
                    const isPosition = column.key === "position";

                    return (
                      <td
                        key={column.key}
                        className={`${column.cellClassName ?? cellClass} ${
                          column.align === "right" ? "text-right" : "text-left"
                        } ${isPosition ? "relative overflow-hidden font-medium" : ""}`}
                      >
                        {isConsultant ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                row.position <= 3 ? "font-semibold text-[var(--foreground)]" : ""
                              }
                            >
                              {column.render(row)}
                            </span>
                            {isCurrentUser && (
                              <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                You
                              </span>
                            )}
                          </div>
                        ) : (
                          column.render(row)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
