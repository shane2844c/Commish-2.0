import SalesPointsLadder from "@/components/SalesPointsLadder";
import {
  buildTargetsMultipliersResult,
  CONVERSION_MULTIPLIER_LEVELS,
  GWP_ACCELERATOR_LEVELS,
  type TargetsMultipliersInput,
} from "@/lib/targetsMultipliers/calculate";
import {
  formatCurrency,
  formatCurrencyNoDecimals,
  formatPercent,
} from "@/lib/calculations";

type TargetsMultipliersViewProps = TargetsMultipliersInput & {
  monthLabel: string;
};

function formatPoints(value: number): string {
  return Number(value).toFixed(2);
}

export default function TargetsMultipliersView({
  monthLabel,
  ...input
}: TargetsMultipliersViewProps) {
  const data = buildTargetsMultipliersResult(input);

  return (
    <div className="space-y-8">
      <p className="rounded-xl border border-[var(--border)] bg-[#f8fbff] px-4 py-3 text-sm text-[var(--muted)]">
        Sales Points unlock your commission tier first. Conversion and GWP accelerators only apply
        after a Sales Points tier is reached. Figures reflect your {monthLabel} performance.
      </p>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Your Progress Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard label="Current Sales Points" value={formatPoints(data.currentSalesPoints)} />
          <SummaryCard
            label="Current Tier"
            value={data.unlockedTier ? `Tier ${data.unlockedTier.tier}` : "None"}
            tone={data.unlockedTier ? "active" : "locked"}
          />
          <SummaryCard
            label="Next Tier Needed"
            value={
              data.nextTier
                ? `Tier ${data.nextTier.tier}${
                    data.pointsToNextTier !== null
                      ? ` · ${formatPoints(data.pointsToNextTier)} more pts`
                      : ""
                  }`
                : data.unlockedTier
                  ? "Highest tier reached"
                  : `Tier 1 · ${formatPoints(data.tiers[0]?.pointsRequired ?? 0)} pts needed`
            }
          />
          <SummaryCard
            label="Base Commission Unlocked"
            value={data.acceleratorsUnlocked ? formatCurrencyNoDecimals(data.unlockedBaseCommission) : "$0"}
            tone={data.acceleratorsUnlocked ? "active" : "locked"}
          />
          <SummaryCard
            label="Conversion Accelerator"
            value={
              data.acceleratorsUnlocked
                ? data.conversionMultiplier > 0
                  ? "Active"
                  : "Locked (< 80% to target)"
                : "Locked"
            }
            tone={data.acceleratorsUnlocked && data.conversionMultiplier > 0 ? "active" : "locked"}
            subtext={
              data.acceleratorsUnlocked
                ? `${formatPercent(data.percentToTargetConversion)} to target · ${data.conversionMultiplier.toFixed(2)}×`
                : "Reach a Sales Points tier first"
            }
          />
          <SummaryCard
            label="GWP Accelerator"
            value={
              data.acceleratorsUnlocked
                ? data.gwpBonusPerPoint > 0
                  ? "Active"
                  : "Locked (AVG GWP below $3,200)"
                : "Locked"
            }
            tone={data.acceleratorsUnlocked && data.gwpBonusPerPoint > 0 ? "active" : "locked"}
            subtext={
              data.acceleratorsUnlocked
                ? data.gwpBandLabel ?? `AVG GWP ${formatCurrency(data.averageGwp)}`
                : "Reach a Sales Points tier first"
            }
          />
        </div>
      </section>

      <SalesPointsLadder
        tiers={data.tiers}
        currentSalesPoints={data.currentSalesPoints}
        percentToTargetConversion={data.percentToTargetConversion}
        averageGwp={data.averageGwp}
        currentGwpBandLabel={data.gwpBandLabel}
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <AcceleratorPanel
          title="Conversion Accelerator"
          locked={!data.acceleratorsUnlocked}
          lockedMessage="Reach a Sales Points tier first to unlock the Conversion Accelerator."
        >
          {data.acceleratorsUnlocked ? (
            <>
              <dl className="mb-4 grid gap-3 sm:grid-cols-3">
                <Metric label="Conversion to target" value={formatPercent(data.percentToTargetConversion)} />
                <Metric
                  label="Current multiplier"
                  value={data.conversionMultiplier > 0 ? `${data.conversionMultiplier.toFixed(2)}×` : "0×"}
                />
                <Metric
                  label="Adjusted commission"
                  value={formatCurrencyNoDecimals(data.conversionAdjustedCommission)}
                />
              </dl>
              <MiniTable
                headers={["Conversion %", "Multiplier", "Commission Result"]}
                rows={CONVERSION_MULTIPLIER_LEVELS.map((level) => [
                  `${level.conversionPercent}%`,
                  level.multiplier.toFixed(2),
                  formatCurrencyNoDecimals(data.unlockedBaseCommission * level.multiplier),
                ])}
                highlightRowIndex={CONVERSION_MULTIPLIER_LEVELS.findIndex(
                  (level) => level.multiplier === data.conversionMultiplier
                )}
              />
            </>
          ) : null}
        </AcceleratorPanel>

        <AcceleratorPanel
          title="GWP Accelerator"
          locked={!data.acceleratorsUnlocked}
          lockedMessage="Reach a Sales Points tier first to unlock the GWP Accelerator."
        >
          {data.acceleratorsUnlocked ? (
            <>
              <dl className="mb-4 grid gap-3 sm:grid-cols-3">
                <Metric label="Current AVG GWP" value={formatCurrency(data.averageGwp)} />
                <Metric label="Current GWP band" value={data.gwpBandLabel ?? "Below $3,200"} />
                <Metric label="Current GWP bonus" value={formatCurrency(data.gwpBonus)} />
              </dl>
              <MiniTable
                headers={["Average GWP Required", "Bonus Per Point", "Bonus Amount"]}
                rows={GWP_ACCELERATOR_LEVELS.map((level) => [
                  `$${level.minAverageGwp.toLocaleString("en-AU")}+`,
                  `$${level.bonusPerPoint}`,
                  formatCurrency(data.currentSalesPoints * level.bonusPerPoint),
                ])}
                highlightRowIndex={GWP_ACCELERATOR_LEVELS.findIndex(
                  (level) => level.bonusPerPoint === data.gwpBonusPerPoint
                )}
              />
            </>
          ) : null}
        </AcceleratorPanel>
      </section>

      <section className="rounded-xl border border-[var(--brand)] bg-[#f7fbff] p-6 shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Estimated Commission Summary</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Conversion-adjusted commission replaces base commission in the total. GWP bonus is added on
          top.
        </p>
        <dl className="mt-5 space-y-3">
          <SummaryLine
            label="Base Sales Points Commission"
            value={formatCurrencyNoDecimals(data.unlockedBaseCommission)}
          />
          <SummaryLine
            label="Conversion Adjusted Commission"
            value={formatCurrencyNoDecimals(data.conversionAdjustedCommission)}
          />
          <SummaryLine label="GWP Bonus" value={formatCurrency(data.gwpBonus)} />
          <div className="border-t border-[var(--border)] pt-3">
            <SummaryLine
              label="Estimated Total Commission"
              value={formatCurrencyNoDecimals(data.estimatedTotalCommission)}
              emphasis
            />
          </div>
        </dl>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subtext,
  tone = "default",
}: {
  label: string;
  value: string;
  subtext?: string;
  tone?: "default" | "active" | "locked";
}) {
  const toneClass =
    tone === "active"
      ? "border-green-200 bg-green-50/50"
      : tone === "locked"
        ? "border-[var(--border)] bg-[#f9fafb]"
        : "border-[var(--border)] bg-white";

  return (
    <div className={`rounded-xl border p-4 shadow-[0_4px_14px_rgba(0,74,147,0.06)] ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{value}</p>
      {subtext ? <p className="mt-1 text-xs text-[var(--muted)]">{subtext}</p> : null}
    </div>
  );
}

function AcceleratorPanel({
  title,
  locked,
  lockedMessage,
  children,
}: {
  title: string;
  locked: boolean;
  lockedMessage: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
      <div className="border-b border-[var(--border)] px-6 py-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
      </div>
      <div className="px-6 py-4">
        {locked ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[#f9fafb] px-4 py-4 text-sm text-[var(--muted)]">
            <p className="font-medium text-[var(--foreground)]">Locked</p>
            <p className="mt-1">{lockedMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function MiniTable({
  headers,
  rows,
  highlightRowIndex,
}: {
  headers: string[];
  rows: string[][];
  highlightRowIndex: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="min-w-full divide-y divide-[var(--border)] text-sm">
        <thead className="bg-[#f6f9ff]">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row, rowIndex) => (
            <tr
              key={row.join("-")}
              className={rowIndex === highlightRowIndex ? "bg-[#eef6ff] font-medium" : ""}
            >
              {row.map((cell) => (
                <td key={cell} className="whitespace-nowrap px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={`text-sm ${emphasis ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
        {label}
      </dt>
      <dd className={`text-sm ${emphasis ? "text-xl font-bold text-[var(--brand)]" : "font-semibold"}`}>
        {value}
      </dd>
    </div>
  );
}
