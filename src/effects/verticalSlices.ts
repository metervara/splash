import type { SectionEffect } from './types';

// A generalized version of the previous Letter5Effect that can target any section
export class VerticalSlicesEffect implements SectionEffect {
  private readonly section: HTMLElement;
  private readonly letterElement: HTMLElement | null;
  private columns: HTMLElement[] = [];
  private columnCount: number = 19;
  private maxOffset: number = 0.5;

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
    const dataMaxOffset = this.section.getAttribute('data-max-offset');
    
    const styles = getComputedStyle(this.section);
    const genericSlices = styles.getPropertyValue('--slices').trim();
    const legacySlices = styles.getPropertyValue('--letter-5-slices').trim();
    
    const slicesValue = dataSlices || genericSlices || legacySlices;
    const parsedSlices = parseInt(slicesValue || '', 10);
    if (!Number.isNaN(parsedSlices) && parsedSlices > 1) {
      this.columnCount = parsedSlices;
    }
    
    const parsedMaxOffset = parseFloat(dataMaxOffset || '');
    if (!Number.isNaN(parsedMaxOffset) && parsedMaxOffset > 0) {
      this.maxOffset = parsedMaxOffset;
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
      // Set the actual slice count and max offset as CSS variables for the transform calculation
      wrapper.style.setProperty('--actual-slices', String(this.columnCount));
      wrapper.style.setProperty('--max-offset', String(this.maxOffset));
      // Keep compatibility with existing CSS variables: --letter-5-dir
      wrapper.style.transform =
        'translateX(calc(var(--letter-5-dir, 1) * -100% * ( ((1 - var(--effect-progress-abs, 0)) * (var(--slice-index) / var(--actual-slices))) + (var(--effect-progress-abs, 0) * (0.5 - (0.5 / var(--actual-slices)))) )))';

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


