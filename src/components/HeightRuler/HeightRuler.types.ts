import type { ViewStyle } from 'react-native';

import type { HeightUnit } from '../../types';

export type HeightRulerLiveSnapshot = {
  valueCm: number;
  valueString: string;
  unit: HeightUnit;
};

export type HeightRulerHandle = {
  getValueCm: () => number;
  getValueString: () => string;
  getSnapshot: () => HeightRulerLiveSnapshot;
  subscribe: (listener: (snapshot: HeightRulerLiveSnapshot) => void) => () => void;
};

export interface HeightRulerProps {
  /** Display unit only; events and `initialValue` stay in centimetres. */
  unit: HeightUnit;
  /** Scroll position in cm; not re-applied on every render — use `key` or remount to reset. */
  initialValue: number;
  /** Centimetre amount as decimal string, e.g. `"175.00"`. */
  onValueChange?: (value: string) => void;

  formatValue?: (value: number) => string;
  onScrollBegin?: () => void;
  onScrollEnd?: () => void;

  /** iOS: PostScript name; Android: `Typeface.create`. Native applies bold. */
  fontFamily?: string;

  tickSpacing?: number;
  minorTickHeight?: number;
  midTickHeight?: number;
  majorTickHeight?: number;
  tickWidth?: number;

  /** Android: empty uses theme tertiary. iOS: defaults to a light grey if omitted. */
  tickColor?: string;
  midTickColor?: string;
  majorTickColor?: string;
  glassActiveTickColor?: string;
  glassActiveNeighborTickColor?: string;
  /** Accent for the snapped label under the glass (`#`, `rgb()`, `rgba()`). Empty = derive from majors/mids. */
  glassCenterLabelColor?: string;

  /** Android only (ignored on iOS). Pill fill; empty uses default tint. */
  glassPillBackgroundColor?: string;
  /** Android only (ignored on iOS). Corner radius in dp; `0` = default (~16). */
  glassPillBorderRadius?: number;

  style?: ViewStyle;
}
