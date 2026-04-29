import type { HeightUnit } from '../../../types';

export const LONG_STEP_INTERVAL = 10;
/** Leading gutter in track width on iOS only (Android pill-width track has no outer left pad). */
export const TICK_CELL_PADDING_LEFT = 0;
/** Label column: right-aligned (ft labels like 6′11″ under glass scale need a few extra dp) */
export const LABEL_COL_WIDTH = 60;
/** Horizontal space between label column and tick bar */
export const LABEL_TO_TICK_GAP = 5;
/** Android native ruler width matches the pill (no extra horizontal gutter); iOS still uses this in track width. */
export const TICK_CELL_PADDING_RIGHT = 6;
/**
 * Extra horizontal space on Android after the major tick column (pill + view extend together).
 * Keep in sync with [ANDROID_RULER_EXTRA_TRACK_DP] in HeightRulerView.kt.
 */
export const ANDROID_RULER_EXTRA_TRACK_DP = 28;
/**
 * iOS: major ticks scale + translate right under the glass (`HeightRulerTickRowView`); without extra
 * track width the trailing tick is clipped by `UICollectionView` bounds.
 */
export const IOS_RULER_EXTRA_TRACK_DP = 22;
export const DEFAULT_VERTICAL_VIEWPORT = 240;

/** Same shape as native `onValueChange` payloads (two decimal places). */
export function formatHeightRulerCmString(cm: number): string {
  if (!Number.isFinite(cm)) return '0.00';
  return cm.toFixed(2);
}

/**
 * Native tick label size (pt on iOS, sp on Android). Not a `HeightRuler` prop — fixed in native code so
 * pill height and clipping stay consistent. Keep in sync with `TICK_LABEL_FONT_SIZE_SP` in HeightRulerView.kt
 * and `tickLabelFontSize` in RulerStateModel.swift.
 */
export const TICK_LABEL_FONT_SIZE = 19;

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
