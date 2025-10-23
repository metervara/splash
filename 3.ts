

import { initSplashOverlay } from './src/shared/utils';

const writeSpeed = 200;
const runSpeed = 30;

const getCursor = (): HTMLSpanElement | null => document.querySelector('span.cursor');
const showCursor = (): void => { const c = getCursor(); if (c) c.style.visibility = 'visible'; };
const hideCursor = (): void => { const c = getCursor(); if (c) c.style.visibility = 'hidden'; };
const placeCursorIn = (el: HTMLElement): void => {
	const c = getCursor();
	if (!c) return;
	if (c.parentElement !== el) {
		el.appendChild(c);
	} else {
		// ensure cursor is at the end
		el.appendChild(c);
	}
};
const ensureTextNode = (el: HTMLElement): Text => {
	const first = el.firstChild;
	if (first && first.nodeType === Node.TEXT_NODE) return first as Text;
	// Clear existing textual content but preserve nothing else before typing starts
	el.textContent = '';
	const textNode = document.createTextNode('');
	el.appendChild(textNode);
	return textNode;
};

async function updateHeaderWithManifest(): Promise<void> {
	const h2 = document.querySelector('header h2');

	try {
		const res = await fetch('/splash-manifest.json', { cache: 'no-store' });
		if (!res.ok) throw new Error(String(res.status));
		const manifest = (await res.json()) as string[];
		const total = Array.isArray(manifest) ? manifest.length : 0;
		h2!.textContent = `#3 - Ascii maze. Total: ${total}`;
	} catch {
		console.error('Failed to fetch splash manifest');
	}
}


const writeText = async(text: string, target: HTMLElement, loop: boolean = false, speed: number = 100, random: boolean = false, withCursor: boolean = false): Promise<void> => {
	const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
	let cancelled = false;
	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape' || e.key === 'Esc') {
			cancelled = true;
		}
	};
	window.addEventListener('keydown', onKeyDown);
	try {
		let textNode: Text | null = null;
		if (withCursor) {
			textNode = ensureTextNode(target);
			if (loop) {
				hideCursor();
			} else {
				placeCursorIn(target);
				showCursor();
			}
		}
		// Random mode: append a single random character each iteration
		if (random) {
			do {
				const length = text.length;
				const randomIndex = length > 0 ? Math.floor(Math.random() * length) : 0;
				const nextChar = length > 0 ? text.charAt(randomIndex) : '';
				if (nextChar) {
					if (textNode) {
						textNode.nodeValue = (textNode.nodeValue ?? '') + nextChar;
					} else {
						target.textContent = (target.textContent ?? '') + nextChar;
					}
					const scroller = document.scrollingElement || document.documentElement;
					scroller.scrollTop = scroller.scrollHeight;
				}
				if (!loop || cancelled) break;
				await sleep(speed);
				if (cancelled) break;
			} while (loop && !cancelled);
			return;
		}

		// Sequential typing mode
		do {
			for (let i = 1; i <= text.length; i++) {
				if (cancelled) break;
				if (textNode) {
					textNode.nodeValue = text.slice(0, i);
				} else {
					target.textContent = text.slice(0, i);
				}
				await sleep(speed);
				if (cancelled) break;
			}

			if (!loop || cancelled) break;

			// Small pause before restarting and clear text
			await sleep(speed * 4);
			if (cancelled) break;
			if (textNode) {
				textNode.nodeValue = '';
			} else {
				target.textContent = '';
			}
			await sleep(speed);
			if (cancelled) break;
		} while (loop && !cancelled);
	} finally {
		window.removeEventListener('keydown', onKeyDown);
		if (withCursor && !loop) {
			// After finishing non-loop typing, keep cursor visible in the last typed element
			showCursor();
			placeCursorIn(target);
		}
	}
}

document.addEventListener('DOMContentLoaded', async () => {
	console.log('DOMContentLoaded');
	await initSplashOverlay();
	await updateHeaderWithManifest();

  const scroller = document.scrollingElement || document.documentElement;

  // Inputting command
  const commandElement = document.createElement('p'); 
  document.querySelector('main')?.appendChild(commandElement);
	await writeText('10 PRINT CHR$(205.5 + RND(1)); : GOTO 10', commandElement, false, writeSpeed, false, true);

  //Run command
  const runElement = document.createElement('p'); 
  document.querySelector('main')?.appendChild(runElement);
	await writeText('RUN', runElement, false, writeSpeed, false, true);

  //Maze loop (program executing forever)
  const executeElement = document.createElement('p'); 
  document.querySelector('main')?.appendChild(executeElement);
	await writeText('╱╲', executeElement, true, runSpeed, true, true);

  const breakElement = document.createElement('p');
  document.querySelector('main')?.appendChild(breakElement);
  breakElement.innerText = "BREAK IN 10"

  const endElement = document.createElement('p');
  document.querySelector('main')?.appendChild(endElement);
  endElement.innerText = "Ready."

  placeCursorIn(endElement);
  showCursor();
});
