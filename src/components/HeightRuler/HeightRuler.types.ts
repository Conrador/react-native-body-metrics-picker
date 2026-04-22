import type { ViewStyle } from 'react-native';

import type { HeightUnit } from '../../types';

export interface HeightRulerProps {
  /** Current unit (controlled) */
  unit: HeightUnit;
  /**
   * Current value in the current unit. Treated as the initial scroll
   * position — not reactive to every keystroke.
   */
  initialValue: number;
  /**
   * Called whenever the ruler value changes (including after a unit
   * switch, with the converted value). Always receives a string
   * pre-formatted with the correct fractionDigits.
   */
  onValueChange?: (value: string) => void;

  // ── Optional overrides (defaults come from UNIT_CONFIG[unit]) ──────
  min?: number;
  max?: number;
  step?: number;
  fractionDigits?: number;

  // ── Rendering ──────────────────────────────────────────────────────
  /** Visible height of the vertical ruler viewport. Default: 240. */
  verticalViewportHeight?: number;
  formatValue?: (value: number) => string;
  onScrollBegin?: () => void;
  onScrollEnd?: () => void;

  // Typography
  fontFamily?: string;
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
