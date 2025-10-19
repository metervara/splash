import type { SectionEffect } from './types';

// Simpler horizontal version mirroring VerticalSlicesEffect
export class HorizontalSlicesEffect implements SectionEffect {
  private readonly section: HTMLElement;
  private readonly letterElement: HTMLElement | null;
  private rows: HTMLElement[] = [];
  private rowCount: number = 19;
  private maxAmount: number = 1; // 0..∞ scales transform intensity
  private maxTranslatePx: number = 16; // horizontal offset amplitude at |offset|=1
  private maxSkewDeg: number = 12; // skewX amplitude at |offset|=1

  constructor(section: HTMLElement) {
    this.section = section;
    this.letterElement = section.querySelector('.letter');
  }

  init(): void {
    if (!this.letterElement) return;
    this.readConfigFromAttributes();
    this.createRows();
  }

  update(normalizedOffset: number): void {
    const progressAbs = Math.min(1, Math.abs(normalizedOffset));
    this.section.style.setProperty('--effect-progress-abs', `${progressAbs}`);
  }

  destroy(): void {
    if (!this.letterElement) return;
    this.letterElement.innerHTML = '';
    this.rows = [];
  }

  private readConfigFromAttributes(): void {
    const dataSlices = this.section.getAttribute('data-slices');
    const dataMaxAmount = this.section.getAttribute('data-max-amount');
    const dataMaxTranslate = this.section.getAttribute('data-max-translate');
    const dataAmpPx = this.section.getAttribute('data-amp-px'); // legacy name support
    const dataMaxSkew = this.section.getAttribute('data-max-skew');

    const parsedSlices = parseInt((dataSlices || '').trim(), 10);
    if (!Number.isNaN(parsedSlices) && parsedSlices > 1) {
      this.rowCount = parsedSlices;
    }

    const parsedMaxAmount = parseFloat((dataMaxAmount || '').trim());
    if (!Number.isNaN(parsedMaxAmount)) {
      this.maxAmount = Math.max(0, parsedMaxAmount);
    }

    const parsedMaxTranslate = parseFloat((dataMaxTranslate || dataAmpPx || '').trim());
    if (!Number.isNaN(parsedMaxTranslate)) {
      this.maxTranslatePx = parsedMaxTranslate;
    }

    const parsedMaxSkew = parseFloat((dataMaxSkew || '').trim());
    if (!Number.isNaN(parsedMaxSkew)) {
      this.maxSkewDeg = parsedMaxSkew;
    }
  }

  private createRows(): void {
    if (!this.letterElement) return;
    const originalContent = this.letterElement.textContent;

    this.letterElement.innerHTML = '';
    this.letterElement.style.position = 'relative';
    this.letterElement.style.display = 'flex';
    this.letterElement.style.flexDirection = 'column';
    this.letterElement.style.width = '100%';
    this.letterElement.style.height = '100%';
    this.letterElement.style.alignItems = 'stretch';
    this.letterElement.style.justifyContent = 'center';

    for (let i = 0; i < this.rowCount; i++) {
      const row = document.createElement('div');
      row.style.position = 'relative';
      row.style.width = '100%';
      row.style.height = `${100 / this.rowCount}%`;
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'center';
      row.style.overflow = 'hidden';
      row.style.setProperty('--slice-index', String(i));

      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.top = '0';
      wrapper.style.left = '0';
      wrapper.style.width = '100%';
      wrapper.style.height = `${this.rowCount * 100}%`;
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.willChange = 'transform';
      wrapper.style.transformOrigin = '50% 50%';

      // Precompute a smooth 0..1 wave coefficient per row (0 at edges, 1 at center)
      const t = (i + 0.5) / this.rowCount; // 0..1
      const wave = Math.sin(Math.PI * t); // 0..1
      wrapper.style.setProperty('--actual-slices', String(this.rowCount));
      wrapper.style.setProperty('--max-amount', String(this.maxAmount));
      wrapper.style.setProperty('--row-coeff', String(wave));
      wrapper.style.setProperty('--max-translate', `${this.maxTranslatePx}px`);
      wrapper.style.setProperty('--max-skew', `${this.maxSkewDeg}deg`);

      // Translate each slice from assembled to centered layout based on progress
      // Then add horizontal offset and skew using the precomputed coefficient
      wrapper.style.transform = [
        'translateY(calc(-100% * ( ((1 - (var(--effect-progress-abs, 0) * var(--max-amount, 1))) * (var(--slice-index) / var(--actual-slices))) + ((var(--effect-progress-abs, 0) * var(--max-amount, 1)) * (0.5 - (0.5 / var(--actual-slices)))) )))',
        'translateX(calc(var(--row-coeff) * var(--effect-progress-abs, 0) * var(--max-amount, 1) * var(--max-translate)))',
        'skewX(calc(var(--row-coeff) * var(--effect-progress-abs, 0) * var(--max-amount, 1) * var(--max-skew)))',
      ].join(' ');

      const content = document.createElement('div');
      content.textContent = originalContent;
      content.style.position = 'absolute';
      content.style.top = '50%';
      content.style.left = '50%';
      content.style.transform = 'translate(-50%, -50%)';
      content.style.fontSize = 'inherit';
      content.style.fontWeight = 'inherit';
      content.style.fontFamily = 'inherit';
      content.style.color = 'inherit';
      content.style.lineHeight = 'inherit';
      content.style.whiteSpace = 'nowrap';

      wrapper.appendChild(content);
      row.appendChild(wrapper);
      this.letterElement.appendChild(row);
      this.rows.push(row);
    }
  }
}

export function createHorizontalSlicesEffect(section: HTMLElement): SectionEffect {
  const effect = new HorizontalSlicesEffect(section);
  effect.init();
  return effect;
}
