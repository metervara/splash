import { Vector2 } from '../../../shared/physics2d/Vector2';
import { EulerMass } from '../../../shared/physics2d/EulerMass';

const DEG_TO_RAD = Math.PI / 180;

export type ColorPair = [string, string];

export class ConfettiRibbon {
	static bounds = new Vector2(0, 0);

	particleDist: number;
	particleCount: number;
	particleMass: number;
	particleDrag: number;

	particles: EulerMass[];

	frontColor: string;
	backColor: string;

	xOff: number;
	yOff: number;

	position: Vector2;
	prevPosition: Vector2;

	velocityInherit: number;

	time: number;
	oscillationSpeed: number;
	oscillationDistance: number;

	ySpeed: number;

	constructor(x: number, y: number, count: number, dist: number, thickness: number, angle: number, mass: number, drag: number, colors: ColorPair[]) {
		this.particleDist = dist;
		this.particleCount = count;
		this.particleMass = mass;
		this.particleDrag = drag;

		this.particles = new Array();

		const ci = Math.round(Math.random() * (colors.length - 1));

		this.frontColor = colors[ci][0];
		this.backColor = colors[ci][1];

		this.xOff = Math.cos(DEG_TO_RAD * angle) * thickness;
		this.yOff = Math.sin(DEG_TO_RAD * angle) * thickness;

		this.position = new Vector2(x, y);
		// Set prevPosition slightly behind to give initial movement
		this.prevPosition = new Vector2(x, y - 10);

		this.velocityInherit = Math.random() * 2 + 4;

		this.time = Math.random() * 100;
		this.oscillationSpeed = Math.random() * 2 + 2;
		this.oscillationDistance = Math.random() * 40 + 40;

		this.ySpeed = Math.random() * 40 + 80;

		for (let i = 0; i < this.particleCount; i++) {
			this.particles[i] = new EulerMass(x, y - i * this.particleDist, this.particleMass, this.particleDrag);
		}
	}

	update(dt: number): void {
		// Guard against invalid or tiny dt values that destabilize physics
		if (!Number.isFinite(dt) || dt <= 0) return;
		const safeDt = Math.max(1 / 120, Math.min(dt, 0.1));
		let i = 0;
		this.time += safeDt * this.oscillationSpeed;

		//update position
		this.position.y += this.ySpeed * safeDt;
		this.position.x += Math.cos(this.time) * this.oscillationDistance * safeDt;

		this.particles[0].position = this.position;

		const dX = this.prevPosition.x - this.position.x;
		const dY = this.prevPosition.y - this.position.y;
		const delta = Math.sqrt(dX * dX + dY * dY);

		this.prevPosition = new Vector2(this.position.x, this.position.y);

		//Forces
		for (i = 1; i < this.particleCount; i++) {
			const dirP = Vector2.sub(this.particles[i - 1].position, this.particles[i].position);
			dirP.normalize();
			dirP.mul((delta / safeDt) * this.velocityInherit);
			this.particles[i].addForce(dirP);
		}

		//Integrate physics
		for (i = 1; i < this.particleCount; i++) {
			this.particles[i].integrate(safeDt);
		}

		//constrain
		for (i = 1; i < this.particleCount; i++) {
			const rp2 = new Vector2(this.particles[i].position.x, this.particles[i].position.y);
			rp2.sub(this.particles[i - 1].position);
			rp2.normalize();
			rp2.mul(this.particleDist);
			rp2.add(this.particles[i - 1].position);
			this.particles[i].position = rp2;
		}

		//wrap
		if (this.position.y > ConfettiRibbon.bounds.y + this.particleDist * this.particleCount) {
			this.wrap();
		}
	}

	private wrap(): void {
		this.position.y = -Math.random() * ConfettiRibbon.bounds.y;
		this.position.x = Math.random() * ConfettiRibbon.bounds.x;
		this.prevPosition = new Vector2(this.position.x, this.position.y);

		// Reinitialize particles at new position
		for (let i = 0; i < this.particleCount; i++) {
			this.particles[i].position = new Vector2(this.position.x, this.position.y - i * this.particleDist);
		}
	}

	/*
	reset(colors: ColorPair[]): void {
		this.position.y = -Math.random() * ConfettiRibbon.bounds.y;
		this.position.x = Math.random() * ConfettiRibbon.bounds.x;
		this.prevPosition = new Vector2(this.position.x, this.position.y);

		this.velocityInherit = Math.random() * 2 + 4;

		this.time = Math.random() * 100;
		this.oscillationSpeed = Math.random() * 2.0 + 1.5;
		this.oscillationDistance = Math.random() * 40 + 40;

		this.ySpeed = Math.random() * 40 + 80;

		const ci = Math.round(Math.random() * (colors.length - 1));

		this.frontColor = colors[ci][0];
		this.backColor = colors[ci][1];

		this.particles = new Array();
		for (let i = 0; i < this.particleCount; i++) {
			this.particles[i] = new EulerMass(this.position.x, this.position.y - i * this.particleDist, this.particleMass, this.particleDrag);
		}
	}
	*/

	draw(g: CanvasRenderingContext2D): void {
		for (let i = 0; i < this.particleCount - 1; i++) {
			const p0 = new Vector2(this.particles[i].position.x + this.xOff, this.particles[i].position.y + this.yOff);
			const p1 = new Vector2(this.particles[i + 1].position.x + this.xOff, this.particles[i + 1].position.y + this.yOff);

			if (this.side(this.particles[i].position.x, this.particles[i].position.y, this.particles[i + 1].position.x, this.particles[i + 1].position.y, p1.x, p1.y) < 0) {
				g.fillStyle = this.frontColor;
				g.strokeStyle = this.frontColor;
			} else {
				g.fillStyle = this.backColor;
				g.strokeStyle = this.backColor;
			}

			if (i === 0) {
				//ends
				g.beginPath();
				g.moveTo(this.particles[i].position.x, this.particles[i].position.y);
				g.lineTo(this.particles[i + 1].position.x, this.particles[i + 1].position.y);
				g.lineTo((this.particles[i + 1].position.x + p1.x) * 0.5, (this.particles[i + 1].position.y + p1.y) * 0.5);
				g.closePath();
				g.stroke();
				g.fill();

				g.beginPath();
				g.moveTo(p1.x, p1.y);
				g.lineTo(p0.x, p0.y);
				g.lineTo((this.particles[i + 1].position.x + p1.x) * 0.5, (this.particles[i + 1].position.y + p1.y) * 0.5);
				g.closePath();
				g.stroke();
				g.fill();
			} else if (i === this.particleCount - 2) {
				g.beginPath();
				g.moveTo(this.particles[i].position.x, this.particles[i].position.y);
				g.lineTo(this.particles[i + 1].position.x, this.particles[i + 1].position.y);
				g.lineTo((this.particles[i].position.x + p0.x) * 0.5, (this.particles[i].position.y + p0.y) * 0.5);
				g.closePath();
				g.stroke();
				g.fill();

				g.beginPath();
				g.moveTo(p1.x, p1.y);
				g.lineTo(p0.x, p0.y);
				g.lineTo((this.particles[i].position.x + p0.x) * 0.5, (this.particles[i].position.y + p0.y) * 0.5);
				g.closePath();
				g.stroke();
				g.fill();
			} else {
				g.beginPath();
				g.moveTo(this.particles[i].position.x, this.particles[i].position.y);
				g.lineTo(this.particles[i + 1].position.x, this.particles[i + 1].position.y);
				g.lineTo(p1.x, p1.y);
				g.lineTo(p0.x, p0.y);
				g.closePath();
				g.stroke();
				g.fill();
			}
		}
	}

	private side(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): number {
		return ((x1 - x2) * (y3 - y2) - (y1 - y2) * (x3 - x2));
	}
}

