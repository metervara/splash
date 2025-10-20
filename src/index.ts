import { selectRandom } from './shared/utils';

async function pickRandomSplash(): Promise<string | null> {
	try {
		const res = await fetch('/splash-manifest.json', { cache: 'no-store' });
		if (!res.ok) return null;
		const list: string[] = await res.json();
		const params = new URLSearchParams(window.location.search);
		const excludeStr = params.get('exclude');
		const excludeIdx = Number.isFinite(parseInt(excludeStr || '', 10)) ? parseInt(excludeStr || '', 10) : -1;
		let pool = list
			.map((href, idx) => ({ href, idx }))
			.filter((item) => typeof item.href === 'string' && item.href.endsWith('.html'));
		if (excludeIdx >= 0 && excludeIdx < list.length) {
			const filtered = pool.filter((item) => item.idx !== excludeIdx);
			if (filtered.length > 0) pool = filtered;
		}
		if (pool.length === 0) return null;
		const chosenItem = selectRandom(pool);
		const chosen = chosenItem?.href;
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
		if (statusEl) statusEl.textContent = 'No splashes found. Add files in \\`/splashes\\`.';
	}
})();


