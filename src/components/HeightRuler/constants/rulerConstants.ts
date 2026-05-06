import type { HeightUnit } from '../../../types';

export const LONG_STEP_INTERVAL = 10;
export const TICK_CELL_PADDING_LEFT = 0;
export const LABEL_COL_WIDTH = 60;
export const LABEL_TO_TICK_GAP = 5;
export const TICK_CELL_PADDING_RIGHT = 6;
/** Keep aligned with `ANDROID_RULER_EXTRA_TRACK_DP` in `HeightRulerView.kt`. */
export const ANDROID_RULER_EXTRA_TRACK_DP = 28;
/** Keep aligned with iOS ruler tick overflow in `HeightRulerUIKitView`. */
export const IOS_RULER_EXTRA_TRACK_DP = 22;
export const DEFAULT_VERTICAL_VIEWPORT = 240;

export function formatHeightRulerCmString(cm: number): string {
  if (!Number.isFinite(cm)) return '0.00';
  return cm.toFixed(2);
}

/** Matches native ruler label metric; synced with Kotlin `TICK_LABEL_FONT_SIZE_SP` and Swift `tickLabelFontSize`. */
export const TICK_LABEL_FONT_SIZE = 19;

export const CM_PER_FOOT = 30.48;

export const NATIVE_RULER_CM_MIN = 100;
export const NATIVE_RULER_CM_MAX = 250;

/** Bounds in cm or ft for helpers (same band as native). */
export function nativeRulerBoundsForUnit(unit: HeightUnit): { min: number; max: number } {
  if (unit === 'cm') {
    return { min: NATIVE_RULER_CM_MIN, max: NATIVE_RULER_CM_MAX };
  }
  return {
    min: NATIVE_RULER_CM_MIN / CM_PER_FOOT,
    max: NATIVE_RULER_CM_MAX / CM_PER_FOOT,
  };
}
