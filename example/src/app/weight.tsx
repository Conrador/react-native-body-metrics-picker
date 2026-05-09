import React, { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  useFonts as useFrauncesFonts,
} from '@expo-google-fonts/fraunces';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  UnitSwitcher,
  WeightRuler,
  useWeightRulerSnapshot,
  weightRulerDisplayFromKg,
  weightRulerKgFromDisplay,
  type WeightRulerHandle,
  type WeightUnit,
} from 'react-native-body-metrics-picker';

const DARK_CARD_BACKGROUND = '#0F172A';
/** Same fill for card + native ruler (background + chrome) so nothing clashes with the card background. */
const AURORA_CARD_BG = '#F5F3FF';

/**
 * Android-only `glassBackgroundColor` / `glassBorderColor` overrides — iOS keeps its fixed
 * frosted glass chrome, while Android renders a **solid** colored pill that contrasts cleanly
 * with the card surface (frosted/translucent looks read as a render bug on most Android themes).
 */
const androidGlass = {
  aurora: {
    glassBackgroundColor: '#E9D5FF',
    glassBorderColor: '#C4B5FD',
  },
  dark: {
    glassBackgroundColor: '#1E293B',
    glassBorderColor: '#475569',
  },
  hero: {
    glassBackgroundColor: '#1E2A47',
    glassBorderColor: '#FBBF24',
  },
} as const;

/** Hero showcase — midnight, amber, teal highlights. Mirrors the height tab hero. */
const HERO = {
  cardBg: '#0c1222',
  cardBorder: 'rgba(251, 191, 36, 0.28)',
  insetBg: '#111827',
  gold: '#fbbf24',
  goldSoft: '#fcd34d',
  muted: '#94a3b8',
  muted2: '#64748b',
  tickMinor: '#334155',
  tickMid: '#64748b',
  tickMajor: '#e2e8f0',
  active: '#2dd4bf',
  activeNeighbor: 'rgba(45, 212, 191, 0.72)',
} as const;

/** Base bottom padding for the ScrollView — total = this + `SafeAreaInsets.bottom`. */
const SCROLL_BOTTOM_PADDING_BASE = 32;

/** Snapshot is canonical kg — convert to whatever the active switcher unit is for display. */
function displayValueForUnit(valueKg: number, unit: WeightUnit): number {
  return Math.round(weightRulerDisplayFromKg(valueKg, unit));
}

function DemoDebugWeight({
  rulerRef,
  unit,
}: {
  rulerRef: React.RefObject<WeightRulerHandle | null>;
  unit: WeightUnit;
}) {
  const { valueKg } = useWeightRulerSnapshot(rulerRef, unit);
  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugLabel}>Value</Text>
      <Text style={styles.debugValue}>
        {displayValueForUnit(valueKg, unit)} {unit}
      </Text>
    </View>
  );
}

function DemoDebugWeightAurora({
  rulerRef,
  unit,
}: {
  rulerRef: React.RefObject<WeightRulerHandle | null>;
  unit: WeightUnit;
}) {
  const { valueKg } = useWeightRulerSnapshot(rulerRef, unit);
  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugLabel}>Value</Text>
      <Text style={styles.debugValue}>
        {displayValueForUnit(valueKg, unit)} {unit}
      </Text>
    </View>
  );
}

function DemoDebugWeightDark({
  rulerRef,
  unit,
}: {
  rulerRef: React.RefObject<WeightRulerHandle | null>;
  unit: WeightUnit;
}) {
  const { valueKg } = useWeightRulerSnapshot(rulerRef, unit);
  return (
    <View style={[styles.debugContainer, styles.debugContainerDark]}>
      <Text style={[styles.debugLabel, styles.debugLabelDark]}>Value</Text>
      <Text style={[styles.debugValue, styles.debugValueDark]}>
        {displayValueForUnit(valueKg, unit)} {unit}
      </Text>
    </View>
  );
}

function DemoHeroWeightReadout({
  rulerRef,
  unit,
}: {
  rulerRef: React.RefObject<WeightRulerHandle | null>;
  unit: WeightUnit;
}) {
  const { valueKg } = useWeightRulerSnapshot(rulerRef, unit);
  const displayValue = weightRulerDisplayFromKg(valueKg, unit);
  return (
    <View style={styles.heroValueColumn}>
      <Text style={styles.heroValueMain} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {Math.round(displayValue)}
      </Text>
      <Text style={styles.heroValueUnit}>{unit === 'kg' ? 'kilograms' : 'pounds'}</Text>
      <Text style={styles.heroValueSub}>
        {displayValue.toFixed(2)} {unit}
      </Text>
    </View>
  );
}

export default function WeightScreen() {
  const [fontsLoaded] = useFrauncesFonts({
    Fraunces_700Bold,
    Fraunces_600SemiBold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  const [switcherUnit, setSwitcherUnit] = useState<WeightUnit>('kg');
  const [darkSwitcherUnit, setDarkSwitcherUnit] = useState<WeightUnit>('kg');
  const [heroUnit, setHeroUnit] = useState<WeightUnit>('kg');

  const { bottom: safeBottomInset } = useSafeAreaInsets();
  const kgOnlyRulerRef = useRef<WeightRulerHandle>(null);
  const lbOnlyRulerRef = useRef<WeightRulerHandle>(null);
  const auroraRulerRef = useRef<WeightRulerHandle>(null);
  const switcherRulerRef = useRef<WeightRulerHandle>(null);
  const darkRulerRef = useRef<WeightRulerHandle>(null);
  const heroRulerRef = useRef<WeightRulerHandle>(null);

  const auroraLabelFont = Platform.select({
    ios: 'AvenirNext-DemiBold',
    android: 'sans-serif-medium',
    default: undefined,
  });

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: SCROLL_BOTTOM_PADDING_BASE + safeBottomInset }}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
      >
        <Text style={styles.title}>Body Metrics Picker</Text>
        <Text style={styles.subtitle}>
          WeightRuler — New Architecture (react-native-body-metrics-picker)
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruler - kg only</Text>
          <Text style={styles.sectionDescription}>
            Native horizontal arc weight scale (kitchen-style dial) in kilograms.
          </Text>

          <View style={styles.rulerCard}>
            <View style={styles.rulerWrap}>
              <WeightRuler
                ref={kgOnlyRulerRef}
                unit="kg"
                initialValue={75}
                tickColor="#E5E7EB"
                midTickColor="#6B7280"
                majorTickColor="#111827"
                activeTickColor="#111827"
                activeNeighborTickColor="rgba(17, 24, 39, 0.55)"
                glassCenterLabelColor="#111827"
                tickWidth={2}
                tickSpacing={12}
                minorTickHeight={14}
                midTickHeight={22}
                majorTickHeight={34}
                arcCenterOffset={180}
                glassLabelFontSize={20}
                glassLabelArea={28}
                style={styles.rulerInner}
              />
            </View>
            <DemoDebugWeight rulerRef={kgOnlyRulerRef} unit="kg" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruler - lb only</Text>
          <Text style={styles.sectionDescription}>Same range, displayed in pounds.</Text>

          <View style={styles.rulerCard}>
            <View style={styles.rulerWrap}>
              <WeightRuler
                ref={lbOnlyRulerRef}
                unit="lb"
                initialValue={weightRulerKgFromDisplay(170, 'lb')}
                tickColor="#E5E7EB"
                midTickColor="#6B7280"
                majorTickColor="#111827"
                activeTickColor="#111827"
                activeNeighborTickColor="rgba(17, 24, 39, 0.55)"
                glassCenterLabelColor="#111827"
                tickWidth={2}
                tickSpacing={12}
                minorTickHeight={14}
                midTickHeight={22}
                majorTickHeight={34}
                arcCenterOffset={180}
                glassLabelFontSize={20}
                glassLabelArea={28}
                style={styles.rulerInner}
              />
            </View>
            <DemoDebugWeight rulerRef={lbOnlyRulerRef} unit="lb" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruler - kg (custom theme)</Text>
          <Text style={styles.sectionDescription}>
            Different tick + glass tint colors plus an optional{' '}
            <Text style={styles.inlineCode}>fontFamily</Text> — the snap label adopts a contrasting
            accent so the centered value reads cleanly against the band.
          </Text>

          <View style={[styles.rulerCard, styles.rulerCardAurora]}>
            <View style={styles.rulerWrap}>
              <WeightRuler
                ref={auroraRulerRef}
                unit="kg"
                initialValue={72}
                fontFamily={auroraLabelFont}
                tickColor="#DDD6FE"
                midTickColor="#7C3AED"
                majorTickColor="#4C1D95"
                activeTickColor="#C026D3"
                activeNeighborTickColor="rgba(192, 38, 211, 0.72)"
                glassCenterLabelColor="#86198F"
                {...(Platform.OS === 'android' ? androidGlass.aurora : {})}
                tickWidth={2}
                tickSpacing={13}
                minorTickHeight={14}
                midTickHeight={23}
                majorTickHeight={36}
                arcCenterOffset={180}
                glassLabelFontSize={20}
                glassLabelArea={28}
                style={styles.rulerInner}
              />
            </View>
            <DemoDebugWeightAurora rulerRef={auroraRulerRef} unit="kg" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruler - kg/lb switcher</Text>
          <Text style={styles.sectionDescription}>
            JS/Reanimated switcher with drag + spring thumb. The arc remounts on unit change so it
            picks up the new range cleanly.
          </Text>

          <View style={styles.rulerCard}>
            <View style={styles.switcherWrap}>
              <UnitSwitcher
                variant="weight"
                unit={switcherUnit}
                onUnitChange={setSwitcherUnit}
                {...(Platform.OS === 'ios'
                  ? {
                      trackColor: '#F3F4F6',
                      thumbColor: '#FFFFFF',
                      activeTextColor: '#111827',
                      inactiveTextColor: '#6B7280',
                      labelFontSize: 16,
                    }
                  : {})}
              />
            </View>
            <View style={styles.rulerWrap}>
              <WeightRuler
                ref={switcherRulerRef}
                unit={switcherUnit}
                initialValue={75}
                tickColor="#E5E7EB"
                midTickColor="#6B7280"
                majorTickColor="#111827"
                activeTickColor="#F59E0B"
                activeNeighborTickColor="rgba(245, 158, 11, 0.6)"
                glassCenterLabelColor="#F59E0B"
                tickWidth={2}
                tickSpacing={12}
                minorTickHeight={14}
                midTickHeight={22}
                majorTickHeight={34}
                arcCenterOffset={180}
                glassLabelFontSize={20}
                glassLabelArea={28}
                style={styles.rulerInner}
              />
            </View>
            <DemoDebugWeight rulerRef={switcherRulerRef} unit={switcherUnit} />
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
                variant="weight"
                unit={darkSwitcherUnit}
                onUnitChange={setDarkSwitcherUnit}
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
              <WeightRuler
                ref={darkRulerRef}
                unit={darkSwitcherUnit}
                initialValue={78}
                tickColor="#374151"
                midTickColor="#9CA3AF"
                majorTickColor="#E5E7EB"
                activeTickColor="#60A5FA"
                activeNeighborTickColor="rgba(96, 165, 250, 0.7)"
                glassCenterLabelColor="#60A5FA"
                {...(Platform.OS === 'android' ? androidGlass.dark : {})}
                tickWidth={2}
                tickSpacing={12}
                minorTickHeight={14}
                midTickHeight={22}
                majorTickHeight={34}
                arcCenterOffset={180}
                glassLabelFontSize={20}
                glassLabelArea={28}
                style={styles.rulerInner}
              />
            </View>
            <DemoDebugWeightDark rulerRef={darkRulerRef} unit={darkSwitcherUnit} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Showcase — ruler & switcher</Text>
          <Text style={styles.sectionDescription}>
            Large Fraunces readout above the arc — amber and navy/teal capsule.
          </Text>

          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Your weight</Text>
            <View style={styles.heroSwitcherWrap}>
              <UnitSwitcher
                variant="weight"
                unit={heroUnit}
                onUnitChange={setHeroUnit}
                fontFamily="Outfit_600SemiBold"
                labelFontSize={15}
                trackColor={
                  Platform.OS === 'android' ? 'rgba(255,255,255,0.1)' : 'rgba(148, 163, 184, 0.14)'
                }
                thumbColor={Platform.OS === 'android' ? HERO.goldSoft : HERO.gold}
                activeTextColor="#0f172a"
                inactiveTextColor={HERO.muted}
                thumbGlassBorderColor="transparent"
                thumbSheenColor="rgba(255,255,255,0.35)"
              />
            </View>

            <View style={styles.heroReadoutWrap}>
              <DemoHeroWeightReadout rulerRef={heroRulerRef} unit={heroUnit} />
            </View>

            <View style={styles.heroRulerInset}>
              <WeightRuler
                ref={heroRulerRef}
                unit={heroUnit}
                initialValue={78}
                fontFamily="Fraunces_600SemiBold"
                tickColor={HERO.tickMinor}
                midTickColor={HERO.tickMid}
                majorTickColor={HERO.tickMajor}
                activeTickColor={HERO.active}
                activeNeighborTickColor={HERO.activeNeighbor}
                glassCenterLabelColor={HERO.gold}
                {...(Platform.OS === 'android' ? androidGlass.hero : {})}
                tickWidth={2}
                tickSpacing={15}
                minorTickHeight={17}
                midTickHeight={24}
                majorTickHeight={46}
                arcCenterOffset={180}
                glassLabelFontSize={22}
                glassLabelArea={40}
                style={styles.heroRulerInner}
              />
            </View>
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
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    paddingVertical: 14,
    paddingHorizontal: 8,
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
  rulerInner: {
    height: 200,
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
    alignSelf: 'stretch',
    marginHorizontal: 8,
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
  heroCard: {
    backgroundColor: HERO.cardBg,
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: HERO.cardBorder,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  heroEyebrow: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    letterSpacing: 3,
    color: HERO.muted,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 14,
  },
  heroSwitcherWrap: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  heroReadoutWrap: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  heroValueColumn: {
    width: '100%',
    alignItems: 'center',
  },
  heroValueMain: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -2,
    color: HERO.gold,
    textAlign: 'center',
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
  heroValueUnit: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: HERO.goldSoft,
    marginTop: 6,
    opacity: 0.95,
    textAlign: 'center',
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
  heroValueSub: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: HERO.muted2,
    marginTop: 6,
    lineHeight: 19,
    textAlign: 'center',
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
  heroRulerInset: {
    backgroundColor: HERO.insetBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    overflow: 'hidden',
    marginHorizontal: 18,
    marginTop: 6,
    paddingVertical: 8,
  },
  heroRulerInner: {
    height: 220,
    width: '100%',
  },
});
