import { bellCurveSegmentAngles } from "../shared/bellCurve";
import { initSplashOverlay } from "/src/shared/utils";


document.addEventListener("DOMContentLoaded", async () => {

  const curveSegments = 15;
  const splitHeight = 30;
  const curveHeightRatio = 0.1;
  const main = document.querySelector("main") as HTMLElement;
  const split = document.querySelector(".split") as HTMLElement;
  const left = document.querySelector(".split > .left") as HTMLElement;
  const right = document.querySelector(".split > .right") as HTMLElement;
  const itemsLeft: HTMLElement[] = [];
  const itemsRight: HTMLElement[] = [];

  const createSplitItems = (curveSegments: number) => {
    const content = document.querySelector("main") as HTMLElement;

    for (let i = 0; i < curveSegments; i++) {
      const cloneL = content.cloneNode(true) as HTMLElement;
      const cloneR = content.cloneNode(true) as HTMLElement;

      const itemL = document.createElement("div");
      const itemR = document.createElement("div");
      itemL.appendChild(cloneL);
      itemR.appendChild(cloneR);
      itemL.classList.add("item");
      itemR.classList.add("item");
      left.appendChild(itemL);
      right.appendChild(itemR);
      itemsLeft.push(itemL);
      itemsRight.push(itemR);
    }
  }

  const onScroll = () => {
    const scrollTop = window.scrollY;
    updateSplitItems(scrollTop);
  }

  const updateSplitItems = (scrollTop: number) => {
    for (let i = 0; i < curveSegments; i++) {
      itemsLeft[i].style.setProperty("--scroll-top", `${-scrollTop}px`);
      itemsRight[i].style.setProperty("--scroll-top", `${-scrollTop}px`);
    }
  }

  const onResize = () => {
    const splitMarginHeight = (100 - splitHeight) / 2.0;

    const curveWidth = window.innerHeight * (splitHeight / 100.0) ;
    const curveHeight = curveWidth * curveHeightRatio;
    split.style.setProperty("--split-height", `${splitMarginHeight}vh`);
    split.style.setProperty("--split-segment-height", `${curveWidth / curveSegments}px`);
    split.style.setProperty("--split-top", `${left.offsetTop}px`);
    
    const angles = bellCurveSegmentAngles(curveSegments, curveWidth, curveHeight, { units: "deg" });
    console.log(angles);
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
    split.style.setProperty("--content-width", `${contentWidth}px`);
    split.style.setProperty("--content-height", `${contentHeight}px`);
  };

  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll);

  createSplitItems(curveSegments);
  onResize();
  
  await initSplashOverlay();
});
