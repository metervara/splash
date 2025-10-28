import { Vector2 } from './Vector2';
import type { PointMass } from './PointMass';

/**
 * Semi-Implicit (Symplectic) Euler integrator.
 * More stable than explicit Euler, cheap to compute.
 */
export class SemiImplicitEulerMass implements PointMass {
  position: Vector2;
  velocity: Vector2;
  force: Vector2;
  constructor(public x: number, public y: number, public mass: number, public drag: number) {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(0, 0);
    this.force = new Vector2(0, 0);
  }

  addForce(f: Vector2): void {
    this.force.add(f);
  }

  setPosition(x: number, y: number, resetVelocity: boolean = true): void {
    this.position.x = x; this.position.y = y;
    if (resetVelocity) { this.velocity.x = 0; this.velocity.y = 0; }
  }

  integrate(dt: number): void {
    // Kinematic/static anchor
    if (this.mass === 0) { this.force.x = 0; this.force.y = 0; return; }

    // a = F/m using current state (drag included)
    const a = this.currentForce(this.position, this.velocity);
    a.div(this.mass);

    // Semi-implicit Euler: v_{t+dt} = v_t + a*dt; x_{t+dt} = x_t + v_{t+dt}*dt
    const dv = new Vector2(a.x, a.y); dv.mul(dt);
    this.velocity.add(dv);

    const dx = new Vector2(this.velocity.x, this.velocity.y); dx.mul(dt);
    this.position.add(dx);

    // Clear forces for next step
    this.force.x = 0; this.force.y = 0;
  }

  currentForce(pos: Vector2, vel?: Vector2): Vector2 {
    // Sum of external forces + quadratic drag
    const v = vel ? new Vector2(vel.x, vel.y) : new Vector2(this.velocity.x, this.velocity.y);
    const totalForce = new Vector2(this.force.x, this.force.y);
    const speed = v.length();

    // Quadratic drag opposite to velocity: Fd = -c * m * |v| * v
    const dragVel = new Vector2(v.x, v.y);
    dragVel.mul(this.drag * this.mass * speed);
    totalForce.sub(dragVel);

    return totalForce;
  }
}
