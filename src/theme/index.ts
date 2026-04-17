/**
 * Flat, prop-based theme for body-metrics-picker components.
 *
 * Pass a partial object via the `theme` prop. Every field is optional —
 * unspecified keys fall back to defaults. See `defaultTheme` below.
 */
export interface BodyMetricsPickerTheme {
  colors?: {
    /** Sheet / ruler surface background */
    background?: string;
    /** Minor (short) tick color */
    tick?: string;
    /** Mid tick color */
    midTick?: string;
    /** Major (long) tick color */
    majorTick?: string;
    /** Tick label text color */
    tickLabel?: string;
    /** Big animated value text color */
    value?: string;
    /** Unit text color next to the value ("cm", "ft") */
    unit?: string;
    /** Bottom sheet title color */
    title?: string;
    /** Central indicator triangle color */
    indicator?: string;
    /** Default confirm button background */
    confirmButtonBackground?: string;
    /** Default confirm button text color */
    confirmButtonText?: string;
    /** Default close button background */
    closeBackground?: string;
    /** Default close "✕" icon color */
    closeIcon?: string;
    /** Sheet backdrop color */
    backdrop?: string;
    /** Top drag-handle indicator color */
    handleIndicator?: string;
    /** Unit switcher pill track background */
    unitSwitcherBackground?: string;
    /** Unit switcher active thumb background */
    unitSwitcherActiveBackground?: string;
    /** Unit switcher active option text color */
    unitSwitcherActiveText?: string;
    /** Unit switcher inactive option text color */
    unitSwitcherInactiveText?: string;
  };
  typography?: {
    /** Global font family applied to every text element */
    fontFamily?: string;
    /** Big animated value size */
    valueSize?: number;
    /** Unit text size */
    unitSize?: number;
    /** Tick label size */
    tickLabelSize?: number;
    /** Sheet title size */
    titleSize?: number;
    /** Confirm button label size */
    confirmButtonSize?: number;
  };
  ruler?: {
    /** Height of short (minor) ticks in px */
    minorTickHeight?: number;
    /** Height of mid ticks in px */
    midTickHeight?: number;
    /** Height of long (major) ticks in px */
    majorTickHeight?: number;
    /** Width / thickness of each tick */
    tickWidth?: number;
    /** Horizontal distance between ticks (item width) */
    tickSpacing?: number;
  };
}

export interface ResolvedTheme {
  colors: Required<NonNullable<BodyMetricsPickerTheme['colors']>>;
  typography: Required<NonNullable<BodyMetricsPickerTheme['typography']>>;
  ruler: Required<NonNullable<BodyMetricsPickerTheme['ruler']>>;
}

export const defaultTheme: ResolvedTheme = {
  colors: {
    background: '#FFFFFF',
    tick: '#D1D5DB',
    midTick: '#6B7280',
    majorTick: '#374151',
    tickLabel: '#6B7280',
    value: '#1F2937',
    unit: '#6B7280',
    title: '#1F2937',
    indicator: '#2563EB',
    confirmButtonBackground: '#2563EB',
    confirmButtonText: '#FFFFFF',
    closeBackground: '#F3F4F6',
    closeIcon: '#6B7280',
    backdrop: '#000000',
    handleIndicator: '#D1D5DB',
    unitSwitcherBackground: '#F3F4F6',
    unitSwitcherActiveBackground: '#FFFFFF',
    unitSwitcherActiveText: '#1F2937',
    unitSwitcherInactiveText: '#6B7280',
  },
  typography: {
    fontFamily: '',
    valueSize: 56,
    unitSize: 22,
    tickLabelSize: 14,
    titleSize: 22,
    confirmButtonSize: 17,
  },
  ruler: {
    minorTickHeight: 18,
    midTickHeight: 28,
    majorTickHeight: 40,
    tickWidth: 1.5,
    tickSpacing: 12,
  },
};

/**
 * Merge a user-supplied partial theme with defaults. Shallow-merges each
 * top-level section.
 */
export function resolveTheme(theme?: BodyMetricsPickerTheme): ResolvedTheme {
  if (!theme) return defaultTheme;
  return {
    colors: { ...defaultTheme.colors, ...theme.colors },
    typography: { ...defaultTheme.typography, ...theme.typography },
    ruler: { ...defaultTheme.ruler, ...theme.ruler },
  };
}
