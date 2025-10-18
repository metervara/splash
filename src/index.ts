import { selectRandom } from './shared/utils';

async function pickRandomSplash(): Promise<string | null> {
	try {
		const res = await fetch('/splash-manifest.json', { cache: 'no-store' });
		if (!res.ok) return null;
		const list: string[] = await res.json();
		const available = list.filter((href) => typeof href === 'string' && href.endsWith('.html'));
		if (available.length === 0) return null;
		const chosen = selectRandom(available);
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


