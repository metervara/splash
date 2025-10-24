import { selectRandom } from './shared/utils';

type ManifestEntry = string | { href: string; title?: string };

function toHref(entry: ManifestEntry): string | null {
	if (typeof entry === 'string') return entry;
	if (entry && typeof entry.href === 'string') return entry.href;
	return null;
}

async function pickRandomSplash(): Promise<string | null> {
	try {
		const res = await fetch('/splash-manifest.json', { cache: 'no-store' });
		if (!res.ok) return null;
		const list: ManifestEntry[] = await res.json();
		const params = new URLSearchParams(window.location.search);
		const excludeStr = params.get('exclude');
		const excludeIdx = Number.isFinite(parseInt(excludeStr || '', 10)) ? parseInt(excludeStr || '', 10) : -1;
    let pool = list
            .map((entry, idx) => ({ href: toHref(entry), idx }))
            .filter((item) => typeof item.href === 'string');
		if (excludeIdx >= 0 && excludeIdx < list.length) {
			const filtered = pool.filter((item) => item.idx !== excludeIdx);
			if (filtered.length > 0) pool = filtered;
		}
		if (pool.length === 0) return null;
		const chosenItem = selectRandom(pool);
		const chosen = chosenItem?.href as string | undefined;
		return chosen ?? null;
	} catch {
		return null;
	}
}

(async () => {
	const statusEl = document.getElementById('status');
	const target = await pickRandomSplash();
	if (target) {
		if (statusEl) statusEl.textContent = 'Redirecting…';
		window.location.replace(target);
	} else {
		if (statusEl) statusEl.textContent = 'No splashes found. Add files in \`/splashes\`.';
	}
})();


