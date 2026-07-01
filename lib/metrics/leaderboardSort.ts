import type { LeaderboardRow } from "@/lib/types";

export function rankLeaderboardRows(rows: LeaderboardRow[]): LeaderboardRow[] {
  const sortedRows = [...rows].sort((a, b) => {
    return (
      Number(b.complianceAdjustedMtdCommission || 0) - Number(a.complianceAdjustedMtdCommission || 0) ||
      Number(b.mtdCommission || 0) - Number(a.mtdCommission || 0) ||
      Number(b.complianceAdjustedProjectedCommission || 0) -
        Number(a.complianceAdjustedProjectedCommission || 0) ||
      Number(b.mtdTotalSalesPoints || 0) - Number(a.mtdTotalSalesPoints || 0) ||
      Number(b.percentToTargetConversion || 0) - Number(a.percentToTargetConversion || 0)
    );
  });

  return sortedRows.map((row, index) => ({
    ...row,
    position: index + 1,
  }));
}
