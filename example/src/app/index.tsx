import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  HeightRuler,
  UnitSwitcher,
  type HeightUnit,
} from 'react-native-body-metrics-picker';

const DARK_CARD_BACKGROUND = '#0F172A';
/** Same fill for card + native ruler (background + chrome) so nothing „gryzie” z tłem karty. */
const AURORA_CARD_BG = '#F5F3FF';

const CM_PER_FOOT = 30.48;

/** Ruler `value` is always cm; format as ft/in for display when UI is in ft mode. */
function formatFeetInchesFromCm(cmValue: string): string {
  const cm = Number(cmValue);
  if (Number.isNaN(cm)) return '--';
  const feetFloat = cm / CM_PER_FOOT;
  const totalInches = Math.round(feetFloat * 12);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}

function formatFeetDecimalFromCm(cmValue: string): string {
  const cm = Number(cmValue);
  if (Number.isNaN(cm)) return cmValue;
  return (cm / CM_PER_FOOT).toFixed(2);
}

export default function HomeScreen() {
  const [cmOnlyValue, setCmOnlyValue] = useState('175');
  const [ftOnlyValue, setFtOnlyValue] = useState('175');
  const [switcherValue, setSwitcherValue] = useState('175');
  const [switcherUnit, setSwitcherUnit] = useState<HeightUnit>('cm');
  const [darkSwitcherValue, setDarkSwitcherValue] = useState('178');
  const [darkSwitcherUnit, setDarkSwitcherUnit] = useState<HeightUnit>('cm');
  const [auroraValue, setAuroraValue] = useState('172');

  const handleCmOnlyChange = useCallback((value: string) => {
    setCmOnlyValue(value);
  }, []);

  const handleFtOnlyChange = useCallback((value: string) => {
    setFtOnlyValue(value);
  }, []);

  const handleSwitcherRulerChange = useCallback((value: string) => {
    console.log('HANDLE SWITCHER RULER CHANGE', value);
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

  const handleAuroraChange = useCallback((value: string) => {
    setAuroraValue(value);
  }, []);

  const auroraLabelFont = Platform.select({
    ios: 'AvenirNext-DemiBold',
    android: 'sans-serif-medium',
    default: undefined,
  });

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
                tickColor="#E5E7EB"
                midTickColor="#6B7280"
                majorTickColor="#111827"
                tickLabelFontSize={19}
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
                tickColor="#E5E7EB"
                midTickColor="#6B7280"
                majorTickColor="#111827"
                tickLabelFontSize={19}
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
              {formatFeetInchesFromCm(ftOnlyValue)} ({formatFeetDecimalFromCm(ftOnlyValue)} ft) ·{' '}
              {ftOnlyValue} cm
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruler - cm (custom theme)</Text>
          <Text style={styles.sectionDescription}>
            Inne kolory ticków i szkła oraz{' '}
            <Text style={styles.inlineCode}>fontFamily</Text> /{' '}
            <Text style={styles.inlineCode}>tickLabelFontSize</Text> — etykiety korzystają z kolorów
            major/mid ticków po stronie natywnej.
          </Text>

          <View style={[styles.rulerCard, styles.rulerCardAurora]}>
            <View style={styles.rulerWrap}>
              <HeightRuler
                unit="cm"
                initialValue={Number(auroraValue)}
                onValueChange={handleAuroraChange}
                fontFamily={auroraLabelFont}
                tickLabelFontSize={21}
                tickColor="#DDD6FE"
                midTickColor="#7C3AED"
                majorTickColor="#4C1D95"
                glassActiveTickColor="#C026D3"
                glassActiveNeighborTickColor="rgba(192, 38, 211, 0.72)"
                minorTickHeight={17}
                midTickHeight={27}
                majorTickHeight={44}
                tickWidth={2}
                tickSpacing={14}
              />
            </View>
          </View>

          <View style={styles.debugContainer}>
            <Text style={styles.debugLabel}>Value</Text>
            <Text style={styles.debugValue}>{auroraValue} cm</Text>
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
                tickColor="#E5E7EB"
                midTickColor="#6B7280"
                majorTickColor="#111827"
                tickLabelFontSize={19}
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
                ? `${formatFeetInchesFromCm(switcherValue)} (${formatFeetDecimalFromCm(switcherValue)} ft) · ${switcherValue} cm`
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
                tickColor="#374151"
                midTickColor="#9CA3AF"
                majorTickColor="#E5E7EB"
                glassActiveTickColor="#60A5FA"
                glassActiveNeighborTickColor="rgba(96, 165, 250, 0.7)"
                tickLabelFontSize={19}
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
                ? `${formatFeetInchesFromCm(darkSwitcherValue)} (${formatFeetDecimalFromCm(darkSwitcherValue)} ft) · ${darkSwitcherValue} cm`
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
  rulerCardAurora: {
    backgroundColor: AURORA_CARD_BG,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    shadowColor: '#6D28D9',
    shadowOpacity: 0.12,
  },
  inlineCode: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 13,
    color: '#5B21B6',
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
