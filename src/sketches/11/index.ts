import { initSplashOverlay } from "/src/shared/utils";


document.addEventListener("DOMContentLoaded", async () => {
  const h1 = document.querySelector("h1") as HTMLElement;
  const spans = h1.querySelectorAll("span");
  
  const maxOffsetVw = 1.5;
  const rotationSpeed = 0.007;
  const rotationOffset = 0.5;
  const speed = 0.1;
  let isDragging = false;
  
  const offsets: {x: number, y: number}[] = [];
  const pointerTargetOffsets: {x: number, y: number}[] = [];
  const pointerOffsets: {x: number, y: number}[] = [];

  for (let i = 0; i < spans.length; i++) {
    offsets.push({x: 0, y: 0});
    pointerTargetOffsets.push({x: 0, y: 0});
    pointerOffsets.push({x: 0, y: 0});
  }

  let mixTarget = 0;
  let target = 0;

  const lerp = (a: number, b: number, t: number) => {
    return a + (b - a) * t;
  };
  
  const tick = (time: number) => {
    requestAnimationFrame(tick);

    rotateOffsets(time);
    target = lerp(target, mixTarget, 0.05);

    for (let i = 0; i < spans.length; i++) {
      // Rotation
      const span = spans[i];
      const offset = offsets[i];
      // const angle = Math.atan2(offset.y, offset.x);

      // Pointer
      const pointerTargetOffset = pointerTargetOffsets[i];
      const dx = pointerTargetOffset.x - pointerOffsets[i].x;
      const dy = pointerTargetOffset.y - pointerOffsets[i].y;
      pointerOffsets[i].x += dx * speed;
      pointerOffsets[i].y += dy * speed;

      // Final offset
      const finalOffsetX = lerp(offset.x, pointerOffsets[i].x, target);
      const finalOffsetY = lerp(offset.y, pointerOffsets[i].y, target);
      const finalAngle = Math.atan2(finalOffsetY, finalOffsetX);

      span.style.setProperty("--angle", `${finalAngle}rad`);
      span.style.setProperty("--offset-x", `${finalOffsetX}px`);
      span.style.setProperty("--offset-y", `${finalOffsetY}px`);
    }
  };

  const rotateOffsets = (time: number) => {
    for (let i = 0; i < spans.length; i++) {
      const timeOffset = (i / (spans.length - 1)) * 2 * Math.PI;
      const angle = (time * rotationSpeed + timeOffset) % (2 * Math.PI);
      // const length = rotationOffset * window.innerWidth / 100 * (i + 1);
      const length = rotationOffset * window.innerWidth / 100;

      const sin = Math.sin(angle);
      const cos = Math.cos(angle);

      offsets[i].x = cos * length;
      offsets[i].y = sin * length;
    }
  };

  const updatePointerOffsets = (clientX: number, clientY: number) => {
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    for (let i = 0; i < spans.length; i++) {
      let span = spans[i];
      let spanRect = span.getBoundingClientRect();
      let spanCenterX = spanRect.left + spanRect.width / 2;
      let spanCenterY = spanRect.top + spanRect.height / 2;
      let spanOffsetX = spanCenterX - clientX;
      let spanOffsetY = spanCenterY - clientY;
      pointerTargetOffsets[i].x = Math.max(-1, Math.min(1, spanOffsetX / vw)) * maxOffsetVw * vw / 100;
      pointerTargetOffsets[i].y = Math.max(-1, Math.min(1, spanOffsetY / vh)) * maxOffsetVw * vh / 100;
    }
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
