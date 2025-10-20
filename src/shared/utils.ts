export function selectRandom<T>(items: readonly T[]): T | undefined {
	if (!Array.isArray(items) || items.length === 0) return undefined;
	const index = Math.floor(Math.random() * items.length);
	return items[index];
}


/** Initialize the shared splash overlay text using splash-manifest.json. */
export async function initSplashOverlay(): Promise<void> {
	const overlay = document.getElementById('splash-overlay') as HTMLAnchorElement | null;
	if (!overlay) return;
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
		const displayIndex = idx >= 0 ? idx + 1 : 1;
		const totalDisplay = total > 0 ? total : 1;
		overlay.textContent = `#${displayIndex} / ${totalDisplay} — Randomize`;
		// Ensure subsequent random selection excludes this page
		overlay.href = `/index.html?exclude=${idx >= 0 ? idx : ''}`;
	} catch {
		overlay.textContent = `Randomize`;
	}
}


