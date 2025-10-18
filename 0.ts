/**
 * 
 * Each letter has  a different effect (kinetic typography)
 * 
 * 
 */

// Easing function for smooth transitions near center
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Viewport optimization system
class ViewportOptimizer {
  private activeEffects: Set<HTMLElement> = new Set();

  constructor() {
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver(): void {
    const options = {
      root: null,
      rootMargin: '50% 0px', // Start effect when section is 50% visible
      threshold: [0, 0.1, 0.5, 1]
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.activeEffects.add(entry.target as HTMLElement);
        } else {
          this.activeEffects.delete(entry.target as HTMLElement);
        }
      });
    }, options);

    // Observe all sections
    document.querySelectorAll('section').forEach(section => {
      observer.observe(section);
    });
  }

  isEffectActive(element: HTMLElement): boolean {
    return this.activeEffects.has(element);
  }
}

// Letter-5 (V) vertical column effect
class Letter5Effect {
  private section: HTMLElement;
  private letterElement: HTMLElement;
  private columns: HTMLElement[] = [];
  private columnCount: number = 19;
  private viewportOptimizer: ViewportOptimizer;

  constructor(section: HTMLElement, viewportOptimizer: ViewportOptimizer) {
    this.section = section;
    this.letterElement = section.querySelector('.letter')!;
    this.viewportOptimizer = viewportOptimizer;
    
    if (!this.letterElement) {
      console.error('Letter element not found in section');
      return;
    }

    this.init();
  }

  private init(): void {
    this.readConfigFromCSS();
    this.createColumns();
    this.setupScrollListener();
  }

  private readConfigFromCSS(): void {
    const styles = getComputedStyle(this.section);
    const slicesVar = styles.getPropertyValue('--letter-5-slices').trim();

    const parsedSlices = parseInt(slicesVar || '', 10);
    if (!Number.isNaN(parsedSlices) && parsedSlices > 1) {
      this.columnCount = parsedSlices;
    }
  }

  private createColumns(): void {
    // Store original content
    const originalContent = this.letterElement.textContent;
    
    // Clear the letter element and set up container
    this.letterElement.innerHTML = '';
    this.letterElement.style.position = 'relative';
    this.letterElement.style.display = 'flex';
    this.letterElement.style.width = '100%';
    this.letterElement.style.height = '100%';
    this.letterElement.style.alignItems = 'center';
    this.letterElement.style.justifyContent = 'center';

    // Create columns with improved structure
    for (let i = 0; i < this.columnCount; i++) {
      const column = document.createElement('div');
      column.style.position = 'relative';
      column.style.width = `${100 / this.columnCount}%`;
      column.style.height = '100%';
      column.style.display = 'flex';
      column.style.alignItems = 'center';
      column.style.justifyContent = 'center';
      column.style.overflow = 'hidden';
      column.style.willChange = 'transform';
      column.style.transform = 'translateY(calc(var(--effect-progress, 0) * var(--letter-5-v-offset) * var(--slice-weight)))';

      // Per-slice weight (0 at center, 1 at edges), mirrored
      const mid = (this.columnCount - 1) / 2;
      const sliceWeight = Math.abs((i - mid) / mid);
      column.style.setProperty('--slice-weight', String(sliceWeight));
      
      // Create wrapper that spans N× width to hold full content, then shift left by i*(100/N)%
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.top = '0';
      wrapper.style.left = '0';
      wrapper.style.width = `${this.columnCount * 100}%`;
      wrapper.style.height = '100%';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      // Shift wrapper left so that the i:th slice shows the correct vertical portion
      const shiftPercent = (100 / this.columnCount) * i;
      wrapper.style.transform = `translateX(-${shiftPercent}%)`;

      // Create content element (full letter) centered within wrapper
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

  private setupScrollListener(): void {
    const updateEffect = () => {
      if (!this.viewportOptimizer.isEffectActive(this.section)) {
        return;
      }

      const rect = this.section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const sectionCenter = rect.top + (rect.height / 2);
      const viewportCenter = windowHeight / 2;
      
      // Calculate offset from center (-1 to 1)
      const rawOffset = (sectionCenter - viewportCenter) / (windowHeight / 2);
      const clampedOffset = Math.max(-1, Math.min(1, rawOffset));
      
      // Apply easing to slow down near center
      const easedOffset = easeInOutCubic(Math.abs(clampedOffset)) * Math.sign(clampedOffset);

      // Set a single CSS variable on the section; columns use CSS calc with their --slice-weight
      this.section.style.setProperty('--effect-progress', `${easedOffset}`);
    };

    window.addEventListener('scroll', updateEffect);
    window.addEventListener('resize', updateEffect);
    
    // Initial update
    updateEffect();
  }
}

// Scroll listener to track active letter and update main element class
class LetterTracker {
  private mainElement: HTMLElement;
  private sections: HTMLElement[];
  private currentActiveIndex: number = -1;
  private viewportOptimizer: ViewportOptimizer;
  private letterEffects: Map<number, any> = new Map();

  constructor() {
    this.mainElement = document.querySelector('main')!;
    this.sections = Array.from(document.querySelectorAll('section'));
    this.viewportOptimizer = new ViewportOptimizer();
    
    if (!this.mainElement || this.sections.length === 0) {
      console.error('Required elements not found');
      return;
    }

    this.init();
  }

  private init(): void {
    // Add scroll listener
    window.addEventListener('scroll', this.handleScroll.bind(this));
    
    // Handle resize to recalculate on viewport changes
    window.addEventListener('resize', this.handleScroll.bind(this));
    
    // Initialize letter effects
    this.initializeLetterEffects();
    
    // Set initial active state after a small delay to ensure DOM is ready
    setTimeout(() => {
      this.updateActiveLetter(0);
    }, 0);
  }

  private initializeLetterEffects(): void {
    // Initialize letter-5 effect (V)
    const letter5Section = this.sections[5];
    if (letter5Section) {
      this.letterEffects.set(5, new Letter5Effect(letter5Section, this.viewportOptimizer));
    }
  }

  private handleScroll(): void {
    const windowHeight = window.innerHeight;
    
    // Find which section is most visible by checking which section's center is closest to viewport center
    let closestIndex = 0;
    let minDistance = Infinity;

    this.sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const sectionCenter = rect.top + (rect.height / 2);
      const viewportCenter = windowHeight / 2;
      
      // Calculate distance from section center to viewport center
      const distance = Math.abs(sectionCenter - viewportCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // Update active letter if it changed
    if (closestIndex !== this.currentActiveIndex) {
      this.updateActiveLetter(closestIndex);
    }
  }

  private updateActiveLetter(index: number): void {
    this.currentActiveIndex = index;
    
    // Remove all active classes
    this.mainElement.classList.remove('active-letter-0', 'active-letter-1', 'active-letter-2', 
                                    'active-letter-3', 'active-letter-4', 'active-letter-5', 
                                    'active-letter-6', 'active-letter-7', 'active-letter-8');
    
    // Add active class for current letter
    this.mainElement.classList.add(`active-letter-${index}`);
    
    // Optional: Log current active letter
    const letterElement = document.querySelector(`#letter-${index}`) as HTMLElement;
    if (letterElement) {
      // console.log(`Active letter: ${letterElement.textContent} (index: ${index})`);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new LetterTracker();
});
