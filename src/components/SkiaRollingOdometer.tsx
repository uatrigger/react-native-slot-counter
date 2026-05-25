import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  Canvas,
  Text as SkText,
  Group,
  RoundedRect,
  matchFont,
  rrect,
  rect,
  type SkFont,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  cancelAnimation,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import {
  buildAnimation,
  estimateMotionDuration,
  type MotionConfig,
} from '../animation';

const MONO_FAMILY = Platform.select({ ios: 'Menlo', default: 'monospace' })!;
const MAX_DIGITS = 12;

export type RollDirection = 'up' | 'down';
export type RollStyle = 'mechanical' | 'digital' | 'spin';

export interface DigitSlotStyle {
  width?: number;
  height?: number;
  paddingX?: number;
  paddingY?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}

export interface ContainerStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  paddingX?: number;
  paddingY?: number;
}

export interface SkiaRollingOdometerHandle {
  setTarget: (value: number) => void;
  addDelta: (delta: number) => void;
  jumpTo: (value: number) => void;
  getCurrent: () => number;
  getTarget: () => number;
}

export interface SkiaRollingOdometerProps {
  initialValue?: number;
  width: number;
  height: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '600' | '700' | '800' | '900';
  fontFamily?: string;
  color?: string;
  digits?: number;
  decimals?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
  groupSize?: number;
  direction?: RollDirection;
  rollStyle?: RollStyle;
  motion?: MotionConfig;
  digitGap?: number;
  groupGap?: number;
  digitSlot?: DigitSlotStyle;
  containerStyle?: ContainerStyle;
  separatorColor?: string;
  spinCycles?: (exponent: number) => number;
}

const DEFAULT_SPIN_CYCLES = (_position: number) => 5;

interface SlotLayout {
  exponent: number;
  slotX: number;
  slotY: number;
  slotW: number;
  slotH: number;
  digitX: number;
  baselineY: number;
  innerX: number;
  innerY: number;
  innerW: number;
  innerH: number;
}

type SepKind = 'thousands' | 'decimal';
interface SepLayout {
  kind: SepKind;
  x: number;
  y: number;
  text: string;
}

export const SkiaRollingOdometer = forwardRef<
  SkiaRollingOdometerHandle,
  SkiaRollingOdometerProps
>(function SkiaRollingOdometer(
  {
    initialValue = 0,
    width,
    height,
    fontSize = 64,
    fontWeight = 'bold',
    fontFamily = MONO_FAMILY,
    color = '#111',
    digits: digitsProp = 8,
    decimals: decimalsProp = 0,
    thousandsSeparator = '',
    decimalSeparator = '.',
    groupSize = 3,
    direction = 'up',
    rollStyle = 'spin',
    motion = { type: 'spring', mass: 0.5, stiffness: 220, damping: 22 },
    digitGap = 0,
    groupGap = 0,
    digitSlot,
    containerStyle,
    separatorColor,
    spinCycles = DEFAULT_SPIN_CYCLES,
  },
  ref
) {
  const digits = Math.min(digitsProp, MAX_DIGITS);
  const decimals = Math.max(0, Math.min(decimalsProp, MAX_DIGITS - digits));
  const totalSlots = digits + decimals;
  const thouSep = thousandsSeparator;
  const decSep = decimals > 0 ? decimalSeparator : '';

  const current = useSharedValue(initialValue);
  const target = useSharedValue(initialValue);
  const spinProgress = useSharedValue(1);
  const spinStart = useSharedValue(initialValue);
  const spinEnd = useSharedValue(initialValue);

  const font = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize,
        fontStyle: 'normal',
        fontWeight,
      }),
    [fontFamily, fontSize, fontWeight]
  );
  const sepFontSize = Math.round(fontSize * 0.6);
  const sepFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: sepFontSize,
        fontStyle: 'normal',
        fontWeight,
      }),
    [fontFamily, sepFontSize, fontWeight]
  );

  const layout = useMemo(() => {
    const dw = font.measureText('0').width;
    const thouSepW = thouSep ? sepFont.measureText(thouSep).width : 0;
    const decSepW = decSep ? sepFont.measureText(decSep).width : 0;

    const padX = digitSlot?.paddingX ?? 0;
    const padY = digitSlot?.paddingY ?? 0;
    const slotH = Math.min(
      digitSlot?.height ?? height - (containerStyle?.paddingY ?? 0) * 2,
      height
    );

    const cPadX = containerStyle?.paddingX ?? 0;
    const cPadY = containerStyle?.paddingY ?? 0;

    type Item =
      | { kind: 'digit'; exponent: number }
      | { kind: 'sep'; sepKind: SepKind; text: string; w: number };
    const items: Item[] = [];
    for (let i = 0; i < digits; i++) {
      const exp = digits - 1 - i;
      items.push({ kind: 'digit', exponent: exp });
      const lastInt = i === digits - 1;
      if (
        !lastInt &&
        thouSep &&
        thouSepW > 0 &&
        exp > 0 &&
        groupSize > 0 &&
        exp % groupSize === 0
      ) {
        items.push({
          kind: 'sep',
          sepKind: 'thousands',
          text: thouSep,
          w: thouSepW,
        });
      }
    }
    if (decimals > 0) {
      if (decSep && decSepW > 0) {
        items.push({
          kind: 'sep',
          sepKind: 'decimal',
          text: decSep,
          w: decSepW,
        });
      }
      for (let i = 0; i < decimals; i++) {
        items.push({ kind: 'digit', exponent: -(i + 1) });
      }
    }

    const thouCount = items.filter(
      (it) => it.kind === 'sep' && it.sepKind === 'thousands'
    ).length;
    const totalSepW = items.reduce(
      (acc, it) => (it.kind === 'sep' ? acc + it.w : acc),
      0
    );
    const totalGapW = Math.max(0, (items.length - 1) * digitGap);
    const totalGroupGapW = thouCount * groupGap;

    const availableW = width - cPadX * 2;
    const measuredSlotW = dw + padX * 2;
    const autoSlotW = Math.max(
      0,
      (availableW - totalGapW - totalSepW - totalGroupGapW) / totalSlots
    );
    const slotW = digitSlot?.width ?? Math.min(measuredSlotW, autoSlotW);

    const totalW = totalSlots * slotW + totalGapW + totalSepW + totalGroupGapW;
    const startX = cPadX + Math.max(0, (availableW - totalW) / 2);
    const slotY = (height - slotH) / 2;

    const slots: SlotLayout[] = [];
    const seps: SepLayout[] = [];

    let cursor = startX;
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      if (item.kind === 'digit') {
        const slotX = cursor;
        const innerX = slotX + padX;
        const innerY = slotY + padY;
        const innerW = slotW - padX * 2;
        const innerH = slotH - padY * 2;
        const digitX = innerX + (innerW - dw) / 2;
        const baselineY = innerY + (innerH + fontSize * 0.7) / 2;
        slots.push({
          exponent: item.exponent,
          slotX,
          slotY,
          slotW,
          slotH,
          digitX,
          baselineY,
          innerX,
          innerY,
          innerW,
          innerH,
        });
        cursor += slotW;
      } else {
        const sepBaselineY = slotY + (slotH + fontSize * 0.7) / 2;
        seps.push({
          kind: item.sepKind,
          x: cursor,
          y: sepBaselineY,
          text: item.text,
        });
        cursor += item.w;
      }
      if (i < items.length - 1) {
        cursor += digitGap;
        const isThouBoundary =
          item.kind === 'sep' && item.sepKind === 'thousands';
        const next = items[i + 1]!;
        const nextIsThouSep =
          next.kind === 'sep' && next.sepKind === 'thousands';
        if (isThouBoundary || nextIsThouSep) cursor += groupGap / 2;
      }
    }

    return { slots, seps, cPadX, cPadY };
  }, [
    font,
    sepFont,
    digits,
    decimals,
    totalSlots,
    thouSep,
    decSep,
    groupSize,
    height,
    fontSize,
    width,
    digitGap,
    groupGap,
    digitSlot,
    containerStyle,
  ]);

  const triggerSpin = (newTarget: number) => {
    spinStart.value = Math.max(0, current.value);
    spinEnd.value = Math.max(0, newTarget);
    cancelAnimation(spinProgress);
    spinProgress.value = 0;
    const duration = estimateMotionDuration(newTarget, current.value, motion);
    spinProgress.value = withTiming(1, {
      duration,
      easing: Easing.bezier(0.0, 0.35, 0.2, 1.0),
    });
  };

  useImperativeHandle(
    ref,
    () => ({
      setTarget: (value: number) => {
        cancelAnimation(current);
        if (rollStyle === 'spin') triggerSpin(value);
        target.value = value;
        current.value = buildAnimation(value, current.value, motion);
      },
      addDelta: (delta: number) => {
        cancelAnimation(current);
        const newTarget = target.value + delta;
        if (rollStyle === 'spin') triggerSpin(newTarget);
        target.value = newTarget;
        current.value = buildAnimation(newTarget, current.value, motion);
      },
      jumpTo: (value: number) => {
        cancelAnimation(current);
        cancelAnimation(spinProgress);
        spinProgress.value = 1;
        spinStart.value = value;
        spinEnd.value = value;
        target.value = value;
        current.value = value;
      },
      getCurrent: () => current.value,
      getTarget: () => target.value,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [motion, current, target, rollStyle]
  );

  const containerRadius = containerStyle?.borderRadius ?? 0;
  const slotRadius = digitSlot?.borderRadius ?? 0;

  return (
    <Canvas style={{ width, height }}>
      {containerStyle?.backgroundColor && (
        <RoundedRect
          x={0}
          y={0}
          width={width}
          height={height}
          r={containerRadius}
          color={containerStyle.backgroundColor}
        />
      )}
      {containerStyle?.borderColor &&
        (containerStyle?.borderWidth ?? 0) > 0 && (
          <RoundedRect
            x={(containerStyle.borderWidth ?? 0) / 2}
            y={(containerStyle.borderWidth ?? 0) / 2}
            width={width - (containerStyle.borderWidth ?? 0)}
            height={height - (containerStyle.borderWidth ?? 0)}
            r={containerRadius}
            color={containerStyle.borderColor}
            style="stroke"
            strokeWidth={containerStyle.borderWidth}
          />
        )}

      {layout.slots.map((slot) => (
        <SlotView
          key={slot.exponent}
          slot={slot}
          slotRadius={slotRadius}
          slotStyle={digitSlot}
          current={current}
          spinProgress={spinProgress}
          spinStart={spinStart}
          spinEnd={spinEnd}
          spinCyclesFor={spinCycles}
          font={font}
          color={color}
          direction={direction}
          rollStyle={rollStyle}
        />
      ))}

      {layout.seps.map((sep, i) => (
        <SkText
          key={`sep-${i}`}
          font={sepFont}
          text={sep.text}
          x={sep.x}
          y={sep.y}
          color={separatorColor ?? color}
        />
      ))}
    </Canvas>
  );
});

interface SlotViewProps {
  slot: SlotLayout;
  slotRadius: number;
  slotStyle?: DigitSlotStyle;
  current: SharedValue<number>;
  spinProgress: SharedValue<number>;
  spinStart: SharedValue<number>;
  spinEnd: SharedValue<number>;
  spinCyclesFor: (exponent: number) => number;
  font: SkFont;
  color: string;
  direction: RollDirection;
  rollStyle: RollStyle;
}

function SlotView({
  slot,
  slotRadius,
  slotStyle,
  current,
  spinProgress,
  spinStart,
  spinEnd,
  spinCyclesFor,
  font,
  color,
  direction,
  rollStyle,
}: SlotViewProps) {
  const { slotX, slotY, slotW, slotH, digitX, baselineY, innerH } = slot;
  const borderWidth = slotStyle?.borderWidth ?? 0;
  const clipPath = useMemo(
    () => rrect(rect(slotX, slotY, slotW, slotH), slotRadius, slotRadius),
    [slotX, slotY, slotW, slotH, slotRadius]
  );

  return (
    <>
      {slotStyle?.backgroundColor && (
        <RoundedRect
          x={slotX}
          y={slotY}
          width={slotW}
          height={slotH}
          r={slotRadius}
          color={slotStyle.backgroundColor}
        />
      )}
      <Group clip={clipPath}>
        <DigitColumn
          current={current}
          spinProgress={spinProgress}
          spinStart={spinStart}
          spinEnd={spinEnd}
          spinCyclesAtPosition={spinCyclesFor(slot.exponent)}
          exponent={slot.exponent}
          digitX={digitX}
          baselineY={baselineY}
          innerHeight={innerH}
          font={font}
          color={color}
          direction={direction}
          rollStyle={rollStyle}
        />
      </Group>
      {slotStyle?.borderColor && borderWidth > 0 && (
        <RoundedRect
          x={slotX + borderWidth / 2}
          y={slotY + borderWidth / 2}
          width={slotW - borderWidth}
          height={slotH - borderWidth}
          r={Math.max(0, slotRadius - borderWidth / 2)}
          color={slotStyle.borderColor}
          style="stroke"
          strokeWidth={borderWidth}
        />
      )}
    </>
  );
}

interface DigitColumnProps {
  current: SharedValue<number>;
  spinProgress: SharedValue<number>;
  spinStart: SharedValue<number>;
  spinEnd: SharedValue<number>;
  spinCyclesAtPosition: number;
  exponent: number;
  digitX: number;
  baselineY: number;
  innerHeight: number;
  font: SkFont;
  color: string;
  direction: RollDirection;
  rollStyle: RollStyle;
}

function DigitColumn({
  current,
  spinProgress,
  spinStart,
  spinEnd,
  spinCyclesAtPosition,
  exponent,
  digitX,
  baselineY,
  innerHeight,
  font,
  color,
  direction,
  rollStyle,
}: DigitColumnProps) {
  const divisor = Math.pow(10, exponent);
  const dirSign = direction === 'up' ? -1 : 1;

  const phase = useDerivedValue(() => {
    if (rollStyle === 'spin') {
      const start = spinStart.value > 0 ? spinStart.value : 0;
      const end = spinEnd.value > 0 ? spinEnd.value : 0;
      const startInt = Math.floor(start / divisor);
      const endInt = Math.floor(end / divisor);
      const endDigit = endInt % 10;
      if (startInt === endInt) return endDigit;
      const p = spinProgress.value;
      if (p >= 1) return endDigit;
      const startDigit = startInt % 10;
      const delta = (((endDigit - startDigit) % 10) + 10) % 10;
      const forwardSteps = spinCyclesAtPosition * 10 + delta;
      return startDigit + forwardSteps * p;
    }
    const v = current.value > 0 ? current.value : 0;
    if (rollStyle === 'mechanical') {
      return (v / divisor) % 10;
    }
    const intDigit = Math.floor(v / divisor) % 10;
    const modVal = v - Math.floor(v / divisor) * divisor;
    const fracRaw = modVal - (divisor - 1);
    const frac = fracRaw > 0 ? fracRaw : 0;
    return intDigit + frac;
  });

  const currentText = useDerivedValue(() =>
    String(Math.floor(phase.value) % 10)
  );

  const nextText = useDerivedValue(() =>
    String((Math.floor(phase.value) + 1) % 10)
  );

  const currentY = useDerivedValue(() => {
    const frac = phase.value - Math.floor(phase.value);
    return baselineY + dirSign * frac * innerHeight;
  });

  const nextY = useDerivedValue(() => {
    const frac = phase.value - Math.floor(phase.value);
    return baselineY + dirSign * (frac - 1) * innerHeight;
  });

  return (
    <>
      <SkText
        font={font}
        text={currentText}
        x={digitX}
        y={currentY}
        color={color}
      />
      <SkText font={font} text={nextText} x={digitX} y={nextY} color={color} />
    </>
  );
}
