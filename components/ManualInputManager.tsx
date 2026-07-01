"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ContactTypeOption } from "@/lib/contactTypes/helpers";
import { formatCurrency, formatPercent } from "@/lib/calculations";
import { averageGwpFromTotals } from "@/lib/types";
import type { AdjustmentHistoryRow, EmploymentTypeUi, ManualInputDefaultValues, PerformanceActionState } from "@/lib/types";

type ManualInputManagerProps = {
  consultantMonthId?: string;
  defaultValues: ManualInputDefaultValues;
  adjustmentHistory: AdjustmentHistoryRow[];
  contactTypes: ContactTypeOption[];
};

type Mode = "baseline" | "manual-adjustment";

type BaselineRowInput = {
  totalContactsSoFar: number;
  convertedSalesSoFar: number;
  averageGwp: number;
};

type AdjustmentRowInput = {
  contactsDelta: number;
  convertedSalesDelta: number;
  averageGwp: number;
};

function buildBaselineRows(
  defaultValues: ManualInputDefaultValues,
  contactTypes: ContactTypeOption[]
): Record<string, BaselineRowInput> {
  const rows: Record<string, BaselineRowInput> = {};
  contactTypes.forEach((type) => {
    const saved = defaultValues.baselineByContactType[type.type_key];
    const convertedSalesSoFar = saved?.convertedSalesSoFar ?? 0;
    rows[type.type_key] = {
      totalContactsSoFar: saved?.totalContactsSoFar ?? 0,
      convertedSalesSoFar,
      averageGwp: averageGwpFromTotals(convertedSalesSoFar, saved?.totalGwpSoFar ?? 0),
    };
  });
  return rows;
}

function buildEmptyAdjustmentRows(contactTypes: ContactTypeOption[]): Record<string, AdjustmentRowInput> {
  const rows: Record<string, AdjustmentRowInput> = {};
  contactTypes.forEach((type) => {
    rows[type.type_key] = { contactsDelta: 0, convertedSalesDelta: 0, averageGwp: 0 };
  });
  return rows;
}

export default function ManualInputManager({
  consultantMonthId,
  defaultValues,
  adjustmentHistory,
  contactTypes,
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
    totalRosteredDaysThisMonth: defaultValues.totalRosteredDaysThisMonth,
    completedRosteredDaysSoFar: defaultValues.completedRosteredDaysSoFar,
  });
  const [baselineRows, setBaselineRows] = useState(() => buildBaselineRows(defaultValues, contactTypes));
  const [adjustmentRows, setAdjustmentRows] = useState(() => buildEmptyAdjustmentRows(contactTypes));

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
        headers: { Accept: "application/json" },
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      let result: PerformanceActionState;
      try {
        result = (await response.json()) as PerformanceActionState;
      } catch {
        setFormState({ error: "Invalid server response. Please try again." });
        return;
      }

      if (!response.ok || result.error) {
        setFormState({ error: result.error ?? "Failed to save. Please try again." });
        return;
      }

      if (!result.success) {
        setFormState({ error: "Save did not complete. Please try again." });
        return;
      }

      setFormState(result);

      if (mode === "manual-adjustment") {
        setAdjustmentRows(buildEmptyAdjustmentRows(contactTypes));
        router.refresh();
        return;
      }

      console.log("Baseline saved successfully");
      console.log("Navigating to dashboard without hard reload");
      router.push("/dashboard");
    } catch {
      setFormState({ error: "Failed to save. Please try again." });
    } finally {
      setPending(false);
    }
  }

  const preview = useMemo(() => {
    const totals = contactTypes.reduce(
      (acc, type) => {
        if (mode === "baseline") {
          const row = baselineRows[type.type_key] ?? {
            totalContactsSoFar: 0,
            convertedSalesSoFar: 0,
            averageGwp: 0,
          };
          const contacts = Number(row.totalContactsSoFar || 0);
          const converted = Number(row.convertedSalesSoFar || 0);
          const totalGwp = converted * Number(row.averageGwp || 0);
          acc.contacts += contacts;
          acc.converted += converted;
          acc.salesPoints += converted * type.points_per_sale;
          acc.totalGwp += totalGwp;
          acc.blendedNumerator += contacts * type.expected_conversion_rate;
        } else {
          const row = adjustmentRows[type.type_key] ?? {
            contactsDelta: 0,
            convertedSalesDelta: 0,
            averageGwp: 0,
          };
          const contacts = Number(row.contactsDelta || 0);
          const converted = Number(row.convertedSalesDelta || 0);
          const totalGwp = converted * Number(row.averageGwp || 0);
          acc.contacts += contacts;
          acc.converted += converted;
          acc.salesPoints += converted * type.points_per_sale;
          acc.totalGwp += totalGwp;
          acc.blendedNumerator += contacts * type.expected_conversion_rate;
        }
        return acc;
      },
      { contacts: 0, converted: 0, salesPoints: 0, totalGwp: 0, blendedNumerator: 0 }
    );

    const blendedTargetConversion =
      totals.contacts > 0 ? totals.blendedNumerator / totals.contacts : 0;
    const actualConversion = totals.contacts > 0 ? totals.converted / totals.contacts : 0;
    const percentToTargetConversion =
      blendedTargetConversion > 0 ? actualConversion / blendedTargetConversion : 0;
    const averageGwp = totals.converted > 0 ? totals.totalGwp / totals.converted : 0;

    return {
      contacts: totals.contacts,
      converted: totals.converted,
      salesPoints: totals.salesPoints,
      blendedTargetConversion,
      actualConversion,
      percentToTargetConversion,
      averageGwp,
    };
  }, [mode, baselineRows, adjustmentRows, contactTypes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <ModeButton active={mode === "baseline"} onClick={() => setMode("baseline")}>
          Starting Baseline
        </ModeButton>
        <ModeButton active={mode === "manual-adjustment"} onClick={() => setMode("manual-adjustment")}>
          Manual Adjustment
        </ModeButton>
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

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InputField label="Month" name="month" value={monthConfig.month} onChange={(value) => setMonthConfig((c) => ({ ...c, month: Number(value || 0) }))} />
            <InputField label="Year" name="year" value={monthConfig.year} onChange={(value) => setMonthConfig((c) => ({ ...c, year: Number(value || 0) }))} />
            <SelectField
              label="Employment Type"
              name="employmentType"
              value={monthConfig.employmentType}
              onChange={(value) => setMonthConfig((c) => ({ ...c, employmentType: value as EmploymentTypeUi }))}
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
              name="totalRosteredDaysThisMonth"
              value={monthConfig.totalRosteredDaysThisMonth}
              onChange={(value) => setMonthConfig((c) => ({ ...c, totalRosteredDaysThisMonth: Number(value || 0) }))}
            />
            <InputField
              label="Completed rostered days so far"
              name="completedRosteredDaysSoFar"
              value={monthConfig.completedRosteredDaysSoFar}
              onChange={(value) => setMonthConfig((c) => ({ ...c, completedRosteredDaysSoFar: Number(value || 0) }))}
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
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
                  {mode === "baseline" ? "Total contacts so far" : "Contacts delta"}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
                  {mode === "baseline" ? "Converted sales so far" : "Converted sales delta"}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Average GWP</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Calculated sales points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {contactTypes.map((type) => {
                if (mode === "baseline") {
                  const row = baselineRows[type.type_key];
                  const salesPoints = Number(row?.convertedSalesSoFar ?? 0) * type.points_per_sale;
                  return (
                    <tr key={type.type_key}>
                      <td className="px-4 py-3 text-sm text-[var(--foreground)]">{type.display_name}</td>
                      <td className="px-4 py-3 text-right text-sm">{type.points_per_sale.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-sm">{(type.expected_conversion_rate * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3">
                        <input
                          name={`${type.type_key}__totalContactsSoFar`}
                          type="number"
                          step="1"
                          min="0"
                          value={row?.totalContactsSoFar ?? 0}
                          onChange={(e) =>
                            setBaselineRows((current) => ({
                              ...current,
                              [type.type_key]: { ...current[type.type_key], totalContactsSoFar: Number(e.target.value || 0) },
                            }))
                          }
                          className={tableInputClass}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          name={`${type.type_key}__convertedSalesSoFar`}
                          type="number"
                          step="1"
                          min="0"
                          value={row?.convertedSalesSoFar ?? 0}
                          onChange={(e) =>
                            setBaselineRows((current) => ({
                              ...current,
                              [type.type_key]: { ...current[type.type_key], convertedSalesSoFar: Number(e.target.value || 0) },
                            }))
                          }
                          className={tableInputClass}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          name={`${type.type_key}__averageGwp`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={row?.averageGwp ?? 0}
                          onChange={(e) =>
                            setBaselineRows((current) => ({
                              ...current,
                              [type.type_key]: { ...current[type.type_key], averageGwp: Number(e.target.value || 0) },
                            }))
                          }
                          className={tableInputClass}
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-[var(--brand)]">
                        {formatCurrency(salesPoints)}
                      </td>
                    </tr>
                  );
                }

                const row = adjustmentRows[type.type_key];
                const salesPoints = Number(row?.convertedSalesDelta ?? 0) * type.points_per_sale;
                return (
                  <tr key={type.type_key}>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">{type.display_name}</td>
                    <td className="px-4 py-3 text-right text-sm">{type.points_per_sale.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-sm">{(type.expected_conversion_rate * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3">
                      <input
                        name={`${type.type_key}__contactsDelta`}
                        type="number"
                        step="1"
                        value={row?.contactsDelta ?? 0}
                        onChange={(e) =>
                          setAdjustmentRows((current) => ({
                            ...current,
                            [type.type_key]: { ...current[type.type_key], contactsDelta: Number(e.target.value || 0) },
                          }))
                        }
                        className={tableInputClass}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        name={`${type.type_key}__convertedSalesDelta`}
                        type="number"
                        step="1"
                        value={row?.convertedSalesDelta ?? 0}
                        onChange={(e) =>
                          setAdjustmentRows((current) => ({
                            ...current,
                            [type.type_key]: { ...current[type.type_key], convertedSalesDelta: Number(e.target.value || 0) },
                          }))
                        }
                        className={tableInputClass}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        name={`${type.type_key}__averageGwp`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={row?.averageGwp ?? 0}
                        onChange={(e) =>
                          setAdjustmentRows((current) => ({
                            ...current,
                            [type.type_key]: { ...current[type.type_key], averageGwp: Number(e.target.value || 0) },
                          }))
                        }
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
          <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Preview (calculated locally)</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PreviewItem label="Total contacts" value={formatCurrency(preview.contacts)} />
            <PreviewItem label="Converted sales" value={formatCurrency(preview.converted)} />
            <PreviewItem label="Sales points" value={formatCurrency(preview.salesPoints)} />
            <PreviewItem label="Blended target conversion" value={formatPercent(preview.blendedTargetConversion)} />
            <PreviewItem label="Actual conversion" value={formatPercent(preview.actualConversion)} />
            <PreviewItem label="% to target conversion" value={formatPercent(preview.percentToTargetConversion)} />
            <PreviewItem label="Average GWP" value={formatCurrency(preview.averageGwp)} />
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
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Contacts delta</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Converted delta</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">Sales points delta</th>
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
                    <td className="whitespace-nowrap px-4 py-3 text-sm">{row.adjustmentDate}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">{row.reason}</td>
                    <td className="px-4 py-3 text-sm">{row.contactTypeName}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatCurrency(row.contactsDelta)}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatCurrency(row.convertedSalesDelta)}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatCurrency(row.salesPointsDelta)}</td>
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

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        active
          ? "bg-[var(--brand)] text-white"
          : "border border-[var(--border)] text-[var(--brand)] hover:bg-[var(--brand-soft)]"
      }`}
    >
      {children}
    </button>
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
