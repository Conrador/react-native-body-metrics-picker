import type { ViewStyle } from 'react-native';

import type { HeightUnit } from '../../types';

/** Live selection synchronized with native ruler (via ref). */
export type HeightRulerLiveSnapshot = {
  /** Centimeters — native source of truth. */
  valueCm: number;
  /** Decimal string from native, e.g. `"175.00"`. */
  valueString: string;
  /** Current `unit` prop on `<HeightRuler />`. */
  unit: HeightUnit;
};

/** Imperative access: snapshots and optional live subscriptions (no React children / Context). */
export type HeightRulerHandle = {
  getValueCm: () => number;
  getValueString: () => string;
  getSnapshot: () => HeightRulerLiveSnapshot;
  /**
   * Called immediately with the latest snapshot, then on every native change.
   * Returns unsubscribe. Prefer over `onValueChange` when you want the same UX without lifting state.
   */
  subscribe: (listener: (snapshot: HeightRulerLiveSnapshot) => void) => () => void;
};

export interface HeightRulerProps {
  /** Current unit (controlled) — display only; emitted values are always cm. */
  unit: HeightUnit;
  /**
   * Initial scroll position in **centimeters** (native source of truth), regardless of `unit`.
   */
  initialValue: number;
  /**
   * Called when the selection changes. `value` is always a centimeter amount (decimal string, e.g. `"175.00"`).
   */
  onValueChange?: (value: string) => void;

  // ── Rendering ──────────────────────────────────────────────────────
  /** Visible height of the vertical ruler viewport. Default: 240. */
  verticalViewportHeight?: number;
  formatValue?: (value: number) => string;
  onScrollBegin?: () => void;
  onScrollEnd?: () => void;

  // Typography
  /** PostScript / family name on iOS (`UIFont(name:size:)`), Android `Typeface.create`. Bold is applied natively. */
  fontFamily?: string;

  // Ruler geometry
  tickSpacing?: number;
  minorTickHeight?: number;
  midTickHeight?: number;
  majorTickHeight?: number;
  tickWidth?: number;

  // Colors
  tickColor?: string;
  midTickColor?: string;
  /** Also drives default label ink on the native ruler (with glass / neighbor blending). */
  majorTickColor?: string;
  glassActiveTickColor?: string;
  glassActiveNeighborTickColor?: string;
  /**
   * **Android only** — ignored on iOS. Background fill for the center glass “pill”.
   * When set, native label/tick contrast adjusts on Android.
   */
  glassPillBackgroundColor?: string;
  /** **Android only** — pill corner radius in dp. Omitted or `0` uses the default (~16). */
  glassPillBorderRadius?: number;

  /** Container style */
  style?: ViewStyle;
}
