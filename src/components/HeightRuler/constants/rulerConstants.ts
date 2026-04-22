import type { HeightUnit } from '../../../types';

export const LONG_STEP_INTERVAL = 10;
/** Matches `tickCellV.paddingLeft` */
export const TICK_CELL_PADDING_LEFT = 0;
/** Label column: right-aligned (ft labels like 5′11″ need room) */
export const LABEL_COL_WIDTH = 52;
/** Horizontal space between label column and tick bar */
export const LABEL_TO_TICK_GAP = 4;
/** Matches `tickCellV.paddingRight` — included in ruler track width */
export const TICK_CELL_PADDING_RIGHT = 6;
export const DEFAULT_VERTICAL_VIEWPORT = 240;

/** Imperial ruler: 1 inch per tick. Min = 1′0″ (12 in); max ≈ 8′2″ to align with cm 50–250. */
export const FT_MIN_INCHES = 12;
export const FT_MAX_INCHES = Math.floor(8.2 * 12);
export const FT_STEP_FEET = 1 / 12;

/** Internal per-unit defaults — can be overridden via props */
export const UNIT_CONFIG: Record<
  HeightUnit,
  { min: number; max: number; step: number; fractionDigits: number }
> = {
  cm: { min: 50, max: 250, step: 1, fractionDigits: 0 },
  ft: {
    min: FT_MIN_INCHES / 12,
    max: FT_MAX_INCHES / 12,
    step: FT_STEP_FEET,
    fractionDigits: 4,
  },
};
