import { createGridList, type GridItem } from '@metervara/grid-listing';
import '@metervara/grid-listing/styles';
import manifest from 'virtual:grid-manifest';

const gridEl = document.getElementById('grid') as HTMLElement;
// const headerEl = document.getElementById('header') as HTMLElement | null;
const measureViewportEl = document.getElementById('measure-viewport') as HTMLElement;

const grid = createGridList({
  gridEl,
  measureViewportEl,
  desiredBlockSize: { width: 400, height: 300 },
  gap: 10,
  fadeOutDurationMs: 200,
  staggerStepMs: 75,
  fadeStaggerStepMs: 50,
  initialResizeDelayFrames: 2,
  initialScrollDelayMs: 1750,
});

grid.init();
grid.setItems(manifest.items.map(item => ({
  id: item.name,
  title: item.title,
  description: item.description,
  tags: item.tags,
  thumbnails: item.thumbnail ? [`/${item.thumbnail}`] : undefined,
  href: item.href,
  group: item.group
} as GridItem)));
