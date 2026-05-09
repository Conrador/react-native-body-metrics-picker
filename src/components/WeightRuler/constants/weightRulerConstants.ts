import type { WeightUnit } from '../../../types';

/**
 * Single source of truth for the **canonical** weight band (kg).
 * Native is told a different range when `unit === 'lb'` so the lb tick grid covers
 * the **same physical extent** (50 kg ≈ 110 lb, 250 kg ≈ 551 lb), giving a lossless
 * round-trip when the unit switcher flips between kg and lb.
 */
export const WEIGHT_RULER_KG_MIN = 50;
export const WEIGHT_RULER_KG_MAX = 250;
export const WEIGHT_RULER_STEP = 1;
export const WEIGHT_RULER_LONG_STEP_INTERVAL = 10;

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
