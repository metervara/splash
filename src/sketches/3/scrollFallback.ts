/**
 * JS fallback for scroll-driven letter animation when
 * animation-timeline: scroll(root block) is not supported.
 * Updates CSS vars / transform in requestAnimationFrame based on scroll position.
 */

function supportsScrollTimeline(): boolean {
	return CSS.supports('animation-timeline', 'scroll(root block)');
}

function getScrollProgress(): number {
	const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
	const maxScroll = scrollHeight - clientHeight;
	if (maxScroll <= 0) return 1;
	return Math.min(1, Math.max(0, scrollTop / maxScroll));
}

function parseDeg(value: string): number {
	return parseFloat(value) || 0;
}

function parsePx(value: string): number {
	return parseFloat(value) || 0;
}

export function initScrollFallback(): void {
	if (supportsScrollTimeline()) return;

	const letters = document.querySelectorAll<HTMLElement>('section .letter');
	// const overlay = document.getElementById('unsupported-overlay');
	// if (overlay) overlay.style.display = 'none';

	const letterConfigs: Array<{
		startP: number;
		endScale: number;
		rot: number;
		skx: number;
		sky: number;
		tx: number;
		ty: number;
		pivotX: string;
		pivotY: string;
		animate: boolean;
	}> = [];

	letters.forEach((letter, i) => {
		const style = getComputedStyle(letter);
		const startP = parseFloat(style.getPropertyValue('--start-p').trim()) || 0;
		const rot = parseDeg(style.getPropertyValue('--rot').trim());
		const skx = parseDeg(style.getPropertyValue('--skx').trim());
		const sky = parseDeg(style.getPropertyValue('--sky').trim());
		const tx = parsePx(style.getPropertyValue('--tx').trim());
		const ty = parsePx(style.getPropertyValue('--ty').trim());
		const pivotX = style.getPropertyValue('--pivot-x').trim() || '50%';
		const pivotY = style.getPropertyValue('--pivot-y').trim() || '50%';

		// Last letter (index 8) has animation: none
		const animate = i < letters.length - 1;
		const endScale = 1 + (1 - startP) * 2;

		letterConfigs.push({
			startP,
			endScale,
			rot,
			skx,
			sky,
			tx,
			ty,
			pivotX,
			pivotY,
			animate,
		});
	});

	function update(): void {
		const scrollProgress = getScrollProgress();

		letters.forEach((letter, i) => {
			const cfg = letterConfigs[i];
			if (!cfg.animate) {
				letter.style.transform = 'none';
				return;
			}

			const rangeLen = 1 - cfg.startP;
			const progress =
				rangeLen <= 0 ? 1 : Math.min(1, Math.max(0, (scrollProgress - cfg.startP) / rangeLen));

			const scale = 1 + (cfg.endScale - 1) * progress;
			const tx = cfg.tx * progress;
			const ty = cfg.ty * progress;
			const rot = cfg.rot * progress;
			const skx = cfg.skx * progress;
			const sky = cfg.sky * progress;

			letter.style.transformOrigin = `${cfg.pivotX} ${cfg.pivotY}`;
			letter.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) skew(${skx}deg, ${sky}deg) scale(${scale})`;
		});

		requestAnimationFrame(update);
	}

	update();
}
