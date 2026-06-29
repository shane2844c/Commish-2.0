"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CONTACT_TYPES } from "@/lib/config/performance";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import type { EmploymentTypeUi, ManualInputDefaultValues, PerformanceActionState } from "@/lib/types";

type AdjustmentHistoryRow = {
  id: string;
  entryDate: string | null;
  reason: string | null;
  contactTypeName: string;
  contactCount: number;
  convertedSalesCount: number;
  salesPoints: number;
};

type ManualInputManagerProps = {
  consultantMonthId?: string;
  defaultValues: ManualInputDefaultValues;
  adjustmentHistory: AdjustmentHistoryRow[];
};

type Mode = "baseline" | "manual-adjustment";
type TypeRowInput = {
  contacts: number;
  convertedSales: number;
  averageGwp: number;
};

type TypeRowsState = Record<string, TypeRowInput>;

function buildRowsFromBaseline(defaultValues: ManualInputDefaultValues): TypeRowsState {
  const rows: TypeRowsState = {};
  CONTACT_TYPES.forEach((type) => {
    rows[type.slug] = {
      contacts: defaultValues.baselineByContactType[type.slug]?.contacts ?? 0,
      convertedSales: defaultValues.baselineByContactType[type.slug]?.convertedSales ?? 0,
      averageGwp: defaultValues.baselineByContactType[type.slug]?.averageGwp ?? 0,
    };
  });
  return rows;
}

function buildEmptyRows(): TypeRowsState {
  const rows: TypeRowsState = {};
  CONTACT_TYPES.forEach((type) => {
    rows[type.slug] = { contacts: 0, convertedSales: 0, averageGwp: 0 };
  });
  return rows;
}

export default function ManualInputManager({
  consultantMonthId,
  defaultValues,
  adjustmentHistory,
}: ManualInputManagerProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("baseline");
  const [formState, setFormState] = useState<PerformanceActionState>({});
  const [pending, setPending] = useState(false);

  const [monthConfig, setMonthConfig] = useState({
    month: defaultValues.month,
    year: defaultValues.year,
    employmentType: defaultValues.employmentType,
    fullTimePointsTarget: defaultValues.fullTimePointsTarget,
    fullTimeRosteredDays: defaultValues.fullTimeRosteredDays,
    totalRosteredDays: defaultValues.totalRosteredDays,
    completedRosteredDays: defaultValues.completedRosteredDays,
  });
  const [baselineRows, setBaselineRows] = useState<TypeRowsState>(() =>
    buildRowsFromBaseline(defaultValues)
  );
  const [adjustmentRows, setAdjustmentRows] = useState<TypeRowsState>(() => buildEmptyRows());

  const currentRows = mode === "baseline" ? baselineRows : adjustmentRows;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormState({});

    const endpoint =
      mode === "baseline" ? "/api/manual-input/baseline" : "/api/manual-input/adjustment";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const result = (await response.json()) as PerformanceActionState;
      setFormState(result);

      if (response.ok && result.success) {
        if (mode === "manual-adjustment") {
          setAdjustmentRows(buildEmptyRows());
        }
        router.refresh();
      }
    } catch {
      setFormState({ error: "Failed to save. Please try again." });
    } finally {
      setPending(false);
    }
  }

  const preview = useMemo(() => {
    const totals = CONTACT_TYPES.reduce(
      (acc, type) => {
        const row = currentRows[type.slug] ?? { contacts: 0, convertedSales: 0, averageGwp: 0 };
        const contacts = Number(row.contacts || 0);
        const converted = Number(row.convertedSales || 0);
        const averageGwp = Number(row.averageGwp || 0);
        const points = converted * type.points;
        const hiddenGwp = converted * averageGwp;
        acc.contacts += contacts;
        acc.converted += converted;
        acc.salesPoints += points;
        acc.hiddenGwp += hiddenGwp;
        acc.blendedNumerator += contacts * type.expectedConversionRate;
        return acc;
      },
      { contacts: 0, converted: 0, salesPoints: 0, hiddenGwp: 0, blendedNumerator: 0 }
    );

    const blendedTargetConversion =
      totals.contacts > 0 ? totals.blendedNumerator / totals.contacts : 0;
    const actualConversion = totals.contacts > 0 ? totals.converted / totals.contacts : 0;
    const percentToTargetConversion =
      blendedTargetConversion > 0 ? actualConversion / blendedTargetConversion : 0;
    const averageGwp = totals.converted > 0 ? totals.hiddenGwp / totals.converted : 0;

    const conversionMultiplier =
      percentToTargetConversion >= 1.2
        ? 1.2
        : percentToTargetConversion >= 1.1
          ? 1.1
          : percentToTargetConversion >= 1
            ? 1
            : percentToTargetConversion >= 0.9
              ? 0.9
              : 0.8;
    const dpp =
      totals.salesPoints >= 250
        ? 16
        : totals.salesPoints >= 200
          ? 14
          : totals.salesPoints >= 150
            ? 12
            : totals.salesPoints >= 100
              ? 10
              : 8;
    const gwpBonus =
      averageGwp >= 160 ? 2.5 : averageGwp >= 140 ? 2 : averageGwp >= 120 ? 1.5 : averageGwp >= 100 ? 1 : 0;
    const estimatedCommissionImpact = totals.salesPoints * (dpp + gwpBonus) * conversionMultiplier;

    return {
      contacts: totals.contacts,
      converted: totals.converted,
      salesPoints: totals.salesPoints,
      blendedTargetConversion,
      actualConversion,
      percentToTargetConversion,
      averageGwp,
      estimatedCommissionImpact,
    };
  }, [currentRows]);

  const updateRows = (setter: React.Dispatch<React.SetStateAction<TypeRowsState>>) => {
    return (slug: string, key: keyof TypeRowInput, value: string) => {
      setter((current) => ({
        ...current,
        [slug]: {
          ...current[slug],
          [key]: Number(value || 0),
        },
      }));
    };
  };

  const updateBaselineRow = updateRows(setBaselineRows);
  const updateAdjustmentRow = updateRows(setAdjustmentRows);
  const updateCurrentRow = mode === "baseline" ? updateBaselineRow : updateAdjustmentRow;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("baseline")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            mode === "baseline"
              ? "bg-[var(--brand)] text-white"
              : "border border-[var(--border)] text-[var(--brand)] hover:bg-[var(--brand-soft)]"
          }`}
        >
          Starting Baseline
        </button>
        <button
          type="button"
          onClick={() => setMode("manual-adjustment")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            mode === "manual-adjustment"
              ? "bg-[var(--brand)] text-white"
              : "border border-[var(--border)] text-[var(--brand)] hover:bg-[var(--brand-soft)]"
          }`}
        >
          Manual Adjustment
        </button>
      </div>

      {(formState.error || formState.success) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            formState.error
              ? "border-red-200 bg-[var(--error-soft)] text-red-700"
              : "border-green-200 bg-[var(--success-soft)] text-green-700"
          }`}
        >
          {formState.error ?? formState.message ?? "Saved successfully."}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {consultantMonthId && <input type="hidden" name="consultantMonthId" value={consultantMonthId} />}

        <div className="rounded-xl border border-[var(--border)] bg-white p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            {mode === "baseline" ? "Manual Input" : "Manual Adjustment"}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {mode === "baseline"
              ? "Baseline replaces existing baseline rows for this month."
              : "Manual adjustments are additive and auditable."}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InputField label="Month" name="month" value={monthConfig.month} onChange={(value) => setMonthConfig((c) => ({ ...c, month: Number(value || 0) }))} />
            <InputField label="Year" name="year" value={monthConfig.year} onChange={(value) => setMonthConfig((c) => ({ ...c, year: Number(value || 0) }))} />
            <SelectField
              label="Employment Type"
              name="employmentType"
              value={monthConfig.employmentType}
              onChange={(value) =>
                setMonthConfig((c) => ({ ...c, employmentType: value as EmploymentTypeUi }))
              }
              options={[
                { value: "Full-time", label: "Full-time" },
                { value: "Part-time", label: "Part-time" },
              ]}
            />
            <InputField
              label="Full-time points target"
              name="fullTimePointsTarget"
              value={monthConfig.fullTimePointsTarget}
              onChange={(value) => setMonthConfig((c) => ({ ...c, fullTimePointsTarget: Number(value || 0) }))}
            />
            <InputField
              label="Full-time rostered days"
              name="fullTimeRosteredDays"
              value={monthConfig.fullTimeRosteredDays}
              onChange={(value) => setMonthConfig((c) => ({ ...c, fullTimeRosteredDays: Number(value || 0) }))}
            />
            <InputField
              label="Total rostered days this month"
              name="totalRosteredDays"
              value={monthConfig.totalRosteredDays}
              onChange={(value) => setMonthConfig((c) => ({ ...c, totalRosteredDays: Number(value || 0) }))}
            />
            <InputField
              label="Completed rostered days so far"
              name="completedRosteredDays"
              value={monthConfig.completedRosteredDays}
              onChange={(value) =>
                setMonthConfig((c) => ({ ...c, completedRosteredDays: Number(value || 0) }))
              }
            />

            {mode === "manual-adjustment" && (
              <>
                <label className="block text-sm font-semibold text-[var(--muted)]">
                  Date
                  <input
                    name="adjustmentDate"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className={inputClass}
                    required
                  />
                </label>
                <TextField label="Reason for adjustment" name="adjustmentReason" required />
              </>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[#f6f9ff]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Contact type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Points per sale</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Expected conversion</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Total contacts so far</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Converted sales so far</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Average GWP</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Calculated sales points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {CONTACT_TYPES.map((type) => {
                const row = currentRows[type.slug];
                const salesPoints = Number(row?.convertedSales ?? 0) * type.points;
                return (
                  <tr key={type.slug}>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">{type.name}</td>
                    <td className="px-4 py-3 text-right text-sm text-[var(--foreground)]">{type.points.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-sm text-[var(--foreground)]">{(type.expectedConversionRate * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3">
                      <input
                        name={`${type.slug}__contacts`}
                        type="number"
                        step="1"
                        value={row?.contacts ?? 0}
                        onChange={(event) => updateCurrentRow(type.slug, "contacts", event.target.value)}
                        className={tableInputClass}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        name={`${type.slug}__convertedSales`}
                        type="number"
                        step="1"
                        value={row?.convertedSales ?? 0}
                        onChange={(event) =>
                          updateCurrentRow(type.slug, "convertedSales", event.target.value)
                        }
                        className={tableInputClass}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        name={`${type.slug}__averageGwp`}
                        type="number"
                        step="0.01"
                        value={row?.averageGwp ?? 0}
                        onChange={(event) => updateCurrentRow(type.slug, "averageGwp", event.target.value)}
                        className={tableInputClass}
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-[var(--brand)]">
                      {formatCurrency(salesPoints)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-white p-5">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Preview</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PreviewItem label="Total contacts" value={formatCurrency(preview.contacts)} />
            <PreviewItem label="Converted sales" value={formatCurrency(preview.converted)} />
            <PreviewItem label="Sales points" value={formatCurrency(preview.salesPoints)} />
            <PreviewItem label="Blended target conversion" value={formatPercent(preview.blendedTargetConversion)} />
            <PreviewItem label="Actual conversion" value={formatPercent(preview.actualConversion)} />
            <PreviewItem label="% to target conversion" value={formatPercent(preview.percentToTargetConversion)} />
            <PreviewItem label="Average GWP" value={formatCurrency(preview.averageGwp)} />
            <PreviewItem label="Estimated commission impact" value={formatCurrency(preview.estimatedCommissionImpact)} />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
        >
          {pending ? "Saving..." : mode === "baseline" ? "Save Baseline" : "Save Adjustment"}
        </button>
      </form>

      <div className="rounded-xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Adjustment History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[#f6f9ff]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Contact type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Contacts</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Converted</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Sales points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {adjustmentHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                    No manual adjustments yet.
                  </td>
                </tr>
              ) : (
                adjustmentHistory.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--foreground)]">
                      {row.entryDate ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">{row.reason ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">{row.contactTypeName}</td>
                    <td className="px-4 py-3 text-right text-sm text-[var(--foreground)]">
                      {formatCurrency(row.contactCount)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-[var(--foreground)]">
                      {formatCurrency(row.convertedSalesCount)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-[var(--foreground)]">
                      {formatCurrency(row.salesPoints)}
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

function InputField({
  label,
  name,
  value,
  onChange,
  type = "number",
}: {
  label: string;
  name: string;
  value: string | number;
  onChange?: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-[var(--muted)]">
      {label}
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className={inputClass}
      />
    </label>
  );
}

function TextField({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-[var(--muted)] sm:col-span-2 lg:col-span-2">
      {label}
      <input name={name} type="text" required={required} className={inputClass} />
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-sm font-semibold text-[var(--muted)]">
      {label}
      <select name={name} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[#f8fbff] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[#dbe9fb]";

const tableInputClass =
  "w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-right text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[#dbe9fb]";
