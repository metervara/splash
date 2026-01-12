// Color presets for the simulation
const Colors = {
  BackgroundColor: '#000000',
  BranchColor: '#ffffff',
  TipColor: '#ff6666',
  AttractorColor: '#6666ff',
  BoundsColor: '#333333',
  BoundsFillColor: '#111111',
  BoundsBorderColor: '#333333',
  NodeColor: '#ffffff',
  AttractionZoneColor: 'rgba(100, 100, 255, 0.1)',
  KillZoneColor: 'rgba(255, 100, 100, 0.1)',
  InfluenceLinesColor: 'rgba(255, 255, 255, 0.3)',
  ObstacleColor: '#444444',
  ObstacleFillColor: '#222222',
};


export default {
  /**
    Simulation configurations
  */

  VenationType: 'Open',          // venation can be "Open" or "Closed"
  SegmentLength: 5,              // length of each branch segment. Smaller numbers mean smoother lines, but more computation cost
  AttractionDistance: 20,        // radius of influence (d_i) around each attractor that attracts nodes
  KillDistance: 5,               // distance (d_k) between attractors and nodes when branches are ended
  IsPaused: false,               // initial pause/unpause state
  EnableCanalization: true,     // turns on/off auxin flux canalization (line segment thickening)
  EnableOpacityBlending: false,  // turns on/off opacity


  /**
    Rendering configurations
  */

  // Visibility toggles
  ShowAttractors: false,
  ShowNodes: true,
  ShowTips: false,
  ShowAttractionZones: false,
  ShowKillZones: false,
  ShowInfluenceLines: false,
  ShowBounds: false,
  ShowObstacles: false,

  // Modes
  RenderMode: 'Lines',  // draw branch segments as "Lines" or "Dots"

  // Colors
  UseBranchColors: false,
  Colors,

  // Line thicknesses
  BranchThickness: 1,
  TipThickness: 1,
  BoundsBorderThickness: 1
} as const