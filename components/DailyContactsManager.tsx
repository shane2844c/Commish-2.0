"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  calculateDailyConversionPerformance,
  filterEntriesForLog,
  logDailyConversionPerformance,
  summarizeContactLog,
  type ContactLogFilter,
} from "@/lib/dailyContacts/dailyConversion";
import type { ContactDispositionOption } from "@/lib/dailyContacts/dispositions";
import type { ContactTypeOption } from "@/lib/contactTypes/helpers";
import { CALLBACK_CONTACT_TYPE_HELPER, isCallbackContactType } from "@/lib/contactTypes/callback";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/calculations";
import type { PerformanceActionState } from "@/lib/types";

type DailyContactEntry = {
  id: string;
  entryDate: string;
  createdAt: string;
  contactTypeKey: string;
  contactTypeName: string;
  dispositionKey: string;
  dispositionName: string;
  pointsPerSale: number;
  contactsCount: number;
  convertedSalesCount: number;
  totalGwp: number;
  notes: string | null;
  salesPoints: number;
};

type DailyContactsManagerProps = {
  consultantMonthId: string;
  entries: DailyContactEntry[];
  contactTypes: ContactTypeOption[];
  dispositions: ContactDispositionOption[];
};

const LOG_FILTER_OPTIONS: { value: ContactLogFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "selected_date", label: "Selected Date" },
  { value: "this_month", label: "This Month" },
  { value: "all", label: "All" },
];

export default function DailyContactsManager({
  consultantMonthId,
  entries,
  contactTypes,
  dispositions,
}: DailyContactsManagerProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const defaultDispositionKey = dispositions[0]?.disposition_key ?? "quote_no_sale";

  const [saveState, setSaveState] = useState<PerformanceActionState>({});
  const [deleteState, setDeleteState] = useState<PerformanceActionState>({});
  const [savePending, setSavePending] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [visibleEntries, setVisibleEntries] = useState(entries);
  const [editEntry, setEditEntry] = useState<DailyContactEntry | null>(null);
  const [logFilter, setLogFilter] = useState<ContactLogFilter>("today");

  useEffect(() => {
    setVisibleEntries(entries);
  }, [entries]);

  const [entryDate, setEntryDate] = useState(today);
  const [contactTypeKey, setContactTypeKey] = useState("outbound");
  const [dispositionKey, setDispositionKey] = useState(defaultDispositionKey);
  const [totalGwp, setTotalGwp] = useState(0);
  const [notes, setNotes] = useState("");

  const requiresGwp = dispositionKey === "converted_to_sale";
  const selectedContactType = contactTypes.find((item) => item.type_key === contactTypeKey);
  const isCallbackType = Boolean(selectedContactType?.is_callback);

  const todayPerformance = useMemo(
    () => calculateDailyConversionPerformance(visibleEntries, contactTypes, today),
    [visibleEntries, contactTypes, today]
  );

  const filteredLogEntries = useMemo(
    () =>
      filterEntriesForLog(visibleEntries, logFilter, {
        today,
        selectedDate: entryDate,
      }),
    [visibleEntries, logFilter, today, entryDate]
  );

  const logSummary = useMemo(
    () => summarizeContactLog(filteredLogEntries, contactTypes),
    [filteredLogEntries, contactTypes]
  );

  useEffect(() => {
    logDailyConversionPerformance(todayPerformance);
  }, [todayPerformance]);

  useEffect(() => {
    if (editEntry) {
      setEntryDate(editEntry.entryDate);
      setContactTypeKey(editEntry.contactTypeKey);
      setDispositionKey(editEntry.dispositionKey);
      setTotalGwp(editEntry.totalGwp);
      setNotes(editEntry.notes ?? "");
    }
  }, [editEntry]);

  function handleDispositionChange(nextDispositionKey: string) {
    setDispositionKey(nextDispositionKey);
    if (nextDispositionKey !== "converted_to_sale") {
      setTotalGwp(0);
    }
  }

  function resetFormAfterSave() {
    setEditEntry(null);
    setDispositionKey(defaultDispositionKey);
    setTotalGwp(0);
    setNotes("");
  }

  function cancelEdit() {
    setEditEntry(null);
    setEntryDate(today);
    setContactTypeKey("outbound");
    setDispositionKey(defaultDispositionKey);
    setTotalGwp(0);
    setNotes("");
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    void submitSave(formData);
  }

  async function submitSave(formData: FormData) {
    setSavePending(true);
    setSaveState({});
    setDeleteState({});

    try {
      const response = await fetch("/api/daily-contacts", {
        method: "POST",
        body: formData,
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      let result: PerformanceActionState;
      try {
        result = (await response.json()) as PerformanceActionState;
      } catch {
        setSaveState({ error: "Invalid server response. Please try again." });
        return;
      }

      setSaveState(result);

      if (response.ok && result.success) {
        resetFormAfterSave();
        router.refresh();
      }
    } catch {
      setSaveState({ error: "Failed to save contact. Please try again." });
    } finally {
      setSavePending(false);
    }
  }

  async function handleDelete(entryId: string) {
    if (!window.confirm("Delete this contact entry? Dashboard figures will update after removal.")) {
      return;
    }

    setDeletingEntryId(entryId);
    setDeleteState({});
    setSaveState({});

    try {
      const formData = new FormData();
      formData.set("entryId", entryId);
      const response = await fetch("/api/daily-contacts/delete", {
        method: "POST",
        body: formData,
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      let result: PerformanceActionState;
      try {
        result = (await response.json()) as PerformanceActionState;
      } catch {
        setDeleteState({ error: "Invalid server response. Please try again." });
        return;
      }

      if (!response.ok || result.error) {
        setDeleteState({ error: result.error ?? "Failed to delete contact. Please try again." });
        return;
      }

      setDeleteState({ success: true });
      setVisibleEntries((current) => current.filter((entry) => entry.id !== entryId));
      if (editEntry?.id === entryId) {
        cancelEdit();
      }
      router.refresh();
    } catch {
      setDeleteState({ error: "Failed to delete contact. Please try again." });
    } finally {
      setDeletingEntryId(null);
    }
  }

  const logFilterLabel =
    logFilter === "today"
      ? today
      : logFilter === "selected_date"
        ? entryDate
        : logFilter === "this_month"
          ? today.slice(0, 7)
          : "all dates";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Today&apos;s performance ({today})
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Cards always reflect calendar today. Separate from Dashboard MTD metrics.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <SummaryCard
          label="Contact Count Today"
          value={todayPerformance.dailyContacts.toString()}
          helperText="Callbacks are shown in the log but excluded from contact count."
        />
        <SummaryCard
          label="Converted Sales Today"
          value={todayPerformance.dailyConvertedSales.toString()}
        />
        <SummaryCard label="Sales Points Today" value={formatNumber(todayPerformance.salesPointsToday)} />
        <SummaryCard label="Average GWP Today" value={formatCurrency(todayPerformance.averageGwpToday)} />
        <SummaryCard
          label="Daily Actual Conversion"
          value={formatPercent(todayPerformance.dailyActualConversion)}
        />
        <SummaryCard
          label="Daily Target Conversion"
          value={formatPercent(todayPerformance.dailyTargetConversion)}
        />
        <SummaryCard
          label="Daily % To Target Conversion"
          value={formatPercent(todayPerformance.dailyPercentToTargetConversion)}
          highlight
        />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
        <h3 className="text-xl font-semibold text-[var(--foreground)]">Add Contact Entry</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Each submission logs one entry. Contact and sale counts are calculated from the disposition.
        </p>

        {(saveState.error || deleteState.error) && (
          <div className="mt-4 rounded-lg border border-red-200 bg-[var(--error-soft)] px-4 py-3 text-sm text-red-700">
            {saveState.error ?? deleteState.error}
          </div>
        )}

        {(saveState.success || deleteState.success) && (
          <div className="mt-4 rounded-lg border border-green-200 bg-[var(--success-soft)] px-4 py-3 text-sm text-green-700">
            {deleteState.success ? "Entry deleted." : "Saved successfully."}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <input type="hidden" name="consultantMonthId" value={consultantMonthId} />
          <input type="hidden" name="editEntryId" value={editEntry?.id ?? ""} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Date">
              <input
                name="entryDate"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className={inputClass}
                required
              />
            </FormField>

            <FormField label="Contact type">
              <select
                name="contactTypeKey"
                value={contactTypeKey}
                onChange={(e) => setContactTypeKey(e.target.value)}
                className={inputClass}
                required
              >
                {contactTypes.map((item) => (
                  <option key={item.type_key} value={item.type_key}>
                    {`${item.display_name} — ${item.points_per_sale} pts — ${(item.expected_conversion_rate * 100).toFixed(0)}%`}
                  </option>
                ))}
              </select>
              {isCallbackType ? (
                <p className="mt-2 text-xs font-normal text-[var(--brand)]">{CALLBACK_CONTACT_TYPE_HELPER}</p>
              ) : null}
            </FormField>

            <FormField label="Disposition">
              <select
                name="dispositionKey"
                value={dispositionKey}
                onChange={(e) => handleDispositionChange(e.target.value)}
                className={inputClass}
                required
              >
                {dispositions.map((item) => (
                  <option key={item.disposition_key} value={item.disposition_key}>
                    {item.display_name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs font-normal text-[var(--muted)]">
                {isCallbackType
                  ? "Callback dispos count sales/points but do not add to contact totals."
                  : "No answer, disgruntled, wrong number, and message bank only count as contacts for CLI contact types."}
              </p>
            </FormField>

            <FormField label="Total GWP">
              <input
                name="totalGwp"
                type="number"
                step="0.01"
                min="0"
                value={requiresGwp ? totalGwp : 0}
                onChange={(e) => setTotalGwp(Number(e.target.value || 0))}
                disabled={!requiresGwp}
                required={requiresGwp}
                className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#f3f6fb] disabled:text-[var(--muted)]`}
              />
            </FormField>

            <FormField label="Notes (optional)">
              <input
                name="notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass}
              />
            </FormField>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savePending}
              className="rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
            >
              {savePending ? "Saving..." : editEntry ? "Update Entry" : "Add Entry"}
            </button>
            {editEntry && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)]"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Contact Log</h3>
            <div className="flex flex-wrap gap-2">
              {LOG_FILTER_OPTIONS.map((option) => {
                const isActive = logFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLogFilter(option.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? "bg-[var(--brand)] text-white"
                        : "border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Showing {logSummary.entryCount} {logSummary.entryCount === 1 ? "entry" : "entries"}.{" "}
            {logSummary.contactCount} count as contacts. {logSummary.callbackEntryCount}{" "}
            {logSummary.callbackEntryCount === 1 ? "is a callback entry" : "are callback entries"}.
            {logFilter !== "all" ? (
              <span className="ml-1 text-[var(--foreground)]">({logFilterLabel})</span>
            ) : null}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[#f6f9ff]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Contact type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Disposition</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Points</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Total GWP</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredLogEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                    No entries for this filter.
                  </td>
                </tr>
              ) : (
                filteredLogEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#f8fbff]">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">{entry.entryDate}</td>
                    <td className="px-4 py-3 text-sm">
                      {entry.contactTypeName}
                      {isCallbackContactType(entry.contactTypeKey, contactTypes) ? (
                        <span className="ml-2 rounded bg-[var(--brand-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]">
                          Callback
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm">{entry.dispositionName}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatNumber(entry.salesPoints)}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatCurrency(entry.totalGwp)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditEntry(entry)}
                          className="rounded-md border border-[var(--brand)] px-2.5 py-1 text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingEntryId === entry.id}
                          onClick={() => {
                            void handleDelete(entry.id);
                          }}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingEntryId === entry.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helperText,
  highlight = false,
}: {
  label: string;
  value: string;
  helperText?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-4 ${
        highlight ? "border-blue-200 bg-[#f7fbff]" : "border-[var(--border)]"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{value}</p>
      {helperText ? <p className="mt-2 text-xs text-[var(--muted)]">{helperText}</p> : null}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-[var(--muted)]">
      {label}
      {children}
    </label>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[#dbe9fb]";
