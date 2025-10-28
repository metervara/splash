import { initSplashOverlay } from '/src/shared/utils';

interface Vec2 {
	x: number;
	y: number;
}

interface DragState {
	isDragging: boolean;
	initialDotPos: Vec2; // Initial position of the dot element
	mouseInitialPos: Vec2; // Where mouse was when drag started
	mouseCurrentPos: Vec2; // Current mouse position
	dotCurrentPos: Vec2; // Current dot position (may be different from mouse due to elastic)
	dotVelocity: Vec2; // Velocity for spring animation
	animationFrameId: number | null;
}

// Configuration
const MAX_DRAG_DISTANCE_PERCENT = 0.4; // Maximum drag distance as percentage of window width (0.15 = 15%)
const ELASTIC_STRENGTH = 0.3; // How elastic the drag feels (0-1, lower = more elastic)
const SPRING_STIFFNESS = 0.15; // Spring stiffness for snap-back
const SPRING_DAMPING = 0.75; // Spring damping (0-1, higher = more damping)

document.addEventListener('DOMContentLoaded', async () => {
	await initSplashOverlay();

	const dot = document.querySelector('span.dot') as HTMLElement;
	const h1 = document.querySelector('h1') as HTMLElement;
	if (!dot || !h1) return;

	// Calculate max drag distance based on window width
	let MAX_DRAG_DISTANCE = window.innerWidth * MAX_DRAG_DISTANCE_PERCENT;

	// Get initial dot position
	const rect = dot.getBoundingClientRect();
	const initialDotPos: Vec2 = {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2,
	};

	const state: DragState = {
		isDragging: false,
		initialDotPos,
		mouseInitialPos: { x: 0, y: 0 },
		mouseCurrentPos: { x: 0, y: 0 },
		dotCurrentPos: { ...initialDotPos },
		dotVelocity: { x: 0, y: 0 },
		animationFrameId: null,
	};

	// Update max drag distance on window resize
	window.addEventListener('resize', () => {
		MAX_DRAG_DISTANCE = window.innerWidth * MAX_DRAG_DISTANCE_PERCENT;
	});

	// Calculate distance between two points
	const distance = (a: Vec2, b: Vec2): number => {
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		return Math.sqrt(dx * dx + dy * dy);
	};

	// Elastic function: moves less as distance increases
	const applyElastic = (rawDistance: number): number => {
		// Near origin: 1:1 following, far from origin: strong resistance
		// Uses a damping factor that increases with distance
		const dampingFactor = 1 + rawDistance / (MAX_DRAG_DISTANCE * ELASTIC_STRENGTH);
		return rawDistance / dampingFactor;
	};

	// Update dot position and fold effect
	const updateDotTransform = () => {
		const offsetX = state.dotCurrentPos.x - state.initialDotPos.x;
		const offsetY = state.dotCurrentPos.y - state.initialDotPos.y;
		
		// Apply transform to dot
		dot.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
		
		// Calculate current distance from origin
		const currentDistance = distance(state.initialDotPos, state.dotCurrentPos);
		
		// Map distance to fold angle (0-90 degrees)
		const foldAngle = (currentDistance / MAX_DRAG_DISTANCE) * 90;
		h1.style.setProperty('--fold', foldAngle.toFixed(2));
		
		// Optional: log for debugging
		// console.log('Distance:', currentDistance.toFixed(2), 'Fold:', foldAngle.toFixed(2));
	};

	// Handle drag start
	const handleStart = (e: MouseEvent | TouchEvent) => {
		e.preventDefault();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		
		state.isDragging = true;
		state.mouseInitialPos = { x: clientX, y: clientY };
		state.mouseCurrentPos = { x: clientX, y: clientY };
		state.dotVelocity = { x: 0, y: 0 }; // Reset velocity
		
		// Start animation loop
		startAnimationLoop();
	};

	// Handle drag end - start spring-back
	const handleEnd = () => {
		state.isDragging = false;
		// Animation continues to handle spring-back
	};

	// Handle mouse/touch move
	const handleMove = (e: MouseEvent | TouchEvent) => {
		if (!state.isDragging) return;
		
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		
		state.mouseCurrentPos = { x: clientX, y: clientY };
	};

	// Main animation loop
	const startAnimationLoop = () => {
		if (state.animationFrameId !== null) return;
		
		const animate = () => {
			if (state.isDragging) {
				// Dragging: calculate elastic position
				const dx = state.mouseCurrentPos.x - state.mouseInitialPos.x;
				const dy = state.mouseCurrentPos.y - state.mouseInitialPos.y;
				const rawDistance = Math.sqrt(dx * dx + dy * dy);
				
				if (rawDistance > 0) {
					// Apply elastic damping
					const elasticDistance = applyElastic(rawDistance);
					const ratio = elasticDistance / rawDistance;
					
					// Calculate elastic position
					state.dotCurrentPos = {
						x: state.initialDotPos.x + dx * ratio,
						y: state.initialDotPos.y + dy * ratio,
					};
				}
				
				updateDotTransform();
				state.animationFrameId = requestAnimationFrame(animate);
			} else {
				// Spring-back animation
				const dx = state.initialDotPos.x - state.dotCurrentPos.x;
				const dy = state.initialDotPos.y - state.dotCurrentPos.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				
				// Check if spring-back is complete
				if (dist < 0.5 && Math.abs(state.dotVelocity.x) < 0.5 && Math.abs(state.dotVelocity.y) < 0.5) {
					// Snap to origin and stop
					state.dotCurrentPos = { ...state.initialDotPos };
					state.dotVelocity = { x: 0, y: 0 };
					updateDotTransform();
					stopAnimationLoop();
					return;
				}
				
				// Apply spring physics
				const springForceX = dx * SPRING_STIFFNESS;
				const springForceY = dy * SPRING_STIFFNESS;
				
				state.dotVelocity.x += springForceX;
				state.dotVelocity.y += springForceY;
				
				// Apply damping
				state.dotVelocity.x *= SPRING_DAMPING;
				state.dotVelocity.y *= SPRING_DAMPING;
				
				// Update position
				state.dotCurrentPos.x += state.dotVelocity.x;
				state.dotCurrentPos.y += state.dotVelocity.y;
				
				updateDotTransform();
				state.animationFrameId = requestAnimationFrame(animate);
			}
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

