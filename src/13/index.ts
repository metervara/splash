import { initSplashOverlay } from "/src/shared/utils";

document.addEventListener("DOMContentLoaded", async () => {
  await initSplashOverlay();

  const vwToPx = (vw: number) => {
    return (window.innerWidth || document.documentElement.clientWidth) * (vw / 100);
  };

  // Configuration
  const MIN_DISTANCE = 0;       // px where peel reaches max (0 = at element)
  const MAX_DISTANCE_VW = 50;   // vw where peel reaches 0
  const PEEL_MAX = 120;         // % of height (100 = fully peeled)
  const MAX_ANGLE_DELTA = 5;   // degrees per frame - caps how fast angle can change

  const letters = document.querySelectorAll("h1 .letter") as NodeListOf<HTMLElement>;
  let pointerX = 0;
  let pointerY = 0;
  let pointerFollowX = 0;
  let pointerFollowY = 0;

  let maxDistancePx = vwToPx(MAX_DISTANCE_VW);

  // Store current angle for each letter to smooth transitions
  const letterAngles = new Map<HTMLElement, number>();

  const updateLetterPeel = (letter: HTMLElement, clientX: number, clientY: number) => {
    const rect = letter.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = clientX - cx;
    const dy = clientY - cy;

    // φ = direction from center to pointer (in degrees)
    const phiDeg = Math.atan2(dy, dx) * 180 / Math.PI;

    // Crease must be perpendicular to that vector → rotate by φ + 90°
    const targetCreaseDeg = phiDeg + 90;

    // Get current angle or initialize it
    let currentCreaseDeg = letterAngles.get(letter) ?? targetCreaseDeg;

    // Calculate shortest angular distance (handles wrapping)
    let angleDelta = targetCreaseDeg - currentCreaseDeg;
    // Normalize to [-180, 180] range
    while (angleDelta > 180) angleDelta -= 360;
    while (angleDelta < -180) angleDelta += 360;

    // Cap the delta to prevent aggressive movement
    angleDelta = Math.max(-MAX_ANGLE_DELTA, Math.min(MAX_ANGLE_DELTA, angleDelta));

    // Update current angle with capped delta
    currentCreaseDeg += angleDelta;
    letterAngles.set(letter, currentCreaseDeg);

    // Distance from center of letter to pointer
    const distance = Math.hypot(dx, dy);
    
    // Map distance from [MIN_DISTANCE..maxDistancePx] to [1..0], can go negative when far
    const t = Math.min((maxDistancePx - distance) / (maxDistancePx - MIN_DISTANCE), 1);
    const peelPct = t * PEEL_MAX;

    // Set z-index based on inverse of distance (closer = higher z-index)
    // Use a large base value to avoid negative z-index
    const zIndex = Math.max(0, Math.round(10000 - distance));

    letter.style.setProperty('--peel-rotation', `${currentCreaseDeg}deg`);
    letter.style.setProperty('--peel-pct', `${peelPct.toFixed(3)}%`);
    letter.style.zIndex = `${zIndex}`;
  };

  const tick = () => {
    requestAnimationFrame(tick);

    pointerFollowX += (pointerX - pointerFollowX) * 0.2;
    pointerFollowY += (pointerY - pointerFollowY) * 0.2;

    letters.forEach((letter: HTMLElement) => {
      updateLetterPeel(letter, pointerFollowX, pointerFollowY);
    });
  };

  const handlePointerMove = (event: PointerEvent) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
  };

  // Initialize letters far away (collapsed peel state)
  letters.forEach((letter: HTMLElement) => {
    const rect = letter.getBoundingClientRect();
    updateLetterPeel(letter, rect.right + maxDistancePx * 2, rect.bottom + maxDistancePx * 2);
  });

  document.addEventListener("pointermove", handlePointerMove);
  window.addEventListener('resize', () => { 
    maxDistancePx = vwToPx(MAX_DISTANCE_VW); 
  });

  requestAnimationFrame(tick);
});
