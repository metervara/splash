// svgPathToEdges.ts
import type { Vec2 } from "./Vec2"
import type { Edge } from "./Edge"
import { edge } from "./Edge"

const numOrCmdRE = /[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g

const v2 = (x: number, y: number): Vec2 => ({ x, y })

const eq = (a: Vec2, b: Vec2, eps = 1e-9) =>
  Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps

const fmt = (n: number) => {
  // reasonable compact output; tweak if you want fewer/more decimals
  const s = Number(n.toFixed(6)).toString()
  return s === "-0" ? "0" : s
}

const p = (v: Vec2) => `${fmt(v.x)} ${fmt(v.y)}`
/**
 * Converts an SVG path string to straight-line edges.
 * Supports absolute commands only: M, L, H, V, Z.
 *
 * Notes:
 * - Curves (C/Q/A/S/T) are NOT supported here.
 * - Relative commands (lowercase) are NOT supported here.
 * - Multiple subpaths are supported; Z closes each subpath.
 */
export const svgPathToEdges = (d: string): Edge[] => {
  const tokens = d.match(numOrCmdRE) ?? []
  const edges: Edge[] = []

  let i = 0
  let cmd: string | null = null

  let cur: Vec2 = v2(0, 0)
  let subpathStart: Vec2 | null = null

  const readNumber = (): number => {
    if (i >= tokens.length) throw new Error("Unexpected end of path data")
    const t = tokens[i++]
    const n = Number(t)
    if (!Number.isFinite(n)) throw new Error(`Expected number, got "${t}"`)
    return n
  }

  const isCommand = (t: string) => /^[a-zA-Z]$/.test(t)

  const lineTo = (next: Vec2) => {
    // Skip zero-length edges if you want:
    // if (next.x === cur.x && next.y === cur.y) return
    edges.push(edge(cur, next, true, true))
    cur = next
  }

  while (i < tokens.length) {
    const t = tokens[i]

    // If we see a command, consume it; otherwise repeat the previous command
    if (isCommand(t)) {
      cmd = t
      i++
    } else if (!cmd) {
      throw new Error(`Path data must start with a command (got "${t}")`)
    }

    if (!cmd) continue

    // Only support absolute commands
    if (cmd !== cmd.toUpperCase()) {
      throw new Error(`Relative command "${cmd}" not supported (use uppercase)`)
    }

    switch (cmd) {
      case "M": {
        const x = readNumber()
        const y = readNumber()
        cur = v2(x, y)
        subpathStart = cur

        // SVG: subsequent pairs after M are implicit L commands
        while (i < tokens.length && !isCommand(tokens[i])) {
          const lx = readNumber()
          const ly = readNumber()
          lineTo(v2(lx, ly))
        }
        break
      }

      case "L": {
        const x = readNumber()
        const y = readNumber()
        lineTo(v2(x, y))

        // Allow repeated coordinate pairs for L
        while (i < tokens.length && !isCommand(tokens[i])) {
          const lx = readNumber()
          const ly = readNumber()
          lineTo(v2(lx, ly))
        }
        break
      }

      case "H": {
        const x = readNumber()
        lineTo(v2(x, cur.y))

        // Allow repeated x values
        while (i < tokens.length && !isCommand(tokens[i])) {
          const hx = readNumber()
          lineTo(v2(hx, cur.y))
        }
        break
      }

      case "V": {
        const y = readNumber()
        lineTo(v2(cur.x, y))

        // Allow repeated y values
        while (i < tokens.length && !isCommand(tokens[i])) {
          const vy = readNumber()
          lineTo(v2(cur.x, vy))
        }
        break
      }

      case "Z": {
        if (subpathStart) {
          lineTo(subpathStart)
        }
        // After closing, current point becomes start of subpath
        // (already set by lineTo)
        break
      }

      default:
        throw new Error(`Unsupported command "${cmd}". Only M,L,H,V,Z supported.`)
    }
  }

  return edges
}

/**
 * Converts an ordered list of edges into an SVG path string using only M/L/Z.
 * Assumes edges are in the order you want them drawn.
 *
 * - Starts a new subpath when continuity breaks.
 * - Closes a subpath with Z when the current end matches that subpath's start.
 */
export const edgesToSvgPath = (edges: Edge[], eps = 1e-9): string => {
  if (edges.length === 0) return ""

  let d = ""
  let subStart: Vec2 | null = null
  let cur: Vec2 | null = null

  const moveTo = (v: Vec2) => {
    d += (d ? "" : "") + `M${p(v)}`
    subStart = v
    cur = v
  }

  const lineTo = (v: Vec2) => {
    d += `L${p(v)}`
    cur = v
  }

  for (const e of edges) {
    if (!cur) {
      moveTo(e.start)
      lineTo(e.end)
      continue
    }

    // If this edge continues from the current point, draw it.
    if (eq(e.start, cur, eps)) {
      lineTo(e.end)
      continue
    }

    // Otherwise, try reversed edge if it matches (optional convenience)
    if (eq(e.end, cur, eps)) {
      lineTo(e.start)
      continue
    }

    // Continuity break: close previous subpath if it's closed
    if (subStart && cur && eq(cur, subStart, eps)) {
      d += "Z"
    }

    // Start a new subpath
    moveTo(e.start)
    lineTo(e.end)
  }

  // Close final subpath if it's closed
  if (subStart && cur && eq(cur, subStart, eps)) {
    d += "Z"
  }

  return d
}