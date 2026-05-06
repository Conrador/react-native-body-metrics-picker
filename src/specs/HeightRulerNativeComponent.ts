import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Double, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

type ValueChangeEvent = Readonly<{ value: string }>;

// Fabric codegen: event payload cannot be `{}` — use named empty shape.
interface EmptyScrollEvent {}

export interface NativeProps extends ViewProps {
  unit: string;
  rangeMin: Double;
  rangeMax: Double;
  step: Double;
  fractionDigits: Int32;
  initialValue: Double;
  rulerTrackWidth: Double;
  tickSpacing: Double;
  minorTickHeight: Double;
  midTickHeight: Double;
  majorTickHeight: Double;
  tickWidth: Double;
  labelColumnWidth: Double;
  labelToTickGap: Double;
  tickCellPaddingRight: Double;
  fontFamily?: string | null;
  longStepInterval: Int32;
  imperialMinInches: Int32;
  colorTick: string;
  colorMidTick: string;
  colorMajorTick: string;
  colorGlassActiveTick: string;
  colorGlassActiveNeighborTick: string;
  colorGlassCenterLabel?: string | null;
  /** Android-only; omit on iOS wrapper. Empty = default pill tint. */
  glassPillBackgroundColor?: string | null;
  /** Android-only; omit on iOS. `0` = default (~16dp). */
  glassPillBorderRadius?: Double;
  onValueChange?: DirectEventHandler<ValueChangeEvent> | null;
  onScrollBegin?: DirectEventHandler<EmptyScrollEvent> | null;
  onScrollEnd?: DirectEventHandler<EmptyScrollEvent> | null;
}

export default codegenNativeComponent<NativeProps>('HeightRulerView');
