import { Trail } from "./Trail";
import { Vector2 } from "../shared/physics2d";
import { initSplashOverlay } from "/src/shared/utils";


document.addEventListener("DOMContentLoaded", async () => {
  await initSplashOverlay();

  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  const trail = new Trail(100);

  const resizeHandler = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
    trail.setMaxLength(rect.width * 0.5);
  };

  const pointerMoveHandler = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const point = new Vector2(e.clientX - rect.left, e.clientY - rect.top);
    trail.addPoint(point);
  };
  
  const tick = () => {
    requestAnimationFrame(tick);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "red";
    // ctx.lineWidth = 2;
    
    const points = trail.getPoints();
    const totalLength = trail.getTotalLength();
    console.log(points.length, totalLength);
    
    if(points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for(let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }

    const followPoints = trail.getEvenlySpacedPoints(10, 50);
    followPoints.forEach((point) => {
      ctx.fillStyle = "red";
      ctx.fillRect(point.x - 5, point.y - 5, 10, 10);
    });
  }
  
  window.addEventListener("resize", resizeHandler);
  window.addEventListener("pointermove", pointerMoveHandler);
  
  resizeHandler();
  tick();
  // ctx.fillStyle = "red";
  // ctx.fillRect(0, 0, canvas.width, canvas.height);
});
