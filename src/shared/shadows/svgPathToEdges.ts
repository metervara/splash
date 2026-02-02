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
    if (eq(cur, next)) return
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

      case "C": {
        const BEZIER_SEGMENTS = 16
        const x1 = readNumber(), y1 = readNumber()
        const x2 = readNumber(), y2 = readNumber()
        const ex = readNumber(), ey = readNumber()
        const p0 = cur, p1 = v2(x1, y1), p2 = v2(x2, y2), p3 = v2(ex, ey)
        for (let s = 1; s <= BEZIER_SEGMENTS; s++) {
          const t = s / BEZIER_SEGMENTS, mt = 1 - t
          lineTo(v2(
            mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
            mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y,
          ))
        }
        // implicit repetition: consume additional coordinate sextuplets
        while (i < tokens.length && !isCommand(tokens[i])) {
          const cx1 = readNumber(), cy1 = readNumber()
          const cx2 = readNumber(), cy2 = readNumber()
          const cex = readNumber(), cey = readNumber()
          const cp0 = cur, cp1 = v2(cx1, cy1), cp2 = v2(cx2, cy2), cp3 = v2(cex, cey)
          for (let s = 1; s <= BEZIER_SEGMENTS; s++) {
            const t = s / BEZIER_SEGMENTS, mt = 1 - t
            lineTo(v2(
              mt*mt*mt*cp0.x + 3*mt*mt*t*cp1.x + 3*mt*t*t*cp2.x + t*t*t*cp3.x,
              mt*mt*mt*cp0.y + 3*mt*mt*t*cp1.y + 3*mt*t*t*cp2.y + t*t*t*cp3.y,
            ))
          }
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