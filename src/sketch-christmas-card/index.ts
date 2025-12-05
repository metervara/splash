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

const SLEIGH_SOURCES = Array.from({ length: 29 }, (_, i) =>
  new URL(`./images/sleigh-${i + 1}.png`, import.meta.url).href
);

const SLEIGH_SCALE = 7;
const MAX_OFFSET = 0.8;
const REINDEER_COUNT = 5;
const SPACING = 5;

const REINS_SOURCE = new URL(`./images/reins.png`, import.meta.url).href;
const REINS_START_INDEX = 10;
const REINS_END_INDEX = (REINDEER_COUNT + SPACING) * REINDEER_SOURCES.length + 5;

console.log(`Reins from index: ${REINS_START_INDEX} to ${REINS_END_INDEX}`);

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
  const sleighImages = (await Promise.all(SLEIGH_SOURCES.map(loadImage))).reverse();

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
  let trailLength = (REINDEER_COUNT * reindeerImages.length + sleighImages.length + SPACING* REINDEER_COUNT) * MAX_OFFSET * SLEIGH_SCALE;
  trailLength += 5 * SLEIGH_SCALE; // Just some padding so it's guaranteed to be bigger than the trail
  console.log(trailLength);
  const trail = new Trail(trailLength);
  // const trail = new Trail(1000);

  let starfield: Starfield; // = new Starfield(200, { x: 0, y: 0, width: canvas.width, height: canvas.height });

  const resizeHandler = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
    disableImageSmoothing();
    center = new Vector2(rect.width * 0.5, rect.height * 0.5);
    // trail.setMaxLength(rect.width * 0.5);
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

    // starfield.getStars().forEach((star, index) => {
    //   drawStar(star, index);
    // });

    // DEBUG trail
    /*
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
    */

    // DEBUG TRAIL FOLLOWING
    // const followPointsDev = trail.getEvenlySpacedPoints(10, 20).reverse();
    // let size = 20;
    // followPointsDev.forEach((point) => {
    //   ctx.fillStyle = "red";
    //   ctx.fillRect(point.x - size* 0.5, point.y - size * 0.5, size, size);
    //   size -= 1;
    // });

    // SANTAS SLEIGH AND REINDEER FOLLOWING
    const framesPerItem = 29;
    const itemCount = (REINDEER_COUNT * framesPerItem) + (REINDEER_COUNT * SPACING) + framesPerItem;
    console.log(`Item count: ${itemCount}`);
    const followPoints = trail.getEvenlySpacedPoints(itemCount, SLEIGH_SCALE * MAX_OFFSET).reverse();
    
    const reinsImage = new Image();
    reinsImage.src = REINS_SOURCE;
    const reinsWidth = reinsImage.width * SLEIGH_SCALE;
    const reinsHeight = reinsImage.height * SLEIGH_SCALE;

    followPoints.forEach((point, index) => {
      const indexReversed = itemCount - index - 1;
      let image: HTMLImageElement | null = null;
      let isSpacing = false;
      
      // Determine which type of image to render based on position
      let position = indexReversed;

      // Draw reins if we're in the range
      if (position >= REINS_START_INDEX && position < REINS_END_INDEX) {
        ctx.drawImage(reinsImage, point.x - reinsWidth * 0.5, point.y - reinsHeight * 0.5, reinsWidth, reinsHeight);
      }
      
      // Process reindeer sections first (from back to front)
      for (let i = REINDEER_COUNT - 1; i >= 0; i--) {
        // Check if in this reindeer's frames
        if (position < framesPerItem) {
          image = reindeerImages[position];
          break;
        }
        position -= framesPerItem;
        
        // Check if in spacing after this reindeer
        if (position < SPACING) {
          isSpacing = true; // Mark as spacing
          break;
        }
        position -= SPACING;
      }
      
      let yOff = 0;
      // Check if we're in the sleigh section (at the front) - only if not spacing and haven't found an image
      if (!isSpacing && image === null && position >= 0 && position < framesPerItem) {
        image = sleighImages[position];
        yOff = 2 * SLEIGH_SCALE;
      }
      
      if (image) {
        const width = image.width * SLEIGH_SCALE;
        const height = image.height * SLEIGH_SCALE;
        ctx.drawImage(image, point.x - width * 0.5, point.y - height * 0.5 + yOff, width, height);
      }
    });
  }
  
  window.addEventListener("resize", resizeHandler);
  window.addEventListener("pointermove", pointerMoveHandler);
  
  resizeHandler();
  tick(0);
  // ctx.fillStyle = "red";
  // ctx.fillRect(0, 0, canvas.width, canvas.height);
});
