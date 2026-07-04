import {
  getAdjustedCommissionBrackets,
  getConversionMultiplier,
  getGwpAcceleratorDpp,
  type CommissionBracket,
} from "@/lib/calculations";
import {
  CONVERSION_MULTIPLIER_LEVELS,
  GWP_ACCELERATOR_LEVELS,
  gwpSimOptionLabel,
  type ConversionSimOption,
  type GwpSimOption,
  type TierStatus,
} from "@/lib/targetsMultipliers/constants";

export type SalesTier = {
  tier: number;
  pointsRequired: number;
  dollarsPerPoint: number;
  baseCommission: number;
  avgPerDay: number;
};

export type SalesTierRow = SalesTier & {
  status: TierStatus;
  statusLabel: string;
};

export type TargetsMultipliersInput = {
  currentSalesPoints: number;
  percentToTargetConversion: number;
  averageGwp: number;
  totalRosteredDaysThisMonth: number;
  fullTimeRosteredDays: number;
};

export type TargetsMultipliersResult = {
  currentSalesPoints: number;
  percentToTargetConversion: number;
  averageGwp: number;
  tiers: SalesTierRow[];
  unlockedTier: SalesTier | null;
  nextTier: SalesTier | null;
  pointsToNextTier: number | null;
  acceleratorsUnlocked: boolean;
  conversionMultiplier: number;
  gwpBonusPerPoint: number;
  unlockedBaseCommission: number;
  conversionAdjustedCommission: number;
  gwpBonus: number;
  estimatedTotalCommission: number;
  conversionPercentDisplay: number;
  gwpBandLabel: string | null;
};

export function buildSalesTiers(
  adjustedBrackets: CommissionBracket[],
  totalRosteredDays: number
): SalesTier[] {
  return adjustedBrackets.map((bracket, index) => ({
    tier: index + 1,
    pointsRequired: bracket.points,
    dollarsPerPoint: bracket.dpp,
    baseCommission: bracket.points * bracket.dpp,
    avgPerDay: totalRosteredDays > 0 ? bracket.points / totalRosteredDays : 0,
  }));
}

export function getUnlockedSalesTier(
  currentSalesPoints: number,
  tiers: SalesTier[]
): SalesTier | null {
  const safePoints = Number(currentSalesPoints || 0);
  if (safePoints <= 0 || tiers.length === 0) {
    return null;
  }

  return (
    [...tiers].reverse().find((tier) => safePoints >= tier.pointsRequired) ?? null
  );
}

export function getNextSalesTier(
  currentSalesPoints: number,
  tiers: SalesTier[]
): SalesTier | null {
  const safePoints = Number(currentSalesPoints || 0);
  return tiers.find((tier) => safePoints < tier.pointsRequired) ?? null;
}

export function getGwpBonusPerPoint(avgGwp: number): number {
  return getGwpAcceleratorDpp(avgGwp);
}

export { getConversionMultiplier } from "@/lib/calculations";

export function calculateConversionAdjustedCommission(
  baseCommission: number,
  conversionMultiplier: number
): number {
  return baseCommission * conversionMultiplier;
}

export function calculateGwpBonus(
  currentSalesPoints: number,
  gwpBonusPerPoint: number
): number {
  return currentSalesPoints * gwpBonusPerPoint;
}

export function calculateEstimatedCommission(
  baseCommission: number,
  conversionMultiplier: number,
  currentSalesPoints: number,
  gwpBonusPerPoint: number
): {
  conversionAdjustedCommission: number;
  gwpBonus: number;
  estimatedTotalCommission: number;
} {
  const conversionAdjustedCommission = calculateConversionAdjustedCommission(
    baseCommission,
    conversionMultiplier
  );
  const gwpBonus = calculateGwpBonus(currentSalesPoints, gwpBonusPerPoint);
  const estimatedTotalCommission = conversionAdjustedCommission + gwpBonus;

  return {
    conversionAdjustedCommission,
    gwpBonus,
    estimatedTotalCommission,
  };
}

export function resolveSimulatedConversionRatio(
  option: ConversionSimOption,
  currentPercentToTarget: number
): number {
  if (option === "current") {
    return currentPercentToTarget;
  }

  return option / 100;
}

export function resolveSimulatedAverageGwp(
  option: GwpSimOption,
  currentAverageGwp: number
): number {
  switch (option) {
    case "current":
      return currentAverageGwp;
    case "below_3200":
      return 0;
    case "3200":
      return 3200;
    case "3500":
      return 3500;
    case "3800":
      return 3800;
    default:
      return currentAverageGwp;
  }
}

export type WhatIfSimulationInput = {
  acceleratorsUnlocked: boolean;
  unlockedBaseCommission: number;
  currentSalesPoints: number;
  percentToTargetConversion: number;
  averageGwp: number;
  currentGwpBandLabel: string | null;
  conversionOption: ConversionSimOption;
  gwpOption: GwpSimOption;
};

export type WhatIfSimulationResult = {
  simulatedConversionPercent: number;
  simulatedConversionLabel: string;
  simulatedGwpBandLabel: string;
  simulatedConversionMultiplier: number;
  simulatedGwpBonusPerPoint: number;
  conversionAdjustedCommission: number;
  gwpBonus: number;
  estimatedTotalCommission: number;
};

export function buildWhatIfSimulation(input: WhatIfSimulationInput): WhatIfSimulationResult {
  if (!input.acceleratorsUnlocked) {
    return {
      simulatedConversionPercent: 0,
      simulatedConversionLabel: "—",
      simulatedGwpBandLabel: "—",
      simulatedConversionMultiplier: 0,
      simulatedGwpBonusPerPoint: 0,
      conversionAdjustedCommission: 0,
      gwpBonus: 0,
      estimatedTotalCommission: 0,
    };
  }

  const simulatedConversionRatio = resolveSimulatedConversionRatio(
    input.conversionOption,
    input.percentToTargetConversion
  );
  const simulatedAverageGwp = resolveSimulatedAverageGwp(input.gwpOption, input.averageGwp);
  const simulatedConversionMultiplier = getConversionMultiplier(simulatedConversionRatio);
  const simulatedGwpBonusPerPoint = getGwpBonusPerPoint(simulatedAverageGwp);

  const { conversionAdjustedCommission, gwpBonus, estimatedTotalCommission } =
    calculateEstimatedCommission(
      input.unlockedBaseCommission,
      simulatedConversionMultiplier,
      input.currentSalesPoints,
      simulatedGwpBonusPerPoint
    );

  const simulatedConversionLabel =
    input.conversionOption === "current"
      ? `${(input.percentToTargetConversion * 100).toFixed(1)}%`
      : `${input.conversionOption}%`;

  const simulatedGwpBandLabel =
    input.gwpOption === "current"
      ? gwpSimOptionLabel("current", input.currentGwpBandLabel)
      : gwpSimOptionLabel(input.gwpOption, input.currentGwpBandLabel);

  return {
    simulatedConversionPercent: simulatedConversionRatio * 100,
    simulatedConversionLabel,
    simulatedGwpBandLabel,
    simulatedConversionMultiplier,
    simulatedGwpBonusPerPoint,
    conversionAdjustedCommission,
    gwpBonus,
    estimatedTotalCommission,
  };
}

function resolveTierStatus(
  tier: SalesTier,
  unlockedTier: SalesTier | null,
  nextTier: SalesTier | null
): { status: TierStatus; statusLabel: string } {
  if (unlockedTier?.tier === tier.tier) {
    return { status: "current", statusLabel: "Current Tier" };
  }
  if (nextTier?.tier === tier.tier) {
    return { status: "next", statusLabel: "Next Tier" };
  }
  if (unlockedTier && tier.tier < unlockedTier.tier) {
    return { status: "unlocked", statusLabel: "Unlocked" };
  }
  return { status: "locked", statusLabel: "Locked" };
}

function resolveGwpBandLabel(averageGwp: number, bonusPerPoint: number): string | null {
  if (bonusPerPoint <= 0) {
    return null;
  }

  const match = GWP_ACCELERATOR_LEVELS.find((level) => level.bonusPerPoint === bonusPerPoint);
  return match?.label ?? null;
}

export function buildTargetsMultipliersResult(
  input: TargetsMultipliersInput
): TargetsMultipliersResult {
  const adjustedBrackets = getAdjustedCommissionBrackets({
    full_time_rostered_days: input.fullTimeRosteredDays,
    total_rostered_days_this_month: input.totalRosteredDaysThisMonth,
  });

  const tiers = buildSalesTiers(adjustedBrackets, input.totalRosteredDaysThisMonth);
  const unlockedTier = getUnlockedSalesTier(input.currentSalesPoints, tiers);
  const nextTier = getNextSalesTier(input.currentSalesPoints, tiers);
  const pointsToNextTier =
    nextTier !== null
      ? Math.max(0, nextTier.pointsRequired - input.currentSalesPoints)
      : null;

  const acceleratorsUnlocked = unlockedTier !== null;
  const unlockedBaseCommission = unlockedTier?.baseCommission ?? 0;

  const conversionMultiplier = acceleratorsUnlocked
    ? getConversionMultiplier(input.percentToTargetConversion)
    : 0;

  const gwpBonusPerPoint = acceleratorsUnlocked
    ? getGwpBonusPerPoint(input.averageGwp)
    : 0;

  const { conversionAdjustedCommission, gwpBonus, estimatedTotalCommission } =
    acceleratorsUnlocked
      ? calculateEstimatedCommission(
          unlockedBaseCommission,
          conversionMultiplier,
          input.currentSalesPoints,
          gwpBonusPerPoint
        )
      : {
          conversionAdjustedCommission: 0,
          gwpBonus: 0,
          estimatedTotalCommission: 0,
        };

  const tierRows: SalesTierRow[] = tiers.map((tier) => {
    const { status, statusLabel } = resolveTierStatus(tier, unlockedTier, nextTier);
    return { ...tier, status, statusLabel };
  });

  return {
    currentSalesPoints: input.currentSalesPoints,
    percentToTargetConversion: input.percentToTargetConversion,
    averageGwp: input.averageGwp,
    tiers: tierRows,
    unlockedTier,
    nextTier,
    pointsToNextTier,
    acceleratorsUnlocked,
    conversionMultiplier,
    gwpBonusPerPoint,
    unlockedBaseCommission,
    conversionAdjustedCommission,
    gwpBonus,
    estimatedTotalCommission,
    conversionPercentDisplay: input.percentToTargetConversion * 100,
    gwpBandLabel: resolveGwpBandLabel(input.averageGwp, gwpBonusPerPoint),
  };
}

export { CONVERSION_MULTIPLIER_LEVELS, GWP_ACCELERATOR_LEVELS };
