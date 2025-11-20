import { Vector2 } from './Vector2';
import type { PointMass } from './PointMass';

/**
 * Verlet/Position-Verlet integrator.
 * Very stable for stiff springs; stores previous position.
 * Drag is approximated by scaling the inertial term.
 */
export class VerletMass implements PointMass {
  position: Vector2;
  velocity: Vector2;
  force: Vector2;
  private prevPosition: Vector2;

  constructor(public x: number, public y: number, public mass: number, public drag: number) {
    this.position = new Vector2(x, y);
    this.prevPosition = new Vector2(x, y);
    this.velocity = new Vector2(0, 0);
    this.force = new Vector2(0, 0);
  }

  addForce(f: Vector2): void { this.force.add(f); }

  setPosition(x: number, y: number, resetVelocity: boolean = true): void {
    this.position.x = x; this.position.y = y;
    if (resetVelocity) {
      this.prevPosition.x = x; this.prevPosition.y = y;
      this.velocity.x = 0; this.velocity.y = 0;
    }
  }

  /**
   * Set initial velocity for Verlet integration.
   * In Verlet, velocity is implicit from position differences, so we set prevPosition
   * such that (position - prevPosition) / dt = velocity.
   * @param vx - Initial velocity x component
   * @param vy - Initial velocity y component
   * @param dt - Timestep used in integration (typically your fixedDelta)
   */
  setVelocity(vx: number, vy: number, dt: number): void {
    this.velocity.x = vx;
    this.velocity.y = vy;
    // Set prevPosition so that (position - prevPosition) / dt = velocity
    this.prevPosition.x = this.position.x - vx * dt;
    this.prevPosition.y = this.position.y - vy * dt;
  }

  integrate(dt: number): void {
    if (this.mass === 0) { this.force.x = 0; this.force.y = 0; this.prevPosition.x = this.position.x; this.prevPosition.y = this.position.y; return; }

    // Acceleration from total forces at current state (drag approximated via velocity estimate)
    const vApprox = new Vector2(this.position.x - this.prevPosition.x, this.position.y - this.prevPosition.y);
    vApprox.div(Math.max(dt, 1e-8));
    const a = this.currentForce(this.position, vApprox);
    a.div(this.mass);

    // Damping factor (simple, stable): multiply inertial term
    const damping = Math.max(0, 1 - this.drag * dt);

    const nextX = new Vector2(
      this.position.x + (this.position.x - this.prevPosition.x) * damping + a.x * dt * dt,
      this.position.y + (this.position.y - this.prevPosition.y) * damping + a.y * dt * dt
    );

    // Update velocity estimate for consumers
    this.velocity.x = (nextX.x - this.position.x) / dt;
    this.velocity.y = (nextX.y - this.position.y) / dt;

    // Advance positions
    this.prevPosition.x = this.position.x; this.prevPosition.y = this.position.y;
    this.position.x = nextX.x; this.position.y = nextX.y;

    this.force.x = 0; this.force.y = 0;
  }

  currentForce(pos: Vector2, vel?: Vector2): Vector2 {
    const v = vel ? new Vector2(vel.x, vel.y) : new Vector2(this.velocity.x, this.velocity.y);
    const totalForce = new Vector2(this.force.x, this.force.y);
    const speed = v.length();
    const dragVel = new Vector2(v.x, v.y);
    dragVel.mul(this.drag * this.mass * speed);
    totalForce.sub(dragVel);
    return totalForce;
  }
}
