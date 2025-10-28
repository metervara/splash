export class Vector2 {
	constructor(public x: number, public y: number) {}

	length(): number {
		return Math.sqrt(this.sqrLength());
	}

	sqrLength(): number {
		return this.x * this.x + this.y * this.y;
	}

	add(vec: Vector2): void {
		this.x += vec.x;
		this.y += vec.y;
	}

	sub(vec: Vector2): void {
		this.x -= vec.x;
		this.y -= vec.y;
	}

	div(f: number): void {
		this.x /= f;
		this.y /= f;
	}

	mul(f: number): void {
		this.x *= f;
		this.y *= f;
	}

	normalize(): void {
		const sqrLen = this.sqrLength();
		if (sqrLen !== 0) {
			const factor = 1.0 / Math.sqrt(sqrLen);
			this.x *= factor;
			this.y *= factor;
		}
	}

	normalized(): Vector2 {
		const sqrLen = this.sqrLength();
		if (sqrLen !== 0) {
			const factor = 1.0 / Math.sqrt(sqrLen);
			return new Vector2(this.x * factor, this.y * factor);
		}
		return new Vector2(0, 0);
	}

	static sub(vec0: Vector2, vec1: Vector2): Vector2 {
		return new Vector2(vec0.x - vec1.x, vec0.y - vec1.y);
	}

	static distance(vec0: Vector2, vec1: Vector2): number {
    const dx = vec0.x - vec1.x;
    const dy = vec0.y - vec1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

