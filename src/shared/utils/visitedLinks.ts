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
	} catch {
		/* noop */
	}
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


