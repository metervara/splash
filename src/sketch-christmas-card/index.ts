import { Trail } from "./Trail";
import { Starfield } from "./Starfield";
import { Vector2 } from "../shared/physics2d";
import { initSplashOverlay } from "/src/shared/utils/";
import { map, lerp } from "/src/shared/utils";
import { easeOutQuad } from "/src/shared/utils/ease";

document.addEventListener("DOMContentLoaded", async () => {
  await initSplashOverlay();

  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  let lastTime = 0;
  let center: Vector2 = new Vector2(0, 0);

  let mousePosition: Vector2 | null = null;
  let mousePrevPosition: Vector2 | null = null;
  // let smoothMousePosition: Vector2 | null = null;
  let smoothMouseDirection: Vector2 | null = null;
  const SMOOTHING_DIRECTION = 0.05;
  const SMOOTHING_OFFSET = 0.05;
  let offset: Vector2 = new Vector2(0, 0);

  if (!ctx) return;

  const trail = new Trail(100);

  let starfield: Starfield; // = new Starfield(200, { x: 0, y: 0, width: canvas.width, height: canvas.height });

  const resizeHandler = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
    center = new Vector2(rect.width * 0.5, rect.height * 0.5);
    trail.setMaxLength(rect.width * 0.5);
    if (!starfield) {
      starfield = new Starfield(200, { x: 0, y: 0, width: canvas.width, height: canvas.height}, 0);
    }
    starfield.updateBounds({ x: 0, y: 0, width: canvas.width, height: canvas.height });
  };

  const pointerMoveHandler = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if(!mousePrevPosition) {
      mousePrevPosition = new Vector2(e.clientX - rect.left, e.clientY - rect.top);
    }
    mousePosition = new Vector2(e.clientX - rect.left, e.clientY - rect.top);
    const point = new Vector2(e.clientX - rect.left, e.clientY - rect.top);
    trail.addPoint(point);
  };
  
  const tick = (time: number) => {
    requestAnimationFrame(tick);


    let mouseDirection = new Vector2(0, 0);
    if (mousePosition && mousePrevPosition) {
      mouseDirection = Vector2.sub(mousePosition, mousePrevPosition);
    }

    if (mousePosition) {
      const targetOffset = Vector2.mul(Vector2.sub(center, mousePosition), 0.25);
      offset = Vector2.lerp(offset, targetOffset, SMOOTHING_OFFSET);
      starfield.setOffCenter(offset);
      // smoothMousePosition = smoothMousePosition
      //   ? Vector2.lerp(smoothMousePosition, mousePosition, SMOOTHING_POSITION)
      //   : mousePosition.clone();

      //   const offset = Vector2.mul(Vector2.sub(smoothMousePosition, center), 0.25);
      //   starfield.setOffCenter(offset);
    }

    smoothMouseDirection = smoothMouseDirection
      ? Vector2.lerp(smoothMouseDirection, mouseDirection, SMOOTHING_DIRECTION)
      : mouseDirection.clone();

    const directionForStarfield = smoothMouseDirection ?? mouseDirection;
    starfield.speed = -directionForStarfield.length();

    if (mousePosition) {
      mousePrevPosition = mousePosition.clone();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dt = time - lastTime;
    starfield.update(dt);
    lastTime = time;

    // DEBUG starfield
    const starSizeMin = 3;
    const starSizeMax = 20;

    const starFadeWindow = 0.15;

    // starfield.setOffCenter(new Vector2(200, 0));

    starfield.getStars().forEach((star) => {
      let starSize = map(star.proximity, 0, 1, starSizeMin, starSizeMax);
      starSize = lerp(starSizeMin, starSize, easeOutQuad(star.time));
      const position = Vector2.add(star.position, center);

      const fadeIn = Math.min(star.time / starFadeWindow, 1);
      const fadeOut = Math.min((1 - star.time) / starFadeWindow, 1);
      const opacity = Math.max(0, Math.min(fadeIn, fadeOut));
      if (opacity <= 0) {
        return;
      }

      ctx.save();
      ctx.strokeStyle = "white";
      ctx.lineWidth = starSize * 0.5;
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.moveTo(position.x, position.y);
      ctx.lineTo(position.x + star.direction.x * starSize, position.y + star.direction.y * starSize);
      ctx.stroke();
      ctx.restore();
      // ctx.fillStyle = "white";
      // ctx.fillRect(star.position.x - starSize * 0.5, star.position.y - starSize * 0.5, starSize, starSize);
    });

    // DEBUG trail
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    
    const points = trail.getPoints();
   
    if(points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for(let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }

    // SANTAS SLEIGH
    const followPoints = trail.getEvenlySpacedPoints(10, 50);
    followPoints.forEach((point) => {
      ctx.fillStyle = "red";
      ctx.fillRect(point.x - 5, point.y - 5, 10, 10);
    });
  }
  
  window.addEventListener("resize", resizeHandler);
  window.addEventListener("pointermove", pointerMoveHandler);
  
  resizeHandler();
  tick(0);
  // ctx.fillStyle = "red";
  // ctx.fillRect(0, 0, canvas.width, canvas.height);
});
