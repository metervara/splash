import type { SectionEffect } from './types';

// A generalized version of the previous Letter5Effect that can target any section
export class VerticalSlicesEffect implements SectionEffect {
  private readonly section: HTMLElement;
  private readonly letterElement: HTMLElement | null;
  private columns: HTMLElement[] = [];
  private columnCount: number = 19;
  private maxAmount: number = 1; // 0..1, scales maximum transform intensity

  constructor(section: HTMLElement) {
    this.section = section;
    this.letterElement = section.querySelector('.letter');
  }

  init(): void {
    if (!this.letterElement) return;
    this.readConfigFromCSS();
    this.createColumns();
  }

  update(normalizedOffset: number): void {
    // Map -1..1 to 0..1 by taking magnitude
    const progressAbs = Math.min(1, Math.abs(normalizedOffset));
    this.section.style.setProperty('--effect-progress-abs', `${progressAbs}`);
  }

  destroy(): void {
    if (!this.letterElement) return;
    this.letterElement.innerHTML = '';
    this.columns = [];
  }

  private readConfigFromCSS(): void {
    // Read from data attributes first, fall back to CSS variables for backward compatibility
    const dataSlices = this.section.getAttribute('data-slices');
    const dataMaxAmount = this.section.getAttribute('data-max-amount');
    
    const slicesValue = dataSlices
    const parsedSlices = parseInt(slicesValue || '', 10);
    if (!Number.isNaN(parsedSlices) && parsedSlices > 1) {
      this.columnCount = parsedSlices;
    }

    const parsedMaxAmount = parseFloat(dataMaxAmount || '');
    if (!Number.isNaN(parsedMaxAmount)) {
      // Allow amplification (>1) and disable negatives
      this.maxAmount = Math.max(0, parsedMaxAmount);
    }
  }

  private createColumns(): void {
    if (!this.letterElement) return;
    const originalContent = this.letterElement.textContent;

    this.letterElement.innerHTML = '';
    this.letterElement.style.position = 'relative';
    this.letterElement.style.display = 'flex';
    this.letterElement.style.width = '100%';
    this.letterElement.style.height = '100%';
    this.letterElement.style.alignItems = 'center';
    this.letterElement.style.justifyContent = 'center';

    for (let i = 0; i < this.columnCount; i++) {
      const column = document.createElement('div');
      column.style.position = 'relative';
      column.style.width = `${100 / this.columnCount}%`;
      column.style.height = '100%';
      column.style.display = 'flex';
      column.style.alignItems = 'center';
      column.style.justifyContent = 'center';
      column.style.overflow = 'hidden';
      column.style.setProperty('--slice-index', String(i));

      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.top = '0';
      wrapper.style.left = '0';
      wrapper.style.width = `${this.columnCount * 100}%`;
      wrapper.style.height = '100%';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.willChange = 'transform';
      // Set the actual slice count and max amount as CSS variables for the transform calculation
      wrapper.style.setProperty('--actual-slices', String(this.columnCount));
      wrapper.style.setProperty('--max-amount', String(this.maxAmount));
      // Translate each slice from assembled to centered layout based on progress
      wrapper.style.transform =
        'translateX(calc(-100% * ( ((1 - (var(--effect-progress-abs, 0) * var(--max-amount, 1))) * (var(--slice-index) / var(--actual-slices))) + ((var(--effect-progress-abs, 0) * var(--max-amount, 1)) * (0.5 - (0.5 / var(--actual-slices)))) )))';

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
      column.appendChild(wrapper);
      this.letterElement.appendChild(column);
      this.columns.push(column);
    }
  }
}

export function createVerticalSlicesEffect(section: HTMLElement): SectionEffect {
  const effect = new VerticalSlicesEffect(section);
  effect.init();
  return effect;
}


