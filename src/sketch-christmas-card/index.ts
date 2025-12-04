import { Trail } from "./Trail";
import { Starfield } from "./Starfield";
import { Vector2 } from "../shared/physics2d";
import { initSplashOverlay } from "/src/shared/utils/";
import { map, lerp } from "/src/shared/utils";
import { easeOutQuad } from "/src/shared/utils/ease";

type StarRenderData = ReturnType<Starfield["getStars"]>[number];

const SNOWFLAKE_SOURCES = [
  new URL("./images/snowflake-0.png", import.meta.url).href,
  new URL("./images/snowflake-1.png", import.meta.url).href,
  new URL("./images/snowflake-2.png", import.meta.url).href,
  new URL("./images/snowflake-3.png", import.meta.url).href,
  new URL("./images/snowflake-4.png", import.meta.url).href,
];

const REINDEER_SOURCES = Array.from({ length: 29 }, (_, i) =>
  new URL(`./images/reindeer-${i + 1}.png`, import.meta.url).href
);

const SLEIGH_SCALE = 7;


const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  await initSplashOverlay();
  const snowflakeImages = await Promise.all(SNOWFLAKE_SOURCES.map(loadImage));
  const reindeerImages = await Promise.all(REINDEER_SOURCES.map(loadImage));

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

  const starSizeMin = 3;
  const starSizeMax = 20;
  const starFadeWindow = 0.15;

  if (!ctx) return;

  const disableImageSmoothing = () => {
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = "low";
  };
  disableImageSmoothing();

  // TODO: Calculate dynamically based on the items we display in the trail
  const trail = new Trail(200); // Depends on number of images (reindeer + sleigh, and spaces multiplied by SLEIGH_SCALE)

  let starfield: Starfield; // = new Starfield(200, { x: 0, y: 0, width: canvas.width, height: canvas.height });

  const resizeHandler = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
    disableImageSmoothing();
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

  const drawStar = (star: StarRenderData, index: number) => {
    let starSize = map(star.proximity, 0, 1, starSizeMin, starSizeMax);
    starSize = lerp(starSizeMin, starSize, easeOutQuad(star.time));

    starSize *= 3;
    const position = Vector2.add(star.position, center);

    const fadeIn = Math.min(star.time / starFadeWindow, 1);
    const fadeOut = Math.min((1 - star.time) / starFadeWindow, 1);
    const opacity = Math.max(0, Math.min(fadeIn, fadeOut));
    if (opacity <= 0) {
      return;
    }

    if (!snowflakeImages.length) {
      return;
    }

    const image = snowflakeImages[index % snowflakeImages.length];
    const halfSize = starSize * 0.5;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(image, position.x - halfSize, position.y - halfSize, starSize, starSize);
    ctx.restore();
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

    // starfield.setOffCenter(new Vector2(200, 0));

    starfield.getStars().forEach((star, index) => {
      drawStar(star, index);
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

    // DEBUG TRAIL FOLLOWING
    // const followPointsDev = trail.getEvenlySpacedPoints(10, 20).reverse();
    // let size = 20;
    // followPointsDev.forEach((point) => {
    //   ctx.fillStyle = "red";
    //   ctx.fillRect(point.x - size* 0.5, point.y - size * 0.5, size, size);
    //   size -= 1;
    // });

    // SANTAS SLEIGH AND REINDEER FOLLOWING
    const itemCount = 29; // TEMP. THis si a single reindeer for now
    const followPoints = trail.getEvenlySpacedPoints(itemCount, SLEIGH_SCALE * 0.8).reverse();
    followPoints.forEach((point, index) => {
      const indexReversed = itemCount - index - 1;
      const image = reindeerImages[indexReversed];
      const width = image.width * SLEIGH_SCALE;
      const height = image.height * SLEIGH_SCALE;
      ctx.drawImage(image, point.x - width * 0.5, point.y - height * 0.5, width, height);
    });
  }
  
  window.addEventListener("resize", resizeHandler);
  window.addEventListener("pointermove", pointerMoveHandler);
  
  resizeHandler();
  tick(0);
  // ctx.fillStyle = "red";
  // ctx.fillRect(0, 0, canvas.width, canvas.height);
});
