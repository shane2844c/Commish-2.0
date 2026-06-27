"use client";

import { useActionState, useEffect } from "react";
import { saveDailyEntry } from "@/lib/actions/dailyEntryActions";

type DailyEntryFormProps = {
  monthlySetupId: string;
};

export default function DailyEntryForm({ monthlySetupId }: DailyEntryFormProps) {
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
    "mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500";
  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Log Daily Entry</h2>

      {state.error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Entry saved successfully.
        </div>
      )}

      <form id="daily-entry-form" action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="monthlySetupId" value={monthlySetupId} />

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
            <label htmlFor="contacts" className={labelClass}>
              Contacts
            </label>
            <input
              id="contacts"
              name="contacts"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="sales" className={labelClass}>
              Sales
            </label>
            <input
              id="sales"
              name="sales"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="gwpTotal" className={labelClass}>
              GWP Total
            </label>
            <input
              id="gwpTotal"
              name="gwpTotal"
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
          className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save Entry"}
        </button>
      </form>
    </div>
  );
}
