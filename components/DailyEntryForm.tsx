"use client";

import { useActionState, useEffect } from "react";
import { saveDailyEntry } from "@/lib/actions/dailyEntryActions";

type DailyEntryFormProps = {
  consultantMonthId: string;
};

export default function DailyEntryForm({ consultantMonthId }: DailyEntryFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const [state, formAction, pending] = useActionState(saveDailyEntry, {});

  useEffect(() => {
    if (state.success) {
      const form = document.getElementById("daily-entry-form") as HTMLFormElement | null;
      form?.reset();
      const dateInput = form?.querySelector('[name="entryDate"]') as HTMLInputElement | null;
      if (dateInput) dateInput.value = today;
    }
  }, [state.success, today]);

  const inputClass =
    "mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[#dbe9fb]";
  const labelClass = "block text-sm font-semibold text-[var(--muted)]";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Daily Update</h2>
        <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand)]">
          Enter Daily Figures
        </span>
      </div>

      {state.error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-[var(--error-soft)] px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="mt-4 rounded-lg border border-green-200 bg-[var(--success-soft)] px-4 py-3 text-sm text-green-700">
          Entry saved successfully.
        </div>
      )}

      <form id="daily-entry-form" action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="consultantMonthId" value={consultantMonthId} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="entryDate" className={labelClass}>
              Date
            </label>
            <input
              id="entryDate"
              name="entryDate"
              type="date"
              defaultValue={today}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="inboundContacts" className={labelClass}>
              Inbound Contacts
            </label>
            <input
              id="inboundContacts"
              name="inboundContacts"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="outboundContacts" className={labelClass}>
              Outbound Contacts
            </label>
            <input
              id="outboundContacts"
              name="outboundContacts"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="transferContacts" className={labelClass}>
              Transfer Contacts
            </label>
            <input
              id="transferContacts"
              name="transferContacts"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="actualSales" className={labelClass}>
              Actual Sales
            </label>
            <input
              id="actualSales"
              name="actualSales"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="averageGwp" className={labelClass}>
              Average GWP
            </label>
            <input
              id="averageGwp"
              name="averageGwp"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="salesPoints" className={labelClass}>
              Sales Points
            </label>
            <input
              id="salesPoints"
              name="salesPoints"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className={inputClass}
              required
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor="notes" className={labelClass}>
              Notes (optional)
            </label>
            <input
              id="notes"
              name="notes"
              type="text"
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save Entry"}
        </button>
      </form>
    </div>
  );
}
