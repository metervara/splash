import { Vector2 } from './Vector2';
import type { PointMass } from './PointMass';

/**
 * Hooke-type spring connecting two PointMass points, works with any integrator.
 */
export class Spring {
  constructor(
    public a: PointMass,
    public b: PointMass,
    public strength: number,
    public damping: number,
    public restLength: number = Spring.distance(a.position, b.position)
  ) {}

  apply(): void {
    const dx = new Vector2(this.b.position.x - this.a.position.x, this.b.position.y - this.a.position.y);
    const dist = dx.length();
    if (dist === 0) return;
    const nx = new Vector2(dx.x / dist, dx.y / dist);

    const x = dist - this.restLength;
    const fSpring = this.strength * x;  // Positive = pull together when stretched

    const dv = new Vector2(this.b.velocity.x - this.a.velocity.x, this.b.velocity.y - this.a.velocity.y);
    const vRelAlong = dv.x * nx.x + dv.y * nx.y;
    const fDamp = -this.damping * vRelAlong;

    const fMag = fSpring + fDamp;
    const f = new Vector2(nx.x * fMag, nx.y * fMag);

    this.a.force.add(f);
    this.b.force.sub(f);
  }

  static distance(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx*dx + dy*dy);
  }
}
