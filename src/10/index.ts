import { initSplashOverlay } from "/src/shared/utils";


document.addEventListener("DOMContentLoaded", async () => {
  const h1 = document.querySelector("h1") as HTMLElement;
  // const rootStyle = document.documentElement.style;
  const maxOffsetVw = 1.5;
  const rotationSpeed = 0.007;
  const rotationOffset = 0.5;
  const speed = 0.1;
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let targetOffsetX = 0;
  let targetOffsetY = 0;
  let pointerTargetOffsetX = 0;
  let pointerTargetOffsetY = 0;
  let pointerOffsetX = 0;
  let pointerOffsetY = 0;

  let mixTarget = 0;
  let target = 0;

  const lerp = (a: number, b: number, t: number) => {
    return a + (b - a) * t;
  };
  
  const tick = (time: number) => {
    requestAnimationFrame(tick);

    rotateOffsets(time);
    target = lerp(target, mixTarget, 0.05);
    
    offsetX = targetOffsetX;
    offsetY = targetOffsetY;

    const dx = pointerTargetOffsetX - pointerOffsetX;
    const dy = pointerTargetOffsetY - pointerOffsetY;
    pointerOffsetX += dx * speed;
    pointerOffsetY += dy * speed;

    const finalOffsetX = lerp(offsetX, pointerOffsetX, target);
    const finalOffsetY = lerp(offsetY, pointerOffsetY, target);

    const finalAngle = Math.atan2(finalOffsetY, finalOffsetX);
    // const finalLength = Math.sqrt(finalOffsetX * finalOffsetX + finalOffsetY * finalOffsetY);
    
    h1.style.setProperty("--offset-x", `${finalOffsetX}px`);
    h1.style.setProperty("--offset-y", `${finalOffsetY}px`);
    h1.style.setProperty("--angle", `${finalAngle}rad`);
    // h1.style.setProperty("--length", `${finalLength}px`);
  };

  const rotateOffsets = (time: number) => {
    const angle = (time * rotationSpeed) % (2 * Math.PI);
    const length = rotationOffset * window.innerWidth / 100;

    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    targetOffsetX = cos * length;
    targetOffsetY = sin * length;

    // targetOffsetY = sin * targetOffsetX + cos * targetOffsetY;
  };

  const updatePointerOffsets = (clientX: number, clientY: number) => {
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    const nx = (0.5 - clientX / vw) * 2;
    const ny = (0.5 - clientY / vh) * 2;
    const maxOffsetPx = maxOffsetVw * vw / 100;
    pointerTargetOffsetX = Math.max(-1, Math.min(1, nx)) * maxOffsetPx;
    pointerTargetOffsetY = Math.max(-1, Math.min(1, ny)) * maxOffsetPx;
    // if (force) {
    //   pointerOffsetX = pointerTargetOffsetX;
    //   pointerOffsetY = pointerTargetOffsetY;
    // }
  };

  // Drag handlers (empty bodies by request)
  const onDragStart = (_ev: PointerEvent) => {
    if (isDragging) {
      return;
    }
    mixTarget = 1;
    isDragging = true;

    const clientX = _ev.clientX;
    const clientY = _ev.clientY;
    updatePointerOffsets(clientX, clientY);
  };

  const onDragMove = (_ev: PointerEvent) => {
    if (!isDragging) {
      return;
    }
    
    const clientX = _ev.clientX;
    const clientY = _ev.clientY;
    updatePointerOffsets(clientX, clientY);
  };

  const onDragEnd = (_ev: PointerEvent) => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    mixTarget = 0;
  };

  // Wiring for drag start/move/end using Pointer Events (supported by modern browsers)
  window.addEventListener("pointerdown", (e: PointerEvent) => {
    onDragStart(e);
  }, { passive: true });
  window.addEventListener("pointermove", (e: PointerEvent) => {
    onDragMove(e);
  }, { passive: true });
  const endPointer = (e: PointerEvent) => {
    onDragEnd(e);
  };
  window.addEventListener("pointerup", endPointer, { passive: true });
  window.addEventListener("pointercancel", endPointer, { passive: true });

  requestAnimationFrame(tick);

  await initSplashOverlay();
});
