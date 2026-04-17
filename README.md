# react-native-body-metrics-picker

Beautiful, reusable body metrics pickers for React Native — height, weight, age.

Built with `react-native-reanimated` for smooth, native-like animations.

## Features

- **HeightRuler** — low-level ruler with smooth scrolling, snapping, animated ticks
- **HeightPicker** — full picker with unit toggle (metric / imperial), formatted display
- Metric & imperial support with accurate conversions
- Accessible (VoiceOver / TalkBack)
- TypeScript-first
- Designed for onboarding flows, fitness & wellness apps

## Installation

```bash
npm install react-native-body-metrics-picker
```

### Peer Dependencies

```bash
npm install react-native-reanimated react-native-gesture-handler
```

Make sure Reanimated is configured in your project ([setup guide](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started)).

## Quick Start

### HeightPicker (bottom sheet)

```tsx
import { HeightPicker, type HeightUnit } from 'react-native-body-metrics-picker';

function MyScreen() {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(175);
  const [unit, setUnit] = useState<HeightUnit>('cm');

  return (
    <HeightPicker
      isOpen={open}
      onClose={() => setOpen(false)}
      value={height}
      unit={unit}
      onUnitChange={setUnit}
      onConfirm={(value, confirmedUnit) => {
        setHeight(Number(value));
        setUnit(confirmedUnit);
      }}
    />
  );
}
```

### HeightRuler (standalone, e.g. onboarding)

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

Pass `onUnitChange` to show the built-in `cm / ft` switcher. When the user
taps it, the ruler auto-converts the current value (`175 cm → 5.7 ft`) and
fires both `onValueChange` and `onUnitChange`.

## API

### Unit handling

Both components accept `unit: 'cm' | 'ft'` and ship with sensible defaults:

| Unit | min | max | step | fractionDigits |
| ---- | --- | --- | ---- | -------------- |
| `cm` | 50  | 250 | 1    | 0              |
| `ft` | 1.6 | 8.2 | 0.1  | 1              |

You can override any of them via the `min`, `max`, `step`, `fractionDigits`
props.

### Conversion Utilities

```tsx
import { cmToFeetInches, feetInchesToCm } from 'react-native-body-metrics-picker';

cmToFeetInches(180); // { feet: 5, inches: 11 }
feetInchesToCm(5, 11); // 180
```

## Customization

A three-layer API keeps the common case simple while leaving room for advanced
control when you need it.

### 1. Simple props

Everyday configuration — `title`, `confirmLabel`, `unit`, callbacks,
`showCloseButton`, and a `closeIcon` that accepts any `ReactNode`:

```tsx
import { Ionicons } from '@expo/vector-icons';

<HeightPicker
  isOpen={open}
  onClose={() => setOpen(false)}
  value={height}
  onConfirm={(v) => setHeight(Number(v))}
  title="Your height"
  confirmLabel="Save"
  unit="cm"
  showCloseButton
  closeIcon={<Ionicons name="close" size={22} color="#111" />}
/>;
```

### 2. `theme` prop (styling)

A flat, declarative object — no provider, no context. Pass a partial theme
object and unspecified keys fall back to defaults.

```tsx
import type { BodyMetricsPickerTheme } from 'react-native-body-metrics-picker';

const theme: BodyMetricsPickerTheme = {
  colors: {
    background: '#FFFFFF',
    value: '#111827',
    title: '#111827',
    majorTick: '#111827',
    tick: '#E5E7EB',
    indicator: '#FF5A5F',
    confirmButtonBackground: '#FF5A5F',
    confirmButtonText: '#FFFFFF',
  },
  typography: {
    fontFamily: 'Inter_700Bold',
    valueSize: 64,
    titleSize: 20,
  },
  ruler: {
    minorTickHeight: 16,
    midTickHeight: 26,
    majorTickHeight: 42,
    tickWidth: 2,
    tickSpacing: 14,
  },
};

<HeightPicker theme={theme} /* … */ />;
<HeightRuler theme={theme} /* … */ />;
```

#### Theme shape

```ts
type BodyMetricsPickerTheme = {
  colors?: {
    background?: string;
    tick?: string; // minor ticks
    midTick?: string;
    majorTick?: string;
    tickLabel?: string;
    value?: string; // big animated number
    unit?: string;
    title?: string;
    indicator?: string;
    confirmButtonBackground?: string;
    confirmButtonText?: string;
    closeBackground?: string;
    closeIcon?: string;
    backdrop?: string;
    handleIndicator?: string;
  };
  typography?: {
    fontFamily?: string; // global font
    valueSize?: number;
    unitSize?: number;
    tickLabelSize?: number;
    titleSize?: number;
    confirmButtonSize?: number;
  };
  ruler?: {
    minorTickHeight?: number;
    midTickHeight?: number;
    majorTickHeight?: number;
    tickWidth?: number;
    tickSpacing?: number;
  };
};
```

### 3. `renderConfirmButton` (advanced)

When theme styling isn't enough, replace the confirm button outright. Call
`onPress` to commit — the sheet dismisses automatically.

```tsx
<HeightPicker
  /* … */
  renderConfirmButton={({ onPress, label }) => (
    <MyBrandButton onPress={onPress} title={label} variant="primary" />
  )}
/>
```

## Example App

```bash
cd example
npm install
npx expo start
```

## Roadmap

- [ ] WeightRuler / WeightPicker
- [ ] AgePicker
- [x] BottomSheet integration
- [ ] Haptic feedback helpers
- [x] Theming API

## License

MIT
