export type ConversionMultiplierLevel = {
  conversionPercent: number;
  multiplier: number;
};

/** Display ladder for conversion accelerator tiers (% of target → multiplier). */
export const CONVERSION_MULTIPLIER_LEVELS: ConversionMultiplierLevel[] = [
  { conversionPercent: 0, multiplier: 0 },
  { conversionPercent: 80, multiplier: 0.8 },
  { conversionPercent: 85, multiplier: 0.85 },
  { conversionPercent: 90, multiplier: 0.9 },
  { conversionPercent: 95, multiplier: 0.95 },
  { conversionPercent: 100, multiplier: 1.0 },
  { conversionPercent: 105, multiplier: 1.05 },
  { conversionPercent: 110, multiplier: 1.1 },
  { conversionPercent: 115, multiplier: 1.15 },
  { conversionPercent: 120, multiplier: 1.2 },
];

export type GwpAcceleratorLevel = {
  minAverageGwp: number;
  bonusPerPoint: number;
  label: string;
};

export const GWP_ACCELERATOR_LEVELS: GwpAcceleratorLevel[] = [
  { minAverageGwp: 3800, bonusPerPoint: 40, label: "GWP $3,800+" },
  { minAverageGwp: 3500, bonusPerPoint: 30, label: "GWP $3,500+" },
  { minAverageGwp: 3200, bonusPerPoint: 20, label: "GWP $3,200+" },
];

export type TierStatus = "current" | "unlocked" | "locked" | "next";

export type ConversionSimOption =
  | "current"
  | 80
  | 85
  | 90
  | 95
  | 100
  | 105
  | 110
  | 115
  | 120;

export type GwpSimOption = "current" | "below_3200" | "3200" | "3500" | "3800";

export const CONVERSION_SIM_OPTIONS: { value: ConversionSimOption; label: string }[] = [
  { value: "current", label: "Current" },
  { value: 80, label: "80%" },
  { value: 85, label: "85%" },
  { value: 90, label: "90%" },
  { value: 95, label: "95%" },
  { value: 100, label: "100%" },
  { value: 105, label: "105%" },
  { value: 110, label: "110%" },
  { value: 115, label: "115%" },
  { value: 120, label: "120%" },
];

export const GWP_SIM_OPTIONS: { value: GwpSimOption; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "below_3200", label: "Below $3,200" },
  { value: "3200", label: "$3,200+" },
  { value: "3500", label: "$3,500+" },
  { value: "3800", label: "$3,800+" },
];

export function gwpSimOptionLabel(option: GwpSimOption, currentBandLabel: string | null): string {
  if (option === "current") {
    return currentBandLabel ?? "Current AVG GWP";
  }

  return GWP_SIM_OPTIONS.find((item) => item.value === option)?.label ?? option;
}
