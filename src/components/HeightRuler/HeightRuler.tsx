import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { resolveTheme, type BodyMetricsPickerTheme } from '../../theme';
import type { HeightUnit } from '../../types';
import { UnitSwitcher } from './UnitSwitcher';

const FADE_STEPS = 8;
const FADE_WIDTH = 60;
const LONG_STEP_INTERVAL = 10;

/** Internal per-unit defaults — can be overridden via props */
const UNIT_CONFIG: Record<
  HeightUnit,
  { min: number; max: number; step: number; fractionDigits: number }
> = {
  cm: { min: 50, max: 250, step: 1, fractionDigits: 0 },
  ft: { min: 1.6, max: 8.2, step: 0.1, fractionDigits: 1 },
};

const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

function convertValue(value: number, from: HeightUnit, to: HeightUnit): number {
  if (from === to) return value;
  if (from === 'cm' && to === 'ft') {
    const ft = value / CM_PER_INCH / INCHES_PER_FOOT;
    return Math.round(ft * 10) / 10;
  }
  // ft -> cm
  const cm = value * INCHES_PER_FOOT * CM_PER_INCH;
  return Math.round(cm);
}

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
  /**
   * Called when user taps the unit switcher. When provided, the
   * switcher UI is rendered. The consumer should typically update the
   * `unit` prop in response.
   */
  onUnitChange?: (unit: HeightUnit) => void;
  /** Explicitly toggle switcher visibility (default: visible if onUnitChange is provided) */
  showUnitSwitcher?: boolean;

  // ── Optional overrides (defaults come from UNIT_CONFIG[unit]) ──────
  min?: number;
  max?: number;
  step?: number;
  fractionDigits?: number;

  // ── Rendering ──────────────────────────────────────────────────────
  formatValue?: (value: number) => string;
  formatTickLabel?: (value: number) => string;
  onScrollBegin?: () => void;
  onScrollEnd?: () => void;
  /** Theme override (partial) */
  theme?: BodyMetricsPickerTheme;
  /** Container style */
  style?: ViewStyle;
}

type TickItem = { index: number };

const keyExtractor = (item: TickItem) => String(item.index);

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<TickItem>);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const valueToIndex = (value: number, min: number, step: number) => Math.round((value - min) / step);

function FadeEdge({ side, color }: { side: 'left' | 'right'; color: string }) {
  return (
    <View
      style={[styles.fadeEdge, side === 'left' ? styles.fadeLeft : styles.fadeRight]}
      pointerEvents="none"
    >
      {Array.from({ length: FADE_STEPS }, (_, i) => {
        const progress = side === 'left' ? 1 - i / FADE_STEPS : i / FADE_STEPS;
        return (
          <View key={i} style={[styles.fadeSlice, { backgroundColor: color, opacity: progress }]} />
        );
      })}
    </View>
  );
}

export function HeightRuler({
  unit,
  initialValue,
  onValueChange,
  onUnitChange,
  showUnitSwitcher,
  min: minProp,
  max: maxProp,
  step: stepProp,
  fractionDigits: fractionDigitsProp,
  formatValue,
  formatTickLabel,
  onScrollBegin,
  onScrollEnd,
  theme,
  style,
}: HeightRulerProps) {
  const t = useMemo(() => resolveTheme(theme), [theme]);

  const unitConfig = UNIT_CONFIG[unit];
  const min = minProp ?? unitConfig.min;
  const max = maxProp ?? unitConfig.max;
  const step = stepProp ?? unitConfig.step;
  const fractionDigits = fractionDigitsProp ?? unitConfig.fractionDigits;
  const switcherVisible = showUnitSwitcher ?? !!onUnitChange;

  const ITEM_WIDTH = t.ruler.tickSpacing;
  const LONG_H = t.ruler.majorTickHeight;
  const MID_H = t.ruler.midTickHeight;
  const SHORT_H = t.ruler.minorTickHeight;
  const TICK_W = t.ruler.tickWidth;
  const RULER_AREA_HEIGHT = LONG_H + 36;

  const totalSteps = Math.round((max - min) / step);
  const listRef = useRef<FlatList<TickItem>>(null);
  const displayValue = useSharedValue(initialValue);
  const activeIndex = useSharedValue(valueToIndex(initialValue, min, step));
  const valueScale = useSharedValue(1);
  /** Latest committed numeric value (JS side) — used for unit conversion */
  const currentValueRef = useRef(initialValue);

  const [containerWidth, setContainerWidth] = useState(0);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const sidePadding = Math.max(0, (containerWidth - ITEM_WIDTH) / 2);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    }),
    [ITEM_WIDTH],
  );

  const valueAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: valueScale.value }],
  }));

  const animatedValueProps = useAnimatedProps(() => {
    const formatted = formatValue
      ? formatValue(displayValue.value)
      : displayValue.value.toFixed(fractionDigits);

    return {
      text: formatted,
      value: formatted,
    } as unknown as { text: string; value: string };
  }, [formatValue, fractionDigits]);

  const data = useMemo<TickItem[]>(
    () => Array.from({ length: totalSteps + 1 }, (_, i) => ({ index: i })),
    [totalSteps],
  );

  useEffect(() => {
    if (containerWidth === 0) return;
    const rawIdx = valueToIndex(initialValue, min, step);
    const idx = Math.max(0, Math.min(totalSteps, rawIdx));
    const clampedValue = Math.max(min, Math.min(max, min + idx * step));
    const rafId = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: false });
    });
    displayValue.value = clampedValue;
    currentValueRef.current = clampedValue;
    return () => cancelAnimationFrame(rafId);
  }, [displayValue, initialValue, min, max, step, totalSteps, containerWidth]);

  const triggerScrollBegin = useCallback(() => {
    onScrollBegin?.();
  }, [onScrollBegin]);

  const updateDisplayByIndex = useCallback(
    (idx: number) => {
      const safeIndex = Math.min(totalSteps, Math.max(0, idx));
      const value = Math.min(max, Math.max(min, min + safeIndex * step));
      displayValue.value = value;
      currentValueRef.current = value;
      onValueChange?.(value.toFixed(fractionDigits));
    },
    [displayValue, fractionDigits, max, min, onValueChange, step, totalSteps],
  );

  const finalizeValue = useCallback(
    (idx: number) => {
      const safeIndex = Math.min(totalSteps, Math.max(0, idx));
      const value = Math.min(max, Math.max(min, min + safeIndex * step));
      displayValue.value = value;
      currentValueRef.current = value;
      onValueChange?.(value.toFixed(fractionDigits));
      onScrollEnd?.();
    },
    [displayValue, fractionDigits, max, min, onValueChange, onScrollEnd, step, totalSteps],
  );

  const handleUnitChange = useCallback(
    (newUnit: HeightUnit) => {
      if (newUnit === unit) return;
      const converted = convertValue(currentValueRef.current, unit, newUnit);
      const nextConfig = UNIT_CONFIG[newUnit];
      const nextFractionDigits = fractionDigitsProp ?? nextConfig.fractionDigits;
      onValueChange?.(converted.toFixed(nextFractionDigits));
      onUnitChange?.(newUnit);
    },
    [unit, fractionDigitsProp, onValueChange, onUnitChange],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      runOnJS(triggerScrollBegin)();
    },
    onScroll: (e) => {
      const idx = Math.round(e.contentOffset.x / ITEM_WIDTH);
      if (idx !== activeIndex.value) {
        activeIndex.value = idx;
        valueScale.value = withSequence(
          withTiming(1.08, { duration: 60 }),
          withTiming(1, { duration: 120 }),
        );
        runOnJS(updateDisplayByIndex)(idx);
      }
    },
    onMomentumEnd: (e) => {
      const idx = Math.round(e.contentOffset.x / ITEM_WIDTH);
      activeIndex.value = idx;
      runOnJS(finalizeValue)(idx);
    },
    onEndDrag: (e) => {
      const velocityX = Math.abs(e.velocity?.x ?? 0);
      if (velocityX < 0.15) {
        const idx = Math.round(e.contentOffset.x / ITEM_WIDTH);
        activeIndex.value = idx;
        runOnJS(finalizeValue)(idx);
      }
    },
  });

  const renderTick = useCallback(
    ({ item }: { item: TickItem }) => {
      const isLong = item.index % LONG_STEP_INTERVAL === 0;
      const isMid = !isLong && item.index % (LONG_STEP_INTERVAL / 2) === 0;
      const tickValue = min + item.index * step;

      return (
        <View style={[tickStyles.tickCell, { width: ITEM_WIDTH, height: RULER_AREA_HEIGHT }]}>
          {isLong && (
            <Animated.Text
              numberOfLines={1}
              style={[
                tickStyles.tickLabel,
                {
                  color: t.colors.tickLabel,
                  fontSize: t.typography.tickLabelSize,
                  ...(t.typography.fontFamily
                    ? { fontFamily: t.typography.fontFamily }
                    : undefined),
                },
              ]}
            >
              {formatTickLabel
                ? formatTickLabel(tickValue)
                : Number.isInteger(tickValue)
                  ? tickValue
                  : tickValue.toFixed(fractionDigits)}
            </Animated.Text>
          )}
          <View
            style={{
              width: TICK_W,
              borderRadius: 1,
              height: isLong ? LONG_H : isMid ? MID_H : SHORT_H,
              backgroundColor: isLong
                ? t.colors.majorTick
                : isMid
                  ? t.colors.midTick
                  : t.colors.tick,
            }}
          />
        </View>
      );
    },
    [
      formatTickLabel,
      fractionDigits,
      min,
      step,
      ITEM_WIDTH,
      RULER_AREA_HEIGHT,
      TICK_W,
      LONG_H,
      MID_H,
      SHORT_H,
      t.colors.majorTick,
      t.colors.midTick,
      t.colors.tick,
      t.colors.tickLabel,
      t.typography.fontFamily,
      t.typography.tickLabelSize,
    ],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: t.colors.background }, style]}
      onLayout={handleLayout}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Height ruler"
      accessibilityValue={{
        min,
        max,
        now: initialValue,
        text: formatValue ? formatValue(initialValue) : `${initialValue}`,
      }}
    >
      {switcherVisible && (
        <View style={styles.switcherWrap}>
          <UnitSwitcher value={unit} onChange={handleUnitChange} theme={t} />
        </View>
      )}

      <Animated.View style={[styles.valueRow, valueAnimStyle]}>
        <AnimatedTextInput
          editable={false}
          underlineColorAndroid="transparent"
          defaultValue={
            formatValue ? formatValue(initialValue) : initialValue.toFixed(fractionDigits)
          }
          animatedProps={animatedValueProps}
          style={[
            styles.valueTextInput,
            {
              color: t.colors.value,
              fontSize: t.typography.valueSize,
              ...(t.typography.fontFamily ? { fontFamily: t.typography.fontFamily } : undefined),
            },
          ]}
        />
        {!formatValue && unit ? (
          <Animated.Text
            style={{
              color: t.colors.unit,
              fontSize: t.typography.unitSize,
              marginLeft: 4,
              ...(t.typography.fontFamily ? { fontFamily: t.typography.fontFamily } : undefined),
            }}
          >
            {unit}
          </Animated.Text>
        ) : null}
      </Animated.View>

      <View style={styles.rulerWrap}>
        <AnimatedFlatList
          ref={listRef}
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderTick}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          scrollEventThrottle={16}
          getItemLayout={getItemLayout}
          onScroll={scrollHandler}
          contentContainerStyle={{ paddingHorizontal: sidePadding }}
          initialScrollIndex={valueToIndex(initialValue, min, step)}
          style={{ height: RULER_AREA_HEIGHT }}
          bounces={false}
          alwaysBounceHorizontal={false}
          overScrollMode="never"
          disableIntervalMomentum
          removeClippedSubviews
          initialNumToRender={80}
          maxToRenderPerBatch={80}
          windowSize={12}
        />

        <View style={styles.indicator} pointerEvents="none">
          <View style={[styles.indicatorArrow, { borderBottomColor: t.colors.indicator }]} />
        </View>

        <FadeEdge side="left" color={t.colors.background} />
        <FadeEdge side="right" color={t.colors.background} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  switcherWrap: {
    marginBottom: 16,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 20,
  },
  valueTextInput: {
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    padding: 0,
    minWidth: 80,
  } as TextStyle,
  rulerWrap: {
    width: '100%',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    left: '50%',
    bottom: -2,
    alignItems: 'center',
    transform: [{ translateX: -6 }],
  },
  indicatorArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  fadeEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
    flexDirection: 'row',
  },
  fadeLeft: { left: 0 },
  fadeRight: { right: 0 },
  fadeSlice: { flex: 1 },
});

const tickStyles = StyleSheet.create({
  tickCell: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  tickLabel: {
    fontWeight: '400',
    position: 'absolute',
    top: 0,
    textAlign: 'center',
    width: 48,
    left: -18,
  },
});
