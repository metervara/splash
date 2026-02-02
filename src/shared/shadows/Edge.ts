// Edge.ts
// Data-only Edge + pure operations (Option C). Mutable Edge fields.

import type { Vec2 } from "./Vec2"
import { sub, normalize, lerp, dot, perpendicular } from "./Vec2"

export type Edge = {
  start: Vec2
  end: Vec2
  firstIsBoundary: boolean
  lastIsBoundary: boolean
}

/** Factory */
export const edge = (
  start: Vec2,
  end: Vec2,
  firstIsBoundary = false,
  lastIsBoundary = false
): Edge => ({
  start,
  end,
  firstIsBoundary: firstIsBoundary === true,
  lastIsBoundary: lastIsBoundary === true
})

/** Operations */
export const edgeDirection = (e: Edge): Vec2 =>
  normalize(sub(e.end, e.start))

export const edgeCenter = (e: Edge): Vec2 =>
  lerp(e.start, e.end, 0.5)

export const edgeNormal = (e: Edge): Vec2 =>
  perpendicular(edgeDirection(e))

/**
 * @param shadowDirection Opposite of light direction
 */
export const edgeIsBackFacing = (e: Edge, shadowDirection: Vec2): boolean =>
  dot(shadowDirection, edgeNormal(e)) > 0

/** Mutators (optional convenience) */
export const setBoundaryFlags = (
  e: Edge,
  firstIsBoundary: boolean,
  lastIsBoundary: boolean
): Edge => {
  e.firstIsBoundary = firstIsBoundary
  e.lastIsBoundary = lastIsBoundary
  return e
}

export const setEndpoints = (e: Edge, start: Vec2, end: Vec2): Edge => {
  e.start = start
  e.end = end
  return e
}
