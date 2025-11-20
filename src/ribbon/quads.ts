import { Vector2 } from "../shared/physics2d/Vector2";

export interface SegmentQuad {
  p0: Vector2;
  p1: Vector2;
  p2: Vector2;
  p3: Vector2;
  oddEven: boolean;
}

const angleBewteenSegments = (v1: Vector2, v2: Vector2): number => {
  const diff = Math.atan2(v2.y, v2.x) - Math.atan2(v1.y, v1.x);
  return Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff))); // 0..π
}

export const getQuads = (points: {position: Vector2, oddEven: boolean}[], thickness: number = 50): SegmentQuad[] => {
  const quads: SegmentQuad[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const pBeyondStart = i > 0 ? points[i - 1].position : null;
    const pStart = points[i].position;
    const pEnd = points[i + 1].position;
    const pBeyondEnd = i < points.length - 2 ? points[i + 2].position : null;

    const direction = Vector2.sub(pEnd, pStart);
    direction.normalize();
    const perpendicular = new Vector2(-direction.y, direction.x);

    // START OF SEGMENT (calc for the two poinst at this side)
    let q1 = Vector2.add(pStart, Vector2.mul(perpendicular, thickness / 2));
    let q4 = Vector2.sub(pStart, Vector2.mul(perpendicular, thickness / 2));
    
    if(pBeyondStart) {
      // 1. Check angle betwene prev and current segments.
      const segPrevDirection = Vector2.sub(pStart, pBeyondStart);
      segPrevDirection.normalize();
      const angleBetweenSegments = angleBewteenSegments(segPrevDirection, direction);

      // 2. If it's below 90 degrees we use an average perpendicular for the crease
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
        const halfThickness = (thickness / 2) * multiplier;

        const averageNormal = Vector2.add(perpendicular, perpendicularBeyondStart);
        averageNormal.normalize();
        q1 = Vector2.add(pStart, Vector2.mul(averageNormal, halfThickness));
        q4 = Vector2.sub(pStart, Vector2.mul(averageNormal, halfThickness));
      } else {
        // 3. If it's above 90 degrees we do a miter 
        // FOR NOW WE KEEP THE PERPENDICULAR AS IS
      }
    }
    
    // END OF SEGMENT (calc for the two poinst at this side)
    let q2 = Vector2.add(pEnd, Vector2.mul(perpendicular, thickness / 2));
    let q3 = Vector2.sub(pEnd, Vector2.mul(perpendicular, thickness / 2));

    if(pBeyondEnd) {
      // 1. Check angle betwene prev and current segments.
      const segNextDirection = Vector2.sub(pBeyondEnd, pEnd);
      segNextDirection.normalize();
      const angleBetweenSegments = angleBewteenSegments(segNextDirection, direction);
      
      // 2. If it's below 90 degrees we use an average perpendicular for the crease
      if(angleBetweenSegments > Math.PI / 2) {

        const dirBeyondEnd = Vector2.sub(pEnd, pBeyondEnd);
        dirBeyondEnd.normalize();
        const perpendicularBeyondEnd = new Vector2(-dirBeyondEnd.y, dirBeyondEnd.x);
      
        const angleBetween =
        Math.atan2(perpendicularBeyondEnd.y, perpendicularBeyondEnd.x) -
        Math.atan2(perpendicular.y, perpendicular.x);

        const phi = Math.abs(angleBetween);
        const multiplier = Math.abs(1 / Math.cos(phi * 0.5));
        const halfThickness = (thickness / 2) * multiplier;

        const averageNormal = Vector2.add(perpendicular, perpendicularBeyondEnd);
        averageNormal.normalize();
        q2 = Vector2.add(pEnd, Vector2.mul(averageNormal, halfThickness));
        q3 = Vector2.sub(pEnd, Vector2.mul(averageNormal, halfThickness));
      
      } else {
        // 3. If it's above 90 degrees we do a miter 
        // FOR NOW WE KEEP THE PERPENDICULAR AS IS
      }

    }

    quads.push({ p0: q1, p1: q2, p2: q3, p3: q4, oddEven: points[i].oddEven });
  }
  
  return quads;
};