type BestBlock = {
  width: number;     // block width (px)
  height: number;    // block height (px)
  cols: number;
  rows: number;
  score?: number;     // lower is better
  sizeError?: number; // relative size error
  arError?: number;   // relative aspect-ratio error
};

type FindOpts = {
  weightSize?: number; // default 1
  weightAR?: number;   // default 1
  alpha?: number;      // size tolerance multiplier around desired (default 1.5)
  maxCols?: number;    // optional external cap
  maxRows?: number;    // optional external cap
  integerBlockSize?: boolean; // if true, only accept grids with integer px block sizes
};

const boundsFromDesired = (
  W: number, H: number, Wd: number, Hd: number, g: number, alpha: number
) => {
  // Keep block size within [Wd/alpha, Wd*alpha] and [Hd/alpha, Hd*alpha]
  const cMin = Math.max(1, Math.ceil((W + g) / (Wd * alpha + g)));
  const cMaxBySize = Math.max(cMin, Math.floor((W + g) / (Wd / alpha + g)));
  const rMin = Math.max(1, Math.ceil((H + g) / (Hd * alpha + g)));
  const rMaxBySize = Math.max(rMin, Math.floor((H + g) / (Hd / alpha + g)));

  // Gap caps (only between blocks): W - (c-1)g > 0 ⇒ c ≤ floor(W/g)+1 (if g>0)
  const cMaxByGap = g > 0 ? Math.floor(W / g) + 1 : Number.POSITIVE_INFINITY;
  const rMaxByGap = g > 0 ? Math.floor(H / g) + 1 : Number.POSITIVE_INFINITY;

  // Pixel sanity caps (if you ever treat integer px as a requirement)
  const cMaxByPx = Math.max(1, Math.floor(W)); // at least 1px wide if integers
  const rMaxByPx = Math.max(1, Math.floor(H));

  const cMax = Math.min(cMaxBySize, cMaxByGap, cMaxByPx);
  const rMax = Math.min(rMaxBySize, rMaxByGap, rMaxByPx);

  return { cMin, cMax, rMin, rMax };
}

/**
 * Find the block size that fills the screen exactly with an even grid and
 * is as close as possible to the desired size + aspect ratio.
 *
 * Gaps are applied only BETWEEN blocks: (cols-1) horizontally, (rows-1) vertically.
 * Subpixel sizes are allowed unless `integerBlockSize` is true.
 */
export const findBestBlockSize = (
  screenW: number,
  screenH: number,
  desiredW: number,
  desiredH: number,
  gap: number,
  opts: FindOpts = {}
): BestBlock => {
  // console.log('[blockSize] findBestBlockSize', screenW, screenH, desiredW, desiredH, gap, opts);
  const weightSize = opts.weightSize ?? 1;
  const weightAR = opts.weightAR ?? 1;
  const alpha = opts.alpha ?? 1.5;
  const desiredAR = desiredW / desiredH;

  // Compute tight bounds from desired size (with gaps) + trivial caps
  const base = boundsFromDesired(screenW, screenH, desiredW, desiredH, gap, alpha);
  const cMin = 1; // allow a touch wider exploration on the left
  const rMin = 1;
  const cMax = Math.min(base.cMax, opts.maxCols ?? Number.POSITIVE_INFINITY);
  const rMax = Math.min(base.rMax, opts.maxRows ?? Number.POSITIVE_INFINITY);

  let best: BestBlock | null = null;

  // Helper to score a candidate
  const scoreCandidate = (cols: number, rows: number) => {
    if (cols < cMin || rows < rMin || cols > cMax || rows > rMax) return;

    const usableW = screenW - (cols - 1) * gap;
    const usableH = screenH - (rows - 1) * gap;
    if (usableW <= 0 || usableH <= 0) return;

    const w = usableW / cols;
    const h = usableH / rows;

    if (opts.integerBlockSize) {
      // Require exact integer pixels for each block
      if (!Number.isInteger(w) || !Number.isInteger(h)) return;
    }

    // Optional pruning: outside desired tolerance window → skip
    if (w < desiredW / alpha || w > desiredW * alpha) return;
    if (h < desiredH / alpha || h > desiredH * alpha) return;

    const sizeErr = Math.hypot((w - desiredW) / desiredW, (h - desiredH) / desiredH);
    const arErr = Math.abs(w / h - desiredAR) / desiredAR;
    const score = weightSize * sizeErr + weightAR * arErr;

    if (!best || score < best.score!) {
      best = { width: w, height: h, cols, rows, score, sizeError: sizeErr, arError: arErr };
    }
  };

  // 1D sweep over cols with aspect-ratio–guided rows (evaluate a tiny ±2 band)
  for (let cols = base.cMin; cols <= cMax; cols++) {
    const usableW = screenW - (cols - 1) * gap;
    if (usableW <= 0) break;
    const w = usableW / cols;

    // Skip cols that force width far outside tolerance
    if (w < desiredW / alpha || w > desiredW * alpha) continue;

    // Best rows for AR given this cols:
    // r0 = (H+g) / ( g + w/A_d )
    const r0 = (screenH + gap) / (gap + w / desiredAR);

    // Check a small neighborhood around r0
    const rCandidates = new Set<number>();
    for (let k = -2; k <= 2; k++) {
      const r = Math.round(r0 + k);
      if (r >= rMin && r <= rMax) rCandidates.add(r);
    }
    // Also include bounds, in case r0 is out of range
    rCandidates.add(base.rMin);
    rCandidates.add(rMax);

    for (const r of rCandidates) scoreCandidate(cols, r);
  }

  if (!best) {
    // Fallback: try full small search within bounds in case AR-guided pass missed everything
    for (let c = base.cMin; c <= cMax; c++) {
      for (let r = base.rMin; r <= rMax; r++) scoreCandidate(c, r);
    }
  }

  if (!best) {
    throw new Error("No feasible grid found with given settings/tolerance.");
  }
  return best;
}

export const findNaiveBlockSize = (
  screenW: number,
  screenH: number,
  desiredW: number,
  desiredH: number,
  gap: number,
): BestBlock => {

  const cols = Math.max(1, Math.round((screenW) / desiredW));
  const rows = Math.max(1, Math.round((screenH) / desiredH));

  const availW = screenW - gap * Math.max(0, cols - 1);
  const availH = screenH - gap * Math.max(0, rows - 1);

  const width = availW / cols;           // can be fractional; that's fine and crisp
  const height = availH / rows;

  return { width, height, cols, rows };
};


