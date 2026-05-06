# react-native-body-metrics-picker

React Native **native** vertical height ruler built for the **New Architecture** on both platforms, plus an optional **`UnitSwitcher`** (JavaScript / Reanimated) for cm ⇄ ft. Use **`HeightRuler`** for the ruler UI; compose it with your own chrome or **`UnitSwitcher`** as needed.

## Features

- **`HeightRuler`** — native **iOS** (`UIView`) / **Android** custom view with snap scrolling, glass “pill”, haptics-oriented behaviour
- **`UnitSwitcher`** — segmented control styling (thumb spring, drag) powered by **`react-native-reanimated`** — keep it beside the ruler when you want unit switching
- Values from the ruler are **`onValueChange` centimetre decimal strings**; `unit` on `HeightRuler` only affects **display** scaling (cm vs ft/in labels)
- Imperative **`ref`** API: `getSnapshot()`, `getValueCm()`, **`subscribe()`**, plus **`useHeightRulerSnapshot()`** for reactive readouts
- TypeScript typings for exported components
- Accessible labels (snap position uses native a11y value ranges)

## Peer dependencies

| Package                   | Notes                                                                                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react`                   | `>= 18`                                                                                                                                                                                                                            |
| `react-native`            | **New Architecture** required for the ruler (tested against `>= 0.74`)                                                                                                                                                             |
| `react-native-reanimated` | **`UnitSwitcher`** only. If you use **only `HeightRuler`** and build your own switcher, Reanimated must still satisfy the peer constraint unless you duplicate the dependency workaround (recommended: declare Reanimated anyway). |

## Installation

```bash
npm install react-native-body-metrics-picker
# or: yarn add react-native-body-metrics-picker
```

Then **iOS**: `pod install` in `ios/` (Codegen picks up specs from `node_modules`). **Android**: Gradle autolinking + New Architecture alignment with your app.

**Minimum iOS:** the pod declares **`IPHONEOS_DEPLOYMENT_TARGET` 15.1**. Your Expo `Podfile.properties.json` **`ios.deploymentTarget`** (or Xcode project) must be **≥ 15.1** — otherwise CocoaPods reports that the pod “requires a higher minimum deployment target”.

---

## Quick start (`HeightRuler` + `UnitSwitcher`)

`HeightRuler` has **no** `onUnitChange` prop — controlled **`unit`** + **`UnitSwitcher.onUnitChange`** live in your screen state:

```tsx
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import {
  HeightRuler,
  UnitSwitcher,
  useHeightRulerSnapshot,
  type HeightRulerHandle,
  type HeightUnit,
} from 'react-native-body-metrics-picker';

function HeightScreen() {
  const rulerRef = useRef<HeightRulerHandle>(null);
  const [unit, setUnit] = useState<HeightUnit>('cm');
  const { valueString } = useHeightRulerSnapshot(rulerRef, unit);

  const handleValue = useCallback((cm: string) => {
    // cm is source of truth, e.g. "175.00"
    console.log(cm);
  }, []);

  return (
    <View style={{ height: 320 }}>
      <UnitSwitcher unit={unit} onUnitChange={setUnit} />
      <HeightRuler
        ref={rulerRef}
        key={unit}
        unit={unit}
        initialValue={175}
        onValueChange={handleValue}
      />
    </View>
  );
}
```

Give the **`View` wrapping `HeightRuler` a real height** (or `flex: 1` under a bounded parent). The ruler applies a **`minHeight` (~240 dp)** so it stays usable in scroll views.

---

## API reference

### `HeightRuler` props

Native ruler view on **both** platforms (**New Architecture**). **Android-only** props are omitted on iOS by the JS wrapper so the host never receives them.

| Prop                           | Type                      | Default                                   | iOS         | Android | Description                                                                                                             |
| ------------------------------ | ------------------------- | ----------------------------------------- | ----------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| `unit`                         | `'cm' \| 'ft'`            | (required)                                | Yes         | Yes     | Display scale for labels and ticks; emitted values stay **cm**.                                                         |
| `initialValue`                 | `number`                  | (required)                                | Yes         | Yes     | Centimetres; initial scroll position (not continuously synced from props).                                              |
| `onValueChange`                | `(value: string) => void` | —                                         | Yes         | Yes     | Cm as decimal string (e.g. `"175.00"`).                                                                                 |
| `formatValue`                  | `(cm: number) => string`  | —                                         | Yes         | Yes     | Feeds optional **accessibility** announced value.                                                                       |
| `onScrollBegin`                | `() => void`              | —                                         | Yes         | Yes     |                                                                                                                         |
| `onScrollEnd`                  | `() => void`              | —                                         | Yes         | Yes     |                                                                                                                         |
| `fontFamily`                   | `string`                  | —                                         | Yes         | Yes     | iOS: PostScript name; Android: `Typeface.create`.                                                                       |
| `tickSpacing`                  | `number`                  | `15`                                      | Yes         | Yes     |                                                                                                                         |
| `minorTickHeight`              | `number`                  | `18`                                      | Yes         | Yes     |                                                                                                                         |
| `midTickHeight`                | `number`                  | `28`                                      | Yes         | Yes     |                                                                                                                         |
| `majorTickHeight`              | `number`                  | `40`                                      | Yes         | Yes     |                                                                                                                         |
| `tickWidth`                    | `number`                  | `1.5`                                     | Yes         | Yes     |                                                                                                                         |
| `tickColor`                    | `string`                  | iOS `#D1D5DB`; Android `''`               | Yes         | Yes     | Android **empty** ⇒ theme tertiary.                                                                                     |
| `midTickColor`                 | `string`                  | iOS `#6B7280`; Android `''`               | Yes         | Yes     | Android **empty** ⇒ theme secondary.                                                                                    |
| `majorTickColor`               | `string`                  | iOS `#374151`; Android `''`               | Yes         | Yes     | Android **empty** ⇒ `textColorPrimary`; blends into label ink.                                                          |
| `glassActiveTickColor`         | `string`                  | iOS `#FFD60A`; Android `''`               | Yes         | Yes     | Android **empty** ⇒ `colorPrimary`.                                                                                     |
| `glassActiveNeighborTickColor` | `string`                  | iOS `rgba(255,214,10,0.72)`; Android `''` | Yes         | Yes     | Android **empty** ⇒ derived from primary.                                                                               |
| `glassCenterLabelColor`        | `string`                  | `''`                                      | Yes         | Yes     | Snapped value under the glass; `#`, `rgb()`, `rgba()`. **Empty** ⇒ blend from major/mid (and pill contrast on Android). |
| `glassPillBackgroundColor`     | `string`                  | —                                         | **Ignored** | **Yes** | Pill fill behind ticks.                                                                                                 |
| `glassPillBorderRadius`        | `number`                  | —                                         | **Ignored** | **Yes** | Corner radius **dp**; `0` uses native default (~16).                                                                    |
| `style`                        | `ViewStyle`               | —                                         | Yes         | Yes     | Applied to the outer **JS** `View` around the native ruler.                                                             |

Colour strings are parsed natively: **`#RGB` / `#RRGGBB` / `#RRGGBBAA`**, **`rgb()`**, **`rgba()`** (unsupported forms fall back to a neutral grey).

The wrapper also forwards **codegen-only** fields (`rangeMin`, `rangeMax`, `step`, …) that the component spec requires; **native code ignores them** and clamps the band to **100–250 cm**.

### `UnitSwitcher` props

Implemented in **JavaScript** with **Reanimated**; usable on **iOS and Android**.

| Prop                    | Type                   | Default                                          |
| ----------------------- | ---------------------- | ------------------------------------------------ |
| `unit`                  | `'cm' \| 'ft'`         | (required)                                       |
| `onUnitChange`          | `(unit) => void`       | —                                                |
| `trackColor`            | `string`               | Android `#E8EAED`, iOS `#F3F4F6`                 |
| `thumbColor`            | `string`               | `#FFFFFF`                                        |
| `activeTextColor`       | `string`               | Android `#1C1B1F`, iOS `#111827`                 |
| `inactiveTextColor`     | `string`               | Android `#49454F`, iOS `#6B7280`                 |
| `thumbSheenColor`       | `string`               | `#FFFFFF`                                        |
| `thumbGlassBorderColor` | `string`               | Android `transparent`, iOS `rgba(60,60,67,0.16)` |
| `fontFamily`            | `string`               | —                                                |
| `labelFontSize`         | `number`               | `16`                                             |
| `style`                 | `StyleProp<ViewStyle>` | —                                                |

---

## Behaviour & defaults

### Native range (canonical)

Internally both platforms constrain height to **`100 cm` … `250 cm`**. The `rangeMin` / `rangeMax` values on the native component exist for **codegen** only.

### Layout

Height is driven by **parent layout**, not by a viewport prop: wrap in a sized container / flex.

### Conversion / formatting helpers

Exported from the package root: **`formatHeightRulerCmString`**, **`nativeRulerBoundsForUnit`**, **`CM_PER_FOOT`**, **`NATIVE_RULER_CM_MIN`**, **`NATIVE_RULER_CM_MAX`**.

---

## Exports (`src/index.ts`)

- **`HeightRuler`**, **`useHeightRulerSnapshot`**, types **`HeightRulerProps`**, **`HeightRulerHandle`**, **`HeightRulerLiveSnapshot`**
- **`UnitSwitcher`**, **`UnitSwitcherProps`**
- **`formatHeightRulerCmString`**, **`nativeRulerBoundsForUnit`**, **`CM_PER_FOOT`**, **`NATIVE_RULER_CM_MIN`**, **`NATIVE_RULER_CM_MAX`**
- Shared types: **`HeightUnit`**, **`UnitSystem`**, **`HeightValue`**, etc.

---

## Example app (this repo)

```bash
cd example
yarn install
yarn start
# Then iOS/Android from Expo CLI
```

See **`example/src/app/index.tsx`** for **New Architecture** ruler demos and hero layout.

---

## Contributing

Branching, issue expectations, PR checklist, and changelog rules live in **[`CONTRIBUTING.md`](CONTRIBUTING.md)**. Release notes follow **[Keep a Changelog](https://keepachangelog.com/)** in **`CHANGELOG.md`**.

---

## iOS build notes

If Xcode fails compiling **`RCTHeightRulerView.mm`** with **`react/utils/fnf1a.h`** or **`folly/dynamic.h` file not found**, the CocoaPods target was missing RN’s bundled **Folly / React Native dependency** headers. This library’s **`install_modules_dependencies(s)`** (from **`react_native_pods.rb`**) lines the pod up with the **New Architecture** codegen and native view stack. After updating the podspec, **`pod install`** and a clean build.

If you fork the podspec, **do not** recreate dependencies by hand with a minimal pod list — rely on **`install_modules_dependencies`** so codegen, Folly search paths, and view-manager headers stay in sync with your React Native version.

---

## Publishing to npm

- **`yarn build`** generates **`lib/`** (ignored in git — always run before checks that read compiled output ).
- **`prepublishOnly`** runs **`bob build`** automatically during **`npm publish`**, so the tarball always includes **`lib/`**.

Dry run locally: **`npm pack`** — files should match **`package.json`**’s **`files`** field (`lib/`, `src/`, `ios/`, `android/`, podspec, `README.md`, `LICENSE`, …).

---

## TODO

Native rulers not implemented yet (API and behaviour TBD):

- **`WeightRuler`** — weight picking on a vertical scale (unit switching, range, and glass UX to be defined).
- **`AgeRuler`** — age picking on a vertical scale (bounds, step, and display format to be defined).

**Ships today:** **`HeightRuler`** + **`UnitSwitcher`** only.

---

## License

MIT
