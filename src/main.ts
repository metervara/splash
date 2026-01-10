
import { GridList, GridItem } from './grid';
import './grid/grid.css';

type ManifestEntry = {
  href: string;
  title?: string;
  description?: string;
  tags?: string[];
  thumbnails?: string[];
  group?: string;
};

let manifest: ManifestEntry[] = [];

const loadManifest = async (): Promise<ManifestEntry[]> => {
	try {
		const res = await fetch('/splash-manifest.json', { cache: 'no-store' });
		if (!res.ok) return [];
		return await res.json();
	} catch {
		return [];
	}
};

const onDomReady = () => {
  
  const gridEl = document.getElementById('grid') as HTMLElement;
  const headerEl = document.getElementById('header') as HTMLElement | null;
  const measureViewportEl = document.getElementById('measure-viewport') as HTMLElement;

  const grid = new GridList({
    gridEl,
    headerEl,                 // pass null/omit to hide tag chips
    measureViewportEl,

    // Optional config (defaults shown)
    desiredBlockSize: { width: 400, height: 300 },
    gap: 10,
    fadeOutDurationMs: 200,   // used for JS fade-out timing
    staggerStepMs: 75,
    fadeStaggerStepMs: 50,
    initialResizeDelayFrames: 2,
    initialScrollDelayMs: 1750,
    filterScrollDelayMs: 400
  });

  grid.init();
  grid.setItems(manifest.map(item => ({
    id: undefined,
    title: item.title, /* || getDisplayName(item.href), */
    description: item.description,
    tags: item.tags,
    thumbnails: item.thumbnails,
    href: item.href,
    group: item.group
  } as GridItem)));
};

(async () => {

  manifest = await loadManifest();
  // console.log('Init Metervara sketches listing', manifest);

  onDomReady();

})();
