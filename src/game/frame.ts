// NEONVOLT — standard playfield frame: single source for physics AND visuals.
import type { Vec2 } from "./types";

export interface FrameWall {
  pts: Vec2[];
  t: number; // physical/visual thickness
}

export const FRAME_WALLS: FrameWall[] = [
  { pts: [{ x: 1, y: 110 }, { x: 1, y: 945 }], t: 18 }, // left wall
  { pts: [{ x: 539, y: 110 }, { x: 539, y: 936 }], t: 18 }, // right wall
  {
    // top arc
    pts: [
      { x: 1, y: 110 },
      { x: 50, y: 55 },
      { x: 130, y: 25 },
      { x: 270, y: 15 },
      { x: 410, y: 25 },
      { x: 490, y: 55 },
      { x: 539, y: 110 },
    ],
    t: 18,
  },
  { pts: [{ x: 492, y: 160 }, { x: 492, y: 936 }], t: 16 }, // shooter lane inner wall
  { pts: [{ x: 492, y: 158 }, { x: 456, y: 132 }], t: 14 }, // lane deflector
  { pts: [{ x: 496, y: 938 }, { x: 539, y: 938 }], t: 14 }, // lane floor
  {
    // left inlane guide
    pts: [
      { x: 88, y: 700 },
      { x: 88, y: 838 },
      { x: 126, y: 872 },
      { x: 150, y: 878 },
    ],
    t: 14,
  },
  {
    // right inlane guide
    pts: [
      { x: 452, y: 700 },
      { x: 452, y: 838 },
      { x: 414, y: 872 },
      { x: 390, y: 878 },
    ],
    t: 14,
  },
];

export const DRAIN_Y = 990;
export const KICKBACK_POS: Vec2 = { x: 24, y: 880 };
export const PLUNGER_REST: Vec2 = { x: 515, y: 918 };
export const FLIPPER_PIVOTS: [Vec2, Vec2] = [
  { x: 162, y: 880 },
  { x: 378, y: 880 },
];

// ------------------------------------------------- path geometry (4.0)

/** Total polyline length in px (min 1 to avoid division by zero). */
export function pathLength(path: Vec2[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (!a || !b) continue;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return Math.max(1, total);
}

/** Position + unit tangent at `dist` px along the polyline. */
export function pointAt(
  path: Vec2[],
  dist: number,
): { x: number; y: number; tx: number; ty: number } {
  let s = Math.max(0, dist);
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (!a || !b) continue;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (s <= len) {
      const f = len === 0 ? 0 : s / len;
      return {
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        tx: (b.x - a.x) / Math.max(0.001, len),
        ty: (b.y - a.y) / Math.max(0.001, len),
      };
    }
    s -= len;
  }
  const last = path[path.length - 1];
  const prev = path[path.length - 2] ?? last;
  if (!last || !prev) return { x: 0, y: 0, tx: 0, ty: -1 };
  const dx = last.x - prev.x;
  const dy = last.y - prev.y;
  const len = Math.max(0.001, Math.hypot(dx, dy));
  return { x: last.x, y: last.y, tx: dx / len, ty: dy / len };
}
