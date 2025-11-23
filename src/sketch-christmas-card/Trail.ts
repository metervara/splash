import { Vector2 } from "../shared/physics2d";

export class Trail {
  private points: Vector2[] = [];
  private segmentLengths: number[] = [];
  private maxLength: number = 0;
  private totalLength: number = 0;

  constructor(maxLength: number) {
    this.points = [];
    this.maxLength = maxLength;
  }

  public addPoint(point: Vector2) {
    if(this.points.length > 0) {
      const lastPoint = this.points[this.points.length - 1];
      // console.log(this.points[this.points.length - 2], point);
      const length = Vector2.distance(lastPoint, point)
      this.segmentLengths.push(length);
      this.totalLength += length;
    }
    this.points.push(point);
    
    // if(this.totalLength > this.maxLength) {
    this.truncateTrail();

    // check that total and sum of segments are equal
    // const sum = this.segmentLengths.reduce((acc, length) => acc + length, 0);
    // console.log(sum, this.totalLength, this.points.length);
  }

  private truncateTrail() {
    while (this.totalLength > this.maxLength && this.segmentLengths.length) {
      this.points.shift(); // remove first element
      const removedLength = this.segmentLengths.shift();
      if(removedLength !== undefined) {
        this.totalLength -= removedLength;
      }
    }
  }

  public setMaxLength(maxLength: number) {
    this.maxLength = maxLength;
    this.truncateTrail();
  }

  public getPoints(): Vector2[] {
    return this.points;
  }

  public getSegmentLengths(): number[] {
    return this.segmentLengths;
  }

  public getTotalLength(): number {
    return this.totalLength;
  }

  /**
   * Returns `count` points along the trail, starting from the most recent point
   * and moving backwards with `distance` spacing. Stops at the first point and
   * repeats it if the requested distribution would go beyond the trail.
   */
  public getEvenlySpacedPoints(count: number, distance: number): Vector2[] {
    if (count <= 0 || this.points.length === 0) {
      return [];
    }

    const lastPoint = this.points[this.points.length - 1];
    if (this.points.length === 1 || distance <= 0) {
      return Array.from({ length: count }, () => lastPoint.clone());
    }

    const cumulative: number[] = new Array(this.points.length);
    cumulative[0] = 0;
    for (let i = 1; i < this.points.length; i++) {
      cumulative[i] = cumulative[i - 1] + (this.segmentLengths[i - 1] ?? 0);
    }

    const totalLength = cumulative[cumulative.length - 1];
    const result: Vector2[] = [];
    let segmentIndex = this.points.length - 2;

    for (let i = 0; i < count; i++) {
      const targetDistanceFromEnd = distance * i;
      const targetDistanceFromStart = Math.max(0, totalLength - targetDistanceFromEnd);

      while (segmentIndex > 0 && targetDistanceFromStart < cumulative[segmentIndex]) {
        segmentIndex--;
      }

      if (segmentIndex < 0 || this.segmentLengths.length === 0) {
        result.push(this.points[0].clone());
        continue;
      }

      const startPoint = this.points[segmentIndex];
      const endPoint = this.points[segmentIndex + 1];
      const segmentLength = this.segmentLengths[segmentIndex];

      if (segmentLength === 0) {
        result.push(endPoint.clone());
        continue;
      }

      const t = (targetDistanceFromStart - cumulative[segmentIndex]) / segmentLength;
      result.push(Vector2.lerp(startPoint, endPoint, t));
    }

    return result;
  }
}