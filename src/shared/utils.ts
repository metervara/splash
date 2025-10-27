export function selectRandom<T>(items: readonly T[]): T | undefined {
	if (!Array.isArray(items) || items.length === 0) return undefined;
	const index = Math.floor(Math.random() * items.length);
	return items[index];
}


// Visited links helpers
const VISITED_STORAGE_KEY = 'visited-links';

function readVisitedSet(): Set<string> {
	try {
		const raw = localStorage.getItem(VISITED_STORAGE_KEY);
		if (!raw) return new Set();
		const arr = JSON.parse(raw) as string[];
		return new Set(Array.isArray(arr) ? arr : []);
	} catch {
		return new Set();
	}
}

function writeVisitedSet(set: Set<string>): void {
	try {
		localStorage.setItem(VISITED_STORAGE_KEY, JSON.stringify([...set]));
	} catch {}
}

export function isVisited(href: string): boolean {
	if (typeof href !== 'string' || href.length === 0) return false;
	const set = readVisitedSet();
	return set.has(href);
}

export function markVisited(href: string): void {
	if (typeof href !== 'string' || href.length === 0) return;
	const set = readVisitedSet();
	set.add(href);
	writeVisitedSet(set);
}

type ManifestEntry = string | { href: string; title?: string };

function toHref(entry: ManifestEntry): string | null {
	if (typeof entry === 'string') return entry;
	if (entry && typeof entry.href === 'string') return entry.href;
	return null;
}

/** Initialize and inject the shared splash overlay using splash-manifest.json. */
export async function initSplashOverlay(): Promise<void> {
	// Remove any pre-existing overlay to ensure a single instance
	const existing = document.getElementById('splash-overlay');
	if (existing) existing.remove();

	const container = document.createElement('div');
	container.id = 'splash-overlay';
	container.className = 'overlay';
	container.style.display = 'flex';
	container.style.flexDirection = 'column';
	container.style.gap = '6px';

	const textBlock = document.createElement('div');
	textBlock.style.display = 'inline-flex';
	textBlock.style.alignItems = 'center';
	textBlock.style.gap = '6px';
	
	const firstRow = document.createElement('div');
	firstRow.style.display = 'inline-flex';
	firstRow.style.alignItems = 'center';
	firstRow.style.gap = '6px';

	const buttonsRow = document.createElement('div');
	buttonsRow.style.display = 'inline-flex';
	buttonsRow.style.alignItems = 'center';
	buttonsRow.style.gap = '6px';

	const randomLink = document.createElement('a');
	randomLink.textContent = 'Randomize';

	const prevLink = document.createElement('a');
	prevLink.textContent = '<';

	const nextLink = document.createElement('a');
	nextLink.textContent = '>';

	const listLink = document.createElement('a');
	listLink.textContent = 'list';
	listLink.href = '/';
	listLink.setAttribute('aria-label', 'List');

	try {
		const res = await fetch('/splash-manifest.json', { cache: 'no-store' });
		if (!res.ok) throw new Error(String(res.status));
		const manifestRaw = (await res.json()) as ManifestEntry[];
		const manifest = manifestRaw.map(toHref).filter((h): h is string => typeof h === 'string');
		const total = Array.isArray(manifest) ? manifest.length : 0;
		const path = window.location.pathname;
		function normalizeCandidates(p: string): string[] {
			const withoutIndex = p.replace(/index\.html$/i, '');
			const ensureSlash = withoutIndex.endsWith('/') ? withoutIndex : withoutIndex + '/';
			const noSlash = ensureSlash.replace(/\/$/, '');
			return [p, withoutIndex, ensureSlash, noSlash];
		}
		let idx = -1;
		const candidates = normalizeCandidates(path);
		for (const c of candidates) {
			const found = manifest.indexOf(c);
			if (found >= 0) { idx = found; break; }
		}

		const safeIdx = idx >= 0 ? idx : 0;
		const displayIndex = total > 0 ? safeIdx + 1 : 1;
		const totalDisplay = total > 0 ? total : 1;
		
		// Get the current entry's title
		const currentEntry = manifestRaw[safeIdx];
		const title = typeof currentEntry === 'object' && currentEntry.title ? currentEntry.title : '';
		
		// Create two-line layout: index on first line, title on second line
		textBlock.innerHTML = `<div>#${displayIndex} / ${totalDisplay}</div>${title ? `<div>${title}</div>` : ''}`;

		// Mark current splash as visited using canonical manifest href
		if (total > 0 && typeof manifest[safeIdx] === 'string') {
			markVisited(manifest[safeIdx]);
		}

		// Random: navigate directly to a random splash (excluding current)
		randomLink.href = '#';
		randomLink.setAttribute('aria-label', 'Random splash');
		randomLink.addEventListener('click', (e) => {
			e.preventDefault();
			if (!Array.isArray(manifest) || manifest.length === 0) return;
			const pool = manifest.map((_, i) => i).filter((i) => i !== safeIdx);
			const chosenIdx = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : safeIdx;
			const target = manifest[chosenIdx];
			if (typeof target === 'string' && target.length > 0) {
				window.location.href = target;
			}
		});

		// Prev/Next with wrap-around
		const prevIdx = total > 0 ? (safeIdx - 1 + total) % total : 0;
		const nextIdx = total > 0 ? (safeIdx + 1) % total : 0;
		prevLink.href = total > 0 ? manifest[prevIdx] : '/';
		prevLink.setAttribute('aria-label', 'Previous splash');
		nextLink.href = total > 0 ? manifest[nextIdx] : '/';
		nextLink.setAttribute('aria-label', 'Next splash');
	} catch {
		textBlock.innerHTML = '<div>#? / ?</div>';
		randomLink.href = '/index.html';
		prevLink.href = '/';
		nextLink.href = '/';
	}

	container.appendChild(textBlock);
	container.appendChild(listLink);
	container.appendChild(randomLink);
	container.appendChild(prevLink);
	container.appendChild(nextLink);

	document.body.appendChild(container);
}


