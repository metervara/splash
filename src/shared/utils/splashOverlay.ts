import manifest from 'virtual:grid-manifest';
import type { ManifestItem } from '@metervara/grid-listing/vite-plugin';
import { markVisited } from './visitedLinks';

/** Initialize and inject the shared splash overlay using the grid manifest. */
export function initSplashOverlay(): void {
	// Remove any pre-existing overlay to ensure a single instance
	const existing = document.getElementById('splash-overlay');
	if (existing) existing.remove();

	// Clean up any existing keyboard listener
	const existingHandler = (window as any).__splashOverlayKeyHandler;
	if (existingHandler) {
		document.removeEventListener('keydown', existingHandler);
		delete (window as any).__splashOverlayKeyHandler;
	}

	const container = document.createElement('div');
	container.id = 'splash-overlay';
	container.className = 'overlay';

	const firstRow = document.createElement('div');
	firstRow.className = 'splash-overlay-row';

	const buttonsRow = document.createElement('div');
	buttonsRow.className = 'splash-overlay-row';

	const randomLink = document.createElement('a');
	randomLink.textContent = 'Randomize';

	const prevLink = document.createElement('a');
	prevLink.textContent = '<';

	const nextLink = document.createElement('a');
	nextLink.textContent = '>';

	const listLink = document.createElement('a');
	listLink.textContent = 'list';
	listLink.className = 'overlay-single-line';
	listLink.href = '/';
	listLink.setAttribute('aria-label', 'List');

	let descriptionRow: HTMLDivElement | null = null;

	const items: ManifestItem[] = manifest.items;
	const total = items.length;
	const path = window.location.pathname;

	function normalizeCandidates(p: string): string[] {
		const withoutIndex = p.replace(/index\.html$/i, '');
		const ensureSlash = withoutIndex.endsWith('/') ? withoutIndex : withoutIndex + '/';
		const noSlash = ensureSlash.replace(/\/$/, '');
		return [p, withoutIndex, ensureSlash, noSlash];
	}

	let idx = -1;
	const candidates = normalizeCandidates(path);
	for (const c of candidates) {
		const found = items.findIndex((item) => item.href === c);
		if (found >= 0) {
			idx = found;
			break;
		}
	}

	const safeIdx = idx >= 0 ? idx : 0;
	const displayIndex = total > 0 ? safeIdx + 1 : 1;
	const totalDisplay = total > 0 ? total : 1;

	// Get the current entry's title and description
	const currentItem = items[safeIdx];
	const title = currentItem?.title ?? '';
	const metaDescription =
		document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
	const description = currentItem?.description ?? metaDescription;

	// Create first line: counter and title in same box
	const infoDiv = document.createElement('div');
	infoDiv.textContent = `#${displayIndex} / ${totalDisplay}${title ? ` : ${title}` : ''}`;
	infoDiv.className = 'overlay-single-line';
	firstRow.appendChild(infoDiv);

	// Mark current splash as visited using canonical manifest href
	if (total > 0 && currentItem?.href) {
		markVisited(currentItem.href);
	}

	// Random: navigate directly to a random splash (excluding current)
	randomLink.href = '#';
	randomLink.setAttribute('aria-label', 'Random splash');
	randomLink.className = 'overlay-single-line';
	randomLink.addEventListener('click', (e) => {
		e.preventDefault();
		if (items.length === 0) return;
		const pool = items.map((_, i) => i).filter((i) => i !== safeIdx);
		const chosenIdx = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : safeIdx;
		const target = items[chosenIdx];
		if (target?.href) {
			window.location.href = target.href;
		}
	});

	// Prev/Next with wrap-around
	const prevIdx = total > 0 ? (safeIdx - 1 + total) % total : 0;
	const nextIdx = total > 0 ? (safeIdx + 1) % total : 0;
	prevLink.href = total > 0 ? items[prevIdx].href : '/';
	prevLink.setAttribute('aria-label', 'Previous splash');
	prevLink.className = 'overlay-single-line';
	nextLink.href = total > 0 ? items[nextIdx].href : '/';
	nextLink.setAttribute('aria-label', 'Next splash');
	nextLink.className = 'overlay-single-line';

	if (description?.trim()) {
		const trimmedDescription = description.trim();
		const infoButton = document.createElement('button');
		infoButton.type = 'button';
		infoButton.textContent = 'info';
		infoButton.setAttribute('aria-label', 'Toggle description');
		infoButton.setAttribute('aria-expanded', 'false');
		infoButton.setAttribute('aria-pressed', 'false');
		infoButton.setAttribute('aria-haspopup', 'true');
		infoButton.className = 'overlay-single-line';
		firstRow.appendChild(infoButton);

		descriptionRow = document.createElement('div');
		descriptionRow.className = 'splash-overlay-row splash-description-row';
		descriptionRow.hidden = true;

		const descriptionBox = document.createElement('div');
		descriptionBox.className = 'splash-description';
		descriptionBox.setAttribute('aria-live', 'polite');

		const descriptionText = document.createElement('span');
		descriptionText.className = 'splash-description-text';
		descriptionText.textContent = trimmedDescription;
		descriptionBox.appendChild(descriptionText);
		descriptionRow.appendChild(descriptionBox);

		let isVisible = false;
		const setVisibility = (visible: boolean) => {
			isVisible = visible;
			if (descriptionRow) {
				descriptionRow.hidden = !visible;
			}
			infoButton.setAttribute('aria-expanded', String(visible));
			infoButton.setAttribute('aria-pressed', String(visible));
		};

		infoButton.addEventListener('click', () => {
			setVisibility(!isVisible);
		});
	}

	// Add buttons to buttons row
	buttonsRow.appendChild(listLink);
	buttonsRow.appendChild(randomLink);
	buttonsRow.appendChild(prevLink);
	buttonsRow.appendChild(nextLink);

	// Add rows to container
	container.appendChild(firstRow);
	container.appendChild(buttonsRow);
	if (descriptionRow) {
		container.appendChild(descriptionRow);
	}

	document.body.appendChild(container);

	// Add keyboard navigation for arrow keys
	const handleKeyDown = (e: KeyboardEvent) => {
		// Don't navigate if user is typing in an input field
		const target = e.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
			return;
		}

		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			if (prevLink.href && prevLink.href !== '#' && prevLink.href !== window.location.href) {
				window.location.href = prevLink.href;
			}
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			if (nextLink.href && nextLink.href !== '#' && nextLink.href !== window.location.href) {
				window.location.href = nextLink.href;
			}
		}
	};

	// Store handler reference and add listener
	(window as any).__splashOverlayKeyHandler = handleKeyDown;
	document.addEventListener('keydown', handleKeyDown);
}
