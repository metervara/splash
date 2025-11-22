import { initSplashOverlay } from "/src/shared/utils";


document.addEventListener("DOMContentLoaded", async () => {
  const svg = document.getElementById("svg-container") as unknown as SVGElement;

  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  });
  await initSplashOverlay();
});
