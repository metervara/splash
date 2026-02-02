export { add, sub, scale, dot, length, normalize, lerp, perpendicular } from './Vec2';
export { edge } from './Edge';
export type { Vec2 } from './Vec2';
export type { Edge } from './Edge';
export { directionalLight, pointLight, toLightDirection } from './Light';
export { svgPathToEdges, edgesToSvgPath } from './svgPathToEdges';
export { findShadowSilhouette } from './silhouette';
export { getShadowCastingEdges, groupCastingChains } from './shadowCasting';