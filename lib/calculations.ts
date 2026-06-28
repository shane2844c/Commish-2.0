export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatCurrency(value: number): string {
  return value.toFixed(2);
}

export function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}
