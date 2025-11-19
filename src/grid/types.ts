export type GridItem = {
  id?: string;
  title: string;
  description?: string;
  tags?: string[];
  thumbnails?: string[]; // full or relative URLs
  href?: string; // if provided, clicking the card navigates here
  group?: string;
};

export type GridConfig = {
  gridEl: HTMLElement;
  headerEl?: HTMLElement | null;
  measureViewportEl?: HTMLElement | null;

  // Layout
  desiredBlockSize?: { width: number; height: number };
  gap?: number;

  // Timing that must be shared between JS and CSS
  // Keep this here only if also used in JS timings.
  fadeOutDurationMs?: number; // maps to --fade-out-duration

  // Staggers
  staggerStepMs?: number; // transform stagger between columns
  fadeStaggerStepMs?: number; // fade stagger between items

  // Init delays
  initialResizeDelayFrames?: number;
  initialScrollDelayMs?: number;
  filterScrollDelayMs?: number;
};

export type GridState = {
  cols: number;
  rows: number;
  width: number;
  height: number;
};


