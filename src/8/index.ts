import { bellCurveSegmentAngles } from "../shared/bellCurve";
import { initSplashOverlay } from "/src/shared/utils";


document.addEventListener("DOMContentLoaded", async () => {

  const curveSegments = 15;
  const splitHeight = 30;
  const curveHeightRatio = 0.1;
  const main = document.querySelector("main") as HTMLElement;
  const follower = document.querySelector(".follower") as HTMLElement;
  const split = document.querySelector(".split") as HTMLElement;
  const left = document.querySelector(".split > .left") as HTMLElement;
  const right = document.querySelector(".split > .right") as HTMLElement;
  const itemsLeft: HTMLElement[] = [];
  const itemsRight: HTMLElement[] = [];
  let mainClone: HTMLElement | null = null;

  const createSplitItems = (curveSegments: number) => {
    const content = document.querySelector("main") as HTMLElement;

    for (let i = 0; i < curveSegments; i++) {
      // const peakPercentage = i / (curveSegments - 1) * 100;
      const t = i / (curveSegments - 1);
      const peakPercentage = (1 - Math.abs(2 * t - 1)) * 100;

      const cloneL = content.cloneNode(true) as HTMLElement;
      const cloneR = content.cloneNode(true) as HTMLElement;
      cloneL.classList.remove("scroll-host");
      cloneR.classList.remove("scroll-host");
      const itemL = document.createElement("div");
      const itemR = document.createElement("div");
      itemL.appendChild(cloneL);
      itemR.appendChild(cloneR);
      itemL.classList.add("item");
      itemR.classList.add("item");
      itemL.style.setProperty("--peak", `${peakPercentage}%`);
      itemR.style.setProperty("--peak", `${peakPercentage}%`);
      left.appendChild(itemL);
      right.appendChild(itemR);
      itemsLeft.push(itemL);
      itemsRight.push(itemR);
    }
  }

  const syncWithScroll = () => {
    const scrollTop = window.scrollY;
    // Drive scroll via global CSS var so both base clone and slices are in sync
    document.documentElement.style.setProperty("--scroll-top", `${-scrollTop}px`);
    requestAnimationFrame(syncWithScroll);
  }

  // Removed per-item scroll updates; global CSS var now drives transforms

  const onResize = () => {
    const splitMarginHeight = (100 - splitHeight) / 2.0;

    const curveWidth = window.innerHeight * (splitHeight / 100.0) ;
    const curveHeight = curveWidth * curveHeightRatio;
    split.style.setProperty("--split-height", `${splitMarginHeight}vh`);
    split.style.setProperty("--split-segment-height", `${curveWidth / curveSegments}px`);
    split.style.setProperty("--split-top", `${left.offsetTop}px`);
    
    const angles = bellCurveSegmentAngles(curveSegments, curveWidth, curveHeight, { units: "deg" });
    
    for (let i = 0; i < curveSegments; i++) {
      itemsLeft[i].style.setProperty("--angle", `${-angles.angles[i]}deg`);
      itemsLeft[i].style.setProperty("--offset", `${-angles.offsets[i]}px`);
      itemsLeft[i].style.setProperty("--top", `${itemsLeft[i].offsetTop}px`);

      itemsRight[i].style.setProperty("--angle", `${angles.angles[i]}deg`);
      itemsRight[i].style.setProperty("--offset", `${angles.offsets[i]}px`);
      itemsRight[i].style.setProperty("--top", `${itemsRight[i].offsetTop}px`);
    }

    const contentWidth = main.offsetWidth;
    const contentHeight = main.offsetHeight;

    // Safari can report 0 on first load before layout settles; try again next frame
    if (contentWidth === 0 || contentHeight === 0) {
      requestAnimationFrame(onResize);
      return;
    }

    split.style.setProperty("--content-width", `${contentWidth}px`);
    split.style.setProperty("--content-height", `${contentHeight}px`);
  };

  // Ensure initial measure happens after layout/paint
  const runInitialResize = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(onResize);
    });
  };

  window.addEventListener("resize", onResize);
  // window.addEventListener("scroll", syncWithScroll);
  
  requestAnimationFrame(syncWithScroll);

  // Prepare original main as scroll host only
  main.classList.add("scroll-host");

  // Create a full, transform-driven clone for base content
  mainClone = main.cloneNode(true) as HTMLElement;
  mainClone.classList.remove("scroll-host");
  follower.appendChild(mainClone);

  createSplitItems(curveSegments);
  runInitialResize();
  // Fallback: run once after full load (CSS/fonts/images) for Safari
  window.addEventListener("load", onResize, { once: true });
  
  await initSplashOverlay();
});
