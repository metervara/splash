import type { SectionEffect } from './types';

type SliceType = 'vertical' | 'horizontal' | 'concentric';
type ProgressMode = 'abs' | 'signed';

function parseProgressMode(value: string | null | undefined, fallback: ProgressMode): ProgressMode {
  const v = (value || '').trim().toLowerCase();
  if (v === 'signed') return 'signed';
  if (v === 'abs') return 'abs';
  return fallback;
}

export class UnifiedSlicesEffect implements SectionEffect {
  private readonly section: HTMLElement;
  private readonly letterElement: HTMLElement | null;

  private sliceType: SliceType = 'vertical';
  private sliceCount: number = 19; // rows/cols, concentric uses circleCount
  private maxAmount: number = 1; // intensity of assemble/disassemble

  // Max transform magnitudes
  private maxTranslateX: number = 0; // px
  private maxTranslateY: number = 0; // px
  private maxSkewX: number = 0; // deg
  private maxSkewY: number = 0; // deg
  private maxRotate: number = 0; // deg
  private maxScale: number = 1; // unitless (>=1)

  // Per-property progress selection
  private modeTranslateX: ProgressMode = 'abs';
  private modeTranslateY: ProgressMode = 'abs';
  private modeSkewX: ProgressMode = 'abs';
  private modeSkewY: ProgressMode = 'abs';
  private modeRotate: ProgressMode = 'signed';
  private modeScale: ProgressMode = 'abs';

  constructor(section: HTMLElement) {
    this.section = section;
    this.letterElement = section.querySelector('.letter');
  }

  init(): void {
    if (!this.letterElement) return;
    this.readConfig();
    this.applyInitCSSVariables();
    this.applyClasses();
    this.createStructure();
  }

  update(normalizedOffset: number): void {
    // Only update shared progress variables; mode selection is wired at init through indirection vars
    const progressAbs = Math.min(1, Math.abs(normalizedOffset));
    const progressSigned = Math.max(-1, Math.min(1, normalizedOffset));
    this.section.style.setProperty('--effect-progress-abs', `${progressAbs}`);
    this.section.style.setProperty('--effect-progress-signed', `${progressSigned}`);
  }

  destroy(): void {
    if (!this.letterElement) return;
    this.letterElement.innerHTML = '';
  }

  private readConfig(): void {
    const typeAttr = (this.section.getAttribute('data-slice-type') || '').trim().toLowerCase();
    if (typeAttr === 'horizontal' || typeAttr === 'concentric' || typeAttr === 'vertical') {
      this.sliceType = typeAttr;
    }

    const countAttrRaw = this.section.getAttribute('data-slices');
    const parsedCount = parseInt((countAttrRaw || '').trim(), 10);
    if (Number.isFinite(parsedCount) && parsedCount > 0) {
      this.sliceCount = parsedCount;
    } else if (this.sliceType === 'concentric' && !Number.isFinite(parsedCount)) {
      // Reasonable default for circles
      this.sliceCount = 8;
    }

    const maxAmountRaw = this.section.getAttribute('data-max-amount');
    const maxAmountParsed = parseFloat((maxAmountRaw || '').trim());
    if (Number.isFinite(maxAmountParsed)) {
      this.maxAmount = Math.max(0, maxAmountParsed);
    }

    const parsePx = (attr: string | null) => {
      const v = parseFloat((attr || '').trim());
      return Number.isFinite(v) ? v : undefined;
    };
    const parseDeg = (attr: string | null) => {
      const v = parseFloat((attr || '').trim());
      return Number.isFinite(v) ? v : undefined;
    };

    const mtX = parsePx(this.section.getAttribute('data-max-translate-x'));
    const mtY = parsePx(this.section.getAttribute('data-max-translate-y'));
    const msX = parseDeg(this.section.getAttribute('data-max-skew-x'));
    const msY = parseDeg(this.section.getAttribute('data-max-skew-y'));
    const mRot = parseDeg(this.section.getAttribute('data-max-rotate'));
    const mScale = parseFloat((this.section.getAttribute('data-max-scale') || '').trim());

    if (mtX != null) this.maxTranslateX = mtX;
    if (mtY != null) this.maxTranslateY = mtY;
    if (msX != null) this.maxSkewX = msX;
    if (msY != null) this.maxSkewY = msY;
    if (mRot != null && Number.isFinite(mRot)) this.maxRotate = mRot;
    if (Number.isFinite(mScale)) this.maxScale = Math.max(0, mScale);

    // Per-property progress modes
    this.modeTranslateX = parseProgressMode(this.section.getAttribute('data-translate-x-mode'), 'abs');
    this.modeTranslateY = parseProgressMode(this.section.getAttribute('data-translate-y-mode'), 'abs');
    this.modeSkewX = parseProgressMode(this.section.getAttribute('data-skew-x-mode'), 'abs');
    this.modeSkewY = parseProgressMode(this.section.getAttribute('data-skew-y-mode'), 'abs');
    this.modeRotate = parseProgressMode(this.section.getAttribute('data-rotate-mode'), 'signed');
    this.modeScale = parseProgressMode(this.section.getAttribute('data-scale-mode'), 'abs');
  }

  private applyInitCSSVariables(): void {
    // Max values
    this.section.style.setProperty('--slice-count', String(this.sliceCount));
    this.section.style.setProperty('--max-amount', String(this.maxAmount));
    this.section.style.setProperty('--max-translate-x', `${this.maxTranslateX}px`);
    this.section.style.setProperty('--max-translate-y', `${this.maxTranslateY}px`);
    this.section.style.setProperty('--max-skew-x', `${this.maxSkewX}deg`);
    this.section.style.setProperty('--max-skew-y', `${this.maxSkewY}deg`);
    this.section.style.setProperty('--max-rotate', `${this.maxRotate}deg`);
    this.section.style.setProperty('--max-scale', `${this.maxScale}`);

    // Indirection for progress selection per property
    this.section.style.setProperty('--p-assemble', 'var(--effect-progress-abs)');
    this.section.style.setProperty('--p-translate-x', this.modeTranslateX === 'signed' ? 'var(--effect-progress-signed)' : 'var(--effect-progress-abs)');
    this.section.style.setProperty('--p-translate-y', this.modeTranslateY === 'signed' ? 'var(--effect-progress-signed)' : 'var(--effect-progress-abs)');
    this.section.style.setProperty('--p-skew-x', this.modeSkewX === 'signed' ? 'var(--effect-progress-signed)' : 'var(--effect-progress-abs)');
    this.section.style.setProperty('--p-skew-y', this.modeSkewY === 'signed' ? 'var(--effect-progress-signed)' : 'var(--effect-progress-abs)');
    this.section.style.setProperty('--p-rotate', this.modeRotate === 'signed' ? 'var(--effect-progress-signed)' : 'var(--effect-progress-abs)');
    this.section.style.setProperty('--p-scale', this.modeScale === 'signed' ? 'var(--effect-progress-signed)' : 'var(--effect-progress-abs)');
  }

  private applyClasses(): void {
    this.section.classList.add('effect-unified');
    this.section.classList.add(`slice-${this.sliceType}`);
  }

  private createStructure(): void {
    if (!this.letterElement) return;
    const originalContent = this.letterElement.textContent || '';
    this.letterElement.innerHTML = '';

    if (this.sliceType === 'concentric') {
      this.createConcentric(originalContent);
      return;
    }

    // Vertical or Horizontal slices
    const isVertical = this.sliceType === 'vertical';
    for (let i = 0; i < this.sliceCount; i++) {
      const slice = document.createElement('div');
      slice.className = 'slice';
      slice.style.setProperty('--slice-index', String(i));

      const wrapper = document.createElement('div');
      wrapper.className = 'slice-wrapper';

      const content = document.createElement('div');
      content.className = 'slice-content';
      content.textContent = originalContent;

      wrapper.appendChild(content);
      slice.appendChild(wrapper);
      this.letterElement.appendChild(slice);

      // Width/height handled in CSS using --slice-count. We only need to set orientation-specific sizing here if necessary.
      if (isVertical) {
        // no-op, CSS covers layout
      } else {
        // horizontal - no-op, CSS covers layout
      }
    }
  }

  private createConcentric(originalContent: string): void {
    if (!this.letterElement) return;
    // Compute max radius as diagonal/2 to ensure full coverage
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const diagonal = Math.sqrt(viewportWidth * viewportWidth + viewportHeight * viewportHeight);
    const maxRadius = diagonal / 2;

    this.section.style.setProperty('--circle-count', String(this.sliceCount));
    this.section.style.setProperty('--circle-denom', String(Math.max(1, this.sliceCount - 1)));

    for (let i = 0; i < this.sliceCount; i++) {
      const radius = (maxRadius * (this.sliceCount - i)) / this.sliceCount;
      const diameter = radius * 2;

      const circle = document.createElement('div');
      circle.className = 'circle';
      circle.style.setProperty('--circle-index', String(i));
      circle.style.width = `${diameter}px`;
      circle.style.height = `${diameter}px`;

      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'circle-content';

      const content = document.createElement('div');
      content.className = 'circle-text';
      content.textContent = originalContent;

      contentWrapper.appendChild(content);
      circle.appendChild(contentWrapper);
      this.letterElement.appendChild(circle);
    }
  }
}

export function createUnifiedSlicesEffect(section: HTMLElement): SectionEffect {
  const effect = new UnifiedSlicesEffect(section);
  effect.init();
  return effect;
}


