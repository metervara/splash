import { initSplashOverlay } from "/src/shared/utils";
import { ConfettiPaper, type ColorPair } from "./confetti/ConfettiPaper";
import { ConfettiRibbon } from "./confetti/ConfettiRibbon";

const CONFETTI_COUNT = 30;
const RIBBON_COUNT = 1;

const colors: ColorPair[] = [
  ["#df0049", "#660671"], // red
  ["#00e857", "#005291"], // green/mint
  ["#2bebbc", "#05798a"], // cyan/blue
  ["#0018ff", "#002369"], // blue
];

class ConfettiMain {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private ribbonCount: number;
  private paperCount: number;
  private confettiRibbons: ConfettiRibbon[];
  private confettiPapers: ConfettiPaper[];
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private accumulator: number = 0;
  private readonly fixedDelta: number = 1 / 60; // 60 FPS

  constructor() {
    const container = document.createElement("div");
    container.id = "metervara_confetti";
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

    this.ribbonCount = RIBBON_COUNT;
    this.paperCount = CONFETTI_COUNT;

    const rpCount = 30;
    const rpDist = 8.0;
    const rpThick = 8.0;

    ConfettiRibbon.bounds.x = this.canvas.width;
    ConfettiRibbon.bounds.y = this.canvas.height;
    this.confettiRibbons = [];

    for (let i = 0; i < this.ribbonCount; i++) {
      // Start ribbons just above the top edge so they always fall into view
      this.confettiRibbons[i] = new ConfettiRibbon(
        Math.random() * this.canvas.width,
        -(rpCount * rpDist),
        rpCount,
        rpDist,
        rpThick,
        45,
        1,
        0.05,
        colors
      );
    }

    ConfettiPaper.bounds.x = this.canvas.width;
    ConfettiPaper.bounds.y = this.canvas.height;
    this.confettiPapers = [];
    for (let i = 0; i < this.paperCount; i++) {
      // Start papers scattered across the screen
      this.confettiPapers[i] = new ConfettiPaper(
        Math.random() * this.canvas.width,
        Math.random() * this.canvas.height,
        colors
      );
    }
  }

  resize(): void {
    this.canvas.width =
      this.canvas.parentElement?.offsetWidth ?? window.innerWidth;
    this.canvas.height =
      this.canvas.parentElement?.offsetHeight ?? window.innerHeight;

    ConfettiPaper.bounds.x = this.canvas.width;
    ConfettiPaper.bounds.y = this.canvas.height;
    ConfettiRibbon.bounds.x = this.canvas.width;
    ConfettiRibbon.bounds.y = this.canvas.height;
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

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    let frameTime = (currentTime - this.lastFrameTime) / 1000.0; // seconds
    this.lastFrameTime = currentTime;

    // Prevent spiral of death when tab is inactive or CPU is throttled
    if (frameTime > 0.25) frameTime = 0.25; // cap at 250ms

    this.accumulator += frameTime;

    while (this.accumulator >= this.fixedDelta) {
      this.step(this.fixedDelta);
      this.accumulator -= this.fixedDelta;
    }

    this.render();
  };

  step(deltaTime: number): void {
    for (let i = 0; i < this.paperCount; i++) {
      this.confettiPapers[i].update(deltaTime);
    }

    for (let i = 0; i < this.ribbonCount; i++) {
      this.confettiRibbons[i].update(deltaTime);
    }
  }

  render(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.paperCount; i++) {
      this.confettiPapers[i].draw(this.context);
    }

    for (let i = 0; i < this.ribbonCount; i++) {
      this.confettiRibbons[i].draw(this.context);
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await initSplashOverlay();

  const confetti = new ConfettiMain();
  confetti.start();

  window.addEventListener("resize", () => {
    confetti.resize();
  });
});
