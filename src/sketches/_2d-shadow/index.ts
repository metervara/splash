import { initSplashOverlay } from "/src/shared/utils";
import { svgPathToEdges, edgesToSvgPath, pointLight, findShadowSilhouette } from "/src/shared/shadows";
import type { Edge } from "/src/shared/shadows";

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

// 100x100 svg path for the M shape
const mShape = 'M0 100V0H24.2105L49.9248 46.8481H50.2256L75.6391 0H100V100H78.4962V34.384H78.0451L70.3759 48.9971L49.9248 84.384L29.9248 49.1404L21.9549 33.3811H21.5038V100H0Z';
const mEdges = svgPathToEdges(mShape);
let mScaledEdges: Edge[] = [];
let mShapeScaled: string = '';

const light = pointLight({ x: 0, y: 1 });


const updateCanvas = (x: number | null = null, y: number | null = null) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw M shape
  const M = new Path2D(mShapeScaled);
  ctx.strokeStyle = 'none';
  ctx.fillStyle = 'blue';
  ctx.fill(M);

  // Draw shadow
  if (x !== null && y !== null) {
    light.position = { x, y };
    // Extract shadow casting edges
    const { boundary, castingChains, isCCW } = findShadowSilhouette(mScaledEdges, light)
    console.log(boundary, castingChains, isCCW);

    // DEV: Draw shadow casting edges
    
    ctx.save();
    ctx.fillStyle = 'none';
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 5;
    for (const chain of castingChains) {
      for (const edge of chain) {
        ctx.beginPath();
        ctx.moveTo(edge.start.x, edge.start.y);
        ctx.lineTo(edge.end.x, edge.end.y);
        ctx.stroke();
      }
    }
    ctx.restore();
    
    
    // build shadow geometry

    // draw shadow geometry with a gradient fill in the direction of the light source
  }
}

const resizeCanvas = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = w;
  canvas.height = h;

  const xCenter = w / 2;
  const yCenter = h / 2;
  const size = Math.min(w, h) * 0.35;
  const scale = size / 100; // m original shape is 100x100 px
  const halfScaledSize = 50 * scale;

  mScaledEdges = mEdges.map(edge => ({
    start: { x: edge.start.x * scale + xCenter - halfScaledSize, y: edge.start.y * scale + yCenter - halfScaledSize },
    end: { x: edge.end.x * scale + xCenter - halfScaledSize, y: edge.end.y * scale + yCenter - halfScaledSize },
    firstIsBoundary: edge.firstIsBoundary,
    lastIsBoundary: edge.lastIsBoundary,
  }));

  mShapeScaled = edgesToSvgPath(mScaledEdges);

  updateCanvas();
}

const pointerMove = (event: PointerEvent) => {
  const x = event.clientX;
  const y = event.clientY;
  updateCanvas(x, y);
}

document.addEventListener("DOMContentLoaded", async () => {
  canvas = document.getElementById('2d-shadow') as HTMLCanvasElement;
  ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('pointermove', pointerMove);
  resizeCanvas();

  await initSplashOverlay();
});
