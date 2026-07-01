import type { ContactTypeRow } from "@/lib/types";

/** Map DB row to UI-friendly shape while keeping type_key for payloads */
export type ContactTypeOption = {
  type_key: string;
  display_name: string;
  points_per_sale: number;
  expected_conversion_rate: number;
  sort_order: number;
};

export function mapContactTypeRows(rows: ContactTypeRow[]): ContactTypeOption[] {
  return rows.map((row) => ({
    type_key: row.type_key,
    display_name: row.display_name,
    points_per_sale: Number(row.points_per_sale),
    expected_conversion_rate: Number(row.expected_conversion_rate),
    sort_order: Number(row.sort_order),
  }));
}

export function contactTypeDisplayName(
  contactTypes: ContactTypeOption[],
  typeKey: string
): string {
  return contactTypes.find((item) => item.type_key === typeKey)?.display_name ?? typeKey;
}

export function contactTypePointsPerSale(
  contactTypes: ContactTypeOption[],
  typeKey: string
): number {
  return Number(contactTypes.find((item) => item.type_key === typeKey)?.points_per_sale ?? 0);
}
