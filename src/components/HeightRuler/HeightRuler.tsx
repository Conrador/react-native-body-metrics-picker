import { useCallback, useMemo, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';

import type { HeightRulerProps } from './HeightRuler.types';
import { NativeHeightRulerView } from './NativeHeightRulerView';
import {
  DEFAULT_VERTICAL_VIEWPORT,
  LABEL_COL_WIDTH,
  LABEL_TO_TICK_GAP,
  LONG_STEP_INTERVAL,
  TICK_CELL_PADDING_LEFT,
  TICK_CELL_PADDING_RIGHT,
  nativeRulerBoundsForUnit,
} from './constants/rulerConstants';

/**
 * Native ruler: `initialValue` and `onValueChange` always use **centimeters**; `unit` only affects the on-screen scale (cm vs ft/in).
 */
export function HeightRuler({
  unit,
  initialValue,
  onValueChange,
  verticalViewportHeight = DEFAULT_VERTICAL_VIEWPORT,
  formatValue,
  onScrollBegin,
  onScrollEnd,
  fontFamily,
  tickLabelFontSize = 19,
  tickSpacing = 15,
  minorTickHeight = 18,
  midTickHeight = 28,
  majorTickHeight = 40,
  tickWidth = 1.5,
  tickColor = '#D1D5DB',
  midTickColor = '#6B7280',
  majorTickColor = '#374151',
  glassActiveTickColor,
  glassActiveNeighborTickColor,
  style,
}: HeightRulerProps) {
  const a11yBounds = nativeRulerBoundsForUnit(unit);

  const rulerTrackWidth = useMemo(
    () =>
      TICK_CELL_PADDING_LEFT +
      LABEL_COL_WIDTH +
      LABEL_TO_TICK_GAP +
      majorTickHeight +
      TICK_CELL_PADDING_RIGHT,
    [majorTickHeight],
  );

  const currentValueRef = useRef(initialValue);

  const handleNativeValue = useCallback(
    (valueStr: string) => {
      const num = Number(valueStr);
      if (Number.isNaN(num)) return;
      currentValueRef.current = num;
      onValueChange?.(valueStr);
    },
    [onValueChange],
  );

  const activeTickColor =
    glassActiveTickColor ?? (Platform.OS === 'ios' ? '#FFD60A' : '#0A84FF');
  const activeNeighborTickColor =
    glassActiveNeighborTickColor ??
    (Platform.OS === 'ios'
      ? 'rgba(255, 214, 10, 0.72)'
      : 'rgba(10, 132, 255, 0.72)');

  const nativeProps = useMemo(
    () => ({
      unit,
      // Fabric still requires these props; native iOS/Android ignore them and use fixed bounds.
      rangeMin: 0,
      rangeMax: 0,
      step: 0,
      fractionDigits: 0,
      imperialMinInches: 0,
      initialValue,
      verticalViewportHeight,
      rulerTrackWidth,
      tickSpacing,
      minorTickHeight,
      midTickHeight,
      majorTickHeight,
      tickWidth,
      labelColumnWidth: LABEL_COL_WIDTH,
      labelToTickGap: LABEL_TO_TICK_GAP,
      tickCellPaddingRight: TICK_CELL_PADDING_RIGHT,
      tickLabelFontSize,
      fontFamily: fontFamily || undefined,
      longStepInterval: LONG_STEP_INTERVAL,
      colorTick: tickColor,
      colorMidTick: midTickColor,
      colorMajorTick: majorTickColor,
      colorGlassActiveTick: activeTickColor,
      colorGlassActiveNeighborTick: activeNeighborTickColor,
    }),
    [
      unit,
      initialValue,
      verticalViewportHeight,
      rulerTrackWidth,
      tickSpacing,
      minorTickHeight,
      midTickHeight,
      majorTickHeight,
      tickWidth,
      tickLabelFontSize,
      fontFamily,
      tickColor,
      midTickColor,
      majorTickColor,
      activeTickColor,
      activeNeighborTickColor,
    ],
  );

  return (
    <NativeHeightRulerView
      style={[
        styles.base,
        {
          width: rulerTrackWidth,
          height: verticalViewportHeight,
        },
        style,
      ]}
      {...nativeProps}
      onValueChange={(e) => handleNativeValue(e.nativeEvent.value)}
      onScrollBegin={onScrollBegin}
      onScrollEnd={onScrollEnd}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Height ruler, vertical"
      accessibilityValue={{
        min: a11yBounds.min,
        max: a11yBounds.max,
        now: currentValueRef.current,
        text: formatValue ? formatValue(currentValueRef.current) : undefined,
      }}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'visible',
  },
});
