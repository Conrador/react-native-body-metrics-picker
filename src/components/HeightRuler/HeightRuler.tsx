import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import type { HeightRulerHandle, HeightRulerLiveSnapshot, HeightRulerProps } from './HeightRuler.types';
import { NativeHeightRulerView } from './NativeHeightRulerView';
import {
  ANDROID_RULER_EXTRA_TRACK_DP,
  IOS_RULER_EXTRA_TRACK_DP,
  DEFAULT_VERTICAL_VIEWPORT,
  LABEL_COL_WIDTH,
  LABEL_TO_TICK_GAP,
  LONG_STEP_INTERVAL,
  TICK_CELL_PADDING_LEFT,
  TICK_CELL_PADDING_RIGHT,
  formatHeightRulerCmString,
  nativeRulerBoundsForUnit,
} from './constants/rulerConstants';

/**
 * Native ruler: `initialValue` and events always use **centimeters**; `unit` only affects the on-screen scale (cm vs ft/in).
 *
 * Height comes from layout only — wrap in a sized parent (`flex: 1`, fixed `height`, etc.).
 *
 * - Read the value with **`ref`**: `getSnapshot()`, `getValueCm()`, `getValueString()` (imperative, e.g. submit).
 * - For live UI without `onValueChange`, use **`ref.subscribe(cb)`** or **`useHeightRulerSnapshot(ref, deps)`**.
 */
export const HeightRuler = forwardRef<HeightRulerHandle, HeightRulerProps>(function HeightRuler(
  {
    unit,
    initialValue,
    onValueChange,
    formatValue,
    onScrollBegin,
    onScrollEnd,
    fontFamily,
    tickSpacing = 15,
    minorTickHeight = 18,
    midTickHeight = 28,
    majorTickHeight = 40,
    tickWidth = 1.5,
    tickColor,
    midTickColor,
    majorTickColor,
    glassActiveTickColor,
    glassActiveNeighborTickColor,
    glassPillBackgroundColor,
    glassPillBorderRadius,
    style,
  },
  ref,
) {
  const a11yBounds = nativeRulerBoundsForUnit(unit);

  const rulerTrackWidth = useMemo(
    () =>
      Platform.OS === 'android'
        ? LABEL_COL_WIDTH +
          LABEL_TO_TICK_GAP +
          majorTickHeight +
          ANDROID_RULER_EXTRA_TRACK_DP
        : TICK_CELL_PADDING_LEFT +
          LABEL_COL_WIDTH +
          LABEL_TO_TICK_GAP +
          majorTickHeight +
          TICK_CELL_PADDING_RIGHT +
          IOS_RULER_EXTRA_TRACK_DP,
    [majorTickHeight],
  );

  const currentValueRef = useRef(initialValue);
  const valueStringRef = useRef(formatHeightRulerCmString(initialValue));
  const unitRef = useRef(unit);
  unitRef.current = unit;

  const lastInitialValuePropRef = useRef(initialValue);
  if (lastInitialValuePropRef.current !== initialValue) {
    lastInitialValuePropRef.current = initialValue;
    currentValueRef.current = initialValue;
    valueStringRef.current = formatHeightRulerCmString(initialValue);
  }
  const nativeInitialValue = currentValueRef.current;

  const listenersRef = useRef(new Set<(s: HeightRulerLiveSnapshot) => void>());

  const buildSnapshot = useCallback((): HeightRulerLiveSnapshot => {
    return {
      valueCm: currentValueRef.current,
      valueString: valueStringRef.current,
      unit: unitRef.current,
    };
  }, []);

  const notifyListeners = useCallback(() => {
    const snapshot = buildSnapshot();
    listenersRef.current.forEach((fn) => {
      fn(snapshot);
    });
  }, [buildSnapshot]);

  useEffect(() => {
    currentValueRef.current = initialValue;
    valueStringRef.current = formatHeightRulerCmString(initialValue);
    notifyListeners();
  }, [initialValue, notifyListeners]);

  useEffect(() => {
    notifyListeners();
  }, [unit, notifyListeners]);

  const handleNativeValue = useCallback(
    (valueStr: string) => {
      const num = Number(valueStr);
      if (Number.isNaN(num)) return;
      currentValueRef.current = num;
      valueStringRef.current = valueStr;
      notifyListeners();
      onValueChange?.(valueStr);
    },
    [notifyListeners, onValueChange],
  );

  useImperativeHandle(
    ref,
    () => ({
      getValueCm: () => currentValueRef.current,
      getValueString: () => valueStringRef.current,
      getSnapshot: () => buildSnapshot(),
      subscribe: (listener: (snapshot: HeightRulerLiveSnapshot) => void) => {
        listener(buildSnapshot());
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [buildSnapshot],
  );

  const activeTickColor =
    glassActiveTickColor ?? (Platform.OS === 'ios' ? '#FFD60A' : '');
  const activeNeighborTickColor =
    glassActiveNeighborTickColor ??
    (Platform.OS === 'ios' ? 'rgba(255, 214, 10, 0.72)' : '');

  const nativeProps = useMemo(
    () => ({
      unit,
      // Fabric still requires these props; native iOS/Android ignore them and use fixed bounds.
      rangeMin: 0,
      rangeMax: 0,
      step: 0,
      fractionDigits: 0,
      imperialMinInches: 0,
      initialValue: nativeInitialValue,
      rulerTrackWidth,
      tickSpacing,
      minorTickHeight,
      midTickHeight,
      majorTickHeight,
      tickWidth,
      labelColumnWidth: LABEL_COL_WIDTH,
      labelToTickGap: LABEL_TO_TICK_GAP,
      tickCellPaddingRight: TICK_CELL_PADDING_RIGHT,
      fontFamily: fontFamily || undefined,
      longStepInterval: LONG_STEP_INTERVAL,
      colorTick:
        Platform.OS === 'android' ? (tickColor ?? '') : (tickColor ?? '#D1D5DB'),
      colorMidTick:
        Platform.OS === 'android' ? (midTickColor ?? '') : (midTickColor ?? '#6B7280'),
      colorMajorTick:
        Platform.OS === 'android'
          ? (majorTickColor ?? '')
          : (majorTickColor ?? '#374151'),
      colorGlassActiveTick: activeTickColor,
      colorGlassActiveNeighborTick: activeNeighborTickColor,
      // Pill styling is Android-only — do not pass these keys on iOS (native has no UI for them).
      ...(Platform.OS === 'android'
        ? {
            glassPillBackgroundColor: glassPillBackgroundColor ?? '',
            glassPillBorderRadius: glassPillBorderRadius ?? 0,
          }
        : {}),
    }),
    [
      unit,
      nativeInitialValue,
      rulerTrackWidth,
      tickSpacing,
      minorTickHeight,
      midTickHeight,
      majorTickHeight,
      tickWidth,
      fontFamily,
      tickColor,
      midTickColor,
      majorTickColor,
      activeTickColor,
      activeNeighborTickColor,
      glassPillBackgroundColor,
      glassPillBorderRadius,
    ],
  );

  return (
    <View
      style={[styles.host, styles.hostFluid, style]}
    >
      <View style={[styles.wrap, styles.wrapFluid]}>
        <NativeHeightRulerView
          key={unit}
          style={[
            styles.nativeRuler,
            Platform.OS === 'android' ? styles.nativeRulerAndroid : null,
            { width: rulerTrackWidth, minWidth: rulerTrackWidth },
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
      </View>
    </View>
  );
});

HeightRuler.displayName = 'HeightRuler';

const styles = StyleSheet.create({
  host: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
  },
  hostFluid: {
    flexGrow: 1,
    minHeight: DEFAULT_VERTICAL_VIEWPORT,
    alignSelf: 'stretch',
  },
  wrap: {
    overflow: 'visible',
    alignItems: 'center',
  },
  wrapFluid: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  nativeRuler: {
    overflow: 'visible',
    flexGrow: 1,
    minHeight: 0,
    alignSelf: 'center',
  },
  nativeRulerAndroid: {
    backgroundColor: 'transparent',
  },
});
