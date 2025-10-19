import type { SectionEffect } from './types';

// A generalized version of the previous Letter5Effect that can target any section
export class VerticalSlicesEffect implements SectionEffect {
  private readonly section: HTMLElement;
  private readonly letterElement: HTMLElement | null;
  private columns: HTMLElement[] = [];
  private columnCount: number = 19;

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
    const styles = getComputedStyle(this.section);
    // Prefer a generic --slices, fall back to legacy --letter-5-slices for compatibility
    const genericSlices = styles.getPropertyValue('--slices').trim();
    const legacySlices = styles.getPropertyValue('--letter-5-slices').trim();
    const value = genericSlices || legacySlices;
    const parsedSlices = parseInt(value || '', 10);
    if (!Number.isNaN(parsedSlices) && parsedSlices > 1) {
      this.columnCount = parsedSlices;
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
      // Keep compatibility with existing CSS variables: --letter-5-dir and --letter-5-slices
      wrapper.style.transform =
        'translateX(calc(var(--letter-5-dir, 1) * -100% * ( ((1 - var(--effect-progress-abs, 0)) * (var(--slice-index) / var(--letter-5-slices, var(--slices)))) + (var(--effect-progress-abs, 0) * (0.5 - (0.5 / var(--letter-5-slices, var(--slices))))) )))';

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


