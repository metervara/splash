import { Vector2 } from './Vector2';

/**
 * Common API for simulated point masses so springs/constraints can work with any integrator.
 */
export interface PointMass {
  position: Vector2;
  velocity: Vector2;
  mass: number;
  drag: number;
  force: Vector2;

  /** Add external force into the accumulator for this step. */
  addForce(f: Vector2): void;

  /** Directly set position (useful for anchors or mouse-controlled points). */
  setPosition(x: number, y: number, resetVelocity?: boolean): void;

  /** Advance state by dt seconds. */
  integrate(dt: number): void;

  /**
   * Compute the total force at a given state.
   * Implementations should use `vel` if provided (needed by RK4),
   * otherwise use the instance's current velocity.
   */
  currentForce(pos: Vector2, vel?: Vector2): Vector2;
}
