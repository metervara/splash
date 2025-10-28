import { Vector2 } from './Vector2';
import { EulerMass } from './EulerMass';

/**
 * Hooke-type spring connecting two EulerMass points.
 * - strength (k): spring stiffness (N / unit length)
 * - damping (c):  damping coefficient applied along the spring axis
 * - restLength (L0): natural length of the spring
 */
export class Spring {
  public a: EulerMass;
  public b: EulerMass;
  public strength: number;
  public damping: number;
  public restLength: number;

  constructor(a: EulerMass, b: EulerMass, strength: number, damping: number, restLength?: number) {
    this.a = a;
    this.b = b;
    this.strength = strength;
    this.damping = damping;
    // Default rest length to the current distance if not provided
    this.restLength = typeof restLength === 'number' ? restLength : Vector2.distance(a.position, b.position);
  }

  /**
   * Compute and APPLY spring + damping forces to the attached masses.
   * Call this once per simulation step before you integrate the masses.
   */
  apply(): void {
    // Relative position and distance
    const dx = new Vector2(this.b.position.x - this.a.position.x, this.b.position.y - this.a.position.y);
    const dist = dx.length();
    // Avoid divide-by-zero; if coincident, do nothing
    if (dist === 0) return;

    // Normalized axis from a -> b
    const nx = new Vector2(dx.x / dist, dx.y / dist);

    // Hooke's law: F_spring = k * (|x| - L0) along the axis
    // Positive force when stretched pulls a toward b
    const x = dist - this.restLength;
    const fSpring = this.strength * x;

    // Relative velocity projected onto the spring axis
    const dv = new Vector2(this.b.velocity.x - this.a.velocity.x, this.b.velocity.y - this.a.velocity.y);
    const vRelAlong = dv.x * nx.x + dv.y * nx.y;

    // Damping along the spring axis (critical-like linear damper)
    const fDamp = -this.damping * vRelAlong;

    // Total force magnitude along axis
    const fMag = fSpring + fDamp;

    // Force vector applied to a (and opposite to b)
    const f = new Vector2(nx.x * fMag, nx.y * fMag);

    // Push equal/opposite forces into each mass's accumulator
    // Assumes EulerMass exposes a public `force: Vector2` accumulator (as in the provided file)
    this.a.force.add(f);
    const fOpp = new Vector2(-f.x, -f.y);
    this.b.force.add(fOpp);
  }

  /**
   * Calculate forces without applying them.
   * Returns [forceOnA, forceOnB]
   */
  currentForces(): [Vector2, Vector2] {
    const dx = new Vector2(this.b.position.x - this.a.position.x, this.b.position.y - this.a.position.y);
    const dist = dx.length();
    if (dist === 0) return [new Vector2(0, 0), new Vector2(0, 0)];

    const nx = new Vector2(dx.x / dist, dx.y / dist);
    const x = dist - this.restLength;
    const fSpring = this.strength * x;

    const dv = new Vector2(this.b.velocity.x - this.a.velocity.x, this.b.velocity.y - this.a.velocity.y);
    const vRelAlong = dv.x * nx.x + dv.y * nx.y;
    const fDamp = -this.damping * vRelAlong;

    const fMag = fSpring + fDamp;
    const fA = new Vector2(nx.x * fMag, nx.y * fMag);
    const fB = new Vector2(-fA.x, -fA.y);
    return [fA, fB];
  }
}
