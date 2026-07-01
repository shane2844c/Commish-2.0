"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatPercent } from "@/lib/calculations";
import {
  calculateCompliancePayableRate,
  formatCallsMarkedLabel,
  formatCompliancePayableRateLabel,
  getQaResultLabel,
  parseMarkedComplianceScores,
  calculateQaFromScores,
} from "@/lib/compliance/calculate";
import type {
  ComplianceCallFormEntry,
  ComplianceMetrics,
  PerformanceActionState,
} from "@/lib/types";

type ComplianceManagerProps = {
  month: number;
  year: number;
  consultantMonthId?: string;
  initialCalls: ComplianceCallFormEntry[];
  summary: ComplianceMetrics;
};

function buildInitialCalls(initialCalls: ComplianceCallFormEntry[]): ComplianceCallFormEntry[] {
  const byNumber = new Map(initialCalls.map((entry) => [entry.callNumber, entry]));
  return Array.from({ length: 5 }, (_, index) => {
    const callNumber = index + 1;
    return (
      byNumber.get(callNumber) ?? {
        callNumber,
        score: "",
        notes: "",
      }
    );
  });
}

export default function ComplianceManager({
  month,
  year,
  consultantMonthId,
  initialCalls,
  summary,
}: ComplianceManagerProps) {
  const router = useRouter();
  const [calls, setCalls] = useState(() => buildInitialCalls(initialCalls));
  const [formState, setFormState] = useState<PerformanceActionState>({});
  const [pending, setPending] = useState(false);

  const previewSummary = useMemo(() => {
    const qa = calculateQaFromScores(parseMarkedComplianceScores(calls));
    const compliancePayableRate = calculateCompliancePayableRate({
      qaComplete: qa.qaComplete,
      qaPassed: qa.qaPassed,
      previousThreeMonthsAllFailed: summary.previousThreeMonthsAllFailed,
    });

    return {
      qaCallsMarked: qa.qaCallsMarked,
      qaAverage: qa.qaAverage,
      qaResult: getQaResultLabel(qa),
      compliancePayableRateLabel: formatCompliancePayableRateLabel(
        compliancePayableRate,
        qa.qaComplete,
        summary.commissionIneligible
      ),
      currentFailStreak: summary.currentFailStreak,
      nextMonthEligibilityWarning: summary.nextMonthEligibilityWarning,
    };
  }, [calls, summary]);

  useEffect(() => {
    setCalls(buildInitialCalls(initialCalls));
  }, [initialCalls]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    void submitCompliance(formData);
  }

  async function submitCompliance(formData: FormData) {
    setPending(true);
    setFormState({});

    try {
      const response = await fetch("/api/compliance/scores", {
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
        setFormState({ error: result.error ?? "Failed to save compliance scores." });
        return;
      }

      setFormState(result);
      router.refresh();
    } catch {
      setFormState({ error: "Failed to save compliance scores." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form method="get" className="flex flex-wrap items-end gap-4 rounded-xl border border-[var(--border)] bg-white p-4">
        <label className="block text-sm font-semibold text-[var(--muted)]">
          Month
          <input type="number" name="month" min={1} max={12} defaultValue={month} className={inputClass} />
        </label>
        <label className="block text-sm font-semibold text-[var(--muted)]">
          Year
          <input type="number" name="year" min={2000} max={2100} defaultValue={year} className={inputClass} />
        </label>
        <button
          type="submit"
          className="rounded-lg border border-[var(--brand)] px-4 py-2.5 text-sm font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)]"
        >
          Apply
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Calls Marked" value={formatCallsMarkedLabel(previewSummary.qaCallsMarked)} />
        <SummaryCard
          label="QA Average"
          value={previewSummary.qaCallsMarked > 0 ? formatPercent(previewSummary.qaAverage / 100) : "—"}
        />
        <SummaryCard label="QA Result" value={previewSummary.qaResult} highlight={previewSummary.qaResult} />
        <SummaryCard label="Commission Payable Rate" value={previewSummary.compliancePayableRateLabel} />
        <SummaryCard label="Current Fail Streak" value={String(previewSummary.currentFailStreak)} />
        <SummaryCard
          label="Next Month Eligibility"
          value={previewSummary.nextMonthEligibilityWarning ?? "No warning"}
          muted={!previewSummary.nextMonthEligibilityWarning}
        />
      </div>

      {previewSummary.nextMonthEligibilityWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {previewSummary.nextMonthEligibilityWarning}
        </div>
      )}

      {(formState.error || formState.success) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            formState.error
              ? "border-red-200 bg-[var(--error-soft)] text-red-700"
              : "border-green-200 bg-[var(--success-soft)] text-green-700"
          }`}
        >
          {formState.error ?? formState.message ?? "Compliance saved."}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="year" value={year} />
        {consultantMonthId && <input type="hidden" name="consultantMonthId" value={consultantMonthId} />}

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">QA Call Scores</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Mark at least 4 QA calls for the month. Call 5 is optional. Leave a score blank to
              ignore it — empty fields are not saved as zero.
            </p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {calls.map((call) => (
              <div key={call.callNumber} className="grid gap-4 px-5 py-4 sm:grid-cols-3">
                <label className="block text-sm font-semibold text-[var(--muted)]">
                  Call {call.callNumber} score (%)
                  {call.callNumber === 5 ? " (optional)" : ""}
                  <input
                    name={`call_${call.callNumber}_score`}
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={call.score}
                    onChange={(event) =>
                      setCalls((current) =>
                        current.map((entry) =>
                          entry.callNumber === call.callNumber
                            ? { ...entry, score: event.target.value }
                            : entry
                        )
                      )
                    }
                    className={inputClass}
                    placeholder="0–100"
                  />
                </label>
                <label className="block text-sm font-semibold text-[var(--muted)] sm:col-span-2">
                  Notes (optional)
                  <input
                    name={`call_${call.callNumber}_notes`}
                    type="text"
                    value={call.notes}
                    onChange={(event) =>
                      setCalls((current) =>
                        current.map((entry) =>
                          entry.callNumber === call.callNumber
                            ? { ...entry, notes: event.target.value }
                            : entry
                        )
                      )
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save Compliance"}
        </button>
      </form>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: string;
  muted?: boolean;
}) {
  const valueClass =
    highlight === "Pass"
      ? "text-green-700"
      : highlight === "Fail"
        ? "text-red-700"
        : highlight === "Pending"
          ? "text-[var(--muted)]"
          : muted
            ? "text-[var(--muted)]"
            : "text-[var(--foreground)]";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-[0_4px_14px_rgba(0,74,147,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[#dbe9fb]";
