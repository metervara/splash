import { initSplashOverlay } from "/src/shared/utils";


document.addEventListener("DOMContentLoaded", async () => {
  const svg = document.getElementById("svg-container") as unknown as SVGElement;
  const svgText = document.getElementById("svg-text") as unknown as SVGElement;

  const speed = 0.005;
  
  const tick = (time: number) => {
    requestAnimationFrame(tick);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const amount = w * 0.01;
    const xOff = Math.sin(time * speed) * amount;
    const yOff = Math.cos(time * speed) * amount;
    svgText.setAttribute('x', `${w * 0.5 + xOff}px`);
    svgText.setAttribute('y', `${h * 0.5 + yOff}px`);
    // svgText.style.transform = `translate(${xOff}px, ${yOff}px)`;
  };

  tick(0);

  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  });
  
  await initSplashOverlay();
});
