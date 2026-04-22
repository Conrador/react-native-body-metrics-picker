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
  UNIT_CONFIG,
} from './constants/rulerConstants';

export function HeightRuler({
  unit,
  initialValue,
  onValueChange,
  min: minProp,
  max: maxProp,
  step: stepProp,
  fractionDigits: fractionDigitsProp,
  verticalViewportHeight = DEFAULT_VERTICAL_VIEWPORT,
  formatValue,
  onScrollBegin,
  onScrollEnd,
  fontFamily,
  tickLabelFontSize = 24,
  tickSpacing = 15,
  minorTickHeight = 18,
  midTickHeight = 28,
  majorTickHeight = 40,
  tickWidth = 1.5,
  backgroundColor = '#FFFFFF',
  rulerChromeColor = 'rgba(0, 0, 0, 0)',
  tickColor = '#D1D5DB',
  midTickColor = '#6B7280',
  majorTickColor = '#374151',
  selectedTickColor = '#D1D5DB',
  glassSurfaceColor = 'rgba(255, 255, 255, 0.22)',
  glassBorderColor = 'rgba(60, 60, 67, 0.16)',
  glassSheenColor = 'rgba(255, 255, 255, 0.32)',
  glassRimColor = 'rgba(10, 20, 40, 0.07)',
  glassLiquidBorderColor = 'rgba(255, 255, 255, 0.78)',
  glassActiveTickColor,
  glassActiveNeighborTickColor,
  style,
}: HeightRulerProps) {
  const unitConfig = UNIT_CONFIG[unit];
  const min = minProp ?? unitConfig.min;
  const max = maxProp ?? unitConfig.max;
  const step = stepProp ?? unitConfig.step;
  const fractionDigits = fractionDigitsProp ?? unitConfig.fractionDigits;

  const rulerTrackWidth = useMemo(
    () =>
      TICK_CELL_PADDING_LEFT +
      LABEL_COL_WIDTH +
      LABEL_TO_TICK_GAP +
      majorTickHeight +
      TICK_CELL_PADDING_RIGHT,
    [majorTickHeight],
  );

  const minInches = useMemo(
    () => (unit === 'ft' ? Math.round(min * 12) : 0),
    [unit, min],
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
      rangeMin: min,
      rangeMax: max,
      step,
      fractionDigits,
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
      imperialMinInches: unit === 'ft' ? minInches : 12,
      colorBackground: backgroundColor,
      colorRulerChrome: rulerChromeColor,
      colorTick: tickColor,
      colorMidTick: midTickColor,
      colorMajorTick: majorTickColor,
      colorSelectedTick: selectedTickColor,
      colorGlassSurface: glassSurfaceColor,
      colorGlassBorder: glassBorderColor,
      colorGlassSheen: glassSheenColor,
      colorGlassRim: glassRimColor,
      colorGlassLiquidBorder: glassLiquidBorderColor,
      colorGlassActiveTick: activeTickColor,
      colorGlassActiveNeighborTick: activeNeighborTickColor,
    }),
    [
      unit,
      min,
      max,
      step,
      fractionDigits,
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
      backgroundColor,
      rulerChromeColor,
      tickColor,
      midTickColor,
      majorTickColor,
      selectedTickColor,
      glassSurfaceColor,
      glassBorderColor,
      glassSheenColor,
      glassRimColor,
      glassLiquidBorderColor,
      minInches,
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
        min,
        max,
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
