import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { HeightUnit } from '../../types';

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
  trackColor = '#F3F4F6',
  thumbColor = '#FFFFFF',
  activeTextColor = '#111827',
  inactiveTextColor = '#6B7280',
  thumbSheenColor = '#FFFFFF',
  thumbGlassBorderColor = 'rgba(60, 60, 67, 0.16)',
  fontFamily,
  labelFontSize = 16,
  style,
}: UnitSwitcherProps) {
  const optionWidth = 64;
  const trackPadding = 3;
  const thumbX = useSharedValue(unit === 'ft' ? optionWidth : 0);
  const pressMotion = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const onUnitChangeRef = useRef(onUnitChange);
  onUnitChangeRef.current = onUnitChange;

  useEffect(() => {
    if (isDragging.value) return;
    thumbX.value = withSpring(unit === 'ft' ? optionWidth : 0, {
      damping: 16,
      stiffness: 180,
      mass: 0.8,
    });
  }, [unit, thumbX, isDragging, optionWidth]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: thumbX.value },
      { scaleX: interpolate(pressMotion.value, [0, 1], [1, 1.03]) },
      { scaleY: interpolate(pressMotion.value, [0, 1], [1, 0.97]) },
    ],
  }));

  const thumbSheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressMotion.value, [0, 1], [0.3, 0.14]),
  }));

  const settleThumb = useCallback(
    (nextUnit: HeightUnit) => {
      const targetX = nextUnit === 'ft' ? optionWidth : 0;
      thumbX.value = withSpring(targetX, {
        damping: 17,
        stiffness: 190,
        mass: 0.78,
        velocity: 0,
      });
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
        onPanResponderRelease: (_, g) => {
          isDragging.value = false;
          pressMotion.value = withTiming(0, { duration: 120 });
          const midpoint = optionWidth / 2;
          const velocityThreshold = 0.3;
          const nextUnit: HeightUnit =
            Math.abs(g.vx) > velocityThreshold
              ? g.vx > 0
                ? 'ft'
                : 'cm'
              : thumbX.value > midpoint
                ? 'ft'
                : 'cm';
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
    [dragStartX, isDragging, optionWidth, pressMotion, settleThumb, thumbX, unit],
  );

  const handlePressIn = () => {
    pressMotion.value = withTiming(1, { duration: 90 });
  };

  const handlePressOut = () => {
    if (!isDragging.value) {
      pressMotion.value = withTiming(0, { duration: 120 });
    }
  };

  const handleSelect = (nextUnit: HeightUnit) => {
    settleThumb(nextUnit);
    if (nextUnit !== unit) {
      onUnitChange?.(nextUnit);
    }
  };

  return (
    <View
      style={[styles.base, { backgroundColor: trackColor }, style]}
      accessibilityRole="tablist"
      {...panResponder.panHandlers}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            left: trackPadding,
            width: optionWidth,
            backgroundColor: thumbColor,
            borderColor: thumbGlassBorderColor,
          },
          thumbStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.thumbSheen,
            { backgroundColor: thumbSheenColor },
            thumbSheenStyle,
          ]}
        />
      </Animated.View>

      {(['cm', 'ft'] as const).map((option) => {
        const selected = unit === option;
        return (
          <Pressable
            key={option}
            onPress={() => handleSelect(option)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={styles.option}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? activeTextColor : inactiveTextColor,
                  fontSize: labelFontSize,
                },
                fontFamily ? { fontFamily } : null,
              ]}
            >
              {option}
            </Text>
          </Pressable>
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
    padding: 3,
    flexDirection: 'row',
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
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
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
