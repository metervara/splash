import type { SectionEffect } from './types';

export class ConcentricCirclesEffect implements SectionEffect {
  private readonly section: HTMLElement;
  private readonly letterElement: HTMLElement | null;
  private circles: HTMLElement[] = [];
  private circleCount: number = 8;
  private maxRadius: number = 0;

  constructor(section: HTMLElement) {
    this.section = section;
    this.letterElement = section.querySelector('.letter');
  }

  init(): void {
    if (!this.letterElement) return;
    this.readConfigFromCSS();
    this.calculateMaxRadius();
    this.createCircles();
  }

  update(normalizedOffset: number): void {
    // Use signed offset for rotation direction, absolute for scaling
    const progressAbs = Math.min(1, Math.abs(normalizedOffset));
    const progressSigned = normalizedOffset; // Keep sign for rotation direction
    
    this.section.style.setProperty('--effect-progress-abs', `${progressAbs}`);
    this.section.style.setProperty('--effect-progress-signed', `${progressSigned}`);
  }

  destroy(): void {
    if (!this.letterElement) return;
    this.letterElement.innerHTML = '';
    this.circles = [];
  }

  private readConfigFromCSS(): void {
    const styles = getComputedStyle(this.section);
    const circlesVar = styles.getPropertyValue('--circles').trim();
    const parsedCircles = parseInt(circlesVar || '', 10);
    if (!Number.isNaN(parsedCircles) && parsedCircles > 1) {
      this.circleCount = parsedCircles;
    }
  }

  private calculateMaxRadius(): void {
    // Calculate diagonal of viewport and use half as max radius
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const diagonal = Math.sqrt(viewportWidth * viewportWidth + viewportHeight * viewportHeight);
    this.maxRadius = diagonal / 2;
  }

  private createCircles(): void {
    if (!this.letterElement) return;
    const originalContent = this.letterElement.textContent;

    this.letterElement.innerHTML = '';
    this.letterElement.style.position = 'relative';
    this.letterElement.style.display = 'flex';
    this.letterElement.style.width = '100%';
    this.letterElement.style.height = '100%';
    this.letterElement.style.alignItems = 'center';
    this.letterElement.style.justifyContent = 'center';
    this.letterElement.style.overflow = 'hidden';

    // Create circles from largest (back) to smallest (front)
    for (let i = 0; i < this.circleCount; i++) {
      const circle = document.createElement('div');
      const radius = (this.maxRadius * (this.circleCount - i)) / this.circleCount;
      const diameter = radius * 2;
      
      circle.style.position = 'absolute';
      circle.style.top = '50%';
      circle.style.left = '50%';
      circle.style.width = `${diameter}px`;
      circle.style.height = `${diameter}px`;
      circle.style.transform = 'translate(-50%, -50%)';
      circle.style.borderRadius = '50%';
      circle.style.overflow = 'hidden';
      circle.style.display = 'flex';
      circle.style.alignItems = 'center';
      circle.style.justifyContent = 'center';
      circle.style.willChange = 'transform';
      // circle.style.border = '1px solid black';
      
      // Set circle index for CSS calculations (0 = outermost, circleCount-1 = innermost)
      circle.style.setProperty('--circle-index', String(i));
      circle.style.setProperty('--circle-count', String(this.circleCount));
      
      // Create content wrapper for transforms
      const contentWrapper = document.createElement('div');
      contentWrapper.style.position = 'relative';
      contentWrapper.style.width = '100%';
      contentWrapper.style.height = '100%';
      contentWrapper.style.display = 'flex';
      contentWrapper.style.alignItems = 'center';
      contentWrapper.style.justifyContent = 'center';
      contentWrapper.style.willChange = 'transform';
      // Inherit background color from main element's animated class system
      contentWrapper.style.backgroundColor = 'var(--letter-0-bg)';
      
      // Transform: scale and rotate based on circle index and effect progress
      // Outer circles (lower index) scale more and rotate more
      // Progress 0 = normal, Progress 1 = maximum distortion
      // Use signed progress for rotation direction
      contentWrapper.style.transform = `
        scale(calc(1 + var(--effect-progress-abs, 0) * (1 + (var(--circle-count) - var(--circle-index) - 1) * 0.2))) 
        rotate(calc(var(--effect-progress-signed, 0) * 180deg * (var(--circle-count) - var(--circle-index) - 1) / (var(--circle-count) - 1)))
      `;

      // Create content element
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

      contentWrapper.appendChild(content);
      circle.appendChild(contentWrapper);
      this.letterElement.appendChild(circle);
      this.circles.push(circle);
    }
  }
}

export function createConcentricCirclesEffect(section: HTMLElement): SectionEffect {
  const effect = new ConcentricCirclesEffect(section);
  effect.init();
  return effect;
}
