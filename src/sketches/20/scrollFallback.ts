/**
 * JS fallback for scroll-driven shadow animation when
 * animation-timeline: scroll(root block) is not supported.
 * Updates h1 text-shadow in requestAnimationFrame based on scroll position.
 */

function supportsScrollTimeline(): boolean {
	return CSS.supports('animation-timeline', 'scroll(root block)');
}

function getScrollProgress(): number {
	const { scrollTop } = document.documentElement;
	const shadowOffset = parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue('--shadow-offset').trim()
	) || 100;
	const rangeEnd = shadowOffset * 4 * 0.5;
	if (rangeEnd <= 0) return 1;
	return Math.min(1, Math.max(0, scrollTop / rangeEnd));
}

export function initScrollFallback(): void {
	if (supportsScrollTimeline()) return;

	const el = document.querySelector<HTMLElement>('h1');
	if (!el) return;
	const heading: HTMLElement = el;

	const root = document.documentElement;

	function getColorVar(name: string): string {
		return getComputedStyle(root).getPropertyValue(name).trim() || 'transparent';
	}

	function update(): void {
		const progress = getScrollProgress();

		const shadowOffset = parseFloat(
			getComputedStyle(root).getPropertyValue('--shadow-offset').trim()
		) || 100;

		const color0 = getColorVar('--color-0');
		const color1 = getColorVar('--color-1');
		const color2 = getColorVar('--color-2');
		const color3 = getColorVar('--color-3');

		const y0 = shadowOffset * 1 * progress;
		const y1 = shadowOffset * 2 * progress;
		const y2 = shadowOffset * 3 * progress;
		const y3 = shadowOffset * 4 * progress;

		heading.style.textShadow = [
			`0 ${y0}px 0 ${color0}`,
			`0 ${y1}px 0 ${color1}`,
			`0 ${y2}px 0 ${color2}`,
			`0 ${y3}px 0 ${color3}`,
		].join(', ');
	}

	function tick(): void {
		update();
		requestAnimationFrame(tick);
	}

	tick();
}
