import { initSplashOverlay } from '/src/shared/utils';

interface DragState {
	isDragging: boolean;
	initialPos: { x: number; y: number };
	currentPos: { x: number; y: number };
	animationFrameId: number | null;
}

document.addEventListener('DOMContentLoaded', async () => {
	await initSplashOverlay();

	const dot = document.querySelector('span.dot') as HTMLElement;
	if (!dot) return;

	const state: DragState = {
		isDragging: false,
		initialPos: { x: 0, y: 0 },
		currentPos: { x: 0, y: 0 },
		animationFrameId: null,
	};

	// Mouse events
	const handleStart = (e: MouseEvent | TouchEvent) => {
		e.preventDefault();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		
		state.isDragging = true;
		state.initialPos = { x: clientX, y: clientY };
		state.currentPos = { x: clientX, y: clientY };
		
		// Start animation loop
		startAnimationLoop();
	};

	const handleEnd = () => {
		state.isDragging = false;
		
		// Stop animation loop
		stopAnimationLoop();
	};

	const handleMove = (e: MouseEvent | TouchEvent) => {
		if (!state.isDragging) return;
		
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		
		state.currentPos = { x: clientX, y: clientY };
	};

	const startAnimationLoop = () => {
		if (state.animationFrameId !== null) return;
		
		const animate = () => {
			if (!state.isDragging) {
				stopAnimationLoop();
				return;
			}
			
			// Your animation logic here
			console.log('Dragging:', state.currentPos);
			
			state.animationFrameId = requestAnimationFrame(animate);
		};
		
		state.animationFrameId = requestAnimationFrame(animate);
	};

	const stopAnimationLoop = () => {
		if (state.animationFrameId !== null) {
			cancelAnimationFrame(state.animationFrameId);
			state.animationFrameId = null;
		}
	};

	// Mouse events
	dot.addEventListener('mousedown', handleStart);
	document.addEventListener('mousemove', handleMove);
	document.addEventListener('mouseup', handleEnd);

	// Touch events
	dot.addEventListener('touchstart', handleStart, { passive: false });
	document.addEventListener('touchmove', handleMove, { passive: false });
	document.addEventListener('touchend', handleEnd);
});

