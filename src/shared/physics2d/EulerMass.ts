import { Vector2 } from './Vector2';
import type { PointMass } from './PointMass';

/**
 * Explicit Euler point mass (original behavior), now implementing PointMass.
 * - Adds setPosition(x, y, resetVelocity?) for anchors/mouse-driven nodes.
 * - Early-outs in integrate() when mass === 0 (kinematic/static anchor).
 */
export class EulerMass implements PointMass {
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

	/** Directly set position; optionally zero velocity for stability. */ 
	setPosition(x: number, y: number, resetVelocity: boolean = true): void {
		this.position.x = x; this.position.y = y;
		if (resetVelocity) { this.velocity.x = 0; this.velocity.y = 0; }
	}

	integrate(dt: number): void {
		// Kinematic/static point (e.g., anchor or mouse follower)
		if (this.mass === 0) { this.force.x = 0; this.force.y = 0; return; }

		// Acceleration from current forces
		const a = this.currentForce(this.position, this.velocity);
		a.div(this.mass);

		// Explicit Euler: x += v*dt; v += a*dt
		const dx = new Vector2(this.velocity.x, this.velocity.y); dx.mul(dt);
		this.position.add(dx);

		const dv = new Vector2(a.x, a.y); dv.mul(dt);
		this.velocity.add(dv);

		// Clear accumulator
		this.force.x = 0; this.force.y = 0;
	}

	currentForce(pos: Vector2, vel?: Vector2): Vector2 {
		// Use provided velocity if given (needed by RK4), else instance velocity
		const v = vel ? new Vector2(vel.x, vel.y) : new Vector2(this.velocity.x, this.velocity.y);
		const totalForce = new Vector2(this.force.x, this.force.y);

		// Quadratic drag opposite to velocity: Fd = -c * m * |v| * v
		const speed = v.length();
		const dragVel = new Vector2(v.x, v.y);
		dragVel.mul(this.drag * this.mass * speed);
		totalForce.sub(dragVel);

		return totalForce;
	}
}
