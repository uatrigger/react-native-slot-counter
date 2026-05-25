import { Easing, withSpring, withTiming } from 'react-native-reanimated';

export type MotionConfig =
  | {
      type: 'spring';
      mass?: number;
      stiffness?: number;
      damping?: number;
    }
  | {
      type: 'casino';
      duration?: number;
      minDuration?: number;
      maxDuration?: number;
    };

const casinoEasing = Easing.bezier(0.0, 0.35, 0.2, 1.0);

export function buildAnimation(
  value: number,
  currentValue: number,
  motion: MotionConfig
) {
  if (motion.type === 'spring') {
    return withSpring(value, {
      mass: motion.mass ?? 1,
      stiffness: motion.stiffness ?? 60,
      damping: motion.damping ?? 14,
    });
  }
  const duration = casinoDuration(value, currentValue, motion);
  return withTiming(value, { duration, easing: casinoEasing });
}

export function estimateMotionDuration(
  value: number,
  currentValue: number,
  motion: MotionConfig
): number {
  if (motion.type === 'spring') {
    const m = motion.mass ?? 1;
    const k = motion.stiffness ?? 60;
    const period = 2 * Math.PI * Math.sqrt(m / k);
    return Math.min(2500, Math.max(400, period * 1500));
  }
  return casinoDuration(value, currentValue, motion);
}

function casinoDuration(
  value: number,
  currentValue: number,
  motion: Extract<MotionConfig, { type: 'casino' }>
): number {
  const distance = Math.abs(value - currentValue);
  const minDur = motion.minDuration ?? 800;
  const maxDur = motion.maxDuration ?? 2500;
  const calculated = motion.duration ?? minDur + Math.log10(distance + 1) * 250;
  return Math.min(maxDur, Math.max(minDur, calculated));
}

export function spinEasing() {
  'worklet';
  return casinoEasing;
}
