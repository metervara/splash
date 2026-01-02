import { initSplashOverlay } from '/src/shared/utils';
import { Vector2 } from '/src/shared/physics2d';
import { Trail } from '/src/shared/Trail';

let isDragging = false;
let center: Vector2 = new Vector2(0, 0);
let trailLength: number = 0;
let hueOffset: number = 0;

const getMouseFromCenter = (event: PointerEvent) => {
  return new Vector2(event.clientX - center.x, event.clientY - center.y);
};

/*
const getMouseFromRelative = (x: number, y: number) => {
  return {
    x: x + center.x,
    y: y + center.y
  };
};
*/

document.addEventListener('DOMContentLoaded', () => {
  initSplashOverlay();

  const letters = document.querySelectorAll("h1 span") as NodeListOf<HTMLElement>;
  
  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    letter.style.setProperty("--index", `${i}`);
    letter.style.zIndex = `${10 - i}`;
  }

  const trail = new Trail(100);

  // trail.addPoint(new Vector2(0, 0)); // Centered

  const width = window.innerWidth * 0.8 / 2;
  trail.addPoint(new Vector2(width, 0));
  trail.addPoint(new Vector2(-width, 0));


  /*
  const tick = (time: number) => {
    requestAnimationFrame(tick);
  };
  */

  const updateTrail = () => {
    const points = trail.getEvenlySpacedPoints(10, trailLength / 10);
    for (let i = 0; i < points.length; i++) {
      const point = Vector2.add(points[i], center);
      const letter = letters[i];
      const rect = letter.getBoundingClientRect();
      letter.style.transform = `translate(${point.x - rect.width / 2}px, ${point.y - rect.height / 2}px)`;
    }
  };

  const onDragStart = (e: PointerEvent) => {
    if (isDragging) {
      return;
    }
    isDragging = true;

    // This resets trail. Remove to keep moving from current positiom.
    // trail.clear();

    const pos = getMouseFromCenter(e);
    trail.addPoint(pos);
    updateTrail();
  };

  const onDragMove = (e: PointerEvent) => {
    if (!isDragging) {
      return;
    }
    const pos = getMouseFromCenter(e);

    const lastPos = trail.getPoints()[trail.getPoints().length - 1];
    const dx = pos.x - lastPos.x;
    const dy = pos.y - lastPos.y;
    const dist = Math.hypot(dx, dy);
    hueOffset += dist * 1;
    hueOffset = hueOffset % 360;
   
    document.documentElement.style.setProperty("--hue-offset", `${hueOffset}deg`);
    
    trail.addPoint(pos);
    updateTrail();
  };

  const onDragEnd = (e: PointerEvent) => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
  };

  const onResize = () => {
    center = new Vector2(window.innerWidth / 2, window.innerHeight / 2);
    // const rect = h1.getBoundingClientRect();
    // trail.setMaxLength(rect.width);
    trailLength = window.innerWidth * 0.9;
    trail.setMaxLength(trailLength);

    updateTrail();
  };

  // Wiring for drag start/move/end using Pointer Events (supported by modern browsers)
  window.addEventListener("pointerdown", onDragStart, { passive: true });
  window.addEventListener("pointermove", onDragMove, { passive: true });
  window.addEventListener("pointerup", onDragEnd, { passive: true });
  window.addEventListener("pointercancel", onDragEnd, { passive: true });
  window.addEventListener("resize", onResize);

  onResize();

});


