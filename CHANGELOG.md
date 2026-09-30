# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-09-30

### Added

- **`WeightRuler` `step` prop** — snap precision of `1` (default), `0.5` or `0.1` in the active display unit, so users can pick values like `70.5 kg` / `155.4 lb` ([#2](https://github.com/conrador/react-native-body-metrics-picker/issues/2)). Fractional steps show a single fixed readout under the glass, which widens to fit it.
- **`WeightRulerStep`** type and **`WEIGHT_RULER_STEPS`** constant.
- **Example app** — “Ruler - decimal step” section with a 1 / 0.5 / 0.1 picker and kg/lb switcher.

### Changed

- **`WeightRuler` (iOS + Android)** — ticks are drawn by index over the visible window only (instead of walking the whole range in whole units), and fling / overshoot / rubber-band thresholds are measured in steps so every `step` feels the same per tick.
- **`WeightRuler` (Android)** — props are applied once per update batch (`onAfterUpdateTransaction`) instead of re-syncing after every single prop.
- **`HeightRuler` (Android)** — flings glide like a native Android fling (same distance, duration and deceleration curve for the release velocity) and come to rest on the nearest tick, instead of `LinearSnapHelper`’s fixed-speed seek that braked hard and felt like it stopped right away.

### Fixed

- **`WeightRuler` (Android)** — the initial value was snapped with whichever `step` / range props had arrived so far, which could round a decimal `initialValue`.
- **`HeightRuler` (Android)** — rulers opened at the top of the range (250 cm / 8′2″) instead of `initialValue`, and could jump to an unrelated value after the screen re-laid out (e.g. switching tabs). React Native drops `requestLayout()` from inside native views, so the list never applied its pending scroll; the view now runs that layout pass itself. The centering offset is also measured from the list’s padded start, as `LinearLayoutManager` expects.
- **`HeightRuler` (Android)** — the enlarged center label under the pill was clipped at the top and bottom by its one-tick-tall row. Rows may now overflow (the ruler rect still clips the list), and the center row draws last so its neighbors never paint over it.
- **npm package** — no longer ships local Android build output (`android/build`, `android/app/build`, including stale codegen sources): ~2 MB and 230 files less.

## [1.1.0] - 2026-05-09

### Added

- **`WeightRuler`** — native horizontal arc (“kitchen scale”) weight picker on **iOS** (Swift) and **Android** (Kotlin) for the **New Architecture**, with snap scrolling, arc-band overlay, haptics, and `onScrollBegin` / `onScrollEnd`.
- **`useWeightRulerSnapshot`**, **`WeightRulerHandle`**, and **`WeightRulerLiveSnapshot`** — ref + subscription API mirroring `HeightRuler`, with **`valueKg`** as the canonical field.
- **Weight helpers** — `weightRulerBoundsForUnit`, `weightRulerDisplayFromKg`, `weightRulerKgFromDisplay`, `formatWeightRulerString`, **`KG_PER_LB`**, **`LB_PER_KG`**, **`WEIGHT_RULER_KG_MIN`**, **`WEIGHT_RULER_KG_MAX`**, **`WEIGHT_RULER_STEP`**.
- **`UnitSwitcher`** — **`variant="weight"`** with **kg / lbs** labels and **`'kg' | 'lb'`** unit type; height mode unchanged (**cm / ft**).
- **Example app** — **Weight** screen showcasing `WeightRuler` themes aligned with the height demos.

### Changed

- **`HeightRuler` (Android)** — tick length, stroke pulse, and glass label scaling use smoother, WeightRuler-style Gaussian falloff for better parity with the weight ruler.
- **`WeightRuler` (Android)** — arc band is a **solid** pill with sensible default fill/stroke (no iOS-style frosted glass); rendering order draws **fill → ticks → stroke** so the outline stays crisp over ticks.
- **`WeightRuler` (iOS)** — glass chrome stays **active** for the full pan; arc band shifted slightly **up** for layout balance.
- **README** — WeightRuler quick start, full props table, weight helpers, `UnitSwitcher` variants, canonical ranges (50–250 kg / matching lb window), and example paths.
- **`package.json`** — description and keywords updated for weight + units.

### Fixed

- **kg ↔ lb switching** — native tick range and JS **canonical kilograms** stay aligned so values round-trip (e.g. 100 kg → lb → back to kg).
- **`useWeightRulerSnapshot`** — first paint no longer flashes **`0`** when the hook’s consumer mounts **above** `WeightRuler` in the tree (one-shot rebind in `useLayoutEffect`).

### Removed

- **Native dev stamp** — `#N` revision badge removed from **WeightRuler** on iOS (former `#if DEBUG` label) and Android (debuggable-only overlay).

## [1.0.0] - 2026-05-06

### Added

- Initial public release: **`HeightRuler`** (New Architecture on iOS and Android), optional Reanimated `UnitSwitcher`, and documented public API.

[1.1.0]: https://github.com/conrador/react-native-body-metrics-picker/compare/v1.0.0...v1.1.0
