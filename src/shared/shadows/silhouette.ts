// silhouette.ts
import type { Vec2 } from "./Vec2"
import type { Edge } from "./Edge"
import { edgeCenter, setBoundaryFlags } from "./Edge"
import { dot } from "./Vec2"
import type { Light } from "./Light"
import { toLightDirection } from "./Light"
import { isPolygonCCW } from "./Polygon"
import { groupCastingChains } from "./shadowCasting"

export type BoundaryPoint = {
  point: Vec2
  kind: "start" | "end"
  edgeIndex: number
}

const eq = (a: Vec2, b: Vec2, eps = 1e-9) =>
  Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps

const normalFromEdge = (a: Vec2, b: Vec2): Vec2 => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return { x: dy, y: -dx }
}

const verticesFromEdges = (edges: Edge[], eps = 1e-9): Vec2[] => {
  if (edges.length === 0) return []
  const verts: Vec2[] = [edges[0].start]
  for (let i = 0; i < edges.length; i++) {
    const v = edges[i].end
    const last = verts[verts.length - 1]
    if (!eq(v, last, eps)) verts.push(v)
  }
  // If closed (last == first), remove duplicate final vertex for area calc
  if (verts.length >= 2 && eq(verts[0], verts[verts.length - 1], eps)) {
    verts.pop()
  }
  return verts
}

/**
 * Classifies edges as front/back facing w.r.t. light and marks boundary vertices.
 * Auto-corrects winding so results are consistent even if polygon is CW.
 */
export const findShadowSilhouette = (
  edges: Edge[],
  light: Light,
  eps = 1e-9,
  isHole = false
): {
  isFrontFacing: boolean[]
  boundary: BoundaryPoint[]
  castingChains: Edge[][]
  isCCW: boolean
} => {
  const n = edges.length
  if (n === 0) {
    return { isFrontFacing: [], boundary: [], castingChains: [], isCCW: true }
  }

  const isClosed = eq(edges[0].start, edges[n - 1].end, eps)
  const verts = verticesFromEdges(edges, eps)
  const isCCW = verts.length >= 3 ? isPolygonCCW(verts) : true

  // 1) classify edges
  const isFrontFacing = new Array<boolean>(n)
  for (let i = 0; i < n; i++) {
    const e = edges[i]

    // Flip normal if winding is CW so "front/back" stays consistent with CCW walk logic.
    const N0 = normalFromEdge(e.start, e.end)
    const N = isCCW ? N0 : { x: -N0.x, y: -N0.y }

    const toLight = toLightDirection(light, edgeCenter(e))
    isFrontFacing[i] = isHole ? dot(N, toLight) < 0 : dot(N, toLight) > 0
  }

  // 2) boundary points + edge flags
  const boundary: BoundaryPoint[] = []

  for (let i = 0; i < n; i++) {
    const prev = i === 0 ? (isClosed ? n - 1 : -1) : i - 1
    const next = i === n - 1 ? (isClosed ? 0 : -1) : i + 1

    const prevFacing = prev >= 0 ? isFrontFacing[prev] : isFrontFacing[i]
    const currFacing = isFrontFacing[i]
    const nextFacing = next >= 0 ? isFrontFacing[next] : isFrontFacing[i]

    const startIsBoundary = prevFacing !== currFacing
    const endIsBoundary = currFacing !== nextFacing

    setBoundaryFlags(edges[i], startIsBoundary, endIsBoundary)

    // transition at edges[i].start (shared vertex with prev edge)
    if (startIsBoundary) {
      // While walking CCW:
      // front -> back = start shadow point (light->shadow)
      // back -> front = end shadow point (shadow->light)
      const kind: BoundaryPoint["kind"] =
        prevFacing === true && currFacing === false ? "start" : "end"
      boundary.push({ point: edges[i].start, kind, edgeIndex: i })
    }
  }

  // 3) contiguous casting chains (back-facing runs)
  const castingChains = groupCastingChains(edges, isFrontFacing, eps)

  return { isFrontFacing, boundary, castingChains, isCCW }
}
