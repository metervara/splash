import { initSplashOverlay } from "/src/shared/utils";
import { Network, Node, Vec2, AttractorPatterns, Utilities, SVGLoader, Path } from 'space-colonization';
import Settings from './Settings';
import mShapeSvg from './m-shape.svg?raw';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let network: Network;

// Create bounds from the M shape SVG
function createMShapeBounds(): Path[] {
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

  for (const polygon of polygons) {
    // Scale and translate the design to the screen center
    for (const point of polygon) {
      point[0] = cx - shapeWidth / 2 + point[0] * scale;
      point[1] = cy - shapeHeight / 2 + point[1] * scale;
    }

    bounds.push(new Path(polygon, 'Bounds', ctx, Settings));
  }

  return bounds;
}

// Create the network with initial conditions
function setupNetwork() {
  // Initialize simulation object
  network = new Network(ctx, Settings);

  // Create bounds from M shape
  network.bounds = createMShapeBounds();

  // Set up attractors using grid pattern, constrained to bounds
  network.attractors = AttractorPatterns.getGridOfAttractors(150, 100, ctx, 10, network.bounds);

  // Share the network's settings with all attractors (by reference)
  for (const attractor of network.attractors) {
    attractor.settings = network.settings;
  }

  // Add a set of random root nodes throughout scene
  for (let i = 0; i < 10; i++) {
    network.addNode(
      new Node(
        null,
        new Vec2(
          Utilities.random(window.innerWidth),
          Utilities.random(window.innerHeight)
        ),
        true,
        ctx,
        Settings
      )
    );
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
