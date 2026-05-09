import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import {
  DEFAULT_WEIGHT_RULER_HEIGHT,
  formatWeightRulerString,
  WEIGHT_RULER_KG_MAX,
  WEIGHT_RULER_KG_MIN,
  WEIGHT_RULER_LONG_STEP_INTERVAL,
  WEIGHT_RULER_STEP,
  weightRulerBoundsForUnit,
  weightRulerDisplayFromKg,
  weightRulerKgFromDisplay,
} from './constants/weightRulerConstants';
import { NativeWeightRulerView } from './NativeWeightRulerView';
import type {
  WeightRulerHandle,
  WeightRulerLiveSnapshot,
  WeightRulerProps,
} from './WeightRuler.types';

/**
 * Native horizontal arc weight ruler ("kitchen scale" style).
 *
 * The component is unit-independent: state is stored as **canonical kilograms**, and the
 * `unit` prop only relabels the on-screen scale. When the user flips the unit switcher,
 * the JS wrapper converts the live kg value into the new display unit (whole-lb in lb mode,
 * whole-kg in kg mode) and the native view re-renders with the matching tick grid. This
 * gives a lossless round-trip: 100 kg → switch to lb → ~220 lb → switch back → 100 kg.
 */
export const WeightRuler = forwardRef<WeightRulerHandle, WeightRulerProps>(function WeightRuler(
  {
    unit,
    initialValue,
    onValueChange,
    formatValue,
    onScrollBegin,
    onScrollEnd,
    fontFamily,
    tickSpacing = 12,
    minorTickHeight = 14,
    midTickHeight = 22,
    majorTickHeight = 32,
    tickWidth = 1.5,
    arcCenterOffset = 240,
    tickColor,
    midTickColor,
    majorTickColor,
    activeTickColor,
    activeNeighborTickColor,
    glassCenterLabelColor,
    glassBackgroundColor,
    glassBorderColor,
    glassArcHalfAngle = 0,
    glassOuterPadding = 10,
    glassLabelArea = 22,
    glassLabelFontSize = 18,
    trackColor,
    style,
  },
  ref,
) {
  const currentValueKgRef = useRef(initialValue);
  const valueStringRef = useRef(formatWeightRulerString(initialValue));
  const unitRef = useRef(unit);
  unitRef.current = unit;

  const lastInitialValuePropRef = useRef(initialValue);
  if (lastInitialValuePropRef.current !== initialValue) {
    lastInitialValuePropRef.current = initialValue;
    currentValueKgRef.current = initialValue;
    valueStringRef.current = formatWeightRulerString(initialValue);
  }

  const listenersRef = useRef(new Set<(s: WeightRulerLiveSnapshot) => void>());

  const buildSnapshot = useCallback(
    (): WeightRulerLiveSnapshot => ({
      valueKg: currentValueKgRef.current,
      valueString: valueStringRef.current,
      unit: unitRef.current,
    }),
    [],
  );

  const notifyListeners = useCallback(() => {
    const snapshot = buildSnapshot();
    listenersRef.current.forEach((fn) => {
      fn(snapshot);
    });
  }, [buildSnapshot]);

  useEffect(() => {
    currentValueKgRef.current = initialValue;
    valueStringRef.current = formatWeightRulerString(initialValue);
    notifyListeners();
  }, [initialValue, notifyListeners]);

  useEffect(() => {
    notifyListeners();
  }, [unit, notifyListeners]);

  // Native emits values in the **active display unit**; convert back to canonical kg before
  // publishing so subscribers always see kilograms regardless of switcher state.
  const handleNativeValue = useCallback(
    (displayValueStr: string) => {
      const displayNum = Number(displayValueStr);
      if (Number.isNaN(displayNum)) return;
      const kg = weightRulerKgFromDisplay(displayNum, unitRef.current);
      currentValueKgRef.current = kg;
      valueStringRef.current = formatWeightRulerString(kg);
      notifyListeners();
      onValueChange?.(valueStringRef.current);
    },
    [notifyListeners, onValueChange],
  );

  useImperativeHandle(
    ref,
    () => ({
      getValueKg: () => currentValueKgRef.current,
      getValueString: () => valueStringRef.current,
      getSnapshot: () => buildSnapshot(),
      subscribe: (listener: (snapshot: WeightRulerLiveSnapshot) => void) => {
        listener(buildSnapshot());
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [buildSnapshot],
  );

  const resolvedActiveTick =
    activeTickColor ?? (Platform.OS === 'ios' ? '#FFD60A' : '');
  const resolvedActiveNeighbor =
    activeNeighborTickColor ?? (Platform.OS === 'ios' ? 'rgba(255, 214, 10, 0.72)' : '');

  // Tick grid is whole units of the **display** unit (lb → 110…551, kg → 50…250). Both
  // windows cover the same physical band (50–250 kg) so unit flips preserve the live value.
  const displayBounds = useMemo(() => weightRulerBoundsForUnit(unit), [unit]);
  const nativeInitialValueDisplay = useMemo(() => {
    const kg = currentValueKgRef.current;
    const clampedKg = Math.min(WEIGHT_RULER_KG_MAX, Math.max(WEIGHT_RULER_KG_MIN, kg));
    const raw = weightRulerDisplayFromKg(clampedKg, unit);
    return Math.min(displayBounds.max, Math.max(displayBounds.min, raw));
    // `initialValue` (kg) is consumed via the ref above so it can stay out of the deps;
    // listing it here just forces a recompute when the prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, initialValue, displayBounds.min, displayBounds.max]);

  const nativeProps = useMemo(
    () => ({
      unit,
      initialValue: nativeInitialValueDisplay,
      rangeMin: displayBounds.min,
      rangeMax: displayBounds.max,
      step: WEIGHT_RULER_STEP,
      fractionDigits: 0,
      longStepInterval: WEIGHT_RULER_LONG_STEP_INTERVAL,
      tickSpacingPx: tickSpacing,
      minorTickHeight,
      midTickHeight,
      majorTickHeight,
      tickWidth,
      arcCenterOffset,
      fontFamily: fontFamily || undefined,
      colorTick: Platform.OS === 'android' ? (tickColor ?? '') : (tickColor ?? '#D1D5DB'),
      colorMidTick:
        Platform.OS === 'android' ? (midTickColor ?? '') : (midTickColor ?? '#6B7280'),
      colorMajorTick:
        Platform.OS === 'android' ? (majorTickColor ?? '') : (majorTickColor ?? '#111827'),
      colorActiveTick: resolvedActiveTick,
      colorActiveNeighborTick: resolvedActiveNeighbor,
      colorGlassCenterLabel: glassCenterLabelColor ?? '',
      glassPillBackgroundColor: glassBackgroundColor ?? '',
      glassPillBorderColor: glassBorderColor ?? '',
      glassArcHalfAngle,
      glassOuterPadding,
      glassLabelArea,
      glassLabelFontSize,
      colorTrack: trackColor ?? '',
    }),
    [
      unit,
      nativeInitialValueDisplay,
      displayBounds.min,
      displayBounds.max,
      tickSpacing,
      minorTickHeight,
      midTickHeight,
      majorTickHeight,
      tickWidth,
      arcCenterOffset,
      fontFamily,
      tickColor,
      midTickColor,
      majorTickColor,
      resolvedActiveTick,
      resolvedActiveNeighbor,
      glassCenterLabelColor,
      glassBackgroundColor,
      glassBorderColor,
      glassArcHalfAngle,
      glassOuterPadding,
      glassLabelArea,
      glassLabelFontSize,
      trackColor,
    ],
  );

  return (
    <View style={[styles.host, style]}>
      <NativeWeightRulerView
        key={unit}
        style={styles.native}
        {...nativeProps}
        onValueChange={(e) => handleNativeValue(e.nativeEvent.value)}
        onScrollBegin={onScrollBegin}
        onScrollEnd={onScrollEnd}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Weight ruler, horizontal arc"
        accessibilityValue={{
          min: WEIGHT_RULER_KG_MIN,
          max: WEIGHT_RULER_KG_MAX,
          now: Math.round(currentValueKgRef.current),
          text: formatValue ? formatValue(currentValueKgRef.current) : undefined,
        }}
      />
    </View>
  );
});

WeightRuler.displayName = 'WeightRuler';

const styles = StyleSheet.create({
  host: {
    width: '100%',
    minHeight: DEFAULT_WEIGHT_RULER_HEIGHT,
    overflow: 'hidden',
  },
  native: {
    flex: 1,
    width: '100%',
  },
});
