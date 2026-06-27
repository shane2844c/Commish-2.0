"use client";

import { useActionState } from "react";
import { saveMonthlySetup } from "@/lib/actions/monthlySetupActions";
import { getCurrentMonthYear } from "@/lib/types";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type MonthlySetupFormProps = {
  defaultValues?: {
    month?: number;
    year?: number;
    employmentType?: "full-time" | "part-time";
    fullTimeTarget?: number;
    fullTimeRosteredDays?: number;
    userRosteredDays?: number;
    gwpTarget?: number;
    conversionTarget?: number;
    startingSales?: number;
    startingContacts?: number;
    startingGwpTotal?: number;
    startingSalesPoints?: number;
  };
};

export default function MonthlySetupForm({ defaultValues }: MonthlySetupFormProps) {
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  const [state, formAction, pending] = useActionState(saveMonthlySetup, {});

  const inputClass =
    "mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500";
  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <form action={formAction} className="space-y-8">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Period</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="month" className={labelClass}>
              Month
            </label>
            <select
              id="month"
              name="month"
              defaultValue={defaultValues?.month ?? currentMonth}
              className={inputClass}
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="year" className={labelClass}>
              Year
            </label>
            <input
              id="year"
              name="year"
              type="number"
              defaultValue={defaultValues?.year ?? currentYear}
              className={inputClass}
              required
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Monthly Targets</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="employmentType" className={labelClass}>
              Employment Type
            </label>
            <select
              id="employmentType"
              name="employmentType"
              defaultValue={defaultValues?.employmentType ?? "full-time"}
              className={inputClass}
            >
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
            </select>
          </div>
          <div>
            <label htmlFor="fullTimeTarget" className={labelClass}>
              Full-time Target (sales)
            </label>
            <input
              id="fullTimeTarget"
              name="fullTimeTarget"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.fullTimeTarget ?? ""}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="fullTimeRosteredDays" className={labelClass}>
              Full-time Rostered Days
            </label>
            <input
              id="fullTimeRosteredDays"
              name="fullTimeRosteredDays"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={defaultValues?.fullTimeRosteredDays ?? ""}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="userRosteredDays" className={labelClass}>
              Your Rostered Days
            </label>
            <input
              id="userRosteredDays"
              name="userRosteredDays"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={defaultValues?.userRosteredDays ?? ""}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="gwpTarget" className={labelClass}>
              GWP Target
            </label>
            <input
              id="gwpTarget"
              name="gwpTarget"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.gwpTarget ?? ""}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="conversionTarget" className={labelClass}>
              Conversion Target (optional)
            </label>
            <input
              id="conversionTarget"
              name="conversionTarget"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.conversionTarget ?? 0}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Starting Statistics</h2>
        <p className="mt-1 text-sm text-gray-500">
          If joining mid-month, enter your current totals before daily tracking.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startingSales" className={labelClass}>
              Starting Sales
            </label>
            <input
              id="startingSales"
              name="startingSales"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.startingSales ?? 0}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="startingContacts" className={labelClass}>
              Starting Contacts
            </label>
            <input
              id="startingContacts"
              name="startingContacts"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.startingContacts ?? 0}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="startingGwpTotal" className={labelClass}>
              Starting GWP Total
            </label>
            <input
              id="startingGwpTotal"
              name="startingGwpTotal"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.startingGwpTotal ?? 0}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="startingSalesPoints" className={labelClass}>
              Starting Sales Points
            </label>
            <input
              id="startingSalesPoints"
              name="startingSalesPoints"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.startingSalesPoints ?? 0}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save Monthly Setup"}
      </button>
    </form>
  );
}
