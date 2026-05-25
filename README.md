# react-native-slot-counter

Casino-style rolling digit counter for React Native, powered by Skia. Supports per-digit slot animations with text or custom image renderers.

<table>
  <tr>
    <td><img src="https://raw.githubusercontent.com/uatrigger/react-native-slot-counter/main/docs/ios-thumb.png" alt="iOS demo" width="320"/></td>
    <td><img src="https://raw.githubusercontent.com/uatrigger/react-native-slot-counter/main/docs/android-thumb.png" alt="Android demo" width="320"/></td>
  </tr>
  <tr>
    <td align="center"><sub>iOS</sub></td>
    <td align="center"><sub>Android</sub></td>
  </tr>
</table>

## Features

- **Slot-machine spin** — visible roll cycle then lands on target (casino style)
- **Mechanical roll** — continuous odometer-style motion
- **Digital flip** — discrete drop-in transition
- **Two renderers** — text glyphs or custom image strips per digit
- **Per-slot styling** — backgrounds, borders, padding, container chrome
- **Imperative API** — `setTarget`, `addDelta`, `jumpTo`, value getters
- **iOS + Android** — runs on both, Fabric / New Architecture compatible

## Installation

```sh
npm install react-native-slot-counter
```

Install the peer dependencies (skip any already in your project):

```sh
npm install @shopify/react-native-skia react-native-reanimated react-native-worklets
```

Add the worklets Babel plugin to your `babel.config.js`:

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-worklets/plugin'],
};
```

iOS: run `pod install` in your `ios/` directory.

## Quick start

```tsx
import { useRef } from 'react';
import { Button, View } from 'react-native';
import { SlotCounter, type SlotCounterHandle } from 'react-native-slot-counter';

export default function App() {
  const ref = useRef<SlotCounterHandle>(null);

  return (
    <View>
      <SlotCounter
        ref={ref}
        initialValue={1234}
        width={320}
        height={80}
        digits={7}
        fontSize={56}
        thousandsSeparator=","
        rollStyle="spin"
      />
      <Button title="+250" onPress={() => ref.current?.addDelta(250)} />
    </View>
  );
}
```

## Examples

### Text renderer (default)

```tsx
<SlotCounter
  initialValue={0}
  width={320}
  height={72}
  digits={7}
  fontSize={50}
  color="#111"
  thousandsSeparator=","
  rollStyle="spin"
  digitSlot={{
    backgroundColor: '#f3f3f3',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 6,
    paddingX: 6,
    paddingY: 4,
  }}
  digitGap={4}
  groupGap={6}
/>
```

### Casino style (dark + gold)

```tsx
<SlotCounter
  initialValue={123456}
  width={320}
  height={84}
  digits={7}
  fontSize={56}
  fontWeight="bold"
  color="#ffd25a"
  thousandsSeparator=","
  separatorColor="#ffd25a"
  rollStyle="spin"
  digitSlot={{
    backgroundColor: '#1a1a1a',
    borderColor: '#ffd25a',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingX: 8,
    paddingY: 6,
  }}
  containerStyle={{
    backgroundColor: '#000',
    borderRadius: 10,
    paddingX: 10,
    paddingY: 10,
  }}
  digitGap={4}
  groupGap={8}
/>
```

### Image renderer (custom digits)

Provide your own digit sprites — 10 image sources for digits 0–9, plus optional separator images.

```tsx
import { SlotCounter, type DigitImageTuple } from 'react-native-slot-counter';

const DIGITS: DigitImageTuple = [
  require('./assets/digits/0.png'),
  require('./assets/digits/1.png'),
  // ... 2 through 9
];

<SlotCounter
  renderer="image"
  initialValue={9876}
  width={320}
  height={88}
  digits={6}
  rollStyle="spin"
  digitImages={DIGITS}
  thousandsSeparatorImage={require('./assets/digits/comma.png')}
  decimalSeparatorImage={require('./assets/digits/dot.png')}
  containerStyle={{
    backgroundColor: '#0d0d0d',
    borderRadius: 10,
    paddingX: 10,
    paddingY: 10,
  }}
  digitGap={2}
/>
```

### Decimals (price tag)

```tsx
<SlotCounter
  initialValue={1299.99}
  width={320}
  height={72}
  digits={5}
  decimals={2}
  fontSize={46}
  color="#0a8a3a"
  thousandsSeparator=","
  decimalSeparator="."
  rollStyle="spin"
/>
```

## API

### `<SlotCounter>` — unified entry point

Selects renderer via the `renderer` prop and forwards to the appropriate underlying component.

**Common props:**

| Prop                 | Type                                | Default   | Description                                                  |
|----------------------|-------------------------------------|-----------|--------------------------------------------------------------|
| `width`              | `number`                            | _required_| Canvas width in pixels                                       |
| `height`             | `number`                            | _required_| Canvas height in pixels                                      |
| `initialValue`       | `number`                            | `0`       | Starting value                                               |
| `digits`             | `number`                            | `8`       | Integer digit positions (max 12 total)                       |
| `decimals`           | `number`                            | `0`       | Fractional digit positions                                   |
| `groupSize`          | `number`                            | `3`       | Digits per thousand group                                    |
| `direction`          | `'up' \| 'down'`                    | `'up'`    | Roll direction                                               |
| `rollStyle`          | `'spin' \| 'mechanical' \| 'digital'` | `'spin'` | Animation strategy                                           |
| `motion`             | `MotionConfig`                      | spring    | Animation config — see Motion section                        |
| `spinCycles`         | `(exponent: number) => number`      | `() => 5` | Cycles per position when `rollStyle='spin'`                  |
| `digitGap`           | `number`                            | `0`       | Pixel gap between adjacent slots                             |
| `groupGap`           | `number`                            | `0`       | Extra pixel gap at thousand-group boundaries                 |
| `digitSlot`          | `DigitSlotStyle`                    | —         | Per-slot styling (background, border, padding, radius)       |
| `containerStyle`     | `ContainerStyle`                    | —         | Outer container chrome (background, border, padding)         |

**Text-renderer props (`renderer="text"`, default):**

| Prop                  | Type                                                                | Default                  | Description                                  |
|-----------------------|---------------------------------------------------------------------|--------------------------|----------------------------------------------|
| `fontSize`            | `number`                                                            | `64`                     | Digit font size                              |
| `fontWeight`          | `'normal' \| 'bold' \| '600' \| '700' \| '800' \| '900'`            | `'bold'`                 | Font weight                                  |
| `fontFamily`          | `string`                                                            | `Menlo` / `monospace`    | Font family — pick a monospace for alignment |
| `color`               | `string`                                                            | `'#111'`                 | Digit color                                  |
| `thousandsSeparator`  | `string`                                                            | `''` (no separator)      | Character drawn between thousand groups      |
| `decimalSeparator`    | `string`                                                            | `'.'`                    | Character between integer and decimals       |
| `separatorColor`      | `string`                                                            | inherits `color`         | Override color for separators                |

**Image-renderer props (`renderer="image"`):**

| Prop                       | Type               | Default | Description                                              |
|----------------------------|--------------------|---------|----------------------------------------------------------|
| `digitImages`              | `DigitImageTuple`  | _required_ | Tuple of 10 image sources for digits 0–9              |
| `thousandsSeparatorImage`  | `DataSourceParam`  | —       | Image drawn between thousand groups                      |
| `decimalSeparatorImage`    | `DataSourceParam`  | —       | Image between integer and decimals                       |
| `digitAspectRatio`         | `number`           | `0.7`   | Width / height ratio of each digit slot                  |

### Imperative ref API

All variants expose the same handle:

```ts
interface SlotCounterHandle {
  setTarget(value: number): void;   // animate to absolute value
  addDelta(delta: number): void;    // animate by relative delta
  jumpTo(value: number): void;      // instant, no animation
  getCurrent(): number;             // animated value at the current frame
  getTarget(): number;              // final target value
}
```

### Motion config

```ts
type MotionConfig =
  | { type: 'spring'; mass?: number; stiffness?: number; damping?: number }
  | { type: 'casino'; duration?: number; minDuration?: number; maxDuration?: number };
```

Default spring is `{ mass: 0.5, stiffness: 220, damping: 22 }` — tight casino feel. For longer dramatic rolls use `{ type: 'casino', minDuration: 1200, maxDuration: 2500 }`.

### Direct component access

If you want to skip the facade, import the underlying components:

```ts
import {
  SkiaRollingOdometer,   // text renderer (per-digit slots)
  SkiaImageOdometer,     // image renderer
  SkiaOdometer,          // basic single-text variant (no per-digit slots)
} from 'react-native-slot-counter';
```

## Development

```sh
yarn install                # install root + example workspaces
yarn typecheck              # tsc on the library
yarn lint                   # ESLint
yarn prepare                # build into ./lib for publish

cd example
yarn ios                    # run example on iOS Simulator
yarn android                # run example on an Android device or emulator
```

## License

MIT
