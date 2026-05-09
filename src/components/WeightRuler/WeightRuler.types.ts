import type { ViewStyle } from 'react-native';

import type { WeightUnit } from '../../types';

export type WeightRulerLiveSnapshot = {
  /** Canonical weight in **kilograms** — ruler state is unit-independent. */
  valueKg: number;
  /** Decimal **kg** string sent by the JS wrapper (e.g. `"100.00"`). */
  valueString: string;
  /** Currently displayed unit (`'kg'` or `'lb'`); only changes the on-screen scale. */
  unit: WeightUnit;
};

export type WeightRulerHandle = {
  /** Canonical weight in **kilograms** (always, regardless of display unit). */
  getValueKg: () => number;
  /** Decimal **kg** string (mirrors `valueString` from the snapshot). */
  getValueString: () => string;
  getSnapshot: () => WeightRulerLiveSnapshot;
  subscribe: (listener: (snapshot: WeightRulerLiveSnapshot) => void) => () => void;
};

export interface WeightRulerProps {
  /** Display unit; **only relabels the scale** — internal value stays in kilograms. */
  unit: WeightUnit;
  /**
   * Initial weight in **kilograms** (canonical).
   * Re-applied only on remount of the underlying native view (driven by `unit` change).
   */
  initialValue: number;
  /** Snapped weight in **kilograms** as a decimal string, e.g. `"100.00"`. */
  onValueChange?: (valueKg: string) => void;

  formatValue?: (valueKg: number) => string;
  onScrollBegin?: () => void;
  onScrollEnd?: () => void;

  /** iOS: PostScript / Expo font key. Android: `ReactFontManager` key. */
  fontFamily?: string;

  /** Distance in dp/pt along the arc between adjacent ticks. */
  tickSpacing?: number;
  minorTickHeight?: number;
  midTickHeight?: number;
  majorTickHeight?: number;
  tickWidth?: number;

  /**
   * Vertical distance from the bottom of the view to the arc center (dp/pt).
   * Larger value = flatter arc (closer to a straight line).
   */
  arcCenterOffset?: number;

  tickColor?: string;
  midTickColor?: string;
  majorTickColor?: string;
  activeTickColor?: string;
  activeNeighborTickColor?: string;

  /** Optional accent for the centered (selected) label under the glass overlay. */
  glassCenterLabelColor?: string;
  /** Optional fill for the glass overlay. iOS uses a `UIVisualEffect` material when omitted. */
  glassBackgroundColor?: string;
  /** Optional accent for the glass overlay border. */
  glassBorderColor?: string;
  /**
   * Half angular span (radians) of the glass arc band. `0` (default) derives a value from
   * `tickSpacing` so the band stays clearly wider than tall (~3 labels + side overhang).
   */
  glassArcHalfAngle?: number;
  /** Extra distance (dp) above the labels where the outer edge of the glass band sits. */
  glassOuterPadding?: number;
  /** Vertical room (dp) for the labels rendered **above** the tick tips, under the glass. */
  glassLabelArea?: number;
  /** Font size for the labels visible under the glass overlay. */
  glassLabelFontSize?: number;

  /** Background fill of the ruler track (use `'transparent'` to skip). */
  trackColor?: string;

  style?: ViewStyle;
}
