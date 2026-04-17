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

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { ChevronUpIcon, Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text-v2';
import { theme } from '@/styles/theme';

const ITEM_WIDTH = 12;
const SHORT_TICK_HEIGHT = 18;
const MID_TICK_HEIGHT = 28;
const LONG_TICK_HEIGHT = 40;
const TICK_WIDTH = 1.5;
const RULER_AREA_HEIGHT = LONG_TICK_HEIGHT + 36;
const FADE_WIDTH = 60;

type RulerPickerProps = {
  min: number;
  max: number;
  step: number;
  initialValue: number;
  fractionDigits?: number;
  unit?: string;
  longStepInterval?: number;
  formatValue?: (value: number) => string;
  formatTickLabel?: (value: number) => string;
  onValueChange?: (value: string) => void;
  horizontalInset?: number;
};

type TickItem = { index: number };

const keyExtractor = (item: TickItem) => String(item.index);
const getItemLayout = (_: unknown, index: number) => ({
  length: ITEM_WIDTH,
  offset: ITEM_WIDTH * index,
  index,
});
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<TickItem>);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const valueToIndex = (value: number, min: number, step: number) => Math.round((value - min) / step);

const RulerPicker = ({
  min,
  max,
  step,
  initialValue,
  fractionDigits = 1,
  unit = '',
  longStepInterval = 10,
  formatValue,
  formatTickLabel,
  onValueChange,
  horizontalInset = 0,
}: RulerPickerProps) => {
  const totalSteps = Math.round((max - min) / step);
  const listRef = useRef<FlatList<TickItem>>(null);
  const displayValue = useSharedValue(initialValue);
  const { width: screenWidth } = useWindowDimensions();
  const activeIndex = useSharedValue(valueToIndex(initialValue, min, step));
  const valueScale = useSharedValue(1);

  const viewportWidth = Math.max(0, screenWidth - horizontalInset);
  const sidePadding = Math.max(0, (viewportWidth - ITEM_WIDTH) / 2);

  const valueAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: valueScale.value }],
  }));
  const animatedValueProps = useAnimatedProps(() => {
    const formatted = formatValue
      ? formatValue(displayValue.value)
      : displayValue.value.toFixed(fractionDigits);

    return {
      // `text` is supported by Reanimated for TextInput animated props.
      text: formatted,
      value: formatted,
    } as unknown as { text: string; value: string };
  }, [formatValue, fractionDigits]);

  const data = useMemo<TickItem[]>(
    () => Array.from({ length: totalSteps + 1 }, (_, i) => ({ index: i })),
    [totalSteps]
  );

  useEffect(() => {
    const idx = valueToIndex(initialValue, min, step);
    const rafId = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: false });
    });
    displayValue.value = initialValue;
    return () => cancelAnimationFrame(rafId);
  }, [displayValue, initialValue, min, step]);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const updateDisplayByIndex = useCallback(
    (idx: number) => {
      const safeIndex = Math.min(totalSteps, Math.max(0, idx));
      const value = Math.min(max, Math.max(min, min + safeIndex * step));
      displayValue.value = value;
      onValueChange?.(value.toFixed(fractionDigits));
    },
    [displayValue, fractionDigits, max, min, onValueChange, step, totalSteps]
  );

  const finalizeValue = useCallback(
    (idx: number) => {
      const safeIndex = Math.min(totalSteps, Math.max(0, idx));
      const value = Math.min(max, Math.max(min, min + safeIndex * step));
      displayValue.value = value;
      onValueChange?.(value.toFixed(fractionDigits));
    },
    [displayValue, fractionDigits, max, min, onValueChange, step, totalSteps]
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: e => {
      const idx = Math.round(e.contentOffset.x / ITEM_WIDTH);
      if (idx !== activeIndex.value) {
        activeIndex.value = idx;
        valueScale.value = withSequence(
          withTiming(1.08, { duration: 60 }),
          withTiming(1, { duration: 120 })
        );
        runOnJS(updateDisplayByIndex)(idx);
        runOnJS(triggerHaptic)();
      }
    },
    onMomentumEnd: e => {
      const idx = Math.round(e.contentOffset.x / ITEM_WIDTH);
      activeIndex.value = idx;
      runOnJS(finalizeValue)(idx);
    },
    onEndDrag: e => {
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
      const isLong = item.index % longStepInterval === 0;
      const canHaveMid = longStepInterval % 2 === 0;
      const isMid = canHaveMid && !isLong && item.index % (longStepInterval / 2) === 0;
      const tickValue = min + item.index * step;

      return (
        <View style={styles.tickCell}>
          {isLong && (
            <Text numberOfLines={1} style={styles.tickLabel}>
              {formatTickLabel
                ? formatTickLabel(tickValue)
                : Number.isInteger(tickValue)
                  ? tickValue
                  : tickValue.toFixed(fractionDigits)}
            </Text>
          )}
          <View
            style={[
              styles.tick,
              {
                height: isLong ? LONG_TICK_HEIGHT : isMid ? MID_TICK_HEIGHT : SHORT_TICK_HEIGHT,
                backgroundColor: isLong
                  ? theme.colors.typography.black
                  : isMid
                    ? theme.colors.outline[500]
                    : theme.colors.outline[300],
              },
            ]}
          />
        </View>
      );
    },
    [formatTickLabel, fractionDigits, longStepInterval, min, step]
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.valueRow, valueAnimStyle]}>
        <AnimatedTextInput
          editable={false}
          underlineColorAndroid="transparent"
          defaultValue={
            formatValue ? formatValue(initialValue) : initialValue.toFixed(fractionDigits)
          }
          animatedProps={animatedValueProps}
          style={styles.valueTextInput}
        />
        {!formatValue && unit ? <Text style={styles.unitText}>{unit}</Text> : null}
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
          style={styles.flatList}
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
          <Icon as={ChevronUpIcon} size="md" className="text-primary-500" />
        </View>

        <LinearGradient
          colors={[theme.colors.white, 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.fadeLeft}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(255,255,255,0)', theme.colors.white]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.fadeRight}
          pointerEvents="none"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(4),
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: theme.spacing(5),
  },
  valueTextInput: {
    fontFamily: 'Lato_700Bold',
    fontSize: 56,
    lineHeight: 64,
    color: theme.colors.typography.black,
    textAlign: 'center',
    includeFontPadding: false,
    padding: 0,
  },
  unitText: {
    fontFamily: 'Lato_400Regular',
    fontSize: theme.fontSize['2xl'],
    color: theme.colors.outline[500],
    marginLeft: theme.spacing(1),
  },
  rulerWrap: {
    width: '100%',
    position: 'relative',
  },
  flatList: {
    height: RULER_AREA_HEIGHT,
  },
  tickCell: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: RULER_AREA_HEIGHT,
    paddingBottom: 16,
  },
  tick: {
    width: TICK_WIDTH,
    borderRadius: 1,
  },
  tickLabel: {
    fontFamily: 'Lato_400Regular',
    fontSize: theme.fontSize.lg,
    color: theme.colors.outline[500],
    position: 'absolute',
    top: 0,
    textAlign: 'center',
    width: 48,
    left: -18,
  },
  indicator: {
    position: 'absolute',
    left: '50%',
    bottom: -2,
    alignItems: 'center',
    transform: [{ translateX: -10 }],
  },
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
  },
});

export default RulerPicker;
