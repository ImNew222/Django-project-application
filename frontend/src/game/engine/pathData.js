/**
 * S-curve path for enemies to follow.
 * Coordinates are in grid space (0-9 x 0-9).
 * Enemies enter from left, exit to right.
 */

export const PATH_POINTS = [
  { x: -1, z: 1 },   // entry (off screen)
  { x: 0, z: 1 },
  { x: 1, z: 1 },
  { x: 2, z: 1 },
  { x: 3, z: 1 },
  { x: 3, z: 2 },
  { x: 3, z: 3 },
  { x: 3, z: 4 },
  { x: 3, z: 5 },
  { x: 4, z: 5 },
  { x: 5, z: 5 },
  { x: 6, z: 5 },
  { x: 6, z: 4 },
  { x: 6, z: 3 },
  { x: 6, z: 2 },
  { x: 6, z: 1 },
  { x: 7, z: 1 },
  { x: 8, z: 1 },
  { x: 9, z: 1 },
  { x: 10, z: 1 },  // exit (off screen)
];

/**
 * Check if a grid cell is on the path (can't place towers here).
 */
export function isOnPath(gx, gz) {
  return PATH_POINTS.some(p => p.x === gx && p.z === gz);
}

/**
 * Grid size
 */
export const GRID_SIZE = 9;
export const GRID_OFFSET = 0; // grid starts at 0,0

/**
 * Get world position from grid coordinates.
 */
export function gridToWorld(gx, gz) {
  return { x: gx - GRID_SIZE / 2 + 0.5, z: gz - GRID_SIZE / 2 + 0.5 };
}

/**
 * Get interpolated position along the path.
 */
export function getPathPosition(pathIndex, progress) {
  if (pathIndex >= PATH_POINTS.length - 1) {
    const last = PATH_POINTS[PATH_POINTS.length - 1];
    return gridToWorld(last.x, last.z);
  }
  const curr = PATH_POINTS[Math.max(0, pathIndex)];
  const next = PATH_POINTS[Math.min(pathIndex + 1, PATH_POINTS.length - 1)];
  const cx = gridToWorld(curr.x, curr.z);
  const nx = gridToWorld(next.x, next.z);
  return {
    x: cx.x + (nx.x - cx.x) * progress,
    z: cx.z + (nx.z - cx.z) * progress,
  };
}
