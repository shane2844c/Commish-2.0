"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ContactTypeOption } from "@/lib/contactTypes/helpers";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/calculations";
import { calculateMonthlyKpis } from "@/lib/monthlyKpi/roster";
import { averageGwpFromTotals } from "@/lib/types";
import type { AdjustmentHistoryRow, EmploymentTypeUi, ManualInputDefaultValues, PerformanceActionState, RosteredDayOffEntry } from "@/lib/types";

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

function monthDateBounds(month: number, year: number) {
  const lastDay = new Date(year, month, 0).getDate();
  return {
    min: `${year}-${String(month).padStart(2, "0")}-01`,
    max: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

function formatOffDate(offDate: string) {
  const [year, month, day] = offDate.split("-");
  return `${day}/${month}/${year}`;
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
  const [rosterPending, setRosterPending] = useState(false);
  const [rosterState, setRosterState] = useState<PerformanceActionState>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const pendingBaselineFormRef = useRef<FormData | null>(null);

  const [monthConfig, setMonthConfig] = useState({
    month: defaultValues.month,
    year: defaultValues.year,
    employmentType: defaultValues.employmentType,
    fullTimePointsTarget: defaultValues.fullTimePointsTarget,
  });
  const [rosteredDaysOffEntries, setRosteredDaysOffEntries] = useState<RosteredDayOffEntry[]>(
    defaultValues.rosteredDaysOffEntries
  );
  const [newOffDate, setNewOffDate] = useState("");
  const [newOffReason, setNewOffReason] = useState("");
  const [baselineRows, setBaselineRows] = useState(() => buildBaselineRows(defaultValues, contactTypes));
  const [adjustmentRows, setAdjustmentRows] = useState(() => buildEmptyAdjustmentRows(contactTypes));

  const previewOffDates = useMemo(() => {
    if (
      monthConfig.month === defaultValues.month &&
      monthConfig.year === defaultValues.year
    ) {
      return rosteredDaysOffEntries.map((entry) => entry.offDate);
    }
    return [];
  }, [monthConfig.month, monthConfig.year, defaultValues.month, defaultValues.year, rosteredDaysOffEntries]);

  const monthlyKpis = useMemo(
    () =>
      calculateMonthlyKpis({
        month: monthConfig.month,
        year: monthConfig.year,
        employmentType: monthConfig.employmentType,
        fullTimePointsTarget: monthConfig.fullTimePointsTarget,
        offDates: previewOffDates,
      }),
    [monthConfig, previewOffDates]
  );

  const dateBounds = useMemo(
    () => monthDateBounds(monthConfig.month, monthConfig.year),
    [monthConfig.month, monthConfig.year]
  );

  const monthMatchesSaved =
    monthConfig.month === defaultValues.month && monthConfig.year === defaultValues.year;

  const canManageRosteredDaysOff = Boolean(consultantMonthId && monthMatchesSaved);

  useEffect(() => {
    setMonthConfig({
      month: defaultValues.month,
      year: defaultValues.year,
      employmentType: defaultValues.employmentType,
      fullTimePointsTarget: defaultValues.fullTimePointsTarget,
    });
    setRosteredDaysOffEntries(defaultValues.rosteredDaysOffEntries);
    setBaselineRows(buildBaselineRows(defaultValues, contactTypes));
  }, [defaultValues, contactTypes]);

  async function addRosteredDayOff() {
    if (!consultantMonthId) {
      setRosterState({ error: "Save monthly setup first before adding rostered days off." });
      return;
    }

    if (!newOffDate) {
      setRosterState({ error: "Select a date for the rostered day off." });
      return;
    }

    setRosterPending(true);
    setRosterState({});

    const formData = new FormData();
    formData.set("consultantMonthId", consultantMonthId);
    formData.set("offDate", newOffDate);
    if (newOffReason.trim()) {
      formData.set("reason", newOffReason.trim());
    }

    try {
      const response = await fetch("/api/manual-input/rostered-days-off", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const result = (await response.json()) as PerformanceActionState;
      if (!response.ok || result.error) {
        setRosterState({ error: result.error ?? "Failed to add rostered day off." });
        return;
      }

      setRosterState({ success: true, message: result.message ?? "Rostered day off added." });
      setNewOffDate("");
      setNewOffReason("");
      router.refresh();
    } catch {
      setRosterState({ error: "Failed to add rostered day off." });
    } finally {
      setRosterPending(false);
    }
  }

  async function removeRosteredDayOff(entryId: string) {
    setRosterPending(true);
    setRosterState({});

    const formData = new FormData();
    formData.set("entryId", entryId);

    try {
      const response = await fetch("/api/manual-input/rostered-days-off/remove", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const result = (await response.json()) as PerformanceActionState;
      if (!response.ok || result.error) {
        setRosterState({ error: result.error ?? "Failed to remove rostered day off." });
        return;
      }

      setRosterState({ success: true, message: result.message ?? "Rostered day off removed." });
      router.refresh();
    } catch {
      setRosterState({ error: "Failed to remove rostered day off." });
    } finally {
      setRosterPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (mode === "baseline") {
      pendingBaselineFormRef.current = formData;
      setShowResetConfirm(true);
      return;
    }

    void submitManualInput(formData);
  }

  function confirmBaselineSave() {
    setShowResetConfirm(false);
    const formData = pendingBaselineFormRef.current;
    pendingBaselineFormRef.current = null;
    if (formData) {
      void submitManualInput(formData);
    }
  }

  function cancelBaselineSave() {
    setShowResetConfirm(false);
    pendingBaselineFormRef.current = null;
  }

  async function submitManualInput(formData: FormData) {
    setPending(true);
    setFormState({});

    const endpoint =
      mode === "baseline" ? "/api/manual-input/baseline" : "/api/manual-input/adjustment";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
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
      router.refresh();
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
          </div>

          <div className="mt-6 rounded-lg border border-[var(--border)] bg-white p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Rostered days off</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Add or remove specific rostered days off. Performance data is not reset when you change these.
            </p>

            {(rosterState.error || rosterState.success) && (
              <div
                className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                  rosterState.error
                    ? "border-red-200 bg-[var(--error-soft)] text-red-700"
                    : "border-green-200 bg-[var(--success-soft)] text-green-700"
                }`}
              >
                {rosterState.error ?? rosterState.message ?? "Updated rostered days off."}
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-sm font-semibold text-[var(--muted)]">
                Add rostered day off
                <input
                  type="date"
                  value={newOffDate}
                  min={dateBounds.min}
                  max={dateBounds.max}
                  onChange={(event) => setNewOffDate(event.target.value)}
                  className={inputClass}
                  disabled={!canManageRosteredDaysOff || rosterPending}
                />
              </label>
              <label className="block text-sm font-semibold text-[var(--muted)] sm:col-span-2">
                Reason (optional)
                <input
                  type="text"
                  value={newOffReason}
                  onChange={(event) => setNewOffReason(event.target.value)}
                  className={inputClass}
                  disabled={!canManageRosteredDaysOff || rosterPending}
                  placeholder="e.g. Annual leave"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void addRosteredDayOff()}
                  disabled={!canManageRosteredDaysOff || rosterPending}
                  className="w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
                >
                  {rosterPending ? "Saving..." : "Add"}
                </button>
              </div>
            </div>

            {!canManageRosteredDaysOff && (
              <p className="mt-3 text-xs text-[var(--muted)]">
                {!consultantMonthId
                  ? "Save monthly setup first to enable rostered days off."
                  : "Save monthly setup after changing month or year before adding rostered days off."}
              </p>
            )}

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Current rostered days off ({monthMatchesSaved ? previewOffDates.length : 0})
              </p>
              {!monthMatchesSaved ? (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Save monthly setup for this month and year to view or edit rostered days off.
                </p>
              ) : rosteredDaysOffEntries.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--muted)]">No rostered days off recorded.</p>
              ) : (
                <ul className="mt-2 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                  {rosteredDaysOffEntries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{formatOffDate(entry.offDate)}</p>
                        {entry.reason && (
                          <p className="text-xs text-[var(--muted)]">{entry.reason}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeRosteredDayOff(entry.id)}
                        disabled={rosterPending}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-[var(--error-soft)] disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-[var(--border)] bg-[#f8fbff] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Calculated monthly KPIs
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PreviewField
                label="Full-time rostered days"
                value={monthlyKpis.fullTimeRosteredDays.toString()}
              />
              <PreviewField
                label="Rostered days off"
                value={monthlyKpis.rosteredDaysOff.toString()}
              />
              <PreviewField
                label="Base rostered days this month"
                value={monthlyKpis.baseRosteredDaysThisMonth.toString()}
              />
              <PreviewField
                label="Total rostered days this month"
                value={monthlyKpis.totalRosteredDaysThisMonth.toString()}
              />
              <PreviewField
                label="Adjusted points target"
                value={formatNumber(monthlyKpis.adjustedPointsTarget)}
              />
              <PreviewField
                label="Completed rostered days so far"
                value={monthlyKpis.completedRosteredDaysSoFar.toString()}
              />
            </div>
          </div>

          {mode === "manual-adjustment" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            </div>
          )}
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
                        {formatNumber(salesPoints)}
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
                      {formatNumber(salesPoints)}
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
            <PreviewItem label="Total contacts" value={formatNumber(preview.contacts, 0)} />
            <PreviewItem label="Converted sales" value={formatNumber(preview.converted, 0)} />
            <PreviewItem label="Sales points" value={formatNumber(preview.salesPoints)} />
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
                    <td className="px-4 py-3 text-right text-sm">{formatNumber(row.contactsDelta, 0)}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatNumber(row.convertedSalesDelta, 0)}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatNumber(row.salesPointsDelta)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-confirm-title"
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-white p-6 shadow-lg"
          >
            <h3 id="reset-confirm-title" className="text-lg font-semibold text-[var(--foreground)]">
              Reset month performance data?
            </h3>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Saving Manual Input will reset existing daily contacts and manual adjustments for this
              month. Continue?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelBaselineSave}
                disabled={pending}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBaselineSave}
                disabled={pending}
                className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
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

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{value}</p>
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
