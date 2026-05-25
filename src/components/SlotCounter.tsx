import { forwardRef } from 'react';
import {
  SkiaRollingOdometer,
  type SkiaRollingOdometerHandle,
  type SkiaRollingOdometerProps,
} from './SkiaRollingOdometer';
import {
  SkiaImageOdometer,
  type SkiaImageOdometerHandle,
  type SkiaImageOdometerProps,
} from './SkiaImageOdometer';

export type SlotCounterHandle =
  | SkiaRollingOdometerHandle
  | SkiaImageOdometerHandle;

export type SlotCounterProps =
  | ({ renderer?: 'text' } & SkiaRollingOdometerProps)
  | ({ renderer: 'image' } & SkiaImageOdometerProps);

export const SlotCounter = forwardRef<SlotCounterHandle, SlotCounterProps>(
  function SlotCounter(props, ref) {
    if (props.renderer === 'image') {
      const rest: SkiaImageOdometerProps = props;
      return <SkiaImageOdometer ref={ref as any} {...rest} />;
    }
    const rest: SkiaRollingOdometerProps = props;
    return <SkiaRollingOdometer ref={ref as any} {...rest} />;
  }
);
