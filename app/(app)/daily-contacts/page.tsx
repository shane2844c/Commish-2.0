import { AppEmptyState, AppPage } from "@/components/app";
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
import { APP_ROUTES } from "@/lib/app/routes";
import { fetchContactTypes } from "@/lib/performance/queries";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear, type DailyContactEntryRow } from "@/lib/types";

export default async function DailyContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthenticated");
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
      <AppPage title="Daily Contacts" description="Log daily contact entries from this page.">
        <AppEmptyState
          title="Manual Input required"
          message="Set up your Manual Input baseline first before logging daily contacts."
          actionHref={APP_ROUTES.manualInput}
          actionLabel="Go to Manual Input"
        />
      </AppPage>
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
    <AppPage
      title="Daily Contacts"
      description="Add daily entries. Dashboard metrics update from backend calculations only."
    >
      <DailyContactsManager
        consultantMonthId={consultantMonth.id}
        entries={entries}
        contactTypes={contactTypes}
        dispositions={dispositions}
      />
    </AppPage>
  );
}
