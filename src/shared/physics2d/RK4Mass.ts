import { Vector2 } from './Vector2';
import type { PointMass } from './PointMass';

/**
 * Classic RK4 integrator for 2nd order ODE split into (x, v).
 * High accuracy; a bit heavier than Euler/Verlet.
 */
export class RK4Mass implements PointMass {
  position: Vector2;
  velocity: Vector2;
  force: Vector2;

  constructor(public x: number, public y: number, public mass: number, public drag: number) {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(0, 0);
    this.force = new Vector2(0, 0);
  }

  addForce(f: Vector2): void { this.force.add(f); }

  setPosition(x: number, y: number, resetVelocity: boolean = true): void {
    this.position.x = x; this.position.y = y;
    if (resetVelocity) { this.velocity.x = 0; this.velocity.y = 0; }
  }

  private aAt(pos: Vector2, vel: Vector2): Vector2 {
    const F = this.currentForce(pos, vel);
    F.div(Math.max(this.mass, 1e-8));
    return F;
  }

  integrate(dt: number): void {
    if (this.mass === 0) { this.force.x = 0; this.force.y = 0; return; }

    const x0 = new Vector2(this.position.x, this.position.y);
    const v0 = new Vector2(this.velocity.x, this.velocity.y);

    // k1
    const a1 = this.aAt(x0, v0);
    const v1 = new Vector2(v0.x, v0.y);

    // k2
    const x_mid1 = new Vector2(x0.x + v1.x * (dt/2), x0.y + v1.y * (dt/2));
    const v_mid1 = new Vector2(v0.x + a1.x * (dt/2), v0.y + a1.y * (dt/2));
    const a2 = this.aAt(x_mid1, v_mid1);

    // k3
    const x_mid2 = new Vector2(x0.x + v_mid1.x * (dt/2), x0.y + v_mid1.y * (dt/2));
    const v_mid2 = new Vector2(v0.x + a2.x * (dt/2), v0.y + a2.y * (dt/2));
    const a3 = this.aAt(x_mid2, v_mid2);

    // k4
    const x_end = new Vector2(x0.x + v_mid2.x * dt, x0.y + v_mid2.y * dt);
    const v_end = new Vector2(v0.x + a3.x * dt, v0.y + a3.y * dt);
    const a4 = this.aAt(x_end, v_end);

    // Combine
    this.position.x = x0.x + (dt/6) * (v1.x + 2*v_mid1.x + 2*v_mid2.x + v_end.x);
    this.position.y = x0.y + (dt/6) * (v1.y + 2*v_mid1.y + 2*v_mid2.y + v_end.y);

    this.velocity.x = v0.x + (dt/6) * (a1.x + 2*a2.x + 2*a3.x + a4.x);
    this.velocity.y = v0.y + (dt/6) * (a1.y + 2*a2.y + 2*a3.y + a4.y);

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
