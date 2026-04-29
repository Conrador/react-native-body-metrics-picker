export { HeightRuler, useHeightRulerSnapshot } from './components/HeightRuler';
export type {
  HeightRulerHandle,
  HeightRulerLiveSnapshot,
  HeightRulerProps,
} from './components/HeightRuler';
export { UnitSwitcher } from './components/UnitSwitcher';
export type { UnitSwitcherProps } from './components/UnitSwitcher';

export type {
  UnitSystem,
  HeightUnit,
  HeightValue,
  HeightValueMetric,
  HeightValueImperial,
  FeetInches,
  RulerConfig,
} from './types';

export {
  CM_PER_FOOT,
  formatHeightRulerCmString,
  NATIVE_RULER_CM_MAX,
  NATIVE_RULER_CM_MIN,
  nativeRulerBoundsForUnit,
} from './components/HeightRuler/constants/rulerConstants';
