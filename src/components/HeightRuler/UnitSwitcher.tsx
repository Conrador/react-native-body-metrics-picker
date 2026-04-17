import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { ResolvedTheme } from '../../theme';
import type { HeightUnit } from '../../types';

export interface UnitSwitcherProps {
  value: HeightUnit;
  onChange: (unit: HeightUnit) => void;
  theme: ResolvedTheme;
}

const OPTIONS: { key: HeightUnit; label: string }[] = [
  { key: 'cm', label: 'cm' },
  { key: 'ft', label: 'ft' },
];

const TRACK_PADDING = 3;
const OPTION_WIDTH = 64;
const OPTION_HEIGHT = 32;

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 220,
  mass: 0.8,
};

export function UnitSwitcher({ value, onChange, theme }: UnitSwitcherProps) {
  const fontFamily = theme.typography.fontFamily || undefined;

  /** 0 when cm active, 1 when ft active — drives the thumb position + text colors */
  const progress = useSharedValue(value === 'cm' ? 0 : 1);

  useEffect(() => {
    progress.value = withSpring(value === 'cm' ? 0 : 1, SPRING_CONFIG);
  }, [value, progress]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * OPTION_WIDTH }],
  }));

  return (
    <View
      style={[styles.track, { backgroundColor: theme.colors.unitSwitcherBackground }]}
      accessibilityRole="tablist"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          { backgroundColor: theme.colors.unitSwitcherActiveBackground },
          thumbStyle,
        ]}
      />
      {OPTIONS.map((opt, idx) => {
        const selected = opt.key === value;
        return (
          <OptionLabel
            key={opt.key}
            index={idx}
            label={opt.label}
            selected={selected}
            progress={progress}
            fontFamily={fontFamily}
            activeColor={theme.colors.unitSwitcherActiveText}
            inactiveColor={theme.colors.unitSwitcherInactiveText}
            onPress={() => !selected && onChange(opt.key)}
          />
        );
      })}
    </View>
  );
}

interface OptionLabelProps {
  index: number;
  label: string;
  selected: boolean;
  progress: ReturnType<typeof useSharedValue<number>>;
  fontFamily: string | undefined;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
}

function OptionLabel({
  index,
  label,
  selected,
  progress,
  fontFamily,
  activeColor,
  inactiveColor,
  onPress,
}: OptionLabelProps) {
  const textStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      progress.value,
      [0, 1],
      index === 0 ? [activeColor, inactiveColor] : [inactiveColor, activeColor],
    );
    return { color };
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`Use ${label}`}
      style={({ pressed }) => [styles.option, pressed && !selected && styles.optionPressed]}
    >
      <Animated.Text style={[styles.label, fontFamily ? { fontFamily } : null, textStyle]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: TRACK_PADDING,
    alignSelf: 'center',
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    width: OPTION_WIDTH,
    height: OPTION_HEIGHT,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  option: {
    width: OPTION_WIDTH,
    height: OPTION_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionPressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
