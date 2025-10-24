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
	const base = path.replace(/^\/+/, '').replace(/\.html$/, '');
	return base;
}

(async () => {
    const pageEl = document.getElementById('page');
    if (!pageEl) return;

  const STORAGE_KEY = 'visited-links';
  function getVisited(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch {
      return new Set();
    }
  }
  function saveVisited(set: Set<string>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    } catch {}
  }
  const visited = getVisited();

    const items = await loadManifest();
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
    if (visited.has(href)) a.classList.add('is-visited');
    a.addEventListener('click', () => {
      visited.add(href);
      saveVisited(visited);
      a.classList.add('is-visited');
    }, { passive: true });
		li.appendChild(a);
		ul.appendChild(li);
	}

	// Append final text after all items
	const endLi = document.createElement('li');
	const em = document.createElement('em');
	em.textContent = 'Covers are brief studies of ideas I\'m exploring at the moment.';
	endLi.appendChild(em);
	ul.appendChild(endLi);
})();
