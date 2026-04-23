import type { HeightUnit } from '../../../types';

export const LONG_STEP_INTERVAL = 10;
/** Matches `tickCellV.paddingLeft` */
export const TICK_CELL_PADDING_LEFT = 0;
/** Label column: right-aligned (ft labels like 5′11″ need room) */
export const LABEL_COL_WIDTH = 52;
/** Horizontal space between label column and tick bar */
export const LABEL_TO_TICK_GAP = 5;
/** Matches `tickCellV.paddingRight` — included in ruler track width */
export const TICK_CELL_PADDING_RIGHT = 6;
export const DEFAULT_VERTICAL_VIEWPORT = 240;

/** Centimeters per foot (international inch). Matches native rulers. */
export const CM_PER_FOOT = 30.48;

/**
 * Fixed extent for accessibility hints only. Native iOS/Android own the real min/max/step.
 */
export const NATIVE_RULER_CM_MIN = 100;
export const NATIVE_RULER_CM_MAX = 250;

/** Approximate bounds in the current display unit (for a11y). */
export function nativeRulerBoundsForUnit(unit: HeightUnit): { min: number; max: number } {
  if (unit === 'cm') {
    return { min: NATIVE_RULER_CM_MIN, max: NATIVE_RULER_CM_MAX };
  }
  return {
    min: NATIVE_RULER_CM_MIN / CM_PER_FOOT,
    max: NATIVE_RULER_CM_MAX / CM_PER_FOOT,
  };
}
