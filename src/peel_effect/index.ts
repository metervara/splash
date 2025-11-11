import { initSplashOverlay } from "/src/shared/utils";

document.addEventListener("DOMContentLoaded", async () => {
  await initSplashOverlay();

  const vwToPx = (vw: number) => {
    return (window.innerWidth || document.documentElement.clientWidth) * (vw / 100);
  };

  // Configuration
  const MIN_DISTANCE = 0;       // px where peel reaches max (0 = at element)
  const MAX_DISTANCE_VW = 50;   // vw where peel reaches 0
  const PEEL_MAX = 100;         // % of height (100 = fully peeled)

  const letters = document.querySelectorAll("h1 .letter") as NodeListOf<HTMLElement>;
  let pointerX = 0;
  let pointerY = 0;
  let maxDistancePx = vwToPx(MAX_DISTANCE_VW);

  const updateLetterPeel = (letter: HTMLElement, clientX: number, clientY: number) => {
    const rect = letter.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = clientX - cx;
    const dy = clientY - cy;

    // φ = direction from center to pointer (in degrees)
    const phiDeg = Math.atan2(dy, dx) * 180 / Math.PI;

    // Crease must be perpendicular to that vector → rotate by φ + 90°
    const creaseDeg = phiDeg + 90;

    // Distance from center of letter to pointer
    const distance = Math.hypot(dx, dy);
    
    // Map distance from [MIN_DISTANCE..maxDistancePx] to [1..0], can go negative when far
    const t = Math.min((maxDistancePx - distance) / (maxDistancePx - MIN_DISTANCE), 1);
    const peelPct = t * PEEL_MAX;

    letter.style.setProperty('--peel-rotation', `${creaseDeg}deg`);
    letter.style.setProperty('--peel-pct', `${peelPct.toFixed(3)}%`);
  };

  const tick = () => {
    requestAnimationFrame(tick);

    letters.forEach((letter: HTMLElement) => {
      updateLetterPeel(letter, pointerX, pointerY);
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
