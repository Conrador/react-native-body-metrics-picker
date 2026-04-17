import React, { useCallback, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

import {
  HeightPicker,
  HeightRuler,
  type BodyMetricsPickerTheme,
  type HeightUnit,
} from 'react-native-body-metrics-picker';

const customTheme: BodyMetricsPickerTheme = {
  colors: {
    background: '#FFFFFF',
    value: '#111827',
    unit: '#6B7280',
    title: '#111827',
    majorTick: '#111827',
    midTick: '#6B7280',
    tick: '#E5E7EB',
    tickLabel: '#6B7280',
    indicator: '#FF5A5F',
    confirmButtonBackground: '#FF5A5F',
    confirmButtonText: '#FFFFFF',
    closeBackground: '#E5E7EB',
    closeIcon: '#111827',
    unitSwitcherBackground: '#F3F4F6',
    unitSwitcherActiveBackground: '#FFFFFF',
    unitSwitcherActiveText: '#111827',
    unitSwitcherInactiveText: '#6B7280',
  },
  typography: {
    valueSize: 64,
    titleSize: 20,
    confirmButtonSize: 17,
    tickLabelSize: 13,
  },
  ruler: {
    minorTickHeight: 16,
    midTickHeight: 26,
    majorTickHeight: 42,
    tickWidth: 2,
    tickSpacing: 14,
  },
};

export default function App() {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Picker state
  const [pickerHeight, setPickerHeight] = useState(175);
  const [pickerUnit, setPickerUnit] = useState<HeightUnit>('cm');

  // Standalone ruler state
  const [rulerHeight, setRulerHeight] = useState('175');
  const [rulerUnit, setRulerUnit] = useState<HeightUnit>('cm');

  const handleOpenPicker = useCallback(() => {
    setSheetOpen(true);
  }, []);

  const handleClosePicker = useCallback(() => {
    setSheetOpen(false);
  }, []);

  const handlePickerConfirm = useCallback((value: string, unit: HeightUnit) => {
    setPickerHeight(Number(value));
    setPickerUnit(unit);
  }, []);

  const handleRulerChange = useCallback((value: string) => {
    setRulerHeight(value);
  }, []);

  const handleRulerUnitChange = useCallback((unit: HeightUnit) => {
    setRulerUnit(unit);
  }, []);

  const handleScrollBegin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <BottomSheetModalProvider>
        <SafeAreaView style={styles.flex}>
          <StatusBar style="dark" />

          <View style={styles.content}>
            <Text style={styles.title}>Body Metrics Picker</Text>
            <Text style={styles.subtitle}>react-native-body-metrics-picker</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>HeightPicker</Text>
              <Text style={styles.sectionDescription}>
                Themed bottom sheet with a built-in cm/ft switcher
              </Text>

              <TouchableOpacity
                style={styles.openButton}
                onPress={handleOpenPicker}
                activeOpacity={0.8}
              >
                <Text style={styles.openButtonLabel}>Height</Text>
                <Text style={styles.openButtonValue}>
                  {pickerHeight} {pickerUnit}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>HeightRuler</Text>
              <Text style={styles.sectionDescription}>
                Standalone ruler with the switcher (tap cm / ft)
              </Text>

              <View style={styles.rulerCard}>
                <HeightRuler
                  unit={rulerUnit}
                  onUnitChange={handleRulerUnitChange}
                  initialValue={Number(rulerHeight)}
                  onValueChange={handleRulerChange}
                  onScrollBegin={handleScrollBegin}
                  theme={customTheme}
                />
              </View>

              <View style={styles.debugContainer}>
                <Text style={styles.debugLabel}>Value</Text>
                <Text style={styles.debugValue}>
                  {rulerHeight} {rulerUnit}
                </Text>
              </View>
            </View>
          </View>

          <HeightPicker
            isOpen={sheetOpen}
            onClose={handleClosePicker}
            value={pickerHeight}
            unit={pickerUnit}
            onUnitChange={setPickerUnit}
            onConfirm={handlePickerConfirm}
            title="Select your height"
            confirmLabel="Save"
            onScrollBegin={handleScrollBegin}
            theme={customTheme}
          />
        </SafeAreaView>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    paddingHorizontal: 24,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 24,
    marginTop: 4,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  openButtonLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  openButtonValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FF5A5F',
  },
  rulerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    paddingVertical: 8,
  },
  debugContainer: {
    marginTop: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debugLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  debugValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
});
