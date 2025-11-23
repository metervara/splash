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
}