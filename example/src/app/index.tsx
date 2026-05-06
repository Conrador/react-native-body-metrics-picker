import React, { useCallback, useRef, useState } from 'react';
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
  HeightRuler,
  UnitSwitcher,
  useHeightRulerSnapshot,
  type HeightRulerHandle,
  type HeightUnit,
} from 'react-native-body-metrics-picker';

const DARK_CARD_BACKGROUND = '#0F172A';
/** Same fill for card + native ruler (background + chrome) so nothing clashes with the card background. */
const AURORA_CARD_BG = '#F5F3FF';

/** Android: native `glassPillBackgroundColor` / `glassPillBorderRadius` (HeightRuler passes them only on Android). */
const androidPill = {
  /** Opaque black pill on white card (cm-only demo). */
  lightBlack: { glassPillBackgroundColor: '#000000', glassPillBorderRadius: 12 },
  light: { glassPillBackgroundColor: '#E2E8F0', glassPillBorderRadius: 12 },
  aurora: { glassPillBackgroundColor: '#E9D5FF', glassPillBorderRadius: 12 },
  dark: { glassPillBackgroundColor: '#1E293B', glassPillBorderRadius: 12 },
  /** Jewel hero card — navy glass behind ticks. */
  jewel: { glassPillBackgroundColor: '#1e3a5f', glassPillBorderRadius: 16 },
} as const;

/** Hero showcase — midnight, amber, teal highlights. */
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

const CM_PER_FOOT = 30.48;

/** Base bottom padding for home ScrollView — total = this + `SafeAreaInsets.bottom`. */
const SCROLL_BOTTOM_PADDING_BASE = 32;

/** Ruler `value` is always cm; format as ft/in for display when UI is in ft mode. */
function formatFeetInchesFromCm(cmValue: string): string {
  const cm = Number(cmValue);
  if (Number.isNaN(cm)) return '--';
  const feetFloat = cm / CM_PER_FOOT;
  const totalInches = Math.round(feetFloat * 12);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  /** Primes (′ ″): one glyph each — avoids stray ASCII `"` wrapping to its own line. */
  const ftPrime = '\u2032';
  const inDoublePrime = '\u2033';
  return `${feet}${ftPrime}${inches}${inDoublePrime}`;
}

function formatFeetDecimalFromCm(cmValue: string): string {
  const cm = Number(cmValue);
  if (Number.isNaN(cm)) return cmValue;
  return (cm / CM_PER_FOOT).toFixed(2);
}

function DemoDebugCmOnly({ rulerRef }: { rulerRef: React.RefObject<HeightRulerHandle | null> }) {
  const { valueString } = useHeightRulerSnapshot(rulerRef);
  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugLabel}>Value</Text>
      <Text style={styles.debugValue}>{valueString} cm</Text>
    </View>
  );
}

function DemoDebugFtOnly({ rulerRef }: { rulerRef: React.RefObject<HeightRulerHandle | null> }) {
  const { valueString } = useHeightRulerSnapshot(rulerRef);
  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugLabel}>Value</Text>
      <Text style={styles.debugValue}>
        {formatFeetInchesFromCm(valueString)} ({formatFeetDecimalFromCm(valueString)} ft) ·{' '}
        {valueString} cm
      </Text>
    </View>
  );
}

function DemoDebugAurora({ rulerRef }: { rulerRef: React.RefObject<HeightRulerHandle | null> }) {
  const { valueString } = useHeightRulerSnapshot(rulerRef);
  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugLabel}>Value</Text>
      <Text style={styles.debugValue}>{valueString} cm</Text>
    </View>
  );
}

function DemoDebugSwitcher({
  rulerRef,
  switchKey,
}: {
  rulerRef: React.RefObject<HeightRulerHandle | null>;
  switchKey: HeightUnit;
}) {
  const { valueString, unit } = useHeightRulerSnapshot(rulerRef, switchKey);
  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugLabel}>Value</Text>
      <Text style={styles.debugValue}>
        {unit === 'ft'
          ? `${formatFeetInchesFromCm(valueString)} (${formatFeetDecimalFromCm(valueString)} ft) · ${valueString} cm`
          : `${valueString} cm`}
      </Text>
    </View>
  );
}

function DemoDebugDark({
  rulerRef,
  switchKey,
}: {
  rulerRef: React.RefObject<HeightRulerHandle | null>;
  switchKey: HeightUnit;
}) {
  const { valueString, unit } = useHeightRulerSnapshot(rulerRef, switchKey);
  return (
    <View style={[styles.debugContainer, styles.debugContainerDark]}>
      <Text style={[styles.debugLabel, styles.debugLabelDark]}>Value</Text>
      <Text style={[styles.debugValue, styles.debugValueDark]}>
        {unit === 'ft'
          ? `${formatFeetInchesFromCm(valueString)} (${formatFeetDecimalFromCm(valueString)} ft) · ${valueString} cm`
          : `${valueString} cm`}
      </Text>
    </View>
  );
}

function DemoHeroReadout({
  rulerRef,
  heroUnit,
}: {
  rulerRef: React.RefObject<HeightRulerHandle | null>;
  heroUnit: HeightUnit;
}) {
  const { valueString, unit } = useHeightRulerSnapshot(rulerRef, heroUnit);
  return (
    <View style={styles.heroValueColumn}>
      <Text
        style={[styles.heroValueMain, unit === 'ft' ? styles.heroValueMainFt : null]}
        numberOfLines={unit === 'ft' ? 2 : 1}
        adjustsFontSizeToFit={unit === 'ft'}
        minimumFontScale={0.65}
      >
        {unit === 'cm' ? `${Math.round(Number(valueString))}` : formatFeetInchesFromCm(valueString)}
      </Text>
      <Text style={styles.heroValueUnit}>{unit === 'cm' ? 'centimeters' : 'feet & inches'}</Text>
      <Text style={styles.heroValueSub}>
        {unit === 'ft'
          ? `${valueString} cm · ${formatFeetDecimalFromCm(valueString)} ft`
          : `${formatFeetInchesFromCm(valueString)} · ${formatFeetDecimalFromCm(valueString)} ft`}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const [fontsLoaded] = useFrauncesFonts({
    Fraunces_700Bold,
    Fraunces_600SemiBold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  const [switcherUnit, setSwitcherUnit] = useState<HeightUnit>('cm');
  const [darkSwitcherUnit, setDarkSwitcherUnit] = useState<HeightUnit>('cm');
  const [heroUnit, setHeroUnit] = useState<HeightUnit>('cm');

  const { bottom: safeBottomInset } = useSafeAreaInsets();
  const cmOnlyRulerRef = useRef<HeightRulerHandle>(null);
  const ftOnlyRulerRef = useRef<HeightRulerHandle>(null);
  const auroraRulerRef = useRef<HeightRulerHandle>(null);
  const switcherRulerRef = useRef<HeightRulerHandle>(null);
  const darkRulerRef = useRef<HeightRulerHandle>(null);
  const heroRulerRef = useRef<HeightRulerHandle>(null);

  const handleSwitcherUnitChange = useCallback((unit: HeightUnit) => {
    setSwitcherUnit(unit);
  }, []);

  const handleDarkSwitcherUnitChange = useCallback((unit: HeightUnit) => {
    setDarkSwitcherUnit(unit);
  }, []);

  const handleHeroUnitChange = useCallback((unit: HeightUnit) => {
    setHeroUnit(unit);
  }, []);

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
          HeightRuler — New Architecture (react-native-body-metrics-picker)
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruler - cm only</Text>
          <Text style={styles.sectionDescription}>Native vertical ruler in centimeters.</Text>

          <View style={styles.rulerCard}>
            <View style={styles.rulerWrap}>
              <HeightRuler
                ref={cmOnlyRulerRef}
                unit="cm"
                initialValue={175}
                tickColor="#E5E7EB"
                midTickColor="#6B7280"
                majorTickColor="#111827"
                minorTickHeight={16}
                midTickHeight={26}
                majorTickHeight={42}
                tickWidth={2}
                tickSpacing={14}
                {...(Platform.OS === 'android' ? androidPill.lightBlack : {})}
              />
            </View>
            <DemoDebugCmOnly rulerRef={cmOnlyRulerRef} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruler - ft only</Text>
          <Text style={styles.sectionDescription}>Native vertical ruler in feet.</Text>

          <View style={styles.rulerCard}>
            <View style={styles.rulerWrap}>
              <HeightRuler
                ref={ftOnlyRulerRef}
                unit="ft"
                initialValue={175}
                tickColor="#E5E7EB"
                midTickColor="#6B7280"
                majorTickColor="#111827"
                minorTickHeight={16}
                midTickHeight={26}
                majorTickHeight={42}
                tickWidth={2}
                tickSpacing={14}
                {...(Platform.OS === 'android' ? { glassPillBorderRadius: 12 } : {})}
              />
            </View>
            <DemoDebugFtOnly rulerRef={ftOnlyRulerRef} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruler - cm (custom theme)</Text>
          <Text style={styles.sectionDescription}>
            Different tick and glass tint colors plus an optional{' '}
            <Text style={styles.inlineCode}>fontFamily</Text> — native ruler label size is fixed (19
            pt/sp); labels inherit major/mid tick colors.
          </Text>

          <View style={[styles.rulerCard, styles.rulerCardAurora]}>
            <View style={styles.rulerWrap}>
              <HeightRuler
                ref={auroraRulerRef}
                unit="cm"
                initialValue={172}
                fontFamily={auroraLabelFont}
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
                {...(Platform.OS === 'android' ? androidPill.aurora : {})}
              />
            </View>
            <DemoDebugAurora rulerRef={auroraRulerRef} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruler - cm/ft switcher</Text>
          <Text style={styles.sectionDescription}>
            JS/Reanimated switcher with drag + spring thumb. Android uses a Material-style track,
            elevation, and Roboto-friendly labels; iOS keeps the glass thumb sheen.
          </Text>

          <View style={styles.rulerCard}>
            <View style={styles.switcherWrap}>
              <UnitSwitcher
                unit={switcherUnit}
                onUnitChange={handleSwitcherUnitChange}
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
              <HeightRuler
                ref={switcherRulerRef}
                key={switcherUnit}
                unit={switcherUnit}
                initialValue={175}
                tickColor="#E5E7EB"
                midTickColor="#6B7280"
                majorTickColor="#111827"
                minorTickHeight={16}
                midTickHeight={26}
                majorTickHeight={42}
                tickWidth={2}
                tickSpacing={14}
                {...(Platform.OS === 'android' ? androidPill.light : {})}
              />
            </View>
            <DemoDebugSwitcher rulerRef={switcherRulerRef} switchKey={switcherUnit} />
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
                ref={darkRulerRef}
                key={darkSwitcherUnit}
                unit={darkSwitcherUnit}
                initialValue={178}
                tickColor="#374151"
                midTickColor="#9CA3AF"
                majorTickColor="#E5E7EB"
                glassActiveTickColor="#60A5FA"
                glassActiveNeighborTickColor="rgba(96, 165, 250, 0.7)"
                minorTickHeight={16}
                midTickHeight={26}
                majorTickHeight={42}
                tickWidth={2}
                tickSpacing={14}
                {...(Platform.OS === 'android' ? androidPill.dark : {})}
              />
            </View>
            <DemoDebugDark rulerRef={darkRulerRef} switchKey={darkSwitcherUnit} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Showcase — ruler & switcher</Text>
          <Text style={styles.sectionDescription}>
            Ruler on the left, large Fraunces readout on the right — amber and navy/teal capsule.
          </Text>

          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Your height</Text>
            <View style={styles.heroSwitcherWrap}>
              <UnitSwitcher
                unit={heroUnit}
                onUnitChange={handleHeroUnitChange}
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

            <View style={styles.heroRulerTrackWrap}>
              <View style={styles.heroRulerRow}>
                <View style={styles.heroRulerInset}>
                  <HeightRuler
                    ref={heroRulerRef}
                    key={heroUnit}
                    unit={heroUnit}
                    initialValue={178}
                    fontFamily="Fraunces_600SemiBold"
                    tickColor={HERO.tickMinor}
                    midTickColor={HERO.tickMid}
                    majorTickColor={HERO.tickMajor}
                    glassActiveTickColor={HERO.active}
                    glassActiveNeighborTickColor={HERO.activeNeighbor}
                    minorTickHeight={17}
                    midTickHeight={28}
                    majorTickHeight={46}
                    tickWidth={2}
                    tickSpacing={15}
                    {...(Platform.OS === 'android' ? androidPill.jewel : {})}
                  />
                </View>
                <View style={styles.heroReadoutWrap} pointerEvents="box-none">
                  <DemoHeroReadout rulerRef={heroRulerRef} heroUnit={heroUnit} />
                </View>
              </View>
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
    minHeight: 280,
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
  heroCard: {
    backgroundColor: HERO.cardBg,
    borderRadius: 28,
    paddingTop: 28,
    paddingBottom: 12,
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
    marginBottom: 16,
  },
  heroSwitcherWrap: {
    alignItems: 'center',
    marginBottom: 22,
    paddingHorizontal: 20,
  },
  /** Row: fixed-width ruler + flex readout — avoids large numerals overlapping the native track. */
  heroRulerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingLeft: Platform.OS === 'ios' ? 10 : 8,
    paddingRight: 14,
    columnGap: 12,
  },
  heroReadoutWrap: {
    flex: 1,
    minWidth: 136,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 8,
  },
  heroValueColumn: {
    width: '100%',
    maxWidth: 244,
    alignItems: 'flex-end',
  },
  heroValueMain: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 54,
    lineHeight: 54,
    letterSpacing: -2,
    color: HERO.gold,
    textAlign: 'right',
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
  heroValueMainFt: {
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: -1.45,
  },
  heroValueUnit: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: HERO.goldSoft,
    marginTop: 8,
    opacity: 0.95,
    textAlign: 'right',
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
  heroValueSub: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: HERO.muted2,
    marginTop: 10,
    lineHeight: 19,
    textAlign: 'right',
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
  heroRulerInset: {
    backgroundColor: HERO.insetBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    overflow: 'visible',
    minHeight: 292,
  },
  heroRulerTrackWrap: {
    paddingHorizontal: 18,
  },
});
