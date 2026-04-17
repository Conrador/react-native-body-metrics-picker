# Cursor Prompt — react-native-body-metrics-picker

You are helping me build an open-source React Native library called `react-native-body-metrics-picker`.

I want you to act like a senior React Native library engineer and generate real project structure and code, not just advice.

---

## 📦 Package Name

`react-native-body-metrics-picker`

---

## 🎯 Product Vision

This package will provide beautiful, reusable pickers for:

- height
- weight
- age

Target use cases:

- onboarding flows
- health & fitness apps
- profile setup
- wellness apps

The UX should feel:

- smooth
- native-like
- animated
- production-ready

---

## 🚧 MVP Scope (IMPORTANT)

For now, implement ONLY:

- `HeightRuler`
- `HeightPicker`

❌ Do NOT implement:

- WeightPicker
- AgePicker
- any other pickers

---

## 🧩 Planned v1 Components (for architecture planning)

These will exist later:

- HeightRuler
- HeightPicker
- WeightRuler
- WeightPicker
- AgePicker

Future (NOT now):

- DateOfBirthPicker
- GoalPicker
- ActivityLevelPicker
- UnitsProvider
- BodyMetricsBottomSheet

👉 Architecture must support future expansion.

---

## ⚙️ Functional Requirements

### 🔹 HeightRuler

Low-level ruler-based component.

Must support:

- metric and imperial units
- smooth scrolling
- snapping to values
- animated center value
- visual tick marks
- configurable min/max

Metric:

- centimeters (e.g. 100–240 cm)

Imperial:

- feet + inches
- derived from cm internally
- correct conversion logic

UX:

- smooth
- premium feel
- visually clean

---

### 🔹 HeightPicker

Higher-level component using `HeightRuler`.

Must:

- allow height selection
- support unit switching (metric ↔ imperial)
- preserve real value during switching
- display formatted value
- support controlled usage
- support default values
- support min/max

Designed for:

- forms
- onboarding
- future bottom sheet integration

---

## 🔄 Unit Conversion (CRITICAL)

Implement:

- `cmToFeetInches`
- `feetInchesToCm`

Rules:

- preserve real value across unit switch
- predictable rounding
- avoid value jumps

Recommended:

- use `cm` as source of truth
- imperial is derived only

---

## ♿ Accessibility (MANDATORY)

Support:

- screen readers (VoiceOver / TalkBack)
- accessible labels
- selected value announcements
- proper touch targets
- good contrast

Do NOT treat accessibility as optional.

---

## 🎬 Animations

Use:

- `react-native-reanimated`

Include:

- active value scaling
- opacity interpolation
- smooth snapping
- subtle motion only (no flashy animations)

---

## 📦 Dependencies

Set up:

- react
- react-native
- typescript
- react-native-reanimated
- react-native-gesture-handler
- @gorhom/bottom-sheet (prepare support, not required fully now)
- expo-haptics (in example app)

Ensure:

- Reanimated config is correct
- Gesture Handler works properly

---

## 🏗️ Package Architecture

Structure:
src/
components/
HeightRuler/
HeightPicker/
utils/
conversions/
formatters/
math/
types/
theme/

Goals:

- scalable
- clean
- reusable
- easy to extend for Weight/Age later

---

## 🧑‍💻 API Expectations

Example:

```tsx
<HeightPicker
  unitSystem="metric"
  value={{ unitSystem: 'metric', cm: 180 }}
  onChange={handleChange}
/>

Requirements:
simple API
strong typing
explicit values

📱 Example App (REQUIRED)
Create Expo app (latest version).
Requirements:
located in example/
linked to local package
demo screen with:
HeightRuler
HeightPicker
unit switching
formatted display
scaffold for bottom sheet
include haptics setup
ensure Reanimated works

📦 Deliverables
Generate:
package structure
TypeScript setup
HeightRuler
HeightPicker
conversion utils
formatting utils
accessibility support
example Expo app
demo screen
exports
README (basic MVP)

🧼 Code Quality
Must be:
clean
modular
typed
readable
production-ready

Avoid:
overengineering
unnecessary abstractions
placeholder-only code

🚫 Constraints
ONLY implement:
HeightRuler
HeightPicker

Prepare for:
WeightRuler
WeightPicker
AgeRuler
AgePicker

▶️ Output Instructions
Generate actual code and structure.

Start with:
folder structure
package setup
Expo example setup
HeightRuler implementation
HeightPicker implementation
demo screen
README MVP section

🧠 Mindset
Be pragmatic.
Focus on:
clean MVP
smooth UX
future scalability
Do not overcomplicate.
```
