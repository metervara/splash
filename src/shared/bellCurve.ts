/**
 * Approximate a bell curve (Gaussian) with straight line segments
 * and return per-segment angles and offsets.
 *
 * @param segments Number of straight segments (>=1)
 * @param width    Full width of the bell curve (total span)
 * @param height   Peak height
 * @param options  Optional: { units: 'deg' | 'rad' } (default 'deg')
 *
 * Returns:
 *   - angles[i]: angle of segment i (deg or rad)
 *   - offsets[i]: midpoint y (average of y0, y1)
 *   - points: array of sampled (x, y) points along the curve
 */
export function bellCurveSegmentAngles(
  segments: number,
  width: number,
  height: number,
  options?: { units?: 'deg' | 'rad' }
): {
  angles: number[];
  offsets: number[];
  points: { x: number; y: number }[];
} {
  if (segments < 1) throw new Error('segments must be >= 1');
  const units = options?.units ?? 'deg';

  // Define a Gaussian bell shape centered at 0, spanning [-width/2, width/2]
  // Sigma chosen so that edges (±width/2) ≈ 1% of peak height
  const targetEdgeValue = 0.01 * height;
  const sigma = (width / 2) / Math.sqrt(2 * Math.log(height / targetEdgeValue));
  const gauss = (x: number) => height * Math.exp(-(x ** 2) / (2 * sigma ** 2));

  const xMin = -width / 2;
  const xMax = width / 2;

  // Sample points
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = xMin + t * (xMax - xMin);
    points.push({ x, y: gauss(x) });
  }

  const angles: number[] = [];
  const offsets: number[] = [];

  // Compute per-segment slope, angle, and midpoint offset
  for (let i = 0; i < segments; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;

    let angle = Math.atan2(dy, dx);
    if (units === 'deg') angle = (angle * 180) / Math.PI;

    const offset = (p0.y + p1.y) / 2;

    angles.push(angle);
    offsets.push(offset);
  }

  return { angles, offsets, points };
}
