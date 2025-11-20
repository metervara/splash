import { Vector2 } from "../shared/physics2d/Vector2";

export interface SegmentQuad {
  p0: Vector2;
  p1: Vector2;
  p2: Vector2;
  p3: Vector2;
}

export const getQuads = (points: Vector2[], thickness: number = 50): SegmentQuad[] => {
  const quads: SegmentQuad[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const pBeyondStart = i > 0 ? points[i - 1] : null;
    const pStart = points[i];
    const pEnd = points[i + 1];
    const pBeyondEnd = i < points.length - 2 ? points[i + 2] : null;

    const direction = Vector2.sub(pEnd, pStart);
    direction.normalize();
    const perpendicular = new Vector2(-direction.y, direction.x);
    
    let q1 = Vector2.add(pStart, Vector2.mul(perpendicular, thickness / 2));
    let q4 = Vector2.sub(pStart, Vector2.mul(perpendicular, thickness / 2));
    
    if(pBeyondStart) {
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
    }
    
    let q2 = Vector2.add(pEnd, Vector2.mul(perpendicular, thickness / 2));
    let q3 = Vector2.sub(pEnd, Vector2.mul(perpendicular, thickness / 2));
    if(pBeyondEnd) {
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
    }

    quads.push({ p0: q1, p1: q2, p2: q3, p3: q4 });
  }
  
  return quads;
};