import { createGridList, type GridItem } from '@metervara/grid-listing';
import '@metervara/grid-listing/styles';
import manifest from 'virtual:grid-manifest';

const gridEl = document.getElementById('grid') as HTMLElement;
// const headerEl = document.getElementById('header') as HTMLElement | null;

const infoContainerEl = document.getElementById('info-container')!;
const measureViewportEl = document.getElementById('measure-viewport') as HTMLElement;

let infoContainerBlocks: HTMLDivElement[] = [];
const gap = 10;

const items: GridItem[] = manifest.items.map((item) => ({
  id: item.name,
  title: item.title ?? '',
  description: item.description,
  short: item.short,
  tags: item.tags,
  thumbnail: item.thumbnail ? `/${item.thumbnail}` : undefined,
  href: item.href,
  group: item.group
}));

const grid = createGridList({
  gridEl,
  measureViewportEl,
  desiredBlockSize: { width: 400, height: 300 },
  gap,
  fadeOutDurationMs: 200,
  staggerStepMs: 75,
  fadeStaggerStepMs: 50,
  initialResizeDelayFrames: 2,
  initialScrollDelayMs: 1750,
  additionalSpacerRows: true,
});

const getActiveItems = (aboveHeader: number | undefined, belowHeader: number | undefined) => {
  const layout = grid.getLayout();
  return items.filter((_item, index) => {
    const row = Math.floor(index / layout.cols);
    return row === aboveHeader || row === belowHeader;
  });
};

const showInfoAfterPaint = () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => infoContainerEl.classList.add('show-info'));
  });
};

const updateInfoBlockContent = (items: GridItem[]) => {
  console.log("UPDATE BLOCK CONTENT");
  // console.log(`update info for active items: "${items.map((item) => item.title).join(", ")}"`);

  infoContainerBlocks.forEach((block, index) => {
    block.innerHTML = '';
    const topIndex = index;
    const bottomIndex = index + grid.getLayout().cols;
    if(topIndex < items.length) {
      const topItem = items[topIndex];
      block.appendChild(createInfoItem(topItem, topIndex, 'top'));
    }
    if(bottomIndex < items.length) {
      const bottomItem = items[bottomIndex];
      block.appendChild(createInfoItem(bottomItem, topIndex, 'bottom'));
    }
  });
}

const createInfoItem = (item: GridItem, index: number, classNames: string = '') => {
  const itemEl = document.createElement('div');
  itemEl.className = `info-item ${classNames}`;
  itemEl.style.setProperty('--info-item-in-delay', `${index * 75}ms`);
  itemEl.innerHTML = `<span>${index + 1}/${items.length}</span> • <strong>${item.title}</strong> • <span>${item.short}</span>`;
  return itemEl;
}

/**
 * Event listeners for the grid listing
 */
grid.events.on("scroll:start", () => {
  console.log("Scrolling started, CLEAR BLOCKS");
  infoContainerEl.classList.remove('show-info');
});

grid.events.on("grid:clear", () => {
  console.log("Grid clear, CLEAR BLOCKS");
  infoContainerEl.classList.remove('show-info');
});

grid.events.on("grid:rebuild", (state) => {
  // console.log("Grid rebuild", state);
});

grid.events.on("grid:layout:change", ({cols, rows}) => {
  // console.log("Grid layout change", cols, rows);
  console.log("Grid layout change, CLEAR BLOCKS");
  infoContainerBlocks.forEach(block => {
    block.remove();
  });
  infoContainerBlocks = [];
  infoContainerEl.innerHTML = '';

  for(let i = 0; i < cols; i++) {
    const block = document.createElement('div');
    block.className = 'block';
    infoContainerBlocks.push(block);
    infoContainerEl.appendChild(block);
  }
});

grid.events.on("scroll:start", () => {
  // console.log("Scrolling started - Hide descriptions");
});

grid.events.on("scroll:end", ({ aboveHeader, belowHeader }) => {
  console.log("Scrolling ended");
  
  const state = grid.getLayout();
  const snap = state.height + gap;
  const scrollTop = gridEl.scrollTop;

  const ratio = scrollTop / snap;
  const fractional = Math.abs(ratio - Math.round(ratio));

  const EPSILON = 0.01; // ratio-based tolerance (~1% of a snap)
  const scrollIsAlignedToGrid = fractional < EPSILON;

  if(scrollIsAlignedToGrid) {
    const activeItems = getActiveItems(aboveHeader, belowHeader);
    updateInfoBlockContent(activeItems);
    showInfoAfterPaint();
  }
});

grid.events.on("initial:scroll:end", ({ aboveHeader, belowHeader }) => {
  console.log("Initial scroll ended");

  const activeItems = getActiveItems(aboveHeader, belowHeader);
  updateInfoBlockContent(activeItems);
  showInfoAfterPaint();
});

grid.init();

//
grid.setItems(items.map(({title, ...rest}) => rest));
