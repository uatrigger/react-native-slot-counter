import { forwardRef, useImperativeHandle, useMemo } from 'react';
import {
  Canvas,
  Group,
  Image as SkiaImage,
  RoundedRect,
  rect,
  rrect,
  useImage,
  type DataSourceParam,
  type SkImage,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  buildAnimation,
  estimateMotionDuration,
  type MotionConfig,
} from '../animation';
import type {
  ContainerStyle,
  DigitSlotStyle,
  RollDirection,
  RollStyle,
} from './SkiaRollingOdometer';

const MAX_DIGITS = 12;
const DEFAULT_SPIN_CYCLES = (_position: number) => 5;

export type DigitImageTuple = [
  DataSourceParam,
  DataSourceParam,
  DataSourceParam,
  DataSourceParam,
  DataSourceParam,
  DataSourceParam,
  DataSourceParam,
  DataSourceParam,
  DataSourceParam,
  DataSourceParam,
];

export interface SkiaImageOdometerHandle {
  setTarget: (value: number) => void;
  addDelta: (delta: number) => void;
  jumpTo: (value: number) => void;
  getCurrent: () => number;
  getTarget: () => number;
}

export interface SkiaImageOdometerProps {
  initialValue?: number;
  width: number;
  height: number;
  /** Exactly 10 image sources for digits 0–9. */
  digitImages: DigitImageTuple;
  /** Image used between thousand groups in the integer section. Omit for none. */
  thousandsSeparatorImage?: DataSourceParam;
  /** Image used between integer and fractional sections. Omit to skip separator (decimals still rendered if `decimals` > 0). */
  decimalSeparatorImage?: DataSourceParam;
  digits?: number;
  decimals?: number;
  digitAspectRatio?: number;
  groupSize?: number;
  direction?: RollDirection;
  rollStyle?: RollStyle;
  motion?: MotionConfig;
  spinCycles?: (exponent: number) => number;
  digitGap?: number;
  groupGap?: number;
  digitSlot?: DigitSlotStyle;
  containerStyle?: ContainerStyle;
}

interface SlotLayout {
  exponent: number;
  slotX: number;
  slotY: number;
  slotW: number;
  slotH: number;
  innerX: number;
  innerY: number;
  innerW: number;
  innerH: number;
  imgSize: number;
  imgX: number;
  imgBaseY: number;
}

type SepKind = 'thousands' | 'decimal';

interface SepLayout {
  kind: SepKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SkiaImageOdometer = forwardRef<
  SkiaImageOdometerHandle,
  SkiaImageOdometerProps
>(function SkiaImageOdometer(
  {
    initialValue = 0,
    width,
    height,
    digitImages,
    thousandsSeparatorImage,
    decimalSeparatorImage,
    digits: digitsProp = 8,
    decimals: decimalsProp = 0,
    digitAspectRatio = 0.7,
    groupSize = 3,
    direction = 'up',
    rollStyle = 'spin',
    motion = { type: 'spring', mass: 0.5, stiffness: 220, damping: 22 },
    spinCycles = DEFAULT_SPIN_CYCLES,
    digitGap = 0,
    groupGap = 0,
    digitSlot,
    containerStyle,
  },
  ref
) {
  const digits = Math.min(digitsProp, MAX_DIGITS);
  const decimals = Math.max(0, Math.min(decimalsProp, MAX_DIGITS - digits));
  const totalSlots = digits + decimals;

  const current = useSharedValue(initialValue);
  const target = useSharedValue(initialValue);
  const spinProgress = useSharedValue(1);
  const spinStart = useSharedValue(initialValue);
  const spinEnd = useSharedValue(initialValue);

  // Hook count must be stable. Always call 10 useImage hooks for digits.
  const img0 = useImage(digitImages[0]);
  const img1 = useImage(digitImages[1]);
  const img2 = useImage(digitImages[2]);
  const img3 = useImage(digitImages[3]);
  const img4 = useImage(digitImages[4]);
  const img5 = useImage(digitImages[5]);
  const img6 = useImage(digitImages[6]);
  const img7 = useImage(digitImages[7]);
  const img8 = useImage(digitImages[8]);
  const img9 = useImage(digitImages[9]);
  const digitImgs: (SkImage | null)[] = [
    img0,
    img1,
    img2,
    img3,
    img4,
    img5,
    img6,
    img7,
    img8,
    img9,
  ];
  const thousandsImg = useImage(thousandsSeparatorImage ?? null);
  const decimalImg = useImage(decimalSeparatorImage ?? null);

  const layout = useMemo(() => {
    const cPadX = containerStyle?.paddingX ?? 0;
    const cPadY = containerStyle?.paddingY ?? 0;
    const padX = digitSlot?.paddingX ?? 0;
    const padY = digitSlot?.paddingY ?? 0;

    const slotH = Math.min(digitSlot?.height ?? height - cPadY * 2, height);
    const innerH = slotH - padY * 2;

    const requestedDigitW = innerH * digitAspectRatio;
    const requestedSlotW = digitSlot?.width ?? requestedDigitW + padX * 2;

    type Item =
      | { kind: 'digit'; exponent: number }
      | { kind: 'sep'; sepKind: SepKind };
    const items: Item[] = [];

    for (let i = 0; i < digits; i++) {
      const exp = digits - 1 - i;
      items.push({ kind: 'digit', exponent: exp });
      const lastIntDigit = i === digits - 1;
      if (
        !lastIntDigit &&
        thousandsImg &&
        exp > 0 &&
        groupSize > 0 &&
        exp % groupSize === 0
      ) {
        items.push({ kind: 'sep', sepKind: 'thousands' });
      }
    }
    if (decimals > 0) {
      if (decimalImg) items.push({ kind: 'sep', sepKind: 'decimal' });
      for (let i = 0; i < decimals; i++) {
        items.push({ kind: 'digit', exponent: -(i + 1) });
      }
    }

    const thousandsCount = items.filter(
      (it) => it.kind === 'sep' && it.sepKind === 'thousands'
    ).length;
    const hasDecimalSep = items.some(
      (it) => it.kind === 'sep' && it.sepKind === 'decimal'
    );

    const sepW = thousandsImg || decimalImg ? requestedSlotW * 0.3 : 0;
    const totalGapW = (items.length - 1) * digitGap;
    const totalSepW = (thousandsCount + (hasDecimalSep ? 1 : 0)) * sepW;
    const totalGroupGapW = thousandsCount * groupGap;

    const availableW = width - cPadX * 2;
    const autoSlotW = Math.max(
      0,
      (availableW - totalGapW - totalSepW - totalGroupGapW) / totalSlots
    );
    const slotW = Math.min(requestedSlotW, autoSlotW);
    const innerW = Math.max(0, slotW - padX * 2);
    const imgSize = Math.min(innerW, innerH);

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
        const imgX = innerX + (innerW - imgSize) / 2;
        const imgBaseY = innerY + (innerH - imgSize) / 2;
        slots.push({
          exponent: item.exponent,
          slotX,
          slotY,
          slotW,
          slotH,
          innerX,
          innerY,
          innerW,
          innerH,
          imgSize,
          imgX,
          imgBaseY,
        });
        cursor += slotW;
      } else {
        seps.push({
          kind: item.sepKind,
          x: cursor,
          y: slotY + padY,
          w: sepW,
          h: innerH,
        });
        cursor += sepW;
      }
      if (i < items.length - 1) {
        cursor += digitGap;
        const next = items[i + 1]!;
        const nextIsThousands =
          next.kind === 'sep' && next.sepKind === 'thousands';
        const currentWasThousands =
          item.kind === 'sep' && item.sepKind === 'thousands';
        if (nextIsThousands || currentWasThousands) cursor += groupGap / 2;
      }
    }

    return { slots, seps };
  }, [
    width,
    height,
    digits,
    decimals,
    totalSlots,
    digitAspectRatio,
    digitGap,
    groupGap,
    groupSize,
    thousandsImg,
    decimalImg,
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
  const allImagesLoaded = digitImgs.every((img) => img !== null);

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

      {allImagesLoaded &&
        layout.slots.map((slot) => (
          <ImageSlot
            key={slot.exponent}
            slot={slot}
            slotRadius={slotRadius}
            slotStyle={digitSlot}
            current={current}
            spinProgress={spinProgress}
            spinStart={spinStart}
            spinEnd={spinEnd}
            spinCyclesAtPosition={spinCycles(slot.exponent)}
            digitImgs={digitImgs as SkImage[]}
            direction={direction}
            rollStyle={rollStyle}
          />
        ))}

      {layout.seps.map((sep, i) => {
        const img = sep.kind === 'thousands' ? thousandsImg : decimalImg;
        if (!img) return null;
        return (
          <SkiaImage
            key={`sep-${i}`}
            image={img}
            x={sep.x}
            y={sep.y}
            width={sep.w}
            height={sep.h}
            fit="contain"
          />
        );
      })}
    </Canvas>
  );
});

interface ImageSlotProps {
  slot: SlotLayout;
  slotRadius: number;
  slotStyle?: DigitSlotStyle;
  current: SharedValue<number>;
  spinProgress: SharedValue<number>;
  spinStart: SharedValue<number>;
  spinEnd: SharedValue<number>;
  spinCyclesAtPosition: number;
  digitImgs: SkImage[];
  direction: RollDirection;
  rollStyle: RollStyle;
}

function ImageSlot({
  slot,
  slotRadius,
  slotStyle,
  current,
  spinProgress,
  spinStart,
  spinEnd,
  spinCyclesAtPosition,
  digitImgs,
  direction,
  rollStyle,
}: ImageSlotProps) {
  const { slotX, slotY, slotW, slotH, imgX, imgBaseY, imgSize, exponent } =
    slot;
  const borderWidth = slotStyle?.borderWidth ?? 0;
  const clipPath = useMemo(
    () => rrect(rect(imgX, imgBaseY, imgSize, imgSize), 0, 0),
    [imgX, imgBaseY, imgSize]
  );

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

  const stripTransform = useDerivedValue(() => {
    const wrappedPhase = ((phase.value % 10) + 10) % 10;
    return [{ translateY: dirSign * wrappedPhase * imgSize }];
  });

  const stripImages = useMemo(() => {
    const arr: { digit: number; y: number; key: string }[] = [];
    for (let i = 0; i <= 10; i++) {
      arr.push({
        digit: i % 10,
        y: imgBaseY + -dirSign * i * imgSize,
        key: `s${i}`,
      });
    }
    return arr;
  }, [imgBaseY, imgSize, dirSign]);

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
        <Group transform={stripTransform}>
          {stripImages.map((s) => (
            <SkiaImage
              key={s.key}
              image={digitImgs[s.digit]!}
              x={imgX}
              y={s.y}
              width={imgSize}
              height={imgSize}
              fit="contain"
            />
          ))}
        </Group>
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
