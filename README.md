# react-native-body-metrics-picker

React Native **native** vertical height ruler (**Fabric** on both platforms) plus an optional **`UnitSwitcher`** (JavaScript / Reanimated) for cm ⇄ ft. Use **`HeightRuler`** for the ruler UI; compose it with your own chrome or **`UnitSwitcher`** as needed.

## Features

- **`HeightRuler`** — Fabric `UIView` / Android custom view with snap scrolling, glass “pill”, haptics-oriented behaviour  
- **`UnitSwitcher`** — segmented control styling (thumb spring, drag) powered by **`react-native-reanimated`** — keep it beside the ruler when you want unit switching  
- Values from the ruler are **`onValueChange` centimetre decimal strings**; `unit` on `HeightRuler` only affects **display** scaling (cm vs ft/in labels)  
- Imperative **`ref`** API: `getSnapshot()`, `getValueCm()`, **`subscribe()`**, plus **`useHeightRulerSnapshot()`** for reactive readouts  
- TypeScript typings for exported components  
- Accessible labels (snap position uses native a11y value ranges)

### Not in scope (yet)

- Weight / age pickers mentioned in `package.json` description are placeholders for future work — **only HeightRuler + UnitSwitcher ship today.**

## Peer dependencies

| Package | Notes |
|---------|------|
| `react` | `>= 18` |
| `react-native` | New Architecture / Fabric assumed for the ruler (tested against `>= 0.74`) |
| `react-native-reanimated` | **`UnitSwitcher`** only. If you use **only `HeightRuler`** and build your own switcher, Reanimated must still satisfy the peer constraint unless you duplicate the dependency workaround (recommended: declare Reanimated anyway). |

## Installation

Public registry:

```bash
npm install react-native-body-metrics-picker
```

Private scoped package (after you configure scope auth, e.g. npm org / GitHub Packages):

```bash
npm install @your-scope/react-native-body-metrics-picker
```

Then **iOS**: `pod install` in `ios/` (Codegen picks up specs from `node_modules`). **Android**: Gradle autolinking + New Architecture alignment with your app.

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

## Behaviour & defaults

### Native range (canonical)

Internally both platforms constrain height to **`100 cm` … `250 cm`** (JS `rangeMin` / `rangeMax` props exist mainly for codegen but **native clamps to this ruler band**).

### Layout

Height is driven by **parent layout**, not by a viewport prop: wrap in sized container / flex.

### Colour & geometry APIs

Colours and tick sizing are **flat props** on `HeightRuler` (`tickColor`, `majorTickHeight`, `glassActiveTickColor`, …).  
**Android only:** `glassPillBackgroundColor`, `glassPillBorderRadius` (pill fill behind ticks). **iOS** uses system materials for the capsule.

There is **no** consolidated `theme={{…}}` prop — style the ruler through the props documented in `HeightRuler.types.ts`.

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

See **`example/src/app/index.tsx`** for Fabric demos and hero layout.

---

## Publishing to npm

- **`yarn build`** generates **`lib/`** (ignored in git — always run before checks that read compiled output ).
- **`prepublishOnly`** runs **`bob build`** automatically during **`npm publish`**, so the tarball always includes **`lib/`**.

Dry run locally: **`npm pack`** — files should match **`package.json`**’s **`files`** field (`lib/`, `src/`, `ios/`, `android/`, podspec, `README.md`, `LICENSE`, …).

### Private scoped package / registry

1. Use a **scoped name**, e.g. **`"@your-org/react-native-body-metrics-picker"`**.
2. Add **`"publishConfig": { "access": "restricted" }`** for **private scoped** packages on the public npm registry (requires an npm org / appropriate plan).
3. **`access: "restricted"` is not valid for unscoped package names** — rename to a scope or publish to GitHub/npm Enterprise private registry instead.
4. In the consuming app: **`npm install @your-org/...`** (with registry auth configured), **`pod install`**, rebuild Android.

---

## License

MIT
