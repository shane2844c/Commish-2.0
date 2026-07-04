import type { SupabaseClient } from "@supabase/supabase-js";
import { isCallbackContactType } from "@/lib/contactTypes/callback";
import { calculateCounts } from "@/lib/dailyContacts/counts";
import type { ContactTypeRow, DailyContactEntryRow } from "@/lib/types";

/**
 * Recalculates stored contacts_count / converted_sales_count on daily entries
 * so legacy rows saved before callback rules are corrected automatically.
 */
export async function backfillDailyContactEntryCounts(
  supabase: SupabaseClient,
  consultantMonthId: string,
  contactTypes: ContactTypeRow[]
): Promise<{ updated: number; error?: string }> {
  const { data, error } = await supabase
    .from("daily_contact_entries")
    .select("id, contact_type_key, disposition_key, contacts_count, converted_sales_count")
    .eq("consultant_month_id", consultantMonthId);

  if (error) {
    return { updated: 0, error: error.message };
  }

  const entries = (data ?? []) as Pick<
    DailyContactEntryRow,
    "id" | "contact_type_key" | "disposition_key" | "contacts_count" | "converted_sales_count"
  >[];

  let updated = 0;

  for (const entry of entries) {
    const isCallback = isCallbackContactType(entry.contact_type_key, contactTypes);
    const { contacts_count, converted_sales_count } = calculateCounts(
      entry.contact_type_key,
      entry.disposition_key,
      { isCallback }
    );

    if (
      contacts_count === Number(entry.contacts_count) &&
      converted_sales_count === Number(entry.converted_sales_count)
    ) {
      continue;
    }

    const { error: updateError } = await supabase
      .from("daily_contact_entries")
      .update({ contacts_count, converted_sales_count })
      .eq("id", entry.id);

    if (updateError) {
      return { updated, error: updateError.message };
    }

    updated += 1;
  }

  return { updated };
}
