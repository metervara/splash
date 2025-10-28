import { EulerMass, Spring } from "../shared/physics2d";
import { initSplashOverlay } from "/src/shared/utils";

document.addEventListener("DOMContentLoaded", async () => {
  await initSplashOverlay();

  const dot = document.querySelector("span.dot") as HTMLElement;
  const h1 = document.querySelector("h1") as HTMLElement;
  
  if (!dot || !h1) return;


  let animationFrameId: number | null = null;
  let lastFrameTime: number = 0;
  let accumulator: number = 0;
  let fixedDelta: number = 1 / 60; // 60 FPS

  let isDragging = false;

  const MASS_DRAG = 0.3;
  const SPRING_STRENGTH = 50.0;
  const SPRING_DAMPING = 0.2;

  // Store the dot's original screen position
  const dotRect = dot.getBoundingClientRect();
  const originalX = dotRect.left + dotRect.width / 2;
  const originalY = dotRect.top + dotRect.height / 2;

  const followMass = new EulerMass(originalX, originalY, 1, MASS_DRAG); // Start at dot's position
  const anchorMass = new EulerMass(originalX, originalY, 0, 0); // Kinematic anchor at original position
  const dragMass = new EulerMass(0, 0, 0, 0); // Mass moved around by mouse. 
  const dragSpring = new Spring(followMass, dragMass, SPRING_STRENGTH, SPRING_DAMPING, 0.0);
  const returnSpring = new Spring(followMass, anchorMass, SPRING_STRENGTH, SPRING_DAMPING, 0.0);

  const render = () => {
    // Convert from screen coordinates to relative offset
    const offX = followMass.position.x - originalX;
    const offY = followMass.position.y - originalY;
    dot.style.transform = `translate(${offX}px, ${offY}px)`;
  };

  const step = (deltaTime: number) => {
    if(isDragging) {
      dragSpring.apply();
      // console.log(dragSpring.restLength, Vector2.distance(dragMass.position, followMass.position));
    }
    returnSpring.apply();
    followMass.integrate(deltaTime);
    
  }
  

  // Handle drag start
  const handleStart = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    // Get the dot's current position in screen coordinates
    const dotRect = dot.getBoundingClientRect();
    const dotCenterX = dotRect.left + dotRect.width / 2;
    const dotCenterY = dotRect.top + dotRect.height / 2;

    // Initialize both masses at the dot's position (screen coordinates)
    followMass.setPosition(dotCenterX, dotCenterY);
    dragMass.setPosition(clientX, clientY);

    // anchorMass stays fixed at its original position

    isDragging = true;
  };

  // Handle drag end - start spring-back
  const handleEnd = () => {
    isDragging = false;
  };

  // Handle mouse/touch move
  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    dragMass.position.x = clientX;
    dragMass.position.y = clientY;

    // console.log(dragSpring.restLength, Vector2.distance(dragMass.position, followMass.position));

  };

  // Main animation loop
  const startAnimationLoop = () => {
    if (animationFrameId !== null) return;


    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const currentTime = performance.now();
      let frameTime = (currentTime - lastFrameTime) / 1000.0; // seconds
      lastFrameTime = currentTime;

      // Prevent spiral of death when tab is inactive or CPU is throttled
      if (frameTime > 0.25) frameTime = 0.25; // cap at 250ms

      accumulator += frameTime;

      while (accumulator >= fixedDelta) {
        step(fixedDelta);
        accumulator -= fixedDelta;
      }

      render();

    };
    
    animationFrameId = requestAnimationFrame(animate);
  };

  // Mouse events
  dot.addEventListener("mousedown", handleStart);
  document.addEventListener("mousemove", handleMove);
  document.addEventListener("mouseup", handleEnd);

  // Touch events
  dot.addEventListener("touchstart", handleStart, { passive: false });
  document.addEventListener("touchmove", handleMove, { passive: false });
  document.addEventListener("touchend", handleEnd);

  // measure();
  // For now we run it all the time
  startAnimationLoop();
});
