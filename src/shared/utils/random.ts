export function selectRandom<T>(items: readonly T[]): T | undefined {
	if (!Array.isArray(items) || items.length === 0) return undefined;
	const index = Math.floor(Math.random() * items.length);
	return items[index];
}






