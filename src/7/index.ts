import { VerletMass, Spring, Vector2 } from "../shared/physics2d";
import { initSplashOverlay } from "/src/shared/utils";
import { createAccordionVoice, createBellowsMapper } from "./accordion";

document.addEventListener("DOMContentLoaded", async () => {
  await initSplashOverlay();

  const dot = document.querySelector("span.dot") as HTMLElement;
  const h1 = document.querySelector("h1") as HTMLElement;
  
  if (!dot || !h1) return;

  let audioStarted = false;
  let ctx: AudioContext | null = null;
  let acc: ReturnType<typeof createAccordionVoice> | null = null;
  let mapper: ReturnType<typeof createBellowsMapper> | null = null;

  let animationFrameId: number | null = null;
  let lastFrameTime: number = 0;
  let accumulator: number = 0;
  let fixedDelta: number = 1 / 120; // 120 Hz physics (smaller timestep = more stable)

  let isDragging = false;
  let dotOrigin: Vector2 = new Vector2(0, 0);
  let h1Origin: Vector2 = new Vector2(0, 0);
  const basePitchHz = 220; 
  
  const SUBSTEPS = 6;          // or 5–8
  const MASS_DRAG = 0.02;      // keep small with Verlet
  const SPRING_STRENGTH = 100; // k
  const SPRING_DAMPING  = 5;  // ~critical for m=1      // Higher = less oscillation, more critical damping

  const followMass = new VerletMass(dotOrigin.x, dotOrigin.y, 1, MASS_DRAG); // Start at dot's position
  const anchorMass = new VerletMass(h1Origin.x, h1Origin.y, 0, 0); // Kinematic anchor at original position
  const dragMass = new VerletMass(0, 0, 0, 0); // Mass moved around by mouse. 
  const dragSpring = new Spring(followMass, dragMass, SPRING_STRENGTH, SPRING_DAMPING, 0.0);
  const returnSpring = new Spring(followMass, anchorMass, SPRING_STRENGTH, SPRING_DAMPING, 0.0);

  const startAccordionOnce = async () => {
    if (audioStarted) return;             // <- prevent multiple starts
    audioStarted = true;
  
    ctx = new AudioContext();
    acc = createAccordionVoice(ctx);
    acc.connect(ctx.destination);
  
    await ctx.resume();
    acc.start({ pitchHz: basePitchHz, speed: 0.9, pressure: 0.4 });
  
    // optional: set up your mapper here
    mapper = createBellowsMapper(acc, {
      vCap: 600,          // your “normal” ~500 gets full scale; room for peaks
      vDead: 6,           // ignore micro jitter
      pressureCurve: 0.6, // responsive at low speeds, not too spiky at high
      edgeLoss: 0.12,     // small realism at bellows extremes
      bendCentsMax: 4,    // subtle
      smoothTau: 0.025,   // snappy but not clicky
    });
  }
  const updateFromSimulation = (stretch: number, speed: number, basePitchHz: number) => {
    mapper?.map({ stretch, speed, basePitchHz });
  };

  const render = () => {
    // Convert from screen coordinates to relative offset
    const offX = followMass.position.x - dotOrigin.x;
    const offY = followMass.position.y - dotOrigin.y;
    dot.style.transform = `translate(${offX}px, ${offY}px)`;

    const restDistToCenter = Vector2.distance(anchorMass.position, h1Origin);
    const currentDistToCenter = Vector2.distance(followMass.position, h1Origin);

    const stretch = Math.min(Math.max((currentDistToCenter - restDistToCenter) / restDistToCenter, -1), 1); // For audio & skew efefct
    const speed = followMass.velocity.length(); // For audio

    updateFromSimulation(stretch, speed, basePitchHz);
  };

  const step = (deltaTime: number) => {
    if(isDragging) {
      dragSpring.apply();
      // console.log(dragSpring.restLength, Vector2.distance(dragMass.position, followMass.position));
    }
    returnSpring.apply();
  
    followMass.integrate(deltaTime);
  }

  const handleResize = () => {
    const dotRect = dot.getBoundingClientRect();
    dotOrigin.x = dotRect.left + dotRect.width / 2;
    dotOrigin.y = dotRect.top + dotRect.height / 2;

    followMass.setPosition(dotOrigin.x, dotOrigin.y);
    anchorMass.setPosition(dotOrigin.x, dotOrigin.y);

    const h1rect = h1.getBoundingClientRect();
    h1Origin.x = h1rect.left + h1rect.width / 2;
    h1Origin.y = h1rect.top + h1rect.height / 2;
  };

  // Handle drag start
  const handleStart = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();

    startAccordionOnce();

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
        const h = fixedDelta / SUBSTEPS;
      
        for (let i = 0; i < SUBSTEPS; i++) {
          step(h);
        }
      
        accumulator -= fixedDelta;
      }
      // while (accumulator >= fixedDelta) {
      //   step(fixedDelta);
      //   accumulator -= fixedDelta;
      // }

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

  window.addEventListener("resize", handleResize);

  handleResize();
  startAnimationLoop();
});
