import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactDispositionRow } from "@/lib/types";

export type ContactDispositionOption = {
  disposition_key: string;
  display_name: string;
  counts_as_contact_by_default: boolean;
  counts_as_sale: boolean;
  counts_as_contact_for_cli_only: boolean;
  requires_gwp: boolean;
  sort_order: number;
};

export async function fetchContactDispositions(
  supabase: SupabaseClient
): Promise<ContactDispositionRow[]> {
  const { data, error } = await supabase
    .from("contact_dispositions")
    .select(
      "disposition_key, display_name, counts_as_contact_by_default, counts_as_sale, counts_as_contact_for_cli_only, requires_gwp, sort_order, created_at"
    )
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ContactDispositionRow[];
}

export function mapContactDispositionRows(
  rows: ContactDispositionRow[]
): ContactDispositionOption[] {
  return rows.map((row) => ({
    disposition_key: row.disposition_key,
    display_name: row.display_name,
    counts_as_contact_by_default: Boolean(row.counts_as_contact_by_default),
    counts_as_sale: Boolean(row.counts_as_sale),
    counts_as_contact_for_cli_only: Boolean(row.counts_as_contact_for_cli_only),
    requires_gwp: Boolean(row.requires_gwp),
    sort_order: Number(row.sort_order),
  }));
}

export function dispositionDisplayName(
  dispositions: ContactDispositionOption[],
  dispositionKey: string
): string {
  return dispositions.find((item) => item.disposition_key === dispositionKey)?.display_name ?? dispositionKey;
}
