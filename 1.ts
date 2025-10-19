

import { getEffectFactory } from './src/effects';
import type { SectionEffect } from './src/effects/types';

class SpringValue {
  private readonly stiffness: number; // k (higher = snappier)
  private readonly damping: number;   // c (higher = more damping)
  private readonly positionEpsilon: number;
  private readonly velocityEpsilon: number;

  position: number = 0;
  velocity: number = 0;

  constructor(options?: {
    stiffness?: number;
    damping?: number;
    positionEpsilon?: number;
    velocityEpsilon?: number;
  }) {
    this.stiffness = Math.max(0, options?.stiffness ?? 180);
    this.damping = Math.max(0, options?.damping ?? 24);
    this.positionEpsilon = Math.max(1e-6, options?.positionEpsilon ?? 0.0005);
    this.velocityEpsilon = Math.max(1e-6, options?.velocityEpsilon ?? 0.0005);
  }

  update(target: number, dtSeconds: number): void {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    // Mass-spring-damper with mass = 1
    const displacement = this.position - target;
    const acceleration = -this.stiffness * displacement - this.damping * this.velocity;
    this.velocity += acceleration * dtSeconds;
    this.position += this.velocity * dtSeconds;
  }

  isAtRest(target: number): boolean {
    return (
      Math.abs(this.position - target) < this.positionEpsilon &&
      Math.abs(this.velocity) < this.velocityEpsilon
    );
  }
}

class IntersectionOrchestrator {
  private readonly mainElement: HTMLElement;
  private readonly sections: HTMLElement[];
  private readonly observer: IntersectionObserver;
  private readonly active: Set<HTMLElement> = new Set();
  private readonly instances: Map<HTMLElement, SectionEffect> = new Map();
  private rafId: number | null = null;
  private currentActiveIndex = -1;
  private lastRafTime: number | null = null;

  // Offset driving mode
  private mode: 'direct' | 'spring' = 'direct';
  private spring: SpringValue | null = null;
  private springTarget: number = 0;
  // Note: in 'spring' mode, springTarget and spring.position are in page pixels

  constructor() {
    const main = document.querySelector('main');
    const sections = Array.from(document.querySelectorAll('section')) as HTMLElement[];
    if (!main || sections.length === 0) {
      throw new Error('Required elements not found');
    }
    this.mainElement = main as HTMLElement;
    this.sections = sections;

    this.readConfig();

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
    this.rafId = requestAnimationFrame((time) => {
      this.rafId = null;
      this.updateFrame(time);
    });
  }

  private updateFrame(time?: number): void {
    const now = time ?? performance.now();
    const dtSeconds = this.lastRafTime == null ? 0 : Math.min(0.05, Math.max(0, (now - this.lastRafTime) / 1000));
    this.lastRafTime = now;

    const viewportH = window.innerHeight;
    const centerPx = window.scrollY + viewportH / 2; // page coordinate of viewport center
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < this.sections.length; i++) {
      const section = this.sections[i];
      const rect = section.getBoundingClientRect();

      // Track closest to viewport center (for classes)
      const sectionCenter = rect.top + rect.height / 2;
      const distance = Math.abs(sectionCenter - viewportH / 2);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    // Drive global spring towards viewport center in page coords
    if (this.mode === 'spring') {
      if (this.spring) {
        if (this.lastRafTime == null) {
          // Initialize spring to current center to avoid first-frame jump
          this.spring.position = centerPx;
          this.spring.velocity = 0;
        }
        this.springTarget = centerPx;
        this.spring.update(this.springTarget, dtSeconds);
      }
    }

    // Update effects for active sections only
    for (let i = 0; i < this.sections.length; i++) {
      const section = this.sections[i];
      if (!this.active.has(section)) continue;
      const instance = this.instances.get(section);
      if (!instance) continue;

      const rect = section.getBoundingClientRect();
      let value: number;
      if (this.mode === 'spring' && this.spring) {
        value = this.computeNormalizedOffsetToCenterPx(rect, viewportH, this.spring.position);
      } else {
        value = this.computeNormalizedOffset(rect, viewportH);
      }
      instance.update(value);
    }

    if (closestIndex !== this.currentActiveIndex) {
      this.currentActiveIndex = closestIndex;
      this.updateActiveLetterClass(closestIndex);
    }

    // Continue ticking while spring is animating
    if (this.mode === 'spring' && this.spring && !this.spring.isAtRest(this.springTarget)) {
      this.requestTick();
    }
  }

  private computeNormalizedOffset(rect: DOMRect, viewportH: number): number {
    const sectionCenter = rect.top + rect.height / 2;
    const viewportCenter = viewportH / 2;
    const denom = (viewportH + rect.height) / 2; // half-span where |offset|=1 at full out-of-view center
    const raw = (sectionCenter - viewportCenter) / denom;
    return Math.max(-1, Math.min(1, raw));
  }

  private computeNormalizedOffsetToCenterPx(rect: DOMRect, viewportH: number, centerPx: number): number {
    const sectionCenterPx = window.scrollY + rect.top + rect.height / 2;
    const denom = (viewportH + rect.height) / 2;
    const raw = (sectionCenterPx - centerPx) / denom;
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

  private readConfig(): void {
    const modeAttr = (this.mainElement.getAttribute('data-offset-mode') || 'direct').toLowerCase();
    if (modeAttr === 'spring') {
      this.mode = 'spring';
      const stiffness = parseFloat(this.mainElement.getAttribute('data-spring-stiffness') || '');
      const damping = parseFloat(this.mainElement.getAttribute('data-spring-damping') || '');
      const posEps = parseFloat(this.mainElement.getAttribute('data-spring-epsilon') || '');
      const velEps = parseFloat(this.mainElement.getAttribute('data-spring-vel-epsilon') || '');
      this.spring = new SpringValue({
        stiffness: Number.isFinite(stiffness) ? stiffness : undefined,
        damping: Number.isFinite(damping) ? damping : undefined,
        positionEpsilon: Number.isFinite(posEps) ? posEps : undefined,
        velocityEpsilon: Number.isFinite(velEps) ? velEps : undefined,
      });
    } else {
      this.mode = 'direct';
      this.spring = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new IntersectionOrchestrator();
});
