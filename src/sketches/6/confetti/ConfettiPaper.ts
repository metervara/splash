import { Vector2 } from '../../../shared/physics2d/Vector2';

const DEG_TO_RAD = Math.PI / 180;

export type ColorPair = [string, string];

export class ConfettiPaper {
	static bounds = new Vector2(0, 0);

	pos: Vector2;
	rotationSpeed: number;
	angle: number;
	rotation: number;
	cosA: number;
	size: number;
	oscillationSpeed: number;
	xSpeed: number;
	ySpeed: number;
	corners: Vector2[];
	time: number;
	frontColor: string;
	backColor: string;

	constructor(x: number, y: number, colors: ColorPair[]) {
		this.pos = new Vector2(x, y);
		this.rotationSpeed = Math.random() * 600 + 800;

		this.angle = DEG_TO_RAD * Math.random() * 360;
		this.rotation = DEG_TO_RAD * Math.random() * 360;
		this.cosA = 1.0;

		this.size = 5.0;

		this.oscillationSpeed = Math.random() * 1.5 + 0.5;
		this.xSpeed = 40.0;
		this.ySpeed = Math.random() * 60 + 50.0;

		this.corners = new Array();

		this.time = Math.random();

		const ci = Math.round(Math.random() * (colors.length - 1));

		this.frontColor = colors[ci][0];
		this.backColor = colors[ci][1];

		for (let i = 0; i < 4; i++) {
			const dx = Math.cos(this.angle + DEG_TO_RAD * (i * 90 + 45));
			const dy = Math.sin(this.angle + DEG_TO_RAD * (i * 90 + 45));
			this.corners[i] = new Vector2(dx, dy);
		}
	}

	update(dt: number): void {
		this.time += dt;

		this.rotation += this.rotationSpeed * dt;
		this.cosA = Math.cos(DEG_TO_RAD * this.rotation);

		this.pos.x += Math.cos(this.time * this.oscillationSpeed) * this.xSpeed * dt;
		this.pos.y += this.ySpeed * dt;

		//wrap
		if (this.pos.y > ConfettiPaper.bounds.y) {
			this.pos.x = Math.random() * ConfettiPaper.bounds.x;
			this.pos.y = 0;
		}
	}

	draw(g: CanvasRenderingContext2D): void {
		if (this.cosA > 0) {
			g.fillStyle = this.frontColor;
		} else {
			g.fillStyle = this.backColor;
		}
		g.beginPath();

		g.moveTo(this.pos.x + this.corners[0].x * this.size, this.pos.y + this.corners[0].y * this.size * this.cosA);
		for (let i = 1; i < 4; i++) {
			g.lineTo(this.pos.x + this.corners[i].x * this.size, this.pos.y + this.corners[i].y * this.size * this.cosA);
		}

		g.closePath();
		g.fill();
	}
}

