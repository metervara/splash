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
	
	const firstRow = document.createElement('div');
	firstRow.className = 'splash-overlay-row';

	const buttonsRow = document.createElement('div');
	buttonsRow.className = 'splash-overlay-row';

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
		
		// Create first line: counter and title in same box
		const infoDiv = document.createElement('div');
		infoDiv.textContent = `#${displayIndex} / ${totalDisplay}${title ? ` : ${title}` : ''}`;
		firstRow.appendChild(infoDiv);

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
		const errorCounterDiv = document.createElement('div');
		errorCounterDiv.textContent = '#? / ?';
		firstRow.appendChild(errorCounterDiv);
		randomLink.href = '/index.html';
		prevLink.href = '/';
		nextLink.href = '/';
	}

	// Add buttons to buttons row
	buttonsRow.appendChild(listLink);
	buttonsRow.appendChild(randomLink);
	buttonsRow.appendChild(prevLink);
	buttonsRow.appendChild(nextLink);

	// Add rows to container
	container.appendChild(firstRow);
	container.appendChild(buttonsRow);

	document.body.appendChild(container);
}


/**
 * Remaps a number from one range to another.
 *
 * @param value - The input number to map.
 * @param inMin - Lower bound of the input range.
 * @param inMax - Upper bound of the input range.
 * @param outMin - Lower bound of the output range.
 * @param outMax - Upper bound of the output range.
 * @returns The mapped number.
 *
 * Example:
 *   map(-5, -10, 0, 0, 100) // → 50
 *   map(5, 0, 10, 100, 200) // → 150
 *   map(10, 0, 10, 100, 0)  // → 0 (inverted output range)
 */
export function map(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMin === inMax) {
    throw new Error("Input range cannot have the same min and max values.");
  }

  const proportion = (value - inMin) / (inMax - inMin);
  return outMin + proportion * (outMax - outMin);
}
