import { initSplashOverlay } from "/src/shared/utils";
import { svgPathToEdges, pointLight, findShadowSilhouette } from "/src/shared/shadows";
import type { Edge } from "/src/shared/shadows";

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

const ENABLE_INSIDE_CHECK = false;

const M = "M39.2 38.7L40 19.2H39.1L26.1 55.1L13.1 19.2H12.2L13 38.7V69.8H0V0H17.7L26.3 23.5H27.1L35.7 0H52.2V69.8H39.2V38.7Z";
const E = "M64.0609 69.8V0H108.661V12.3H79.0609V28.3H107.661V40.6H79.0609V57.5H108.661V69.8H64.0609Z";
const T = "M153.522 12.3V69.8H138.522V12.3H118.422V0H173.622V12.3H153.522Z";
const E2 = "M183.983 69.8V0H228.583V12.3H198.983V28.3H227.583V40.6H198.983V57.5H228.583V69.8H183.983Z";
const R = "M258.344 69.8H243.544V0H270.544C273.944 0 276.977 0.533332 279.644 1.6C282.31 2.6 284.544 4.06666 286.344 6C288.21 7.93333 289.61 10.2667 290.544 13C291.477 15.7333 291.944 18.8 291.944 22.2C291.944 27.1333 290.877 31.3667 288.744 34.9C286.61 38.4333 283.577 40.7667 279.644 41.9L293.344 69.8H276.944L265.244 43.9H258.344V69.8ZM266.944 32.3C270.477 32.3 272.91 31.6333 274.244 30.3C275.644 28.9667 276.344 26.7667 276.344 23.7V20.7C276.344 17.6333 275.644 15.4333 274.244 14.1C272.91 12.7667 270.477 12.1 266.944 12.1H258.344V32.3H266.944Z";
const V = "M315.305 69.8L296.805 0H313.505L321.705 35.5L325.805 55.6H326.605L330.805 35.5L339.105 0H355.005L336.505 69.8H315.305Z";
const A = "M399.366 69.8L394.966 53H375.866L371.566 69.8H356.366L375.266 0H396.466L415.366 69.8H399.366ZM385.866 14.5H385.066L378.266 40.9H392.666L385.866 14.5Z";
const R2 = "M438.227 69.8H423.427V0H450.427C453.827 0 456.86 0.533332 459.527 1.6C462.193 2.6 464.427 4.06666 466.227 6C468.093 7.93333 469.493 10.2667 470.427 13C471.36 15.7333 471.827 18.8 471.827 22.2C471.827 27.1333 470.76 31.3667 468.627 34.9C466.493 38.4333 463.46 40.7667 459.527 41.9L473.227 69.8H456.827L445.127 43.9H438.227V69.8ZM446.827 32.3C450.36 32.3 452.793 31.6333 454.127 30.3C455.527 28.9667 456.227 26.7667 456.227 23.7V20.7C456.227 17.6333 455.527 15.4333 454.127 14.1C452.793 12.7667 450.36 12.1 446.827 12.1H438.227V32.3H446.827Z";
const A2 = "M519.287 69.8L514.888 53H495.788L491.487 69.8H476.288L495.188 0H516.388L535.287 69.8H519.287ZM505.788 14.5H504.987L498.188 40.9H512.588L505.788 14.5Z";

const letterPaths = [M, E, T, E2, R, V, A, R2, A2];

// Parse each letter path into edges, split out outer vs hole subpaths
const letterEdges = letterPaths.map(p => svgPathToEdges(p));

function splitIntoSubpaths(edges: Edge[]): Edge[][] {
  if (edges.length === 0) return [];
  const result: Edge[][] = [];
  let current: Edge[] = [edges[0]];
  for (let i = 1; i < edges.length; i++) {
    const prevEnd = current[current.length - 1].end;
    const thisStart = edges[i].start;
    if (Math.abs(prevEnd.x - thisStart.x) > 1e-6 || Math.abs(prevEnd.y - thisStart.y) > 1e-6) {
      result.push(current);
      current = [];
    }
    current.push(edges[i]);
  }
  if (current.length > 0) result.push(current);
  return result;
}

// Reverse edge winding so shadow casts from the opposite side
function reverseEdges(edges: Edge[]): Edge[] {
  return edges.slice().reverse().map(e => ({
    start: e.end,
    end: e.start,
    firstIsBoundary: e.lastIsBoundary,
    lastIsBoundary: e.firstIsBoundary,
  }));
}

// Outer subpaths (index 0) are used for shadow casting.
// Hole subpaths (index 1+) are reversed so normals point correctly.
const letterSplit = letterEdges.map(edges => splitIntoSubpaths(edges));
const letterOuterEdges = letterSplit.map(sp => sp[0]);
const letterHoleEdges = letterSplit.map(sp => sp.slice(1).map(reverseEdges));

function computeBoundingBox(edgesArrays: Edge[][]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const edges of edgesArrays) {
    for (const e of edges) {
      minX = Math.min(minX, e.start.x, e.end.x);
      minY = Math.min(minY, e.start.y, e.end.y);
      maxX = Math.max(maxX, e.start.x, e.end.x);
      maxY = Math.max(maxY, e.start.y, e.end.y);
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

const bbox = computeBoundingBox(letterEdges);

// Scaled data, updated on resize
let scaledOuterEdges: Edge[][] = [];
let _scaledHoleEdges: Edge[][][] = []; // stored for later use
let currentScale = 1;
let currentOffsetX = 0;
let currentOffsetY = 0;

const light = pointLight({ x: 0, y: 1 });

function isPointInPolygon(px: number, py: number, edges: Edge[]): boolean {
  let inside = false;
  for (const e of edges) {
    const { start, end } = e;
    if (((start.y > py) !== (end.y > py)) &&
        (px < (end.x - start.x) * (py - start.y) / (end.y - start.y) + start.x)) {
      inside = !inside;
    }
  }
  return inside;
}

const PROJ_SCALE = 100;
const GRADIENT_RADIUS = 0.6; // Factor of viewport width

const updateCanvas = (x: number | null = null, y: number | null = null) => {
  const bgColor = "#880033";
  const shadowColor = "#0000ff";

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Light glow behind everything
  if (x !== null && y !== null) {
    const glowRadius = GRADIENT_RADIUS * canvas.width;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
    glow.addColorStop(0, '#ff9999');
    glow.addColorStop(1, bgColor);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Collect all shadow chains (outer + holes), sort by distance, draw together
  if (x !== null && y !== null) {
    light.position = { x, y };

    const allChains: Edge[][] = [];

    for (let li = 0; li < scaledOuterEdges.length; li++) {
      if (ENABLE_INSIDE_CHECK && isPointInPolygon(x, y, scaledOuterEdges[li])) continue;
      const { castingChains } = findShadowSilhouette(scaledOuterEdges[li], light);
      allChains.push(...castingChains);

      for (const holeEdges of _scaledHoleEdges[li]) {
        const hole = findShadowSilhouette(holeEdges, light, 1e-9, true);
        allChains.push(...hole.castingChains);
      }
    }

    // Sort: closest first so farthest (lighter) shadow wins in overlaps
    const chainDist = (chain: Edge[]) => {
      const verts = [chain[0].start, ...chain.map(e => e.end)];
      const mx = verts.reduce((s, v) => s + v.x, 0) / verts.length;
      const my = verts.reduce((s, v) => s + v.y, 0) / verts.length;
      return Math.hypot(mx - x, my - y);
    };
    allChains.sort((a, b) => chainDist(a) - chainDist(b));

    ctx.save();

    const grad = ctx.createRadialGradient(x, y, 0, x, y, GRADIENT_RADIUS * canvas.width);
    grad.addColorStop(0, shadowColor);
    grad.addColorStop(1, bgColor);
    ctx.fillStyle = grad;

    for (const chain of allChains) {
      const verts = [chain[0].start];
      for (const edge of chain) verts.push(edge.end);

      const projected = verts.map(v => ({
        x: v.x + (v.x - x) * PROJ_SCALE,
        y: v.y + (v.y - y) * PROJ_SCALE,
      }));

      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
      for (let i = projected.length - 1; i >= 0; i--) ctx.lineTo(projected[i].x, projected[i].y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // Draw all letter shapes on top using canvas transform with original SVG paths
  ctx.save();
  ctx.translate(currentOffsetX, currentOffsetY);
  ctx.scale(currentScale, currentScale);
  ctx.fillStyle = '#15BABC';
  for (const path of letterPaths) {
    const p = new Path2D(path);
    ctx.fill(p);
  }
  ctx.restore();
}

const resizeCanvas = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = w;
  canvas.height = h;

  // Scale to fit all letters centered on screen
  currentScale = Math.min(w * 0.8 / bbox.width, h * 0.8 / bbox.height);
  const scaledWidth = bbox.width * currentScale;
  const scaledHeight = bbox.height * currentScale;
  currentOffsetX = (w - scaledWidth) / 2 - bbox.minX * currentScale;
  currentOffsetY = (h - scaledHeight) / 2 - bbox.minY * currentScale;

  const scaleEdges = (edges: Edge[]) => edges.map(e => ({
    start: {
      x: e.start.x * currentScale + currentOffsetX,
      y: e.start.y * currentScale + currentOffsetY,
    },
    end: {
      x: e.end.x * currentScale + currentOffsetX,
      y: e.end.y * currentScale + currentOffsetY,
    },
    firstIsBoundary: e.firstIsBoundary,
    lastIsBoundary: e.lastIsBoundary,
  }));

  scaledOuterEdges = letterOuterEdges.map(scaleEdges);
  _scaledHoleEdges = letterHoleEdges.map(holes => holes.map(scaleEdges));

  updateCanvas();
}

const pointerMove = (event: PointerEvent) => {
  updateCanvas(event.clientX, event.clientY);
}

document.addEventListener("DOMContentLoaded", async () => {
  canvas = document.getElementById('2d-shadow') as HTMLCanvasElement;
  ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('pointermove', pointerMove);
  resizeCanvas();

  await initSplashOverlay();
});
