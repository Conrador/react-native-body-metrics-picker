export { HeightRuler } from './components/HeightRuler';
export type { HeightRulerProps } from './components/HeightRuler';

export { HeightPicker } from './components/HeightPicker';
export type { HeightPickerProps, RenderConfirmButtonProps } from './components/HeightPicker';

export { defaultTheme, resolveTheme } from './theme';
export type { BodyMetricsPickerTheme, ResolvedTheme } from './theme';

export {
  cmToFeetInches,
  feetInchesToCm,
  cmToTotalInches,
  totalInchesToCm,
} from './utils/conversions';

export { formatHeight, formatHeightMetric, formatHeightImperial } from './utils/formatters';

export type {
  UnitSystem,
  HeightUnit,
  HeightValue,
  HeightValueMetric,
  HeightValueImperial,
  FeetInches,
  RulerConfig,
} from './types';
