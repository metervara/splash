import { Vector2 } from "../shared/physics2d/Vector2";

const MIN_SEGMENT_LENGTH = 50; //1e-3;

export interface SegmentQuad {
  p0: Vector2;
  p1: Vector2;
  p2: Vector2;
  p3: Vector2;
  oddEven: boolean;
  length: number;
}

const angleBewteenSegments = (v1: Vector2, v2: Vector2): number => {
  const diff = Math.atan2(v2.y, v2.x) - Math.atan2(v1.y, v1.x);
  return Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff))); // 0..π
};

const cross = (v1: Vector2, v2: Vector2): number => v1.x * v2.y - v1.y * v2.x;

const lineIntersection = (
  p1: Vector2,
  d1: Vector2,
  p2: Vector2,
  d2: Vector2
): Vector2 | null => {
  const denom = cross(d1, d2);
  if (Math.abs(denom) < 1e-6) {
    return null;
  }

  const diff = Vector2.sub(p2, p1);
  const t = cross(diff, d2) / denom;
  return Vector2.add(p1, Vector2.mul(d1, t));
};

export const getQuads = (points: {position: Vector2, oddEven: boolean}[], thickness: number = 50): SegmentQuad[] => {
  const quads: SegmentQuad[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const pBeyondStart = i > 0 ? points[i - 1].position : null;
    const pStart = points[i].position;
    const pEnd = points[i + 1].position;
    const pBeyondEnd = i < points.length - 2 ? points[i + 2].position : null;

    const direction = Vector2.sub(pEnd, pStart);
    const segmentLength = direction.length();
    if (segmentLength < MIN_SEGMENT_LENGTH) {
      continue;
    }
    direction.normalize();
    const perpendicular = new Vector2(-direction.y, direction.x);
    const halfThickness = thickness / 2;

    // START OF SEGMENT (calc for the two poinst at this side)
    let q1 = Vector2.add(pStart, Vector2.mul(perpendicular, halfThickness));
    let q4 = Vector2.sub(pStart, Vector2.mul(perpendicular, halfThickness));
    
    if(pBeyondStart) {
      // 1. Check angle betwene prev and current segments.
      const segPrevDirection = Vector2.sub(pStart, pBeyondStart);
      segPrevDirection.normalize();
      const angleBetweenSegments = angleBewteenSegments(segPrevDirection, direction);

      // 2. If it's above 90 degrees we use an average perpendicular for the crease
      if(angleBetweenSegments > Math.PI / 2) {
        const dirBeyondStart = Vector2.sub(pBeyondStart, pStart);
        dirBeyondStart.normalize();
        const perpendicularBeyondStart = new Vector2(-dirBeyondStart.y, dirBeyondStart.x);
      
        // Angle between the two normals (perpendiculars)
        const angleBetween =
          Math.atan2(perpendicularBeyondStart.y, perpendicularBeyondStart.x) -
          Math.atan2(perpendicular.y, perpendicular.x);

        // We only care about the magnitude of the angle
        const phi = Math.abs(angleBetween);

        // Multiplier: 1 when phi = 0, grows as phi increases
        const multiplier = Math.abs(1 / Math.cos(phi * 0.5)); // = 1 / cos(phi/2)
        const scaledHalfThickness = halfThickness * multiplier;

        const averageNormal = Vector2.add(perpendicular, perpendicularBeyondStart);
        averageNormal.normalize();
        q1 = Vector2.add(pStart, Vector2.mul(averageNormal, scaledHalfThickness));
        q4 = Vector2.sub(pStart, Vector2.mul(averageNormal, scaledHalfThickness));
      } else {
        // 3. If it's below 90 degrees we do a straightforward miter between segments
        const prevNormal = new Vector2(-segPrevDirection.y, segPrevDirection.x);
        if (Vector2.dot(prevNormal, perpendicular) < 0) {
          prevNormal.mul(-1);
        }

        const offsetPrev = Vector2.add(pStart, Vector2.mul(prevNormal, halfThickness));
        const offsetCurr = Vector2.add(pStart, Vector2.mul(perpendicular, halfThickness));
        const topIntersection = lineIntersection(offsetPrev, segPrevDirection, offsetCurr, direction);
        if (topIntersection) {
          q1 = topIntersection;
        }

        const prevNormalOpposite = Vector2.mul(prevNormal, -1);
        const perpendicularOpposite = Vector2.mul(perpendicular, -1);
        const offsetPrevOpp = Vector2.add(pStart, Vector2.mul(prevNormalOpposite, halfThickness));
        const offsetCurrOpp = Vector2.add(pStart, Vector2.mul(perpendicularOpposite, halfThickness));
        const bottomIntersection = lineIntersection(offsetPrevOpp, segPrevDirection, offsetCurrOpp, direction);
        if (bottomIntersection) {
          q4 = bottomIntersection;
        }
      }
    }
    
    // END OF SEGMENT (calc for the two poinst at this side)
    let q2 = Vector2.add(pEnd, Vector2.mul(perpendicular, halfThickness));
    let q3 = Vector2.sub(pEnd, Vector2.mul(perpendicular, halfThickness));

    if(pBeyondEnd) {
      // 1. Check angle betwene prev and current segments.
      const segNextDirection = Vector2.sub(pBeyondEnd, pEnd);
      segNextDirection.normalize();
      const angleBetweenSegments = angleBewteenSegments(segNextDirection, direction);
      
      // 2. If it's above 90 degrees we use an average perpendicular for the crease
      if(angleBetweenSegments > Math.PI / 2) {

        const dirBeyondEnd = Vector2.sub(pEnd, pBeyondEnd);
        dirBeyondEnd.normalize();
        const perpendicularBeyondEnd = new Vector2(-dirBeyondEnd.y, dirBeyondEnd.x);
      
        const angleBetween =
        Math.atan2(perpendicularBeyondEnd.y, perpendicularBeyondEnd.x) -
        Math.atan2(perpendicular.y, perpendicular.x);

        const phi = Math.abs(angleBetween);
        const multiplier = Math.abs(1 / Math.cos(phi * 0.5));
        const scaledHalfThickness = halfThickness * multiplier;

        const averageNormal = Vector2.add(perpendicular, perpendicularBeyondEnd);
        averageNormal.normalize();
        q2 = Vector2.add(pEnd, Vector2.mul(averageNormal, scaledHalfThickness));
        q3 = Vector2.sub(pEnd, Vector2.mul(averageNormal, scaledHalfThickness));
      
      } else {
        // 3. If it's below 90 degrees we do a straightforward miter between segments
        const nextNormal = new Vector2(-segNextDirection.y, segNextDirection.x);
        if (Vector2.dot(nextNormal, perpendicular) < 0) {
          nextNormal.mul(-1);
        }

        const offsetCurr = Vector2.add(pEnd, Vector2.mul(perpendicular, halfThickness));
        const offsetNext = Vector2.add(pEnd, Vector2.mul(nextNormal, halfThickness));
        const topIntersection = lineIntersection(offsetCurr, direction, offsetNext, segNextDirection);
        if (topIntersection) {
          q2 = topIntersection;
        }

        const nextNormalOpposite = Vector2.mul(nextNormal, -1);
        const perpendicularOpposite = Vector2.mul(perpendicular, -1);
        const offsetCurrOpp = Vector2.add(pEnd, Vector2.mul(perpendicularOpposite, halfThickness));
        const offsetNextOpp = Vector2.add(pEnd, Vector2.mul(nextNormalOpposite, halfThickness));
        const bottomIntersection = lineIntersection(offsetCurrOpp, direction, offsetNextOpp, segNextDirection);
        if (bottomIntersection) {
          q3 = bottomIntersection;
        }
      }

    }

    quads.push({ p0: q1, p1: q2, p2: q3, p3: q4, oddEven: points[i].oddEven, length: segmentLength });
  }
  
  return quads;
};