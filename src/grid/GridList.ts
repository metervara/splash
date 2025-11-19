import { findBestBlockSize } from './blockSize';
import type { GridConfig, GridItem, GridState } from './types';

export class GridList {
  private gridEl: HTMLElement;
  private headerEl: HTMLElement | null;
  private measureViewportEl: HTMLElement | null;

  private desiredBlockSize = { width: 400, height: 300 };
  private gap = 10;

  private fadeOutDurationMs = 200;

  private staggerStepMs = 75;
  private fadeStaggerStepMs = 50;

  private initialResizeDelayFrames = 2;
  private initialScrollDelayMs = 1750;
  private filterScrollDelayMs = 400;

  private items: GridItem[] = [];
  private allTags: string[] = [];
  private activeTags = new Set<string>();
  private tagChipsEl: HTMLDivElement | null = null;

  private hasDoneInitialScrollUpdate = false;
  private hasDoneInitialResize = false;
  private resizeDebounceTimer: number | null = null;
  private fadeOutTimer: number | null = null;
  private headerZIndexRaised = false;
  private headerRaiseTimer: number | null = null;

  private state!: GridState;
  private headerRowIndex = 0;

  constructor(config: GridConfig) {
    this.gridEl = config.gridEl;
    this.headerEl = config.headerEl ?? null;
    this.measureViewportEl = config.measureViewportEl ?? null;

    if (config.desiredBlockSize) this.desiredBlockSize = config.desiredBlockSize;
    if (typeof config.gap === 'number') this.gap = config.gap;

    if (typeof config.fadeOutDurationMs === 'number') this.fadeOutDurationMs = config.fadeOutDurationMs;

    if (typeof config.staggerStepMs === 'number') this.staggerStepMs = config.staggerStepMs;
    if (typeof config.fadeStaggerStepMs === 'number') this.fadeStaggerStepMs = config.fadeStaggerStepMs;

    if (typeof config.initialResizeDelayFrames === 'number') this.initialResizeDelayFrames = config.initialResizeDelayFrames;
    if (typeof config.initialScrollDelayMs === 'number') this.initialScrollDelayMs = config.initialScrollDelayMs;
    if (typeof config.filterScrollDelayMs === 'number') this.filterScrollDelayMs = config.filterScrollDelayMs;
  }

  setItems(items: GridItem[]) {
    this.items = items;
    this.allTags = Array.from(new Set(this.items.flatMap(i => i.tags || []))).sort((a, b) => a.localeCompare(b));
    this.initFromUrl();
    this.renderTagChips();
    this.delayFrames(this.initialResizeDelayFrames, () => this.onResizeImmediate());
    window.setTimeout(() => this.onScroll(), this.initialScrollDelayMs);
  }

  init() {
    // Ensure header has a tag chips container
    if (this.headerEl) {
      this.tagChipsEl = document.createElement('div');
      this.tagChipsEl.className = 'tags';
      this.headerEl.appendChild(this.tagChipsEl);
    }

    // Set CSS variables that must be in sync with JS
    this.syncCssVars();

    // Listeners
    this.gridEl.addEventListener('scroll', () => this.onScroll(), { passive: true });
    window.addEventListener('resize', () => this.onWindowResize());
  }

  destroy() {
    this.gridEl.removeEventListener('scroll', () => this.onScroll());
    window.removeEventListener('resize', () => this.onWindowResize());
  }

  // -------------------------
  // Internals
  // -------------------------
  private syncCssVars() {
    const root = document.documentElement.style;
    root.setProperty('--block-gap', `${this.gap}px`);
    root.setProperty('--fade-out-duration', `${this.fadeOutDurationMs}ms`);
    // Start header fade-in slightly before initial scroll triggers
    const headerFadeLeadMs = 250;
    const headerFadeDelayMs = Math.max(0, this.initialScrollDelayMs - headerFadeLeadMs);
    root.setProperty('--header-fade-delay', `${headerFadeDelayMs}ms`);
  }

  private delayFrames(frames: number, callback: () => void) {
    if (frames <= 0) {
      callback();
      return;
    }
    requestAnimationFrame(() => this.delayFrames(frames - 1, callback));
  }

  private setLayout(width: number, height: number) {
    this.state = findBestBlockSize(width, height, this.desiredBlockSize.width, this.desiredBlockSize.height, this.gap);
    this.headerRowIndex = 1;
    const root = document.documentElement.style;
    root.setProperty('--block-width', `${this.state.width}px`);
    root.setProperty('--block-height', `${this.state.height}px`);
    root.setProperty('--cols', String(this.state.cols));
    root.setProperty('--rows', String(this.state.rows));
    root.setProperty('--block-gap', `${this.gap}px`);
    root.setProperty('--header-row', `${this.headerRowIndex}`);
  }

  private rebuildGrid() {
    if (!this.state) return;
    this.gridEl.innerHTML = '';
    const spacerBlock = document.createElement('div');
    spacerBlock.className = 'row-spacer col-0';
    this.gridEl.appendChild(spacerBlock);

    const filtered = this.items.filter(i => {
      if (this.activeTags.size === 0) return true;
      const tags = i.tags || [];
      return tags.some(t => this.activeTags.has(t));
    });

    filtered.forEach((item, index) => {
      const row = Math.floor(index / this.state.cols);
      const column = index % this.state.cols;
      const card = this.createCard(item);
      card.dataset.row = `${row}`;
      card.dataset.column = `${column}`;
      card.classList.add(`row-${row}`);
      card.classList.add(`col-${column}`);

      const isEvenRow = (row % 2) === 0;
      const delayIndex = isEvenRow ? column : (this.state.cols - 1 - column);
      const transformDelayMs = delayIndex * this.staggerStepMs;
      const fadeDelayMs = index * this.fadeStaggerStepMs;
      card.style.transitionDelay = `${transformDelayMs}ms`;
      card.style.setProperty('--fade-delay', `${fadeDelayMs}ms`);
      card.classList.add('fade-in');
      this.gridEl.appendChild(card);
    });
  }

  private createCard(item: GridItem): HTMLDivElement {
    const title = item.title;
    const thumbnails = Array.isArray(item.thumbnails) ? item.thumbnails : [];
    const primaryThumb = thumbnails[0];
    const tags = (item.tags || []).sort((a, b) => a.localeCompare(b));
    const card = document.createElement('div');
    card.className = 'block';
    card.innerHTML = `
      ${primaryThumb ? `<div class="media"><img class="thumb" src="${primaryThumb}" alt="${title}"></div>` : ''}
      <div class="content block-border">
        <div class="info">
          <h3>${title}</h3>
        </div>
        <div class="tags">
          ${tags.map(t => `<button class="tag${this.activeTags.has(t) ? ' active' : ''}" data-tag="${t}">${t}</button>`).join('')}
        </div>
      </div>
      <svg class="checker-border" xmlns="http://www.w3.org/2000/svg">
        <rect class="dash black" />
        <rect class="dash white" />
      </svg>
    `;
    if (item.href) {
      card.addEventListener('click', () => {
        window.location.href = item.href!;
      });
    }
    card.querySelectorAll<HTMLButtonElement>('.tag').forEach(tEl => {
      tEl.addEventListener('click', (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        const tag = tEl.getAttribute('data-tag');
        if (tag) this.toggleTag(tag);
      });
    });
    return card;
  }

  // -------------------------
  // Event handlers
  // -------------------------
  private onScroll() {
    this.updateAboveHeaderClasses();
    if (!this.hasDoneInitialScrollUpdate) {
      this.scheduleRaiseHeaderZIndexAfterStagger();
    }
    this.hasDoneInitialScrollUpdate = true;
  }

  private onResizeImmediate() {
    const rect = this.measureViewportEl?.getBoundingClientRect();
    if (!rect) {
      console.warn('[grid] measureViewport element not found');
      return;
    }

    // Pass 1: use viewport rect
    this.setLayout(rect.width, rect.height);
    this.rebuildGrid();
    if (this.hasDoneInitialScrollUpdate) this.updateAboveHeaderClasses();

    // Pass 2: recompute with client width if vertical scrollbar appears
    if (this.gridEl && this.gridEl.scrollHeight > this.gridEl.clientHeight) {
      this.setLayout(this.gridEl.clientWidth, rect.height);
      this.rebuildGrid();
      if (this.hasDoneInitialScrollUpdate) this.updateAboveHeaderClasses();
    }

    if (!this.hasDoneInitialResize) {
      this.hasDoneInitialResize = true;
      document.body.classList.add('layout-ready');
    }
  }

  private onWindowResize() {
    const rect = this.measureViewportEl?.getBoundingClientRect();
    if (!rect) return;

    this.setLayout(rect.width, rect.height);

    this.gridEl.innerHTML = '';
    const spacerBlock = document.createElement('div');
    spacerBlock.className = 'row-spacer col-0';
    this.gridEl.appendChild(spacerBlock);

    if (this.resizeDebounceTimer !== null) {
      window.clearTimeout(this.resizeDebounceTimer);
    }
    this.resizeDebounceTimer = window.setTimeout(() => {
      this.rebuildGrid();
      if (this.hasDoneInitialScrollUpdate) this.updateAboveHeaderClasses();
      if (this.gridEl && this.gridEl.scrollHeight > this.gridEl.clientHeight) {
        this.setLayout(this.gridEl.clientWidth, rect.height);
        this.rebuildGrid();
        if (this.hasDoneInitialScrollUpdate) this.updateAboveHeaderClasses();
      }
      this.resizeDebounceTimer = null;
    }, 400);
  }

  private updateAboveHeaderClasses() {
    if (!this.state) return;
    const rowSpan = this.state.height + this.gap;
    const scrolledRows = Math.round(this.gridEl.scrollTop / rowSpan);
    const headerAbsoluteRow = scrolledRows + this.headerRowIndex;
    const blocks = this.gridEl.querySelectorAll<HTMLDivElement>('.block');
    blocks.forEach(b => {
      const row = parseInt(b.dataset.row || '0', 10);
      if (row < headerAbsoluteRow) {
        b.classList.add('above-header');
      } else {
        b.classList.remove('above-header');
      }
    });
  }

  private scheduleRaiseHeaderZIndexAfterStagger() {
    if (!this.headerEl || !this.state || this.headerZIndexRaised) return;

    const firstRowBlocks = Array.from(this.gridEl.querySelectorAll<HTMLDivElement>('.row-0'));
    if (firstRowBlocks.length === 0) {
      this.headerEl.style.zIndex = '10';
      this.headerZIndexRaised = true;
      return;
    }

    const parseTimeMs = (val: string): number => {
      const v = val.trim();
      if (v.endsWith('ms')) return parseFloat(v);
      if (v.endsWith('s')) return parseFloat(v) * 1000;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };

    let maxFinishMs = 0;
    firstRowBlocks.forEach(b => {
      const cs = getComputedStyle(b);
      const delays = cs.transitionDelay.split(',').map(d => parseTimeMs(d));
      const durations = cs.transitionDuration.split(',').map(d => parseTimeMs(d));
      const count = Math.max(delays.length, durations.length);
      for (let i = 0; i < count; i++) {
        const dly = delays[i % delays.length] || 0;
        const dur = durations[i % durations.length] || 0;
        const total = dly + dur;
        if (total > maxFinishMs) maxFinishMs = total;
      }
    });

    const totalWait = Math.max(0, Math.round(maxFinishMs + 20));
    if (this.headerRaiseTimer !== null) window.clearTimeout(this.headerRaiseTimer);
    this.headerRaiseTimer = window.setTimeout(() => {
      this.headerEl!.style.zIndex = '10';
      this.headerZIndexRaised = true;
      this.headerRaiseTimer = null;
    }, totalWait);
  }

  // -------------------------
  // Tags & URL
  // -------------------------
  private renderTagChips() {
    if (!this.tagChipsEl) return;
    this.tagChipsEl.innerHTML = '';
    this.allTags.forEach(tag => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'tag';
      chip.textContent = tag;
      chip.dataset.tag = tag;
      if (this.activeTags.has(tag)) chip.classList.add('active');
      chip.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.toggleTag(tag);
      });
      this.tagChipsEl!.appendChild(chip);
    });
  }

  private toggleTag(tag: string) {
    if (this.activeTags.has(tag)) this.activeTags.delete(tag);
    else this.activeTags.add(tag);
    this.renderTagChips();
    this.hasDoneInitialScrollUpdate = false;
    this.fadeOutBlocksThen(() => this.onResizeImmediate());
    window.setTimeout(() => this.onScroll(), this.filterScrollDelayMs);
    this.syncUrl();
  }

  private fadeOutBlocksThen(callback: () => void) {
    const blocks = Array.from(this.gridEl.querySelectorAll<HTMLDivElement>('.block'));
    if (blocks.length === 0) { callback(); return; }

    if (this.fadeOutTimer !== null) {
      window.clearTimeout(this.fadeOutTimer);
      this.fadeOutTimer = null;
    }

    let maxDelay = 0;
    blocks.forEach(b => {
      const row = parseInt(b.dataset.row || '0', 10);
      const col = parseInt(b.dataset.column || '0', 10);
      const isEvenRow = (row % 2) === 0;
      const delayIndex = isEvenRow ? col : (this.state.cols - 1 - col);
      const fadeDelayMs = delayIndex * this.fadeStaggerStepMs;
      b.style.setProperty('--fade-delay', `${fadeDelayMs}ms`);
      b.classList.add('fade-out');
      if (fadeDelayMs > maxDelay) maxDelay = fadeDelayMs;
    });

    const total = maxDelay + this.fadeOutDurationMs + 20;
    this.fadeOutTimer = window.setTimeout(() => {
      this.fadeOutTimer = null;
      callback();
    }, total);
  }

  private syncUrl() {
    const params = new URLSearchParams(location.search);
    const tags = Array.from(this.activeTags);
    if (tags.length) params.set('tags', tags.join(','));
    else params.delete('tags');
    const query = params.toString();
    const url = query ? `${location.pathname}?${query}` : location.pathname;
    history.pushState(null, '', url);
  }

  private initFromUrl() {
    this.activeTags.clear();
    const params = new URLSearchParams(location.search);
    const tags = params.get('tags');
    if (tags) tags.split(',').filter(Boolean).forEach(t => this.activeTags.add(t));

    // Keep UI in sync when navigating with browser back/forward
    window.addEventListener('popstate', () => {
      this.initFromUrl();
      this.renderTagChips();
      this.fadeOutBlocksThen(() => this.onResizeImmediate());
    });
  }
}


