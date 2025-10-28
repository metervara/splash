import { Vector2 } from './Vector2';
import type { PointMass } from './PointMass';

/**
 * Hooke-type spring with linear damper along the spring axis.
 *
 * Force on A = (k * stretch + c * vRelAlong) * n
 * Force on B = -Force on A
 *
 * where:
 *  n          = normalize(B - A)
 *  stretch    = |B - A| - restLength
 *  vRelAlong  = (vB - vA) · n
 *
 * This convention ensures attraction when stretch > 0 (e.g., restLength = 0).
 */
export class Spring {
  constructor(
    public a: PointMass,
    public b: PointMass,
    public strength: number, // k
    public damping: number,  // c
    public restLength: number = Spring.distance(a.position, b.position)
  ) {}

  apply(): void {
    const dx = new Vector2(this.b.position.x - this.a.position.x, this.b.position.y - this.a.position.y);
    const dist = dx.length();
    if (dist === 0) return;

    const n = new Vector2(dx.x / dist, dx.y / dist);
    const stretch = dist - this.restLength;

    const dv = new Vector2(this.b.velocity.x - this.a.velocity.x, this.b.velocity.y - this.a.velocity.y);
    const vRelAlong = dv.x * n.x + dv.y * n.y;

    // Attractive spring and damping (opposes separation rate)
    const fMag = this.strength * stretch + this.damping * vRelAlong;
    const f = new Vector2(n.x * fMag, n.y * fMag);

    this.a.force.add(f);
    this.b.force.sub(f);
  }

  static distance(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx*dx + dy*dy);
  }
}
