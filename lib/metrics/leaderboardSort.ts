import type { LeaderboardRow } from "@/lib/types";

export function rankLeaderboardRows(rows: LeaderboardRow[]): LeaderboardRow[] {
  const sortedRows = [...rows].sort((a, b) => {
    return (
      Number(b.mtdCommission || 0) - Number(a.mtdCommission || 0) ||
      Number(b.projectedCommission || 0) - Number(a.projectedCommission || 0) ||
      Number(b.mtdTotalSalesPoints || 0) - Number(a.mtdTotalSalesPoints || 0) ||
      Number(b.percentToTargetConversion || 0) - Number(a.percentToTargetConversion || 0) ||
      Number(b.averageGwp || 0) - Number(a.averageGwp || 0)
    );
  });

  return sortedRows.map((row, index) => ({
    ...row,
    position: index + 1,
  }));
}
