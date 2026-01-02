import { Vector2 } from "/src/shared/physics2d";

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
      const nextRemoval = this.segmentLengths[0] ?? 0;

      // Stop if removing the next segment would undershoot the ideal length.
      if (this.totalLength - nextRemoval < this.maxLength) {
        break;
      }

      this.points.shift(); // remove first element
      const removedLength = this.segmentLengths.shift();
      if (removedLength !== undefined) {
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
   * 
   * @param count - Number of points to return
   * @param distance - Spacing between each point
   * @param progress - Value from 0 to 1 controlling how far along the trail the head is.
   *                   At 0, all points are at the first point. At 1, full trail (default).
   */
  public getEvenlySpacedPoints(count: number, distance: number, progress: number = 1): Vector2[] {
    if (count <= 0 || this.points.length === 0) {
      return [];
    }

    // Clamp progress to [0, 1]
    const clampedProgress = Math.max(0, Math.min(1, progress));

    const firstPoint = this.points[0];
    if (this.points.length === 1 || distance <= 0) {
      return Array.from({ length: count }, () => firstPoint.clone());
    }

    const cumulative: number[] = new Array(this.points.length);
    cumulative[0] = 0;
    for (let i = 1; i < this.points.length; i++) {
      cumulative[i] = cumulative[i - 1] + (this.segmentLengths[i - 1] ?? 0);
    }

    const totalLength = cumulative[cumulative.length - 1];
    
    // The "head" position is at effectiveLength from the start
    const effectiveLength = totalLength * clampedProgress;
    
    const result: Vector2[] = [];
    let segmentIndex = this.points.length - 2;

    for (let i = 0; i < count; i++) {
      const targetDistanceFromEnd = distance * i;
      // Use effectiveLength instead of totalLength
      const targetDistanceFromStart = Math.max(0, effectiveLength - targetDistanceFromEnd);

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

  public clear(): void {
    this.setPoints([]);
  }

  public setPoints(points: Vector2[]): void {
    this.points = [];
    this.segmentLengths = [];
    this.totalLength = 0;

    if (points.length === 0) {
      return;
    }

    this.points.push(points[0].clone());
    for (let i = 1; i < points.length; i++) {
      const point = points[i].clone();
      const lastPoint = this.points[this.points.length - 1];
      const length = Vector2.distance(lastPoint, point);
      this.segmentLengths.push(length);
      this.totalLength += length;
      this.points.push(point);
    }

    this.truncateTrail();
  }
}