import { isVisited, markVisited, selectRandom } from './shared/utils';
type ManifestEntry = string | { href: string; title?: string };

async function loadManifest(): Promise<ManifestEntry[]> {
	try {
		const res = await fetch('/splash-manifest.json', { cache: 'no-store' });
		if (!res.ok) return [];
		return await res.json();
	} catch {
		return [];
	}
}

function toHref(entry: ManifestEntry): string {
	return typeof entry === 'string' ? entry : entry.href;
}

function toTitle(entry: ManifestEntry): string {
	if (typeof entry === 'string') return getDisplayName(entry);
	if (entry.title && entry.title.trim().length > 0) return entry.title;
	return getDisplayName(entry.href);
}

function getDisplayName(path: string): string {
    const base = path.replace(/^\/+/, '').replace(/\.html$/, '').replace(/\/$/, '');
    return base;
}

async function loadRandomCover(): Promise<void> {
    const items = await loadManifest();
    if (items.length === 0) return;
    
    const chosenItem = selectRandom(items);
    if (!chosenItem) return;
    
    const href = toHref(chosenItem);
    if (href) {
        markVisited(href);
        window.location.href = href;
    }
}

(async () => {
    const pageEl = document.getElementById('page');
    if (!pageEl) return;

  // visited-links are handled via shared utils

    const items = await loadManifest();

    // Update H1 with total count of covers
    const h1 = document.querySelector('h1');
    if (h1) {
        const base = (h1.textContent ?? '').replace(/\s*\(\d+\)\s*$/, '');
        h1.textContent = `${base} (${items.length})`;
    }

    if (items.length === 0) return;

    const ul = pageEl as HTMLUListElement;
    
		// const countLi = document.createElement('li');
    // countLi.textContent = `Count: ${items.length}`;
    // ul.appendChild(countLi);

	for (let i = 0; i < items.length; i++) {
		const entry = items[i];
		const href = toHref(entry);
		const title = toTitle(entry);
		const li = document.createElement('li');
		const a = document.createElement('a');
		a.href = href;
		a.textContent = `#${i + 1}: ${title}`;
	    if (isVisited(href)) a.classList.add('is-visited');
	    a.addEventListener('click', () => {
	      markVisited(href);
	      a.classList.add('is-visited');
	    }, { passive: true });
		li.appendChild(a);
		ul.appendChild(li);
	}

	// Append final text after all items
	const endLi = document.createElement('li');
	const em = document.createElement('em');
	em.textContent = 'The covers are small experiments of things that I find interesting at the moment.';
	endLi.classList.add('end-text');
	endLi.appendChild(em);
	ul.appendChild(endLi);

	// Set up randomize link
	const randomizeLink = document.querySelector('a.nav-link');
	if (randomizeLink) {
		randomizeLink.addEventListener('click', async (e) => {
			e.preventDefault();
			await loadRandomCover();
		});
	}
})();
