// Light.ts
import type { Vec2 } from "./Vec2"
import { sub, normalize } from "./Vec2"

export type DirectionalLight = {
  kind: "directional"
  /** direction of rays (from light toward scene) */
  direction: Vec2
}

export type PointLight = {
  kind: "point"
  position: Vec2
}

export type Light = DirectionalLight | PointLight

export const directionalLight = (direction: Vec2): DirectionalLight => ({
  kind: "directional",
  direction
})

export const pointLight = (position: Vec2): PointLight => ({
  kind: "point",
  position
})

/**
 * Returns a unit vector pointing FROM the sample point TOWARD the light.
 * - directional: opposite of ray direction
 * - point: from sample -> light position
 */
export const toLightDirection = (light: Light, samplePoint: Vec2): Vec2 => {
  if (light.kind === "directional") {
    return normalize({ x: -light.direction.x, y: -light.direction.y })
  }
  return normalize(sub(light.position, samplePoint))
}
