import { Vector2 } from "../shared/physics2d";
import { lerp } from "../shared/utils";

export type StarfieldBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};


export class Star {
  private far: Vector2;
  private near: Vector2;
  private _direction: Vector2;
  private _time: number;
  private _length: number;

  constructor(far: Vector2, near: Vector2, length: number, time: number) {
    this.far = far;
    this.near = near;
    this._length = length;
    this._time = time;
    this._direction = Vector2.sub(near, far);
    this.direction.normalize();
  }

  set time(time: number) {
    this._time = time;
  }
  get time(): number {
    return this._time;
  }

  get length(): number {
    return this._length;
  }

  get direction(): Vector2 {
    return this._direction;
  }
  // Pass offCenter here?
  get position(): Vector2 {
    return Vector2.lerp(this.far, this.near, this.time);
  }
};

export class Starfield {
  private stars: Star[] = [];
  private bounds: StarfieldBounds;
  
  // private offCenter: Vector2 = new Vector2(0, 0);
  // private bounds: Rect;

  constructor(count: number, bounds: StarfieldBounds) {
    this.stars = [];
    this.bounds = bounds;
    for (let i = 0; i < count; i++) {
      this.stars.push(this.spawnStar());
    }
  }

  public update(dt: number) {
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const star = this.stars[i];
      star.time += dt * 0.2 / star.length;
      if (star.time > 1.0) {
        this.stars[i] = this.spawnStar(true); // keep length constant without splice/push
      }
    }
  }

  // public setOffCenter(offCenter: Vector2) {
  //   this.offCenter = offCenter;
  // }

  public updateBounds(bounds: StarfieldBounds) {
    this.bounds = bounds;
  }

  public getStars(): Star[] {
    return this.stars;
  }
  
  private spawnStar(prewarm: boolean = false): Star {
    const direction = Math.random() * 2 * Math.PI;
    const rFar = this.bounds.width * 0.1;
    const rNearInner = this.bounds.width * 0.2;
    const rNearOuter = Math.sqrt(this.bounds.width * this.bounds.width + this.bounds.height * this.bounds.height);
    
    const rNear = lerp(rNearInner, rNearOuter, Math.random()); //Math.sqrt(this.bounds.width * this.bounds.width + this.bounds.height * this.bounds.height);

    const far = new Vector2(rFar * Math.cos(direction), rFar * Math.sin(direction));
    const near = new Vector2(rNear * Math.cos(direction), rNear * Math.sin(direction));
    const length = Vector2.distance(far, near);
    return new Star(far, near, length, prewarm ? Math.random() : 0);
  }
}