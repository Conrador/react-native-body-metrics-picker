# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

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
