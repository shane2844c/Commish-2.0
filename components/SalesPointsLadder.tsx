"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatCurrencyNoDecimals, formatPercent } from "@/lib/calculations";
import {
  buildWhatIfSimulation,
  calculateEstimatedCommission,
  type SalesTierRow,
} from "@/lib/targetsMultipliers/calculate";
import {
  CONVERSION_SIM_OPTIONS,
  GWP_SIM_OPTIONS,
  type ConversionSimOption,
  type GwpSimOption,
} from "@/lib/targetsMultipliers/constants";

type SalesPointsLadderProps = {
  tiers: SalesTierRow[];
  currentSalesPoints: number;
  percentToTargetConversion: number;
  averageGwp: number;
  currentGwpBandLabel: string | null;
};

function formatPoints(value: number): string {
  return Number(value).toFixed(2);
}

function formatAvgPerDay(value: number): string {
  return value.toFixed(2);
}

function salesPointsForTierRow(currentSalesPoints: number, tier: SalesTierRow): number {
  return currentSalesPoints >= tier.pointsRequired ? currentSalesPoints : tier.pointsRequired;
}

export default function SalesPointsLadder({
  tiers,
  currentSalesPoints,
  percentToTargetConversion,
  averageGwp,
  currentGwpBandLabel,
}: SalesPointsLadderProps) {
  const [conversionOption, setConversionOption] = useState<ConversionSimOption>("current");
  const [gwpOption, setGwpOption] = useState<GwpSimOption>("current");

  const simulation = useMemo(
    () =>
      buildWhatIfSimulation({
        acceleratorsUnlocked: true,
        unlockedBaseCommission: 0,
        currentSalesPoints,
        percentToTargetConversion,
        averageGwp,
        currentGwpBandLabel,
        conversionOption,
        gwpOption,
      }),
    [
      currentSalesPoints,
      percentToTargetConversion,
      averageGwp,
      currentGwpBandLabel,
      conversionOption,
      gwpOption,
    ]
  );

  const tierCommissions = useMemo(
    () =>
      tiers.map((tier) => {
        const pointsUsed = salesPointsForTierRow(currentSalesPoints, tier);
        const result = calculateEstimatedCommission(
          tier.baseCommission,
          simulation.simulatedConversionMultiplier,
          pointsUsed,
          simulation.simulatedGwpBonusPerPoint
        );

        return {
          tier: tier.tier,
          pointsUsed,
          ...result,
        };
      }),
    [
      tiers,
      currentSalesPoints,
      simulation.simulatedConversionMultiplier,
      simulation.simulatedGwpBonusPerPoint,
    ]
  );

  const isSimulating =
    conversionOption !== "current" || gwpOption !== "current";

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Sales Points Ladder</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Toggle conversion and GWP to preview commission at each tier. Your real stats are
              unchanged.
            </p>
          </div>
          {isSimulating ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
              Preview mode
            </span>
          ) : null}
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Conversion % to Target
            </p>
            <ToggleGroup
              options={CONVERSION_SIM_OPTIONS}
              value={conversionOption}
              onChange={setConversionOption}
              currentLabel={
                conversionOption === "current"
                  ? formatPercent(percentToTargetConversion)
                  : undefined
              }
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              AVG GWP
            </p>
            <ToggleGroup options={GWP_SIM_OPTIONS} value={gwpOption} onChange={setGwpOption} />
          </div>
        </div>

        <p className="mt-4 text-xs text-[var(--muted)]">
          Showing {simulation.simulatedConversionLabel} conversion ·{" "}
          {simulation.simulatedGwpBandLabel} ·{" "}
          {simulation.simulatedConversionMultiplier.toFixed(2)}× multiplier
          {simulation.simulatedGwpBonusPerPoint > 0
            ? ` · ${formatCurrency(simulation.simulatedGwpBonusPerPoint)}/pt GWP bonus`
            : " · no GWP bonus"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)]">
          <thead className="bg-[#f6f9ff]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
                Tier
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
                Sales Points Needed
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
                AVG / Day
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
                $ Per Point
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
                Base Commission
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
                Est. Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {tiers.map((tier) => {
              const commission = tierCommissions.find((row) => row.tier === tier.tier);

              return (
                <tr
                  key={tier.tier}
                  className={
                    tier.status === "current"
                      ? "bg-[#eef6ff]"
                      : tier.status === "next"
                        ? "bg-[#fafcff]"
                        : "hover:bg-[#f8fbff]"
                  }
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                    Tier {tier.tier}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatPoints(tier.pointsRequired)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {formatAvgPerDay(tier.avgPerDay)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">${tier.dollarsPerPoint}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    {formatCurrencyNoDecimals(tier.baseCommission)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <span className="font-semibold text-[var(--brand)]">
                      {formatCurrencyNoDecimals(commission?.estimatedTotalCommission ?? 0)}
                    </span>
                    {commission && commission.pointsUsed !== tier.pointsRequired ? (
                      <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                        at {formatPoints(commission.pointsUsed)} pts
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tier.status} label={tier.statusLabel} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const className =
    status === "current"
      ? "bg-[var(--brand)] text-white"
      : status === "next"
        ? "border border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-dark)]"
        : status === "unlocked"
          ? "bg-green-100 text-green-800"
          : "bg-[#eef1f5] text-[var(--muted)]";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

function ToggleGroup<T extends string | number>({
  options,
  value,
  onChange,
  currentLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  currentLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.value === value;
        const label =
          option.value === "current" && currentLabel
            ? `${option.label} (${currentLabel})`
            : option.label;

        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
              isActive
                ? "bg-[var(--brand)] text-white shadow-sm"
                : "border border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand-dark)]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
