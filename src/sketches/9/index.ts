import { initSplashOverlay } from "/src/shared/utils";

const h1 = document.querySelector("h1") as HTMLElement;
const hourCircle = document.querySelector(".circle.hour") as HTMLElement;
const minuteCircle = document.querySelector(".circle.minute") as HTMLElement;
const secondCircle = document.querySelector(".circle.second") as HTMLElement;
const rootStyle = document.documentElement.style;

type TimeData = {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;

  hoursNormalized: number;
  minutesNormalized: number;
  secondsNormalized: number;
  millisecondsNormalized: number;

  hoursAngle: number;
  minutesAngle: number;
  secondsAngle: number;

  hoursFraction: number;
  minutesFraction: number;
  secondsFraction: number;

  // Unit-circle offsets (from center → intersection point on circle)
  hoursUnitX: number;   // cos
  hoursUnitY: number;   // sin
  minutesUnitX: number;
  minutesUnitY: number;
  secondsUnitX: number;
  secondsUnitY: number;

  // Convenience: translate-to-center multipliers (negated unit vectors)
  hoursCenterTX: number;
  hoursCenterTY: number;
  minutesCenterTX: number;
  minutesCenterTY: number;
  secondsCenterTX: number;
  secondsCenterTY: number;
};

let time: TimeData;

const toUnitCW = (angleDeg: number) => {
  // convert "clock degrees" (0 at 12, clockwise) to math radians
  const theta = (angleDeg - 90) * (Math.PI / 180);
  return { x: Math.cos(theta), y: Math.sin(theta) };
};

const getTime = (): TimeData => {
  const now = new Date();

  const ms = now.getMilliseconds();
  const secondsExact = now.getSeconds() + ms / 1000;     // 0–60
  const minutesExact = now.getMinutes() + secondsExact / 60;
  const hoursExact   = now.getHours() + minutesExact / 60;

  const hoursAngle   = (hoursExact   * 360) / 24;
  const minutesAngle = (minutesExact * 360) / 60;
  const secondsAngle = (secondsExact * 360) / 60;

  const h = toUnitCW(hoursAngle);
  const m = toUnitCW(minutesAngle);
  const s = toUnitCW(secondsAngle);

  return {
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
    milliseconds: ms,

    hoursNormalized: hoursExact / 24,
    minutesNormalized: minutesExact / 60,
    secondsNormalized: secondsExact / 60,
    millisecondsNormalized: ms / 1000,

    hoursAngle,
    minutesAngle,
    secondsAngle,

    hoursFraction:   (minutesExact % 60) / 60,
    minutesFraction: (secondsExact % 60) / 60,
    secondsFraction: ms / 1000,

    hoursUnitX: h.x,
    hoursUnitY: h.y,
    minutesUnitX: m.x,
    minutesUnitY: m.y,
    secondsUnitX: s.x,
    secondsUnitY: s.y,

    // translate the whole clock so the intersection sits at center:
    // translateX = hoursCenterTX * radius, translateY = hoursCenterTY * radius
    hoursCenterTX: -h.x,
    hoursCenterTY: -h.y,
    minutesCenterTX: -m.x,
    minutesCenterTY: -m.y,
    secondsCenterTX: -s.x,
    secondsCenterTY: -s.y,
  };
};

const updateBackgroundColor = (currTime: TimeData) => {
  const normalizeToChannel = (value: number) =>
    Math.round(Math.min(Math.max(value, 0), 1) * 255);

  const red = normalizeToChannel(currTime.hoursFraction);
  const green = normalizeToChannel(currTime.minutesFraction);
  const blue = normalizeToChannel(currTime.secondsFraction);

  rootStyle.setProperty("--bg-color", `rgb(${red} ${green} ${blue})`);
};

const animate = () => {
  requestAnimationFrame(animate);
  const currTime = getTime();

  hourCircle.style.setProperty("--angle", `${currTime.hoursAngle}deg`);
  hourCircle.style.setProperty("--offset-x", `${currTime.hoursCenterTX}`);
  hourCircle.style.setProperty("--offset-y", `${currTime.hoursCenterTY}`);
  hourCircle.style.setProperty("--fraction", `${currTime.hoursFraction}`);

  minuteCircle.style.setProperty("--angle", `${currTime.minutesAngle}deg`);
  minuteCircle.style.setProperty("--offset-x", `${currTime.minutesCenterTX}`);
  minuteCircle.style.setProperty("--offset-y", `${currTime.minutesCenterTY}`);
  minuteCircle.style.setProperty("--fraction", `${currTime.minutesFraction}`);

  secondCircle.style.setProperty("--angle", `${currTime.secondsAngle}deg`);
  secondCircle.style.setProperty("--offset-x", `${currTime.secondsCenterTX}`);
  secondCircle.style.setProperty("--offset-y", `${currTime.secondsCenterTY}`);
  secondCircle.style.setProperty("--fraction", `${currTime.secondsFraction}`);

  //  <!-- · • ●-->
  const delimiter = "•";
  h1.innerHTML = `<span class="hour">${String(currTime.hours).padStart(2, '0')}</span>${delimiter}<span class="minute">${String(currTime.minutes).padStart(2, '0')}</span>${delimiter}<span class="second">${String(currTime.seconds).padStart(2, '0')}</span>`;
  
  updateBackgroundColor(currTime);
  time = currTime;
}

document.addEventListener("DOMContentLoaded", () => {
  
  initSplashOverlay();
  time = getTime();
  requestAnimationFrame(animate);

  // h1.textContent = `${hours}:${minutes}:${seconds}`;

  // setInterval(() => {
  //   const [hours, minutes, seconds] = getTime();
  //   console.log(hours, minutes, seconds);
  //   // h1.textContent = `${hours}:${minutes}:${seconds}`;
  // }, 1000);
});
