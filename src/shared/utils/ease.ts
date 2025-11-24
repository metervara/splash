
export const linear = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * t;
}

export const easeInQuad = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (t * t);
}

export const easeOutQuad = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (t * (2 - t));
}

export const easeInOutQuad = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (t < 0.5
    ? 2 * t * t
    : -1 + (4 - 2 * t) * t);
}
export const easeInCubic = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (t * t * t);
}
export const easeOutCubic = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (--t * t * t + 1);
}

export const easeInOutCubic = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (t < 0.5
    ? 4 * t * t * t
    : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);
}

export const easeInQuart = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (t * t * t * t);
}

export const easeOutQuart = (t: number, from = 0, to = 1): number => {
  const p = t - 1;
  return from + (to - from) * (1 - p * p * p * p);
}

export const easeInOutQuart = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (t < 0.5
    ? 8 * Math.pow(t, 4)
    : 1 - Math.pow(-2 * t + 2, 4) / 2);
}

export const easeInQuint = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * Math.pow(t, 5);
}

export const easeOutQuint = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (1 - Math.pow(1 - t, 5));
}

export const easeInOutQuint = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (t < 0.5
    ? 16 * Math.pow(t, 5)
    : 1 - Math.pow(-2 * t + 2, 5) / 2);
}

export const easeInSine = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (1 - Math.cos((t * Math.PI) / 2));
}

export const easeOutSine = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * Math.sin((t * Math.PI) / 2);
}

export const easeInOutSine = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (-(Math.cos(Math.PI * t) - 1) / 2);
}

export const easeInExpo = (t: number, from = 0, to = 1): number => {
  if (t === 0) return from;
  return from + (to - from) * Math.pow(2, 10 * t - 10);
}

export const easeOutExpo = (t: number, from = 0, to = 1): number => {
  if (t === 1) return to;
  return from + (to - from) * (1 - Math.pow(2, -10 * t));
}

export const easeInOutExpo = (t: number, from = 0, to = 1): number => {
  if (t === 0) return from;
  if (t === 1) return to;
  return from + (to - from) * (t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2);
}

export const easeInCirc = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (1 - Math.sqrt(1 - Math.pow(t, 2)));
}

export const easeOutCirc = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * Math.sqrt(1 - Math.pow(t - 1, 2));
}

export const easeInOutCirc = (t: number, from = 0, to = 1): number => {
  return from + (to - from) * (t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2);
}

export const easeInBack = (t: number, from = 0, to = 1): number => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return from + (to - from) * (c3 * t * t * t - c1 * t * t)
}

export const easeOutBack = (t: number, from = 0, to = 1): number => {
  const c1 = 1.70158
  const c3 = c1 + 1
  const p = t - 1
  return from + (to - from) * (1 + c3 * p * p * p + c1 * p * p)
}

export const easeInOutBack = (t: number, from = 0, to = 1): number => {
  const c1 = 1.70158
  const c2 = c1 * 1.525
  return from + (to - from) * (t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2);
}

export const easeInElastic = (t: number, from = 0, to = 1): number => {
  if (t === 0) return from;
  if (t === 1) return to;
  const c4 = (2 * Math.PI) / 3
  return from + (to - from) * (-Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4));
}

export const easeOutElastic = (t: number, from = 0, to = 1): number => {
  if (t === 0) return from;
  if (t === 1) return to;
  const c4 = (2 * Math.PI) / 3
  return from + (to - from) * (Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1);
}

export const easeInOutElastic = (t: number, from = 0, to = 1): number => {
  if (t === 0) return from;
  if (t === 1) return to;
  const c5 = (2 * Math.PI) / 4.5
  return from + (to - from) * (t < 0.5
    ? -0.5 * Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)
    : Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5) * 0.5 + 1);
}

export const easeOutBounce = (t: number, from = 0, to = 1): number => {
  const n1 = 7.5625
  const d1 = 2.75
  const delta = to - from

  if (t < 1 / d1) {
    return from + delta * (n1 * t * t)
  }

  if (t < 2 / d1) {
    const p = t - 1.5 / d1
    return from + delta * (n1 * p * p + 0.75)
  }

  if (t < 2.5 / d1) {
    const p = t - 2.25 / d1
    return from + delta * (n1 * p * p + 0.9375)
  }

  const p = t - 2.625 / d1
  return from + delta * (n1 * p * p + 0.984375)
}

export const easeInBounce = (t: number, from = 0, to = 1): number => {
  // Mirror easeOutBounce to reuse the individual bounce segments
  return from + (to - from) * (1 - easeOutBounce(1 - t, 0, 1))
}

export const easeInOutBounce = (t: number, from = 0, to = 1): number => {
  const delta = to - from
  if (t < 0.5) {
    return from + (1 - (easeOutBounce(1 - 2 * t, 0, 1))) * delta * 0.5
  }

  return from + (easeOutBounce(2 * t - 1, 0, 1) * 0.5 + 0.5) * delta
}