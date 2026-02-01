import { createGridList, type GridItem } from '@metervara/grid-listing';
import '@metervara/grid-listing/styles';
import manifest from 'virtual:grid-manifest';

const gridEl = document.getElementById('grid') as HTMLElement;
// const headerEl = document.getElementById('header') as HTMLElement | null;
const measureViewportEl = document.getElementById('measure-viewport') as HTMLElement;

const items: GridItem[] = manifest.items.map((item) => ({
  id: item.name,
  title: item.title ?? '',
  description: item.description,
  tags: item.tags,
  thumbnail: item.thumbnail ? `/${item.thumbnail}` : undefined,
  href: item.href,
  group: item.group
}));

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
  additionalSpacerRows: true,
});

const getActiveItems = (aboveHeader: number | undefined, belowHeader: number | undefined) => {
  const layout = grid.getLayout();
  return items.filter((_item, index) => {
    const row = Math.floor(index / layout.cols);
    return row === aboveHeader || row === belowHeader;
  });
};

grid.events.on("scroll:start", () => {
  console.log("Scrolling started - Hide descriptions");
});
grid.events.on("scroll:end", ({ aboveHeader, belowHeader }) => {
  console.log("Scrolling ended - Show descriptions");

  const activeItems = getActiveItems(aboveHeader, belowHeader);
  console.log(`Active items: "${activeItems.map((item) => item.title).join(", ")}"`);
});

grid.events.on("initial:scroll:end", ({ aboveHeader, belowHeader }) => {
  console.log("Initial scroll ended - Show descriptions");

  const activeItems = getActiveItems(aboveHeader, belowHeader);
  console.log(`Active items: "${activeItems.map((item) => item.title).join(", ")}"`);
});

grid.init();

//
grid.setItems(items.map(({title, ...rest}) => rest));
