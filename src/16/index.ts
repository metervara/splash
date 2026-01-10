import { initSplashOverlay } from "/src/shared/utils";
import figlet from "figlet";

// Import FIGlet fonts directly so we don't trigger network fetches for .flf
// files (which caused ERR_ABORTED 431 with preloadFonts).
import Isometric1 from "figlet/importable-fonts/Isometric1.js";
import Isometric2 from "figlet/importable-fonts/Isometric2.js";
import Isometric3 from "figlet/importable-fonts/Isometric3.js";
import Isometric4 from "figlet/importable-fonts/Isometric4.js";

document.addEventListener("DOMContentLoaded", async () => {
  await initSplashOverlay();

  // Register imported fonts with figlet (no network requests involved).
  const importedFonts: Record<string, string> = {
    Isometric1,
    Isometric2,
    Isometric3,
    Isometric4,
  };

  Object.entries(importedFonts).forEach(([name, fontData]) => {
    figlet.parseFont(name, fontData);
  });

  const availableFonts = figlet.loadedFonts();
  console.log("Loaded FIGlet fonts:", availableFonts);

  const text = "Met\nerv\nara";
  const M1 = figlet.textSync(text, {
    font: "Isometric1",
    horizontalLayout: "default",
    verticalLayout: "default",
  });
  const M2 = figlet.textSync(text, {
    font: "Isometric2",
    horizontalLayout: "default",
    verticalLayout: "default",
  });
  const M3 = figlet.textSync(text, {
    font: "Isometric3",
    horizontalLayout: "default",
    verticalLayout: "default",
  });
  const M4 = figlet.textSync(text, {
    font: "Isometric4",
    horizontalLayout: "default",
    verticalLayout: "default",
  });

  // Display ASCII art in the page.
  const heading = document.querySelector("h1");
  let currentIndex = 0;
  setInterval(() => {
    if (heading) {
      heading.textContent = [M1, M2, M3, M4][currentIndex];
    }
    currentIndex = (currentIndex + 1) % 4;
  }, 400);
});
