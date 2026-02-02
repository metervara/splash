// Polygon.ts
import type { Vec2 } from "./Vec2"

/**
 * Signed area * 2 (shoelace). Positive => CCW in standard Cartesian coords.
 * In canvas coords (y down), CCW/CW appears flipped visually — but this is still
 * a consistent measure for a given coordinate system.
 */
export const signedArea2 = (points: Vec2[]): number => {
  const n = points.length
  if (n < 3) return 0

  let a = 0
  for (let i = 0; i < n; i++) {
    const p = points[i]
    const q = points[(i + 1) % n]
    a += p.x * q.y - q.x * p.y
  }
  return a
}

export const isPolygonCCW = (points: Vec2[]): boolean => signedArea2(points) > 0
