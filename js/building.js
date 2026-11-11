// The 5-storey shell: slabs, walls, windows, stairs, lift shaft, railings.
// Building footprint: x -21.6..12, z -8..8 (40% longer than the original 24 m). Street (front) is +Z.
// Service core on the right: lift x 9.6..12 / z -8..-5.6 (door faces the front),
// a roomy lift lobby z -5.6..0.4, stairs x 9.6..12 / z 0.4..6 (moved towards the front).
import * as THREE from 'three';
import { H, SLAB, CEIL, floorH, box, cyl, grp, glassMat, glowMat, mat, makeLabel, optimize, registerGlow, WINDOWS } from './helpers.js';
import { C } from './furniture.js';

// The building was made 40% longer (24 m -> 33.6 m) by moving the left wall out.
// Each floor's furniture was designed for the old 24 m layout: anything left of
// SPLIT[floor] moved left with the wall (by EXT), opening new space in the middle.
export const EXT = 9.6;
export const X1 = 12, X0 = -12 - EXT, W = X1 - X0, D = 16, Z0 = -8, Z1 = 8, XC = (X0 + X1) / 2;
export const SPLIT = { 1: -4.0, 2: 1.0, 3: 1.0, 4: -1.5, 5: -1.0 };   // 2 = outsource office, 4 = Chill Home
// Walking maps use the same rule, except Floor 1, which was re-laid out in real positions.
const NAV_SPLIT = { ...SPLIT, 1: -Infinity };
/** Walking-map x (old 24 m layout, real on Floor 1) -> real x on floor f. */
export const sx = (f, x) => (x < -500 ? x + 1000 : x < NAV_SPLIT[f] ? x - EXT : x);
/** Mark a walking-map x as already real (never shifted), e.g. furniture that was moved later. */
export const raw = (x) => x - 1000;
export const CORE_X = 9.6;              // rooms are x < CORE_X
export const STAIR = { x0: 9.6, x1: 12, z0: 0.4, z1: 6.0 };
export const LIFT = { x0: 9.6, x1: 12, z0: -8, z1: -5.6 };

// Japanese look: dark timber outside (yakisugi-style posts and beams), each floor lined inside
const WALL = '#4a3428', WALL_OUT = '#4a3428', TRIM = '#2a1f19', POST = '#2a1f19', SLAB_C = '#5a4030';
const LINING = { 1: '#b8865a', 2: '#b8865a', 3: '#b8865a', 4: '#b8865a' };   // same warm wood on every floor
export const KANJI = ['', '一階', '二階', '三階', '四階', '五階'];
// window glass: sky reflection by day, warm room light at night (see js/env.js)
const winMat = () => { const m = mat('#bfe0ee', { emissive: '#9fc8de', emissiveIntensity: 0.35, roughness: 0.2 }); WINDOWS.add(m); return m; };

function windowsAlongX(p, z, x0, x1, every, h0 = 0.9, wh = CEIL - 1.6) {
  for (let x = x0 + every / 2; x < x1; x += every) {
    box(p, every * 0.62, wh, 0.34, winMat(), x, h0, z, { cast: false });
    box(p, every * 0.68, 0.08, 0.4, TRIM, x, h0 - 0.08, z, { cast: false });
    box(p, every * 0.68, 0.08, 0.4, TRIM, x, h0 + wh, z, { cast: false });
  }
}
function windowsAlongZ(p, x, z0, z1, every, h0 = 0.9, wh = CEIL - 1.6) {
  for (let z = z0 + every / 2; z < z1; z += every) {
    box(p, 0.34, wh, every * 0.62, winMat(), x, h0, z, { cast: false });
    box(p, 0.4, 0.08, every * 0.68, TRIM, x, h0 - 0.08, z, { cast: false });
    box(p, 0.4, 0.08, every * 0.68, TRIM, x, h0 + wh, z, { cast: false });
  }
}

/** Long window with slim black mullions, set into a wall running along X. */
function glassStrip(p, z, x0, x1, y0, y1) {
  box(p, x1 - x0, y1 - y0, 0.34, winMat(), (x0 + x1) / 2, y0, z, { cast: false });
  const n = Math.round((x1 - x0) / 1.3);
  for (let i = 0; i <= n; i++) box(p, 0.06, y1 - y0, 0.4, '#2b2a2c', x0 + (x1 - x0) * i / n, y0, z, { cast: false });
  box(p, x1 - x0, 0.07, 0.42, '#2b2a2c', (x0 + x1) / 2, y0, z, { cast: false });
  box(p, x1 - x0, 0.07, 0.42, '#2b2a2c', (x0 + x1) / 2, y1 - 0.07, z, { cast: false });
  box(p, x1 - x0, 0.06, 0.4, '#2b2a2c', (x0 + x1) / 2, (y0 + y1) / 2 + 0.6, z, { cast: false }); // transom
}

/** Same long black-framed window, for a wall running along Z. */
function glassStripZ(p, x, z0, z1, y0, y1) {
  box(p, 0.34, y1 - y0, z1 - z0, winMat(), x, y0, (z0 + z1) / 2, { cast: false });
  const n = Math.round((z1 - z0) / 1.3);
  for (let i = 0; i <= n; i++) box(p, 0.4, y1 - y0, 0.06, '#2b2a2c', x, y0, z0 + (z1 - z0) * i / n, { cast: false });
  box(p, 0.42, 0.07, z1 - z0, '#2b2a2c', x, y0, (z0 + z1) / 2, { cast: false });
  box(p, 0.42, 0.07, z1 - z0, '#2b2a2c', x, y1 - 0.07, (z0 + z1) / 2, { cast: false });
  box(p, 0.4, 0.06, z1 - z0, '#2b2a2c', x, (y0 + y1) / 2 + 0.6, (z0 + z1) / 2, { cast: false }); // transom
}

function glassRail(p, x1, z1, x2, z2, h = 1.05) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const ry = Math.atan2(x2 - x1, z2 - z1) - Math.PI / 2;
  const g = grp(p, (x1 + x2) / 2, 0, (z1 + z2) / 2, ry);
  box(g, len, h - 0.06, 0.03, glassMat(), 0, 0, 0, { cast: false });
  box(g, len, 0.06, 0.1, C.woodDark, 0, h - 0.06, 0, { cast: false });
  return g;
}

/** Slab with holes for stairs (if holeStairs) and lift. Top at y=0. */
function slab(p, n) {
  const holeStairs = n > 1;
  box(p, CORE_X - X0, SLAB, D, SLAB_C, (X0 + CORE_X) / 2, -SLAB, 0, { cast: false });
  const sw = X1 - CORE_X, sx = (CORE_X + X1) / 2;
  // strip right of rooms: front landing, mid landing (between stairs and lift)
  if (holeStairs) {
    box(p, sw, SLAB, Z1 - STAIR.z1, SLAB_C, sx, -SLAB, (STAIR.z1 + Z1) / 2, { cast: false });
    box(p, sw, SLAB, STAIR.z0 - LIFT.z1, SLAB_C, sx, -SLAB, (LIFT.z1 + STAIR.z0) / 2, { cast: false });
  } else {
    box(p, sw, SLAB, Z1 - LIFT.z1, SLAB_C, sx, -SLAB, (LIFT.z1 + Z1) / 2, { cast: false });
  }
  if (n === 1) box(p, sw, SLAB, LIFT.z1 - LIFT.z0, SLAB_C, sx, -SLAB, (LIFT.z0 + LIFT.z1) / 2, { cast: false }); // pit floor
  // slab edge trim along the front
  box(p, W + 0.1, 0.12, 0.12, TRIM, XC, -SLAB, Z1, { cast: false });
  // core floor finish
  if (n > 1) {
    box(p, sw, 0.02, Z1 - STAIR.z1, '#c99a63', sx, 0, (STAIR.z1 + Z1) / 2, { cast: false });
    box(p, sw, 0.02, STAIR.z0 - LIFT.z1, '#c99a63', sx, 0, (LIFT.z1 + STAIR.z0) / 2, { cast: false });
  } else {
    box(p, sw, 0.02, Z1 - LIFT.z1, '#c99a63', sx, 0, (LIFT.z1 + Z1) / 2, { cast: false });
  }
}

/** Stairs from this floor (y=0, front) up to the next floor (y=H, back): same style as the
 *  atrium stairs on Floor 1 (floating cedar treads, soft step lights, wooden rails). */
function stairs(p) {
  flight(p, (STAIR.x0 + STAIR.x1) / 2 + 0.05, 0, STAIR.z1, STAIR.z0, STAIR.x1 - STAIR.x0 - 0.35);
}
/** Wooden balustrade (matches the Floor 1 balconies). */
function woodRail(p, x1, z1, x2, z2, h = 1.0) {
  const len = Math.hypot(x2 - x1, z2 - z1), ry = Math.atan2(x2 - x1, z2 - z1) - Math.PI / 2;
  const g = grp(p, (x1 + x2) / 2, 0, (z1 + z2) / 2, ry);
  const n = Math.max(1, Math.round(len / 1.2));
  for (let i = 0; i <= n; i++) box(g, 0.07, h, 0.07, '#5a3b26', -len / 2 + len * i / n, 0, 0, { cast: false });
  box(g, len, 0.07, 0.1, '#5a3b26', 0, h, 0, { cast: false });
  box(g, len, 0.04, 0.05, '#5a3b26', 0, h / 2, 0, { cast: false });
  return g;
}

/** Floor 1 (the tall atrium): three flights in the core, switching back on two lanes,
 *  with landings at the two balcony levels. Must match ATRIUM_STAIR_PATH in js/staff.js. */
export const LANE_A = 10.2, LANE_B = 11.4;
function flight(p, cx, y0, zA, zB, w = 1.1) {
  const steps = Math.round(H / 0.22), rise = H / steps, run = (zB - zA) / steps;
  const glow = glowMat('#ffcf80', 0.5);
  for (let k = 0; k < steps; k++) {
    const z = zA + run * (k + 0.5), y = y0 + rise * (k + 1);
    box(p, w, 0.1, Math.abs(run) + 0.02, k % 2 ? '#c99a63' : '#bf8f58', cx, y - 0.1, z, { cast: false });     // floating cedar treads
    if (k % 2 === 0) box(p, w - 0.1, 0.03, 0.04, glow, cx, y - 0.13, z + Math.sign(run) * (Math.abs(run) / 2 - 0.02), { cast: false }); // soft step light
  }
  const len = Math.hypot(H, zB - zA), ang = Math.atan2(H, zB - zA);
  for (const sx of [-w / 2, w / 2]) {
    const st = grp(p, cx + sx, y0 + H / 2, (zA + zB) / 2);
    box(st, 0.08, 0.28, len, '#5a3b26', 0, -0.3, 0, { rx: -ang });                // stringer
    box(st, 0.06, 0.06, len, '#3d2618', 0, 0.75, 0, { rx: -ang });                // handrail
  }
  for (let k = 2; k < steps; k += 5) for (const sx of [-w / 2, w / 2]) box(p, 0.04, 0.95, 0.04, '#3d2618', cx + sx, y0 + rise * (k + 1), zA + run * (k + 0.5), { cast: false });
}
function atriumStairs(p) {
  const z0 = STAIR.z0, z1 = STAIR.z1;
  flight(p, LANE_A, 0, z1, z0);              // ground -> 1st balcony level (back)
  flight(p, LANE_B, H, z0, z1);              // 1st -> 2nd balcony level (front)
  flight(p, LANE_A, 2 * H, z1, z0);          // 2nd balcony level -> Floor 2 (back)
  const x0 = STAIR.x0, x1 = STAIR.x1;
  box(p, x1 - x0, 0.25, 1.35, '#8a5f3c', (x0 + x1) / 2, H - 0.25, z0 - 0.65);          // back landing
  box(p, x1 - x0, 0.25, 1.3, '#8a5f3c', (x0 + x1) / 2, 2 * H - 0.25, z1 + 0.65);     // front landing
  for (const [y, z] of [[H, z0 - 0.65], [2 * H, z1 + 0.65]]) box(p, 0.06, 1.0, 1.3, '#3d2618', x1 - 0.1, y, z, { cast: false });
}

function liftShaftSegment(p, n, top = false) {
  const h = top ? 3.4 : floorH(n);
  const y0 = n === 1 ? 0 : -SLAB;
  const hh = h + (n === 1 ? 0 : SLAB) - (top ? 0 : SLAB);
  const { x0, x1, z0, z1 } = LIFT;
  // glass walls (front + left) and corner posts
  box(p, x1 - x0, hh, 0.04, glassMat(), (x0 + x1) / 2, y0, z1, { cast: false });
  box(p, 0.04, hh, z1 - z0, glassMat(), x0, y0, (z0 + z1) / 2, { cast: false });
  for (const [px, pz] of [[x0, z1], [x1 - 0.05, z1], [x0, z0 + 0.05]]) box(p, 0.1, hh, 0.1, '#5b4a3c', px, y0, pz, { cast: false });
  // door frame on the lobby side (front, facing +Z)
  const cx = (x0 + x1) / 2;
  box(p, 1.4, 0.12, 0.12, '#5b4a3c', cx, 2.3, z1, { cast: false });
  box(p, 0.08, 2.3, 0.12, '#5b4a3c', cx - 0.7, 0, z1, { cast: false });
  box(p, 0.08, 2.3, 0.12, '#5b4a3c', cx + 0.7, 0, z1, { cast: false });
  const lbl = makeLabel(`${KANJI[n]}  ${n}F`, { height: 0.34, px: 44, depthTest: true });
  lbl.position.set(cx, 2.7, z1 + 0.15);
  p.add(lbl);
  if (top) {
    box(p, x1 - x0 + 0.2, 0.25, z1 - z0 + 0.2, '#5b4a3c', (x0 + x1) / 2, 3.4, (z0 + z1) / 2, { cast: false });
  }
}

/** Exterior timber frame on a wall running along X (posts between windows + a beam at the top). */
function postsX(p, z, x0, x1, every, h, out) {
  for (let x = x0; x <= x1 + 0.01; x += every) box(p, 0.16, h, 0.08, POST, x, 0, z + out, { cast: false });
  box(p, x1 - x0 + 0.2, 0.32, 0.1, POST, (x0 + x1) / 2, h - 0.02, z + out, { cast: false });
}
function postsZ(p, x, z0, z1, every, h, out) {
  for (let z = z0; z <= z1 + 0.01; z += every) box(p, 0.08, h, 0.16, POST, x + out, 0, z, { cast: false });
  box(p, 0.1, 0.32, z1 - z0 + 0.2, POST, x + out, h - 0.02, (z0 + z1) / 2, { cast: false });
}
/** Dark tiled eave (hisashi) sticking out over the street side. */
function eave(p, y, x0, x1, depth = 0.8) {
  const g = grp(p, (x0 + x1) / 2, y, Z1);
  box(g, x1 - x0, 0.08, depth, '#3a3d42', 0, 0, depth / 2, { rx: 0.22, cast: false });
  for (let x = -(x1 - x0) / 2 + 0.15; x < (x1 - x0) / 2; x += 0.3) box(g, 0.05, 0.05, depth, '#2c2e33', x, 0.06, depth / 2, { rx: 0.22, cast: false }); // tile ribs
  box(g, x1 - x0, 0.06, 0.08, POST, 0, -0.18, depth - 0.02, { cast: false });
}

/** Build the shell of floor n (1..5) into group p (positioned at floor height). */
export function shell(p, n) {
  const roof = n === 5;
  const ceil = floorH(n) - SLAB;
  slab(p, n);
  liftShaftSegment(p, n, roof);
  if (n === 1) atriumStairs(p);
  else if (n < 5) stairs(p);
  if (n > 1) eave(p, -SLAB - 0.05, X0 - 0.1, X1 + 0.1);

  const walls = {};
  if (!roof) {
    // Side / back walls live in their own groups so they can fade out
    // when the camera looks at the building from that side.
    for (const side of ['back', 'left', 'right']) {
      walls[side] = grp(p);
      walls[side].userData.dynamic = true; // merged separately (see main.js)
      walls[side].userData.wallSide = side;
    }
    const lin = LINING[n];
    // back wall (z = -8) with windows
    box(walls.back, W, ceil, 0.3, WALL, XC, 0, Z0 + 0.15, { cast: false });
    box(walls.back, W - 0.6, ceil, 0.01, lin, XC, 0, Z0 + 0.305, { cast: false });
    if (n === 1) {
      // the atrium: tall glass at street level and a clerestory band under the roof beams
      glassStrip(walls.back, Z0 + 0.15, X0 + 0.35, CORE_X - 0.2, 0.75, 4.25);
      glassStrip(walls.back, Z0 + 0.15, X0 + 0.35, CORE_X - 0.2, ceil - 3.2, ceil - 0.5);
    } else {
      windowsAlongX(walls.back, Z0 + 0.15, X0 + 0.5, CORE_X - 0.5, 3.0);
    }
    postsX(walls.back, Z0, X0 + 0.5, CORE_X - 0.5, 3.0, ceil, -0.04);
    // left wall (x = -12)
    box(walls.left, 0.3, ceil, D, WALL, X0 + 0.15, 0, 0, { cast: false });
    box(walls.left, 0.01, ceil, D - 0.6, lin, X0 + 0.305, 0, 0, { cast: false });
    if (n === 1) {
      glassStripZ(walls.left, X0 + 0.15, Z0 + 0.35, Z1 - 0.6, 0.75, 4.25);
      glassStripZ(walls.left, X0 + 0.15, Z0 + 0.35, Z1 - 0.6, ceil - 3.2, ceil - 0.5);
    } else windowsAlongZ(walls.left, X0 + 0.15, Z0 + 0.5, Z1 - 1.0, 3.0);
    postsZ(walls.left, X0, Z0 + 0.5, Z1 - 1.0, 3.0, ceil, -0.04);
    // right wall (x = 12): outer wall of the core
    box(walls.right, 0.3, ceil, D, WALL_OUT, X1 - 0.15, 0, 0, { cast: false });
    box(walls.right, 0.01, ceil, D - 0.6, lin, X1 - 0.305, 0, 0, { cast: false });
    if (n === 1) {
      glassStripZ(walls.right, X1 - 0.15, LIFT.z1 + 0.3, Z1 - 0.6, 0.75, 4.25);
      glassStripZ(walls.right, X1 - 0.15, LIFT.z1 + 0.3, Z1 - 0.6, ceil - 3.2, ceil - 0.5);
    } else windowsAlongZ(walls.right, X1 - 0.15, LIFT.z1 + 0.3, Z1 - 0.3, 3.2);
    postsZ(walls.right, X1, Z0 + 0.3, Z1 - 0.3, 3.2, ceil, 0.04);
    // front corner columns
    box(p, 0.5, ceil, 0.5, POST, X0 + 0.25, 0, Z1 - 0.25, { cast: false });
    box(p, 0.5, ceil, 0.5, POST, X1 - 0.25, 0, Z1 - 0.25, { cast: false });
    // upper floors get a glass balustrade along the open front
    if (n > 1) glassRail(p, X0 + 0.5, Z1 - 0.15, X1 - 0.5, Z1 - 0.15);
    // rail around the stair hole (on this floor, from the flight below)
    if (n > 1) woodRail(p, STAIR.x0 - 0.05, STAIR.z0 + 0.2, STAIR.x0 - 0.05, STAIR.z1);
  } else {
    // roof parapet (glass railing all round)
    glassRail(p, X0 + 0.1, Z1 - 0.1, X1 - 0.1, Z1 - 0.1);
    glassRail(p, X0 + 0.1, Z0 + 0.1, LIFT.x0, Z0 + 0.1);
    glassRail(p, X0 + 0.1, Z0 + 0.1, X0 + 0.1, Z1 - 0.1);
    glassRail(p, X1 - 0.1, LIFT.z1, X1 - 0.1, Z1 - 0.1);
    woodRail(p, STAIR.x0 - 0.05, STAIR.z0 + 0.2, STAIR.x0 - 0.05, STAIR.z1);
    woodRail(p, STAIR.x0, STAIR.z1 + 0.05, X1 - 0.1, STAIR.z1 + 0.05);
  }
  // bilingual floor sign by the stairs (seen from the landing)
  if (n < 5 || roof) {
    const sg = makeLabel(`${KANJI[n]} ${n}F`, { height: 0.32, px: 44, depthTest: true });
    sg.position.set(STAIR.x0 + 0.03, 2.4, Z1 - 0.9);
    p.add(sg);
  }
  return walls;
}

/** Lift car that travels between floors. */
export function liftCar(scene) {
  const g = new THREE.Group();
  const { x0, x1, z0, z1 } = LIFT;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0 - 0.3, d = z1 - z0 - 0.3;
  box(g, w, 0.12, d, '#7a5a3c', 0, 0, 0);
  box(g, w, 0.12, d, '#7a5a3c', 0, 2.5, 0);
  box(g, w, 2.4, 0.06, '#d9c3a0', 0, 0.12, -d / 2);
  box(g, 0.06, 2.4, d, '#d9c3a0', w / 2, 0.12, 0);
  box(g, 0.06, 2.4, d, glassMat(), -w / 2, 0.12, 0, { cast: false });
  box(g, w, 2.4, 0.06, glassMat(), 0, 0.12, d / 2, { cast: false });
  box(g, 0.5, 0.05, 0.5, mat('#fff1c8', { emissive: '#ffe2a0' }), 0, 2.45, 0, { cast: false });
  g.position.set(cx, 0.02, cz);
  scene.add(g);
  return g;
}

export { optimize };
