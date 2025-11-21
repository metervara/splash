import { VerletMass, Vector2 } from "../shared/physics2d";
import { initSplashOverlay } from "/src/shared/utils";
import { getQuads } from "./quads";

// const colors = [
//   ["#df0049", "#660671"], // red
//   ["#00e857", "#005291"], // green/mint
//   ["#2bebbc", "#05798a"], // cyan/blue
//   ["#0018ff", "#002369"], // blue
// ];

const MASS = 1;
const DRAG = 0.01;
const VELOCITY_SCALE = 50;
const POINT_LIFETIME_MS = 5000; // 1 second

let oddEven = false

class RibbonMain {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private accumulator: number = 0;
  private readonly fixedDelta: number = 1 / 60; // 60 FPS

  private pointerPosition: Vector2 = new Vector2(0, 0);
  private pointerDelta: Vector2 = new Vector2(0, 0);
  private previousPointerPosition: Vector2 = new Vector2(0, 0);
  private previousPointerDelta: Vector2 = new Vector2(0, 0);
  private lastPointerMoveTime: number = 0;
  private points: { mass: VerletMass, created: Date, oddEven: boolean }[] = [];
  private allPoints: { position: Vector2, oddEven: boolean }[] = [];

  // Spawning configuration
  private maxDistanceToSpawn: number = Number.MAX_SAFE_INTEGER; // Spawn if distance exceeds this
  private minDistanceToSpawn: number = Number.MAX_SAFE_INTEGER; // Don't spawn if distance is below this
  private thickness: number = 50;
  // private angleThreshold: number = 90; // Angle threshold in degrees for segment-to-segment comparison
  private movementAngleThreshold: number = 90; // Angle threshold in degrees for movement vs segment direction
  // private readonly maxPoints: number = 10;
  private ribbonLength: number = 0;
  private traveledLength: number = 0;
  private maxRibbonLength: number = 5000;

  constructor() {
    const container = document.createElement("div");
    container.id = "metervara_ribbon";
    container.style.cssText =
      "position: fixed; left: 0em; top: 0em; z-index: 1; width: 100%; height: 100%; pointer-events: none;";
    document.body.insertBefore(container, document.body.firstChild);

    this.canvas = document.createElement("canvas");
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get 2d context");
    }
    this.context = ctx;

    this.resize();
  }

  spawnPoint(): void {
    const mass = new VerletMass(this.pointerPosition.x, this.pointerPosition.y, MASS, DRAG);
    
    // Only set initial velocity if movement is significant (not for first point or very slow movement)
    const minVelocityThreshold = 5.0; // Minimum velocity magnitude to apply
    const deltaLength = this.pointerDelta.length();
    
    if (this.points.length > 0 && deltaLength * 10 > minVelocityThreshold) {
      // Set initial velocity based on pointer movement for subsequent points
      const initialVelocity = Vector2.mul(this.pointerDelta, VELOCITY_SCALE); // Scale as needed
      mass.setVelocity(-initialVelocity.x, -initialVelocity.y, this.fixedDelta);
    }
    // First point starts with zero velocity (stays at pointer position)
    this.points.push({ mass, created: new Date(), oddEven });
    this.updateAllPointsAndRecalculateLength();

    oddEven = !oddEven;
  }

  updateAllPointsAndRecalculateLength(): void {
    this.allPoints = [...this.points.map(p => {return {position: p.mass.position, oddEven: p.oddEven}}), {position: this.pointerPosition, oddEven: false}];
    this.ribbonLength = this.allPoints.reduce((total, currentPoint, index) => {
      if (index === 0) return total;
      const previousPoint = this.allPoints[index - 1];
      return total + Vector2.distance(previousPoint.position, currentPoint.position);
    }, 0);
  }

  resize(): void {
    this.canvas.width =
      this.canvas.parentElement?.offsetWidth ?? window.innerWidth;
    this.canvas.height =
      this.canvas.parentElement?.offsetHeight ?? window.innerHeight;

    const screenWidth = this.canvas.width;
    this.maxDistanceToSpawn = screenWidth * 0.35;
    this.minDistanceToSpawn = screenWidth * 0.2;
    this.maxRibbonLength = screenWidth * 5;
    this.thickness = screenWidth * 0.1;

    console.log("maxDistanceToSpawn", this.maxDistanceToSpawn);
    console.log("minDistanceToSpawn", this.minDistanceToSpawn);
    console.log("maxRibbonLength", this.maxRibbonLength);
  }

  updateFollowPoint(x: number, y: number): void {
    // Store previous position and delta
    this.previousPointerPosition.x = this.pointerPosition.x;
    this.previousPointerPosition.y = this.pointerPosition.y;
    this.previousPointerDelta.x = this.pointerDelta.x;
    this.previousPointerDelta.y = this.pointerDelta.y;
    
    // Update current position
    this.pointerPosition.x = x;
    this.pointerPosition.y = y;
    
    // Calculate delta
    this.pointerDelta.x = this.pointerPosition.x - this.previousPointerPosition.x;
    this.pointerDelta.y = this.pointerPosition.y - this.previousPointerPosition.y;
    
    // Update last movement time
    this.lastPointerMoveTime = performance.now();
  }

  start(): void {
    this.stop();
    // Start animation loop
    this.lastFrameTime = performance.now();
    this.accumulator = 0;
    this.animate();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * 
   * When ribbon length is above theshold this function will remove points until below the threshold, and then add teh last removed point back in
   * We need one point beyond the threshold, so we can draw the last segment partially 
   */
  private trimPoints(): void {
    // Delete based on total ribbon length
    if(this.allPoints.length < 2 || this.ribbonLength <= this.maxRibbonLength) {
      return;
    }


    let removedPoint: { mass: VerletMass, created: Date, oddEven: boolean } | undefined = undefined;

    while(this.ribbonLength > this.maxRibbonLength && this.points.length > 0) {
      removedPoint = this.points.shift();
      if(!removedPoint) {
        break;
      }

      this.updateAllPointsAndRecalculateLength();
    }


    if(removedPoint) {
      this.points.unshift(removedPoint);
      this.updateAllPointsAndRecalculateLength();
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    let frameTime = (currentTime - this.lastFrameTime) / 1000.0; // seconds
    this.lastFrameTime = currentTime;

    // Prevent spiral of death when tab is inactive or CPU is throttled
    if (frameTime > 0.25) frameTime = 0.25; // cap at 250ms

    // Reset delta if no pointer movement for more than one frame (16ms at 60fps)
    // This ensures delta is zero when mouse stops moving
    if (this.lastPointerMoveTime > 0 && currentTime - this.lastPointerMoveTime > 20) {
      this.pointerDelta.x = 0;
      this.pointerDelta.y = 0;
    }

    this.accumulator += frameTime;

    while (this.accumulator >= this.fixedDelta) {
      this.step(this.fixedDelta);
      this.accumulator -= this.fixedDelta;
    }

    // Check if we should spawn a new point (once per frame)
    if (this.shouldSpawn()) {
      this.spawnPoint();
    }

    this.trimPoints();

    // No deletion on time, we use a length of the entire ribbon to remove points
    // if(this.points.length > this.maxPoints) {
    //   this.points.shift();
    // }

    this.render();
  };

  private shouldSpawn(): boolean {
    // If no points exist, spawn the first point (only if pointer has moved)
    if (this.points.length === 0) {
      if (this.pointerDelta.length() > 0.1) {
        // console.log("SPAWN: First point (pointer moved)");
        return true;
      }
      return false;
    }

    const latestPoint = this.points[this.points.length - 1];
    const distanceToLatest = Vector2.distance(this.pointerPosition, latestPoint.mass.position);

    // Don't spawn if distance is below minimum threshold
    if (distanceToLatest < this.minDistanceToSpawn) {
      // console.log(`SPAWN BLOCKED: Distance too small (${distanceToLatest.toFixed(2)} < ${this.minDistanceToSpawn.toFixed(2)})`);
      return false;
    }

    // Current segment: pointer to last point
    const currentSegment = Vector2.sub(this.pointerPosition, latestPoint.mass.position);

    // Check if mouse movement direction differs from current segment direction
    // This allows the segment to grow when dragging in the same direction,
    // but spawns a new point when moving in a different direction
    if (this.pointerDelta.length() > 0.1 && currentSegment.length() > 0.1) {
      const movementNormalized = this.pointerDelta.normalized();
      const segmentNormalized = currentSegment.normalized();
      
      // Calculate dot product to get angle between movement and segment direction
      const dotProduct = movementNormalized.x * segmentNormalized.x + movementNormalized.y * segmentNormalized.y;
      // Clamp to [-1, 1] to avoid NaN from acos
      const clampedDot = Math.max(-1, Math.min(1, dotProduct));
      const angle = Math.acos(clampedDot);
      const angleDeg = angle * 180 / Math.PI;
      
      // Convert threshold from degrees to radians
      const movementThresholdRad = this.movementAngleThreshold * Math.PI / 180;
      
      if (angle > movementThresholdRad) {
        // console.log(`SPAWN: Movement angle threshold exceeded (${angleDeg.toFixed(2)}° > ${this.movementAngleThreshold}°)`);
        return true;
      }
    }

    // If only 1 point exists, spawn when distance exceeds maximum threshold
    if (this.points.length === 1) {
      if (distanceToLatest > this.maxDistanceToSpawn) {
        // console.log(`SPAWN: Distance exceeds max (${distanceToLatest.toFixed(2)} > ${this.maxDistanceToSpawn.toFixed(2)}) - single point`);
        return true;
      }
      return false;
    }

    // If 2+ points exist, check angle between segments
    // Previous segment: last point to second-to-last point
    // const secondToLastPoint = this.points[this.points.length - 2];
    // const previousSegment = Vector2.sub(latestPoint.mass.position, secondToLastPoint.mass.position);
    
    // Only check angle if both segments have meaningful length
    /*
    if (currentSegment.length() > 0.1 && previousSegment.length() > 0.1) {
      const currentNormalized = currentSegment.normalized();
      const previousNormalized = previousSegment.normalized();
      
      // Calculate dot product to get angle
      const dotProduct = currentNormalized.x * previousNormalized.x + currentNormalized.y * previousNormalized.y;
      // Clamp to [-1, 1] to avoid NaN from acos
      const clampedDot = Math.max(-1, Math.min(1, dotProduct));
      const angle = Math.acos(clampedDot);
      const angleDeg = angle * 180 / Math.PI;
      
      // Convert threshold from degrees to radians
      const thresholdRad = this.angleThreshold * Math.PI / 180;
      
      if (angle > thresholdRad) {
        console.log(`SPAWN: Segment-to-segment angle threshold exceeded (${angleDeg.toFixed(2)}° > ${this.angleThreshold}°)`);
        return true;
      }
    }
    */

    return false;
  }

  step(deltaTime: number): void {
    // TODO: Update physics
    for (const point of this.points) {
      point.mass.integrate(deltaTime);
    }
  }

  render(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const quads = getQuads(this.allPoints, this.thickness);
    if(this.ribbonLength > this.maxRibbonLength) {

      const partialQuad = quads.shift();
      if(partialQuad) {
        const segmentLength = partialQuad.length;
        const excessLength = this.ribbonLength - this.maxRibbonLength;
        const partialPercentage = excessLength / segmentLength;
        // console.log("partialPercentage", partialPercentage);
        const partial0 = Vector2.lerp(partialQuad.p0, partialQuad.p1, partialPercentage);
        const partial3 = Vector2.lerp(partialQuad.p3, partialQuad.p2, partialPercentage);
        // this.context.fillStyle = "cyan"
        this.context.fillStyle = partialQuad.oddEven ? "blue" : "#000099";

        this.context.beginPath();
        this.context.moveTo(partial0.x, partial0.y);
        this.context.lineTo(partialQuad.p1.x, partialQuad.p1.y);
        this.context.lineTo(partialQuad.p2.x, partialQuad.p2.y);
        this.context.lineTo(partial3.x, partial3.y);

        
        this.context.closePath();
        this.context.fill();
        this.context.stroke();
      }
    }

    this.context.strokeStyle = "#ff00ff";
    for (const quad of quads) {
      this.context.fillStyle = quad.oddEven ? "blue" : "#000099";
      this.context.beginPath();
      this.context.moveTo(quad.p0.x, quad.p0.y);
      this.context.lineTo(quad.p1.x, quad.p1.y);
      this.context.lineTo(quad.p2.x, quad.p2.y);
      this.context.lineTo(quad.p3.x, quad.p3.y);
      this.context.closePath();
      this.context.fill();
      this.context.stroke();
    }

    // DEBUG
    this.context.strokeStyle = "red";
    // draw pointer point as cross
    const size = 20;

    this.context.beginPath();
    this.context.moveTo(this.pointerPosition.x - size, this.pointerPosition.y - size);
    this.context.lineTo(this.pointerPosition.x + size, this.pointerPosition.y + size);
    this.context.moveTo(this.pointerPosition.x + size, this.pointerPosition.y - size);
    this.context.lineTo(this.pointerPosition.x - size, this.pointerPosition.y + size);
    this.context.stroke();

    // draw ribbon line (for debugging purposes)
    if(this.allPoints.length > 0) {
      this.context.beginPath();
      this.context.moveTo(this.allPoints[0].position.x, this.allPoints[0].position.y);
    }
    
    for (let i = 1; i < this.allPoints.length; i++) {
      this.context.lineTo(this.allPoints[i].position.x, this.allPoints[i].position.y);
    } // end at mouse position
    this.context.stroke();
    /*
    if (this.points.length > 0) {
      this.context.beginPath();
      this.context.moveTo(this.points[0].mass.position.x, this.points[0].mass.position.y);
      
      for (let i = 1; i < this.points.length; i++) {
        this.context.lineTo(this.points[i].mass.position.x, this.points[i].mass.position.y);
      }
      this.context.lineTo(this.pointerPosition.x, this.pointerPosition.y); // end at mouse position
      this.context.stroke();
    }

      */
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await initSplashOverlay();

  const ribbon = new RibbonMain();
  ribbon.start();

  window.addEventListener("resize", () => {
    ribbon.resize();
  });

  window.addEventListener("pointermove", (e: PointerEvent) => {
    ribbon.updateFollowPoint(e.clientX, e.clientY);
  });
});
