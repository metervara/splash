export interface SectionEffect {
  init(): void;
  update(normalizedOffset: number): void; // -1..1 where 0 is centered in viewport
  destroy(): void;
}

export type EffectFactory = (section: HTMLElement) => SectionEffect;


