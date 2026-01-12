import { initSplashOverlay } from "/src/shared/utils";
import { Network, Node, Vec2, AttractorPatterns, Utilities } from 'space-colonization';
import Settings from './Settings';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let network: Network;

// Create the network with initial conditions
function setupNetwork() {
  // Initialize simulation object
  network = new Network(ctx, Settings);

  // Set up attractors using grid pattern (150 rows x 100 cols with 10px jitter)
  network.attractors = AttractorPatterns.getGridOfAttractors(150, 100, ctx, 10);

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
