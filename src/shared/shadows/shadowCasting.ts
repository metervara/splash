// shadowCasting.ts
import type { Vec2 } from "./Vec2"
import type { Edge } from "./Edge"
import type { Light } from "./Light"
import { findShadowSilhouette } from "./silhouette"

/** “Casting” = back-facing edges */
export const getShadowCastingEdges = (edges: Edge[], light: Light): Edge[] => {
  const { isFrontFacing } = findShadowSilhouette(edges, light)
  return edges.filter((_, i) => !isFrontFacing[i])
}


const eq = (a: Vec2, b: Vec2, eps = 1e-9) =>
  Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps

/**
 * Groups contiguous back-facing edges into chains.
 * @param edges Ordered edges around the polygon
 * @param isFrontFacing boolean per edge (same indexing as edges)
 * @returns Array of chains (each chain is an array of edges in order)
 */
export const groupCastingChains = (
  edges: Edge[],
  isFrontFacing: boolean[],
  eps = 1e-9
): Edge[][] => {
  const n = edges.length
  if (n === 0) return []

  // closed if first start == last end (typical output of svgPathToEdges with Z)
  const isClosed = eq(edges[0].start, edges[n - 1].end, eps)

  const chains: Edge[][] = []
  let chain: Edge[] | null = null

  for (let i = 0; i < n; i++) {
    const casts = !isFrontFacing[i]

    if (casts) {
      if (!chain) {
        chain = []
        chains.push(chain)
      }
      chain.push(edges[i])
    } else {
      chain = null
    }
  }

  // If closed and both last and first chains are casting, merge them (wrap-around)
  if (isClosed && chains.length >= 2) {
    const firstChain = chains[0]
    const lastChain = chains[chains.length - 1]

    // if the last chain ends at the first chain's beginning, they are contiguous around wrap
    const lastEnd = lastChain[lastChain.length - 1].end
    const firstStart = firstChain[0].start

    if (eq(lastEnd, firstStart, eps)) {
      chains[0] = [...lastChain, ...firstChain]
      chains.pop()
    }
  }

  return chains
}