

import { getEffectFactory } from './src/effects';
import type { SectionEffect } from './src/effects/types';

class IntersectionOrchestrator {
  private readonly mainElement: HTMLElement;
  private readonly sections: HTMLElement[];
  private readonly observer: IntersectionObserver;
  private readonly active: Set<HTMLElement> = new Set();
  private readonly instances: Map<HTMLElement, SectionEffect> = new Map();
  private rafId: number | null = null;
  private currentActiveIndex = -1;

  constructor() {
    const main = document.querySelector('main');
    const sections = Array.from(document.querySelectorAll('section')) as HTMLElement[];
    if (!main || sections.length === 0) {
      throw new Error('Required elements not found');
    }
    this.mainElement = main as HTMLElement;
    this.sections = sections;

    this.observer = new IntersectionObserver(this.onIntersect, {
      root: null,
      rootMargin: '50% 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    });

    this.sections.forEach((s) => this.observer.observe(s));
    this.instantiateEffects();

    window.addEventListener('resize', () => this.requestTick());
    window.addEventListener('scroll', () => this.requestTick(), { passive: true });
    this.requestTick();
  }

  private instantiateEffects(): void {
    for (const section of this.sections) {
      const effectName = section.getAttribute('data-effect');
      const factory = getEffectFactory(effectName);
      if (factory) {
        const instance = factory(section);
        this.instances.set(section, instance);
      }
    }
  }

  private onIntersect = (entries: IntersectionObserverEntry[]): void => {
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      if (entry.isIntersecting) {
        this.active.add(el);
      } else {
        this.active.delete(el);
      }
    }
    this.requestTick();
  };

  private requestTick(): void {
    if (this.rafId != null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.updateFrame();
    });
  }

  private updateFrame(): void {
    const viewportH = window.innerHeight;
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < this.sections.length; i++) {
      const section = this.sections[i];
      // Update effects for active sections only
      if (this.active.has(section)) {
        const offset = this.computeNormalizedOffset(section.getBoundingClientRect(), viewportH);
        const instance = this.instances.get(section);
        if (instance) instance.update(offset);
      }

      // Track closest to center for color/background switching
      const rect = section.getBoundingClientRect();
      const sectionCenter = rect.top + rect.height / 2;
      const distance = Math.abs(sectionCenter - viewportH / 2);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    if (closestIndex !== this.currentActiveIndex) {
      this.currentActiveIndex = closestIndex;
      this.updateActiveLetterClass(closestIndex);
    }
  }

  private computeNormalizedOffset(rect: DOMRect, viewportH: number): number {
    const sectionCenter = rect.top + rect.height / 2;
    const viewportCenter = viewportH / 2;
    const denom = (viewportH + rect.height) / 2; // half-span where |offset|=1 at full out-of-view center
    const raw = (sectionCenter - viewportCenter) / denom;
    return Math.max(-1, Math.min(1, raw));
  }

  private updateActiveLetterClass(index: number): void {
    this.mainElement.classList.remove(
      'active-letter-0',
      'active-letter-1',
      'active-letter-2',
      'active-letter-3',
      'active-letter-4',
      'active-letter-5',
      'active-letter-6',
      'active-letter-7',
      'active-letter-8'
    );
    this.mainElement.classList.add(`active-letter-${index}`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new IntersectionOrchestrator();
});
