import { initSplashOverlay } from "/src/shared/utils";
import { Network, Node, Vec2, AttractorPatterns, Utilities, SVGLoader, Path } from 'space-colonization';
import Settings from './Settings';
import mShapeSvg from './m-shape.svg?raw';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let network: Network;
let boundPolygons: number[][][] = []; // Store polygon data for point-in-polygon checks

// Point-in-polygon test using ray-casting algorithm
function isPointInPolygon(point: Vec2, polygon: number[][]): boolean {
  const x = point.x;
  const y = point.y;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

// Check if a point is inside any of the bounds
function isPointInBounds(point: Vec2): boolean {
  // Check if point is inside any of the bound polygons
  for (const polygon of boundPolygons) {
    if (isPointInPolygon(point, polygon)) {
      return true;
    }
  }
  return false;
}

// Create bounds from the M shape SVG
function createMShapeBounds(): { bounds: Path[]; polygons: number[][][] } {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  
  // SVG viewBox dimensions (original)
  const svgWidth = 800;
  const svgHeight = 840;
  
  // Scale based on viewport - use 60% of the smaller dimension to ensure it fits
  const maxWidth = window.innerWidth * 0.6;
  const maxHeight = window.innerHeight * 0.8;
  
  // Calculate scale to fit while maintaining aspect ratio
  const scale = Math.min(maxWidth / svgWidth, maxHeight / svgHeight);
  
  const shapeWidth = svgWidth * scale;
  const shapeHeight = svgHeight * scale;

  const polygons = SVGLoader.load(mShapeSvg);
  const bounds: Path[] = [];
  const scaledPolygons: number[][][] = [];

  for (const polygon of polygons) {
    // Create a copy of the polygon for our point-in-polygon checks
    const scaledPolygon = polygon.map(point => [
      cx - shapeWidth / 2 + point[0] * scale,
      cy - shapeHeight / 2 + point[1] * scale
    ]);
    scaledPolygons.push(scaledPolygon);

    // Scale and translate the design to the screen center
    for (const point of polygon) {
      point[0] = cx - shapeWidth / 2 + point[0] * scale;
      point[1] = cy - shapeHeight / 2 + point[1] * scale;
    }

    bounds.push(new Path(polygon, 'Bounds', ctx, Settings));
  }

  return { bounds, polygons: scaledPolygons };
}

// Create the network with initial conditions
function setupNetwork() {
  // Initialize simulation object
  network = new Network(ctx, Settings);

  // Create bounds from M shape
  const { bounds, polygons } = createMShapeBounds();
  network.bounds = bounds;
  boundPolygons = polygons;

  // Calculate bounding box for the M shape to improve sampling efficiency
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const polygon of polygons) {
    for (const point of polygon) {
      minX = Math.min(minX, point[0]);
      minY = Math.min(minY, point[1]);
      maxX = Math.max(maxX, point[0]);
      maxY = Math.max(maxY, point[1]);
    }
  }

  // Set up attractors using grid pattern, constrained to bounds
  network.attractors = AttractorPatterns.getGridOfAttractors(150, 100, ctx, 10, network.bounds);

  // Share the network's settings with all attractors (by reference)
  for (const attractor of network.attractors) {
    attractor.settings = network.settings;
  }

  // Add a set of random root nodes inside the M shape bounds using rejection sampling
  const numNodes = 10;
  const maxAttempts = 1000; // Prevent infinite loops
  let nodesAdded = 0;
  let attempts = 0;

  while (nodesAdded < numNodes && attempts < maxAttempts) {
    attempts++;
    const point = new Vec2(
      Utilities.random(maxX - minX) + minX,
      Utilities.random(maxY - minY) + minY
    );

    if (isPointInBounds(point)) {
      network.addNode(
        new Node(null, point, true, ctx, Settings)
      );
      nodesAdded++;
    }
  }
}

// Main animation loop
function animate() {
  network.update();
  network.draw();
  requestAnimationFrame(animate);
}

document.addEventListener("DOMContentLoaded", async () => {
  // Get existing canvas
  canvas = document.getElementById('space-colonization') as HTMLCanvasElement;
  ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  // Resize handler
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // Initial resize
  resizeCanvas();

  // Listen for window resize
  window.addEventListener('resize', resizeCanvas);

  // Setup network with initial conditions
  setupNetwork();

  // Begin animation loop
  requestAnimationFrame(animate);

  await initSplashOverlay();
});
