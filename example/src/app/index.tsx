import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  HeightRuler,
  UnitSwitcher,
  type HeightUnit,
} from 'react-native-body-metrics-picker';

const DARK_CARD_BACKGROUND = '#0F172A';

function formatFeetInches(feetValue: string): string {
  const numeric = Number(feetValue);
  if (Number.isNaN(numeric)) return '--';
  const totalInches = Math.round(numeric * 12);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}

function formatFeetDecimal(feetValue: string): string {
  const numeric = Number(feetValue);
  if (Number.isNaN(numeric)) return feetValue;
  return numeric.toFixed(2);
}

export default function HomeScreen() {
  const [cmOnlyValue, setCmOnlyValue] = useState('175');
  const [ftOnlyValue, setFtOnlyValue] = useState('5.7415');
  const [switcherValue, setSwitcherValue] = useState('175');
  const [switcherUnit, setSwitcherUnit] = useState<HeightUnit>('cm');
  const [darkSwitcherValue, setDarkSwitcherValue] = useState('178');
  const [darkSwitcherUnit, setDarkSwitcherUnit] = useState<HeightUnit>('cm');

  const handleCmOnlyChange = useCallback((value: string) => {
    setCmOnlyValue(value);
  }, []);

  const handleFtOnlyChange = useCallback((value: string) => {
    setFtOnlyValue(value);
  }, []);

  const handleSwitcherRulerChange = useCallback((value: string) => {
    setSwitcherValue(value);
  }, []);

  const handleSwitcherUnitChange = useCallback((unit: HeightUnit) => {
    setSwitcherUnit(unit);
  }, []);

  const handleDarkSwitcherRulerChange = useCallback((value: string) => {
    setDarkSwitcherValue(value);
  }, []);

  const handleDarkSwitcherUnitChange = useCallback((unit: HeightUnit) => {
    setDarkSwitcherUnit(unit);
  }, []);

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Body Metrics Picker</Text>
        <Text style={styles.subtitle}>Fabric HeightRuler (react-native-body-metrics-picker)</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruler - cm only</Text>
          <Text style={styles.sectionDescription}>
            Native vertical ruler in centimeters.
          </Text>

          <View style={styles.rulerCard}>
            <View style={styles.rulerWrap}>
              <HeightRuler
                unit="cm"
                initialValue={Number(cmOnlyValue)}
                onValueChange={handleCmOnlyChange}
                backgroundColor="#FFFFFF"
                tickColor="#E5E7EB"
                midTickColor="#6B7280"
                majorTickColor="#111827"
                selectedTickColor="#D1D5DB"
                tickLabelFontSize={24}
                minorTickHeight={16}
                midTickHeight={26}
                majorTickHeight={42}
                tickWidth={2}
                tickSpacing={14}
              />
            </View>
          </View>

          <View style={styles.debugContainer}>
            <Text style={styles.debugLabel}>Value</Text>
            <Text style={styles.debugValue}>{cmOnlyValue} cm</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruler - ft only</Text>
          <Text style={styles.sectionDescription}>Native vertical ruler in feet.</Text>

          <View style={styles.rulerCard}>
            <View style={styles.rulerWrap}>
              <HeightRuler
                unit="ft"
                initialValue={Number(ftOnlyValue)}
                onValueChange={handleFtOnlyChange}
                backgroundColor="#FFFFFF"
                tickColor="#E5E7EB"
                midTickColor="#6B7280"
                majorTickColor="#111827"
                selectedTickColor="#D1D5DB"
                tickLabelFontSize={24}
                minorTickHeight={16}
                midTickHeight={26}
                majorTickHeight={42}
                tickWidth={2}
                tickSpacing={14}
              />
            </View>
          </View>

          <View style={styles.debugContainer}>
            <Text style={styles.debugLabel}>Value</Text>
            <Text style={styles.debugValue}>
              {formatFeetInches(ftOnlyValue)} ({formatFeetDecimal(ftOnlyValue)} ft)
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruler - cm/ft switcher</Text>
          <Text style={styles.sectionDescription}>
            JS/Reanimated switcher with drag + spring thumb animation.
          </Text>

          <View style={styles.rulerCard}>
            <View style={styles.switcherWrap}>
              <UnitSwitcher
                unit={switcherUnit}
                onUnitChange={handleSwitcherUnitChange}
                trackColor="#F3F4F6"
                thumbColor="#FFFFFF"
                activeTextColor="#111827"
                inactiveTextColor="#6B7280"
                labelFontSize={16}
              />
            </View>
            <View style={styles.rulerWrap}>
              <HeightRuler
                unit={switcherUnit}
                initialValue={Number(switcherValue)}
                onValueChange={handleSwitcherRulerChange}
                backgroundColor="#FFFFFF"
                tickColor="#E5E7EB"
                midTickColor="#6B7280"
                majorTickColor="#111827"
                selectedTickColor="#D1D5DB"
                tickLabelFontSize={24}
                minorTickHeight={16}
                midTickHeight={26}
                majorTickHeight={42}
                tickWidth={2}
                tickSpacing={14}
              />
            </View>
          </View>

          <View style={styles.debugContainer}>
            <Text style={styles.debugLabel}>Value</Text>
            <Text style={styles.debugValue}>
              {switcherUnit === 'ft'
                ? `${formatFeetInches(switcherValue)} (${formatFeetDecimal(switcherValue)} ft)`
                : `${switcherValue} cm`}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruler + switcher - dark mode</Text>
          <Text style={styles.sectionDescription}>
            Dark preset with the same draggable Reanimated switcher behavior.
          </Text>

          <View style={[styles.rulerCard, styles.rulerCardDark]}>
            <View style={styles.switcherWrap}>
              <UnitSwitcher
                unit={darkSwitcherUnit}
                onUnitChange={handleDarkSwitcherUnitChange}
                trackColor="#1F2937"
                thumbColor="#374151"
                activeTextColor="#F9FAFB"
                inactiveTextColor="#9CA3AF"
                thumbSheenColor="#FFFFFF"
                thumbGlassBorderColor="rgba(255,255,255,0.18)"
                labelFontSize={16}
              />
            </View>
            <View style={styles.rulerWrap}>
              <HeightRuler
                unit={darkSwitcherUnit}
                initialValue={Number(darkSwitcherValue)}
                onValueChange={handleDarkSwitcherRulerChange}
                backgroundColor={DARK_CARD_BACKGROUND}
                rulerChromeColor="rgba(0,0,0,0)"
                tickColor="#374151"
                midTickColor="#9CA3AF"
                majorTickColor="#E5E7EB"
                selectedTickColor="#9CA3AF"
                glassSurfaceColor="rgba(255,255,255,0.18)"
                glassBorderColor="rgba(255,255,255,0.16)"
                glassSheenColor="rgba(255,255,255,0.30)"
                glassRimColor="rgba(255,255,255,0.09)"
                glassLiquidBorderColor="rgba(255,255,255,0.46)"
                glassActiveTickColor="#60A5FA"
                glassActiveNeighborTickColor="rgba(96, 165, 250, 0.7)"
                tickLabelFontSize={24}
                minorTickHeight={16}
                midTickHeight={26}
                majorTickHeight={42}
                tickWidth={2}
                tickSpacing={14}
              />
            </View>
          </View>

          <View style={[styles.debugContainer, styles.debugContainerDark]}>
            <Text style={[styles.debugLabel, styles.debugLabelDark]}>Value</Text>
            <Text style={[styles.debugValue, styles.debugValueDark]}>
              {darkSwitcherUnit === 'ft'
                ? `${formatFeetInches(darkSwitcherValue)} (${formatFeetDecimal(darkSwitcherValue)} ft)`
                : `${darkSwitcherValue} cm`}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scroll: {
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    paddingHorizontal: 24,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 24,
    marginTop: 4,
    marginBottom: 24,
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
  rulerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rulerCardDark: {
    backgroundColor: DARK_CARD_BACKGROUND,
  },
  switcherWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 16,
    width: '100%',
  },
  rulerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
  debugContainerDark: {
    backgroundColor: '#111827',
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
  debugLabelDark: {
    color: '#9CA3AF',
  },
  debugValueDark: {
    color: '#E5E7EB',
  },
});
