import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Double, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

type ValueChangeEvent = Readonly<{ value: string }>;

interface EmptyScrollEvent {}

export interface NativeProps extends ViewProps {
  unit: string;
  initialValue: Double;
  rangeMin: Double;
  rangeMax: Double;
  step: Double;
  fractionDigits: Int32;
  longStepInterval: Int32;

  /** Distance (in dp/pt) along the arc between adjacent ticks. */
  tickSpacingPx: Double;
  /** Outward tick lengths (radial). */
  minorTickHeight: Double;
  midTickHeight: Double;
  majorTickHeight: Double;
  tickWidth: Double;

  /** Vertical offset (dp/pt) between the arc center and the bottom edge of the view. Larger = flatter arc. */
  arcCenterOffset: Double;

  fontFamily?: string | null;

  colorTick: string;
  colorMidTick: string;
  colorMajorTick: string;
  colorActiveTick: string;
  colorActiveNeighborTick: string;
  /** Optional accent ink for the centered (selected) label under the glass. Empty = use active tick color. */
  colorGlassCenterLabel?: string | null;
  /** Optional fill for the glass overlay. Empty = native default (iOS material / Android translucent). */
  glassPillBackgroundColor?: string | null;
  /** Optional accent for the glass border. Empty = native default. */
  glassPillBorderColor?: string | null;
  /** Half angular span (radians) of the arc-band glass overlay. `0` = derive a clearly horizontal default from `tickSpacingPx`. */
  glassArcHalfAngle: Double;
  /** Extra dp above the labels where the outer edge of the glass band sits. */
  glassOuterPadding: Double;
  /** Vertical room (dp) for the labels rendered above the tick tips, under the glass. */
  glassLabelArea: Double;
  /** Font size for the labels rendered under the glass. */
  glassLabelFontSize: Double;
  /** Background fill behind the arc (`'transparent'` to skip). */
  colorTrack?: string | null;

  onValueChange?: DirectEventHandler<ValueChangeEvent> | null;
  onScrollBegin?: DirectEventHandler<EmptyScrollEvent> | null;
  onScrollEnd?: DirectEventHandler<EmptyScrollEvent> | null;
}

export default codegenNativeComponent<NativeProps>('WeightRulerView');
