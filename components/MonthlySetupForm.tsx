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
    fullTimePointsTarget?: number;
    fullTimeRosteredDays?: number;
    userRosteredDays?: number;
    inboundTarget?: number;
    outboundTarget?: number;
    transferTarget?: number;
    startingInboundContacts?: number;
    startingOutboundContacts?: number;
    startingTransferContacts?: number;
    startingActualSales?: number;
    startingSalesPoints?: number;
    startingAverageGwp?: number;
  };
};

export default function MonthlySetupForm({ defaultValues }: MonthlySetupFormProps) {
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  const [state, formAction, pending] = useActionState(saveMonthlySetup, {});

  const inputClass =
    "mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[#dbe9fb]";
  const labelClass = "block text-sm font-semibold text-[var(--muted)]";

  return (
    <form action={formAction} className="space-y-8">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-[var(--error-soft)] px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <section className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Month Setup</h2>
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
            <label htmlFor="fullTimePointsTarget" className={labelClass}>
              Full-time Points Target
            </label>
            <input
              id="fullTimePointsTarget"
              name="fullTimePointsTarget"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.fullTimePointsTarget ?? defaultValues?.fullTimeTarget ?? ""}
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
            <label htmlFor="inboundTarget" className={labelClass}>
              Inbound Target Conversion
            </label>
            <input
              id="inboundTarget"
              name="inboundTarget"
              type="number"
              step="0.0001"
              min="0"
              defaultValue={defaultValues?.inboundTarget ?? 0}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="outboundTarget" className={labelClass}>
              Outbound Target Conversion
            </label>
            <input
              id="outboundTarget"
              name="outboundTarget"
              type="number"
              step="0.0001"
              min="0"
              defaultValue={defaultValues?.outboundTarget ?? 0}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="transferTarget" className={labelClass}>
              Transfer Target Conversion
            </label>
            <input
              id="transferTarget"
              name="transferTarget"
              type="number"
              step="0.0001"
              min="0"
              defaultValue={defaultValues?.transferTarget ?? 0}
              className={inputClass}
              required
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Starting Contacts</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startingInboundContacts" className={labelClass}>
              Inbound Contacts
            </label>
            <input
              id="startingInboundContacts"
              name="startingInboundContacts"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.startingInboundContacts ?? 0}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="startingOutboundContacts" className={labelClass}>
              Outbound Contacts
            </label>
            <input
              id="startingOutboundContacts"
              name="startingOutboundContacts"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.startingOutboundContacts ?? 0}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="startingTransferContacts" className={labelClass}>
              Transfer Contacts
            </label>
            <input
              id="startingTransferContacts"
              name="startingTransferContacts"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.startingTransferContacts ?? 0}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Starting Sales</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startingActualSales" className={labelClass}>
              Actual Sales
            </label>
            <input
              id="startingActualSales"
              name="startingActualSales"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.startingActualSales ?? 0}
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
          <div>
            <label htmlFor="startingAverageGwp" className={labelClass}>
              Average GWP
            </label>
            <input
              id="startingAverageGwp"
              name="startingAverageGwp"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.startingAverageGwp ?? 0}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save Starting Data"}
      </button>
    </form>
  );
}
