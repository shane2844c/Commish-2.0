import Link from "next/link";
import { redirect } from "next/navigation";
import DailyContactsManager from "@/components/DailyContactsManager";
import {
  dispositionDisplayName,
  fetchContactDispositions,
  mapContactDispositionRows,
} from "@/lib/dailyContacts/dispositions";
import {
  contactTypeDisplayName,
  contactTypePointsPerSale,
  mapContactTypeRows,
} from "@/lib/contactTypes/helpers";
import { fetchContactTypes } from "@/lib/performance/queries";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear, type DailyContactEntryRow } from "@/lib/types";

export default async function DailyContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [contactTypes, dispositionRows] = await Promise.all([
    mapContactTypeRows(await fetchContactTypes(supabase)),
    fetchContactDispositions(supabase).catch(() => []),
  ]);
  const dispositions = mapContactDispositionRows(dispositionRows);

  const { month, year } = getCurrentMonthYear();
  const { data: consultantMonth } = await supabase
    .from("consultant_months")
    .select("id")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (!consultantMonth) {
    return (
      <>
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-[var(--foreground)]">Daily Contacts</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Log daily contact entries from this page.</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-8 text-center shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
          <p className="text-sm text-[var(--muted)]">
            Set up your Manual Input baseline first before logging daily contacts.
          </p>
          <Link
            href="/setup"
            className="mt-6 inline-block rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)]"
          >
            Go to Manual Input
          </Link>
        </div>
      </>
    );
  }

  const { data: entryRows } = await supabase
    .from("daily_contact_entries")
    .select("*")
    .eq("consultant_month_id", consultantMonth.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const entries = ((entryRows ?? []) as DailyContactEntryRow[]).map((row) => {
    const convertedSalesCount = Number(row.converted_sales_count);
    const pointsPerSale = contactTypePointsPerSale(contactTypes, row.contact_type_key);
    return {
      id: row.id,
      entryDate: row.entry_date,
      createdAt: row.created_at,
      contactTypeKey: row.contact_type_key,
      contactTypeName: contactTypeDisplayName(contactTypes, row.contact_type_key),
      dispositionKey: row.disposition_key,
      dispositionName: dispositionDisplayName(dispositions, row.disposition_key),
      pointsPerSale,
      contactsCount: Number(row.contacts_count),
      convertedSalesCount,
      totalGwp: Number(row.total_gwp),
      notes: row.notes,
      salesPoints: convertedSalesCount * pointsPerSale,
    };
  });

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-[var(--foreground)]">Daily Contacts</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Add daily entries. Dashboard metrics update from backend calculations only.
        </p>
      </div>
      <DailyContactsManager
        consultantMonthId={consultantMonth.id}
        entries={entries}
        contactTypes={contactTypes}
        dispositions={dispositions}
      />
    </>
  );
}
