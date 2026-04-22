# react-native-body-metrics-picker

Reusable body metrics UI for React Native — starting with **height**.

**HeightRuler** is implemented as a **native view** (iOS UIKit + Android `NestedScrollView`). The JS layer only wraps `UnitSwitcher` and passes theme/range props — **no** `react-native-reanimated` or `react-native-gesture-handler`.

## Features

- **HeightRuler** — native vertical ruler, snap scrolling, optional cm/ft switcher (JS)
- Metric & imperial support with accurate conversions
- Accessible (VoiceOver / TalkBack)
- TypeScript-first
- Theming via a flat `theme` prop

## Installation

```bash
npm install react-native-body-metrics-picker
```

### Peer dependencies

- **react** `>=18`
- **react-native** `>=0.72` (with autolinking so the iOS pod and Android library are linked)

No Reanimated, no Gesture Handler, no blur/haptics packages for the ruler.

## Quick start

```tsx
import { HeightRuler, type HeightUnit } from 'react-native-body-metrics-picker';

function MyScreen() {
  const [height, setHeight] = useState('175');
  const [unit, setUnit] = useState<HeightUnit>('cm');

  return (
    <HeightRuler
      unit={unit}
      onUnitChange={setUnit}
      initialValue={Number(height)}
      onValueChange={setHeight}
    />
  );
}
```

Pass `onUnitChange` to show the built-in `cm / ft` switcher. The ruler converts the value on unit change and fires `onValueChange` and `onUnitChange`.

## API (HeightRuler)

### Unit defaults

| Unit | min | max | step | fractionDigits |
| ---- | --- | --- | ---- | -------------- |
| `cm` | 50  | 250 | 1    | 0              |
| `ft` | **1′0″** (1.0 ft) | **~8′2″** (~98 in) | **1 inch** (1/12 ft) | 4 (strings use decimal feet snapped to inches) |

You can override `min`, `max`, `step`, `fractionDigits` for `cm`. The built-in `ft` scale is inch-based.

### Viewport

`verticalViewportHeight` (default **240**) sets the visible ruler band height.

### Conversion helpers

```tsx
import { cmToFeetInches, feetInchesToCm } from 'react-native-body-metrics-picker';

cmToFeetInches(180); // { feet: 5, inches: 11 }
feetInchesToCm(5, 11); // 180
```

## Theming

Pass a partial `BodyMetricsPickerTheme`; missing keys use `defaultTheme` / `resolveTheme`.

```tsx
import type { BodyMetricsPickerTheme } from 'react-native-body-metrics-picker';

const theme: BodyMetricsPickerTheme = {
  colors: {
    background: '#FFFFFF',
    majorTick: '#111827',
    tick: '#E5E7EB',
    // …
  },
  typography: {
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

<HeightRuler theme={theme} /* … */ />;
```

See `src/theme/index.ts` for the full `BodyMetricsPickerTheme` shape.

## Example app

```bash
cd example
yarn install
npx expo start
```

## Roadmap

- [ ] Native Fabric `HeightRuler` (iOS / Android) — native scroll, draw, blur/materials, haptics
- [ ] Then: drop Reanimated + Gesture Handler from **peer** deps for consumers who only use native

## License

MIT
