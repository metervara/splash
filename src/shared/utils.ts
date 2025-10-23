export function selectRandom<T>(items: readonly T[]): T | undefined {
	if (!Array.isArray(items) || items.length === 0) return undefined;
	const index = Math.floor(Math.random() * items.length);
	return items[index];
}


/** Initialize and inject the shared splash overlay using splash-manifest.json. */
export async function initSplashOverlay(): Promise<void> {
	// Remove any pre-existing overlay to ensure a single instance
	const existing = document.getElementById('splash-overlay');
	if (existing) existing.remove();

	const container = document.createElement('div');
	container.id = 'splash-overlay';
	container.className = 'overlay';

	const textBlock = document.createElement('div');
	const randomLink = document.createElement('a');
	randomLink.textContent = 'Randomize';

	const prevLink = document.createElement('a');
	prevLink.textContent = '<';

	const nextLink = document.createElement('a');
	nextLink.textContent = '>';

	try {
		const res = await fetch('/splash-manifest.json', { cache: 'no-store' });
		if (!res.ok) throw new Error(String(res.status));
		const manifest = (await res.json()) as string[];
		const total = Array.isArray(manifest) ? manifest.length : 0;
		const path = window.location.pathname;
		let idx = manifest.indexOf(path);
		if (idx < 0) {
			const base = '/' + (path.split('/')[path.split('/').length - 1] || '');
			idx = manifest.indexOf(base);
		}

		const safeIdx = idx >= 0 ? idx : 0;
		const displayIndex = total > 0 ? safeIdx + 1 : 1;
		const totalDisplay = total > 0 ? total : 1;
		textBlock.textContent = `#${displayIndex} / ${totalDisplay}`;

		// Random excludes current index if we have one
		randomLink.href = `/index.html?exclude=${idx >= 0 ? idx : ''}`;
		randomLink.setAttribute('aria-label', 'Random splash');

		// Prev/Next with wrap-around
		const prevIdx = total > 0 ? (safeIdx - 1 + total) % total : 0;
		const nextIdx = total > 0 ? (safeIdx + 1) % total : 0;
		prevLink.href = total > 0 ? manifest[prevIdx] : '/';
		prevLink.setAttribute('aria-label', 'Previous splash');
		nextLink.href = total > 0 ? manifest[nextIdx] : '/';
		nextLink.setAttribute('aria-label', 'Next splash');
	} catch {
		textBlock.textContent = '#? / ?';
		randomLink.href = '/index.html';
		prevLink.href = '/';
		nextLink.href = '/';
	}

	container.appendChild(textBlock);
	container.appendChild(randomLink);
	container.appendChild(prevLink);
	container.appendChild(nextLink);

	document.body.appendChild(container);
}


