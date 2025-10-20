import type { EffectFactory } from './types';
import { createVerticalSlicesEffect } from './verticalSlices';
import { createConcentricCirclesEffect } from './concentricCircles';
import { createHorizontalSlicesEffect } from './horizontalSlices';
import { createUnifiedSlicesEffect } from './slices';

const registry: Record<string, EffectFactory> = {
  'vertical-slices': createVerticalSlicesEffect,
  'concentric-circles': createConcentricCirclesEffect,
  'horizontal-slices': createHorizontalSlicesEffect,
  'slices': createUnifiedSlicesEffect,
};

export function getEffectFactory(name: string | null | undefined): EffectFactory | undefined {
  if (!name) return undefined;
  return registry[name] as EffectFactory | undefined;
}

export function hasEffect(name: string | null | undefined): boolean {
  return !!getEffectFactory(name);
}


