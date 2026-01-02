import { Vector2 } from "./physics2d";
import { lerp, map } from "./utils";
import { easeInQuad } from "./utils/ease";

// TODO: Move to classes and make adjustable
const nearRadiusFactor = 0.2;
const farRadiusFactor = 0.1;

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
  private _time: number; // [0, 1] - lifetime of the star
  private _length: number;
  private _proximity: number;

  constructor(far: Vector2, near: Vector2, length: number, proximity: number, time: number) {
    this.far = far;
    this.near = near;
    this._length = length;
    this._time = time;
    this._direction = Vector2.sub(near, far);
    this.direction.normalize();
    this._proximity = proximity;
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

  get proximity(): number {
    return this._proximity;
  }

  // get easedTime(): number {
  //   const easetTime = 
  // }
  // Pass offCenter here?
  get position(): Vector2 {
    const easeT = easeInQuad(this.time);
    const t = lerp(this.time, easeT, this.proximity);
    return Vector2.lerp(this.far, this.near, t);
  }

  public getOffsetPosition(offset: Vector2): Vector2 {
    const easeT = easeInQuad(this.time);
    const t = lerp(this.time, easeT, this.proximity);
    return Vector2.lerp(Vector2.add(this.far, offset), Vector2.sub(this.near, offset), t);
  }

  public getOffsetDirection(offset: Vector2): Vector2 {
    const farOffset = Vector2.add(this.far, offset);
    const nearOffset = Vector2.sub(this.near, offset);
    const direction = Vector2.sub(nearOffset, farOffset);
    direction.normalize();
    return direction;
  }
};

export class Starfield {
  private stars: Star[] = [];
  private bounds: StarfieldBounds;
  private offCenter: Vector2 = new Vector2(0, 0);
  private _speed: number = 1.0;

  get speed(): number {
    return this._speed;
  }
  set speed(speed: number) {
    this._speed = speed;
  }
  
  constructor(count: number, bounds: StarfieldBounds, speed: number = 1.0) {
    this.stars = [];
    this.bounds = bounds;
    this._speed = speed;
    for (let i = 0; i < count; i++) {
      // Seed initial stars across the full lifetime span
      this.stars.push(this.spawnStar(Math.random()));
    }
  }

  public update(dt: number) {
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const star = this.stars[i];
      // star.time += dt * 0.1 / star.length; // Breaks the perspective effect
      star.time += dt * 0.0001 * this._speed;
      if (star.time > 1.0 || star.time < 0.0) {
        const spawnTime = this._speed >= 0 ? 0 : 1;
        this.stars[i] = this.spawnStar(spawnTime); // keep length constant without splice/push
      }
    }
  }

  public setOffCenter(offCenter: Vector2) {
    this.offCenter = offCenter;
  }

  public updateBounds(bounds: StarfieldBounds) {
    this.bounds = bounds;
  }

  public getStars(): { position: Vector2; direction: Vector2; length: number; time: number; proximity: number }[] {
    const result = this.stars.map((star) => {
      return {
        position: star.getOffsetPosition(this.offCenter),
        direction: star.getOffsetDirection(this.offCenter),
        length: star.length,
        time: star.time,
        proximity: star.proximity,
      }
    })
    return result;
  }
  
  
  private spawnStar(time: number = 0): Star {
    const direction = Math.random() * 2 * Math.PI;
    const rFar = this.bounds.width * farRadiusFactor * Math.random();
    const rNearInner = this.bounds.width * nearRadiusFactor;
    const rNearOuter = 1.2 * Math.sqrt(this.bounds.width * this.bounds.width + this.bounds.height * this.bounds.height);
    
    const rNear = lerp(rNearInner, rNearOuter, Math.random()); //Math.sqrt(this.bounds.width * this.bounds.width + this.bounds.height * this.bounds.height);

    const far = new Vector2(rFar * Math.cos(direction), rFar * Math.sin(direction));
    const near = new Vector2(rNear * Math.cos(direction), rNear * Math.sin(direction));
    // Do not take near into account here? It's just for a bit of variation instarting point?
    // const length = Vector2.distance(far, near);
    const length = near.length();
    
    const minLength =  this.bounds.width * nearRadiusFactor - this.bounds.width * farRadiusFactor;
    const maxLength = Math.sqrt(this.bounds.width * this.bounds.width + this.bounds.height * this.bounds.height);
    const proximity = map(length, minLength, maxLength, 0, 1);

    const spawnTime = Math.min(1, Math.max(0, time));
    return new Star(far, near, length, proximity, spawnTime);
  }
}