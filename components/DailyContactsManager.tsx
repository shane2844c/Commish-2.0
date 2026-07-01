"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ContactTypeOption } from "@/lib/contactTypes/helpers";
import { formatCurrency } from "@/lib/calculations";
import type { PerformanceActionState } from "@/lib/types";

type DailyContactEntry = {
  id: string;
  entryDate: string;
  createdAt: string;
  contactTypeKey: string;
  contactTypeName: string;
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
  todaySummary: {
    contactsLoggedToday: number;
    convertedSalesToday: number;
    salesPointsToday: number;
    averageGwpToday: number;
  };
};

export default function DailyContactsManager({
  consultantMonthId,
  entries,
  contactTypes,
  todaySummary,
}: DailyContactsManagerProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [saveState, setSaveState] = useState<PerformanceActionState>({});
  const [deleteState, setDeleteState] = useState<PerformanceActionState>({});
  const [savePending, setSavePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [editEntry, setEditEntry] = useState<DailyContactEntry | null>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavePending(true);
    setSaveState({});

    try {
      const response = await fetch("/api/daily-contacts", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const result = (await response.json()) as PerformanceActionState;
      setSaveState(result);

      if (response.ok && result.success) {
        setEditEntry(null);
        router.refresh();
      }
    } catch {
      setSaveState({ error: "Failed to save contact. Please try again." });
    } finally {
      setSavePending(false);
    }
  }

  async function handleDelete(entryId: string) {
    setDeletePending(true);
    setDeleteState({});

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

      const result = (await response.json()) as PerformanceActionState;
      setDeleteState(result);

      if (response.ok && result.success) {
        router.refresh();
      }
    } catch {
      setDeleteState({ error: "Failed to delete contact. Please try again." });
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Contacts logged today" value={todaySummary.contactsLoggedToday.toString()} />
        <SummaryCard label="Converted sales today" value={todaySummary.convertedSalesToday.toString()} />
        <SummaryCard label="Sales points today" value={formatCurrency(todaySummary.salesPointsToday)} />
        <SummaryCard label="Average GWP today" value={formatCurrency(todaySummary.averageGwpToday)} />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
        <h3 className="text-xl font-semibold text-[var(--foreground)]">Add Contact Entry</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Save raw counts and GWP only. Dashboard metrics are calculated after fetch.
        </p>

        {(saveState.error || deleteState.error) && (
          <div className="mt-4 rounded-lg border border-red-200 bg-[var(--error-soft)] px-4 py-3 text-sm text-red-700">
            {saveState.error ?? deleteState.error}
          </div>
        )}

        {(saveState.success || deleteState.success) && (
          <div className="mt-4 rounded-lg border border-green-200 bg-[var(--success-soft)] px-4 py-3 text-sm text-green-700">
            Saved successfully.
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
                defaultValue={editEntry?.entryDate ?? today}
                className={inputClass}
                required
              />
            </FormField>

            <FormField label="Contact type">
              <select
                name="contactTypeKey"
                defaultValue={editEntry?.contactTypeKey ?? "outbound"}
                className={inputClass}
                required
              >
                {contactTypes.map((item) => (
                  <option key={item.type_key} value={item.type_key}>
                    {`${item.display_name} — ${item.points_per_sale} pts — ${(item.expected_conversion_rate * 100).toFixed(0)}%`}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Contacts count">
              <input
                name="contactsCount"
                type="number"
                step="1"
                min="0"
                defaultValue={editEntry?.contactsCount ?? 0}
                className={inputClass}
                required
              />
            </FormField>

            <FormField label="Converted sales count">
              <input
                name="convertedSalesCount"
                type="number"
                step="1"
                min="0"
                defaultValue={editEntry?.convertedSalesCount ?? 0}
                className={inputClass}
                required
              />
            </FormField>

            <FormField label="Total GWP">
              <input
                name="totalGwp"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editEntry?.totalGwp ?? 0}
                className={inputClass}
                required
              />
            </FormField>

            <FormField label="Notes (optional)">
              <input
                name="notes"
                type="text"
                defaultValue={editEntry?.notes ?? ""}
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
                onClick={() => setEditEntry(null)}
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
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Contact Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[#f6f9ff]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Contact type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Contacts</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Converted</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Points</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Total GWP</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                    No contacts logged yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#f8fbff]">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">{entry.entryDate}</td>
                    <td className="px-4 py-3 text-sm">{entry.contactTypeName}</td>
                    <td className="px-4 py-3 text-right text-sm">{entry.contactsCount}</td>
                    <td className="px-4 py-3 text-right text-sm">{entry.convertedSalesCount}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatCurrency(entry.salesPoints)}</td>
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
                          disabled={deletePending}
                          onClick={() => handleDelete(entry.id)}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{value}</p>
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
