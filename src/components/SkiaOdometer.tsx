import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { Platform } from 'react-native';
import { Canvas, Text as SkText, matchFont } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import { buildAnimation, type MotionConfig } from '../animation';

export interface SkiaOdometerHandle {
  setTarget: (value: number) => void;
  addDelta: (delta: number) => void;
  jumpTo: (value: number) => void;
  getCurrent: () => number;
  getTarget: () => number;
}

export interface SkiaOdometerProps {
  initialValue?: number;
  width: number;
  height: number;
  fontSize?: number;
  fontWeight?:
    | 'normal'
    | 'bold'
    | '100'
    | '200'
    | '300'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800'
    | '900';
  fontFamily?: string;
  color?: string;
  decimals?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
  prefix?: string;
  suffix?: string;
  align?: 'left' | 'center' | 'right';
  motion?: MotionConfig;
}

const defaultFamily = Platform.select({
  ios: 'Helvetica',
  default: 'sans-serif',
})!;

function formatNumber(
  v: number,
  decimals: number,
  thousands: string,
  decimal: string,
  prefix: string,
  suffix: string
): string {
  'worklet';
  const neg = v < 0;
  const abs = Math.abs(v);
  const fixed = abs.toFixed(decimals);
  const dotIdx = fixed.indexOf('.');
  const intPart = dotIdx === -1 ? fixed : fixed.slice(0, dotIdx);
  const fracPart = dotIdx === -1 ? '' : fixed.slice(dotIdx + 1);
  let withSep = '';
  for (let i = 0; i < intPart.length; i++) {
    if (i > 0 && (intPart.length - i) % 3 === 0) withSep += thousands;
    withSep += intPart[i];
  }
  const body = fracPart ? withSep + decimal + fracPart : withSep;
  return prefix + (neg ? '-' : '') + body + suffix;
}

export const SkiaOdometer = forwardRef<SkiaOdometerHandle, SkiaOdometerProps>(
  function SkiaOdometer(
    {
      initialValue = 0,
      width,
      height,
      fontSize = 64,
      fontWeight = 'bold',
      fontFamily = defaultFamily,
      color = '#111',
      decimals = 0,
      thousandsSeparator = ',',
      decimalSeparator = '.',
      prefix = '',
      suffix = '',
      align = 'center',
      motion = { type: 'spring' },
    },
    ref
  ) {
    const current = useSharedValue(initialValue);
    const target = useSharedValue(initialValue);

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

    const text = useDerivedValue(() =>
      formatNumber(
        current.value > 0 ? current.value : 0,
        decimals,
        thousandsSeparator,
        decimalSeparator,
        prefix,
        suffix
      )
    );

    const x = useDerivedValue(() => {
      const measured = font.measureText(text.value).width;
      if (align === 'left') return 0;
      if (align === 'right') return width - measured;
      return (width - measured) / 2;
    });

    const y = fontSize * 0.85;

    useImperativeHandle(
      ref,
      () => ({
        setTarget: (value: number) => {
          cancelAnimation(current);
          target.value = value;
          current.value = buildAnimation(value, current.value, motion);
        },
        addDelta: (delta: number) => {
          cancelAnimation(current);
          const newTarget = target.value + delta;
          target.value = newTarget;
          current.value = buildAnimation(newTarget, current.value, motion);
        },
        jumpTo: (value: number) => {
          cancelAnimation(current);
          target.value = value;
          current.value = value;
        },
        getCurrent: () => current.value,
        getTarget: () => target.value,
      }),
      [motion, current, target]
    );

    return (
      <Canvas style={{ width, height }}>
        <SkText font={font} text={text} x={x} y={y} color={color} />
      </Canvas>
    );
  }
);
