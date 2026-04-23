import type { ViewStyle } from 'react-native';

import type { HeightUnit } from '../../types';

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
  fontFamily?: string;
  /** Point size for tick labels (major ticks and values under the glass). Default: 19. */
  tickLabelFontSize?: number;

  // Ruler geometry
  tickSpacing?: number;
  minorTickHeight?: number;
  midTickHeight?: number;
  majorTickHeight?: number;
  tickWidth?: number;

  // Colors
  backgroundColor?: string;
  rulerChromeColor?: string;
  tickColor?: string;
  midTickColor?: string;
  majorTickColor?: string;
  selectedTickColor?: string;
  glassSurfaceColor?: string;
  glassBorderColor?: string;
  glassSheenColor?: string;
  glassRimColor?: string;
  glassLiquidBorderColor?: string;
  glassActiveTickColor?: string;
  glassActiveNeighborTickColor?: string;

  /** Container style */
  style?: ViewStyle;
}
