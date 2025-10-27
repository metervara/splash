import { Vector2 } from './Vector2';

export class EulerMass {
	position: Vector2;
	mass: number;
	drag: number;
	force: Vector2;
	velocity: Vector2;

	constructor(x: number, y: number, mass: number, drag: number) {
		this.position = new Vector2(x, y);
		this.mass = mass;
		this.drag = drag;
		this.force = new Vector2(0, 0);
		this.velocity = new Vector2(0, 0);
	}

	addForce(f: Vector2): void {
		this.force.add(f);
	}

	integrate(dt: number): void {
		// compute acceleration
		const acc = this.currentForce(this.position);
		acc.div(this.mass);

		// compute new position, velocity
		const posDelta = new Vector2(this.velocity.x, this.velocity.y);
		posDelta.mul(dt);
		this.position.add(posDelta);

		acc.mul(dt);
		this.velocity.add(acc);

		this.force = new Vector2(0, 0);
	}

	currentForce(pos: Vector2, vel?: Vector2): Vector2 {
		const totalForce = new Vector2(this.force.x, this.force.y);
		const speed = this.velocity.length();

		const dragVel = new Vector2(this.velocity.x, this.velocity.y);
		dragVel.mul(this.drag * this.mass * speed);
		totalForce.sub(dragVel);

		return totalForce;
	}
}

