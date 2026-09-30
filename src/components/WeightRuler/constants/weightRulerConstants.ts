import type { WeightUnit } from '../../../types';

/**
 * Single source of truth for the **canonical** weight band (kg).
 * Native is told a different range when `unit === 'lb'` so the lb tick grid covers
 * the **same physical extent** (50 kg ≈ 110 lb, 250 kg ≈ 551 lb), giving a lossless
 * round-trip when the unit switcher flips between kg and lb.
 */
export const WEIGHT_RULER_KG_MIN = 50;
export const WEIGHT_RULER_KG_MAX = 250;

/** Supported snap precisions, expressed in the **active display unit** (kg or lb). */
export const WEIGHT_RULER_STEPS = [1, 0.5, 0.1] as const;
export type WeightRulerStep = (typeof WEIGHT_RULER_STEPS)[number];

/** Default snap precision — whole kg / whole lb. */
export const WEIGHT_RULER_STEP: WeightRulerStep = 1;

type WeightRulerTickLayout = {
  fractionDigits: number;
  /** Ticks between labelled majors. */
  longStepInterval: number;
  /** Ticks between mid-height ticks. */
  midStepInterval: number;
};

/**
 * Tick hierarchy per precision. `longStepInterval` stays at 10 for every step so labelled majors
 * keep the same on-screen spacing (10 × `tickSpacing`): every 10 units at `1`, every 5 at `0.5`,
 * every 1 at `0.1`.
 */
const WEIGHT_RULER_TICK_LAYOUT: Record<WeightRulerStep, WeightRulerTickLayout> = {
  1: { fractionDigits: 0, longStepInterval: 10, midStepInterval: 5 },
  0.5: { fractionDigits: 1, longStepInterval: 10, midStepInterval: 2 },
  0.1: { fractionDigits: 1, longStepInterval: 10, midStepInterval: 5 },
};

/** Falls back to {@link WEIGHT_RULER_STEP} for values outside {@link WEIGHT_RULER_STEPS}. */
export function resolveWeightRulerStep(step: number | undefined): WeightRulerStep {
  return WEIGHT_RULER_STEPS.find((s) => s === step) ?? WEIGHT_RULER_STEP;
}

export function weightRulerTickLayout(step: WeightRulerStep): WeightRulerTickLayout {
  return WEIGHT_RULER_TICK_LAYOUT[step];
}

/** Exact NIST conversion factor (1 lb = 0.45359237 kg). */
export const KG_PER_LB = 0.45359237;
export const LB_PER_KG = 1 / KG_PER_LB;

/** Kept aligned with `tickLabelFontSize` in the iOS/Android weight ruler implementations. */
export const WEIGHT_TICK_LABEL_FONT_SIZE = 14;

/** Default arc/track height for the horizontal weight ruler card. */
export const DEFAULT_WEIGHT_RULER_HEIGHT = 180;

/** Format the underlying numeric weight payload (canonical **kg**) sent to JS. */
export function formatWeightRulerString(kg: number): string {
  if (!Number.isFinite(kg)) return '0.00';
  return kg.toFixed(2);
}

/** Convert the canonical kg value to a value in the given display unit. */
export function weightRulerDisplayFromKg(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg * LB_PER_KG : kg;
}

/** Convert a display-unit value back to the canonical kg. */
export function weightRulerKgFromDisplay(displayValue: number, unit: WeightUnit): number {
  return unit === 'lb' ? displayValue * KG_PER_LB : displayValue;
}

/**
 * Tick range **in the active display unit**. The same physical band (50–250 kg) is
 * always covered, so lb mode iterates 110–551 ticks (rounded to whole lb), keeping
 * the rendered scale physically equivalent across unit flips.
 */
export function weightRulerBoundsForUnit(unit: WeightUnit): { min: number; max: number } {
  if (unit === 'lb') {
    return {
      min: Math.round(WEIGHT_RULER_KG_MIN * LB_PER_KG),
      max: Math.round(WEIGHT_RULER_KG_MAX * LB_PER_KG),
    };
  }
  return { min: WEIGHT_RULER_KG_MIN, max: WEIGHT_RULER_KG_MAX };
}
