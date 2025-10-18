// Scroll listener to track active letter and update main element class
class LetterTracker {
  private mainElement: HTMLElement;
  private sections: HTMLElement[];
  private currentActiveIndex: number = -1;

  constructor() {
    this.mainElement = document.querySelector('main')!;
    this.sections = Array.from(document.querySelectorAll('section'));
    
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
    
    // Set initial active state after a small delay to ensure DOM is ready
    setTimeout(() => {
      this.updateActiveLetter(0);
    }, 0);
  }

  private handleScroll(): void {
    const scrollY = window.scrollY;
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
