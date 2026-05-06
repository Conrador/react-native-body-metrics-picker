import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { HeightUnit } from '../../types';

const isAndroid = Platform.OS === 'android';
const thumbPressScaleRange =
  Platform.OS === 'android' ? ([1, 1.02] as const) : ([1, 1.03] as const);
const thumbPressScaleYRange =
  Platform.OS === 'android' ? ([1, 0.985] as const) : ([1, 0.97] as const);

const springConfig = Platform.select({
  android: { damping: 22, stiffness: 260, mass: 0.62 },
  default: { damping: 16, stiffness: 180, mass: 0.8 },
})!;

const settleSpringConfig = Platform.select({
  android: { damping: 23, stiffness: 280, mass: 0.6, velocity: 0 },
  default: { damping: 17, stiffness: 190, mass: 0.78, velocity: 0 },
})!;

export interface UnitSwitcherProps {
  unit: HeightUnit;
  onUnitChange?: (unit: HeightUnit) => void;
  trackColor?: string;
  thumbColor?: string;
  activeTextColor?: string;
  inactiveTextColor?: string;
  thumbSheenColor?: string;
  thumbGlassBorderColor?: string;
  fontFamily?: string;
  labelFontSize?: number;
  style?: StyleProp<ViewStyle>;
}

export function UnitSwitcher({
  unit,
  onUnitChange,
  trackColor = Platform.select({ android: '#E8EAED', default: '#F3F4F6' }),
  thumbColor = '#FFFFFF',
  activeTextColor = Platform.select({ android: '#1C1B1F', default: '#111827' }),
  inactiveTextColor = Platform.select({ android: '#49454F', default: '#6B7280' }),
  thumbSheenColor = '#FFFFFF',
  thumbGlassBorderColor = Platform.select({
    android: 'transparent',
    default: 'rgba(60, 60, 67, 0.16)',
  }),
  fontFamily,
  labelFontSize = 16,
  style,
}: UnitSwitcherProps) {
  const optionWidth = 64;
  const trackPadding = isAndroid ? 4 : 3;
  const tapThreshold = 12;
  const trackWidthRef = useRef(136);
  const thumbX = useSharedValue(unit === 'ft' ? optionWidth : 0);
  const pressMotion = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const onUnitChangeRef = useRef(onUnitChange);
  onUnitChangeRef.current = onUnitChange;

  useEffect(() => {
    if (isDragging.value) return;
    thumbX.value = withSpring(unit === 'ft' ? optionWidth : 0, springConfig);
  }, [unit, thumbX, isDragging, optionWidth]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: thumbX.value },
      { scaleX: interpolate(pressMotion.value, [0, 1], thumbPressScaleRange) },
      { scaleY: interpolate(pressMotion.value, [0, 1], thumbPressScaleYRange) },
    ],
  }));

  const thumbSheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressMotion.value, [0, 1], [0.3, 0.14]),
  }));

  const settleThumb = useCallback(
    (nextUnit: HeightUnit) => {
      const targetX = nextUnit === 'ft' ? optionWidth : 0;
      thumbX.value = withSpring(targetX, settleSpringConfig);
    },
    [optionWidth, thumbX],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => {
          isDragging.value = true;
          dragStartX.value = thumbX.value;
          pressMotion.value = withTiming(1, { duration: 80 });
        },
        onPanResponderMove: (_, g) => {
          const next = Math.min(optionWidth, Math.max(0, dragStartX.value + g.dx));
          thumbX.value = next;
        },
        onPanResponderRelease: (evt, g) => {
          isDragging.value = false;
          pressMotion.value = withTiming(0, { duration: 120 });
          const midpoint = optionWidth / 2;
          const velocityThreshold = 0.3;
          const isTap =
            Math.abs(g.dx) < tapThreshold &&
            Math.abs(g.dy) < tapThreshold &&
            Math.abs(g.vx) < velocityThreshold &&
            Math.abs(g.vy) < velocityThreshold;

          let nextUnit: HeightUnit;
          if (isTap) {
            const w = trackWidthRef.current;
            const x = evt.nativeEvent.locationX;
            nextUnit = x < w / 2 ? 'cm' : 'ft';
          } else if (Math.abs(g.vx) > velocityThreshold) {
            nextUnit = g.vx > 0 ? 'ft' : 'cm';
          } else {
            nextUnit = thumbX.value > midpoint ? 'ft' : 'cm';
          }
          settleThumb(nextUnit);
          if (nextUnit !== unit) {
            onUnitChangeRef.current?.(nextUnit);
          }
        },
        onPanResponderTerminate: () => {
          isDragging.value = false;
          pressMotion.value = withTiming(0, { duration: 120 });
          settleThumb(unit);
        },
      }),
    [dragStartX, isDragging, optionWidth, pressMotion, settleThumb, tapThreshold, thumbX, unit],
  );

  return (
    <View
      style={[
        styles.base,
        isAndroid ? styles.baseAndroid : null,
        { backgroundColor: trackColor, padding: trackPadding },
        style,
      ]}
      accessibilityRole="tablist"
      onLayout={(e) => {
        trackWidthRef.current = e.nativeEvent.layout.width;
      }}
      {...panResponder.panHandlers}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          isAndroid ? styles.thumbAndroid : null,
          {
            left: trackPadding,
            width: optionWidth,
            backgroundColor: thumbColor,
            borderColor: thumbGlassBorderColor,
            borderWidth: isAndroid ? 0 : 1,
          },
          thumbStyle,
        ]}
      >
        {!isAndroid ? (
          <Animated.View
            style={[styles.thumbSheen, { backgroundColor: thumbSheenColor }, thumbSheenStyle]}
          />
        ) : null}
      </Animated.View>

      {(['cm', 'ft'] as const).map((option) => {
        const selected = unit === option;
        return (
          <View
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.option, isAndroid ? styles.optionAndroid : null]}
            pointerEvents="none"
          >
            <Text
              style={[
                styles.label,
                isAndroid ? styles.labelAndroid : null,
                {
                  color: selected ? activeTextColor : inactiveTextColor,
                  fontSize: labelFontSize,
                },
                fontFamily ? { fontFamily } : null,
              ]}
            >
              {option}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 136,
    height: 38,
    borderRadius: 999,
    flexDirection: 'row',
    position: 'relative',
  },
  baseAndroid: {
    height: 40,
    borderRadius: 12,
  },
  thumb: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  thumbAndroid: {
    top: 4,
    bottom: 4,
    borderRadius: 8,
    elevation: 2,
    overflow: 'visible',
  },
  thumbSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  option: {
    width: 64,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionAndroid: {
    height: 32,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelAndroid: {
    fontWeight: '500',
    letterSpacing: 0.15,
    includeFontPadding: false,
  },
});
