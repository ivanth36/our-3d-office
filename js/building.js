// The 5-storey shell: slabs, walls, windows, stairs, lift shaft, railings.
// Building footprint: x -12..12, z -8..8. Street (front) is +Z.
// Service core on the right: lift x 9.6..12 / z -8..-5.6 (door faces the front),
// a roomy lift lobby z -5.6..0.4, stairs x 9.6..12 / z 0.4..6 (moved towards the front).
import * as THREE from 'three';
import { H, SLAB, CEIL, box, cyl, grp, glassMat, mat, makeLabel, optimize } from './helpers.js';
import { C } from './furniture.js';

export const W = 24, D = 16, X0 = -12, X1 = 12, Z0 = -8, Z1 = 8;
export const CORE_X = 9.6;              // rooms are x < CORE_X
export const STAIR = { x0: 9.6, x1: 12, z0: 0.4, z1: 6.0 };
export const LIFT = { x0: 9.6, x1: 12, z0: -8, z1: -5.6 };

const WALL = '#f3e5cf', WALL_OUT = '#e9d3b4', TRIM = '#8a5a33', SLAB_C = '#e8d6bb';

function windowsAlongX(p, z, x0, x1, every, h0 = 0.9, wh = 2.0) {
  for (let x = x0 + every / 2; x < x1; x += every) {
    box(p, every * 0.62, wh, 0.34, mat('#bfe0ee', { emissive: '#9fc8de', emissiveIntensity: 0.35, roughness: 0.2 }), x, h0, z, { cast: false });
    box(p, every * 0.68, 0.08, 0.4, TRIM, x, h0 - 0.08, z, { cast: false });
    box(p, every * 0.68, 0.08, 0.4, TRIM, x, h0 + wh, z, { cast: false });
  }
}
function windowsAlongZ(p, x, z0, z1, every, h0 = 0.9, wh = 2.0) {
  for (let z = z0 + every / 2; z < z1; z += every) {
    box(p, 0.34, wh, every * 0.62, mat('#bfe0ee', { emissive: '#9fc8de', emissiveIntensity: 0.35, roughness: 0.2 }), x, h0, z, { cast: false });
    box(p, 0.4, 0.08, every * 0.68, TRIM, x, h0 - 0.08, z, { cast: false });
    box(p, 0.4, 0.08, every * 0.68, TRIM, x, h0 + wh, z, { cast: false });
  }
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
  box(p, W + 0.1, 0.12, 0.12, TRIM, 0, -SLAB, Z1, { cast: false });
  // core floor finish
  if (n > 1) {
    box(p, sw, 0.02, Z1 - STAIR.z1, '#d9c7aa', sx, 0, (STAIR.z1 + Z1) / 2, { cast: false });
    box(p, sw, 0.02, STAIR.z0 - LIFT.z1, '#d9c7aa', sx, 0, (LIFT.z1 + STAIR.z0) / 2, { cast: false });
  } else {
    box(p, sw, 0.02, Z1 - LIFT.z1, '#d9c7aa', sx, 0, (LIFT.z1 + Z1) / 2, { cast: false });
  }
}

/** Stairs from this floor (y=0, front) up to the next floor (y=H, back). */
function stairs(p) {
  const steps = 16, rise = H / steps, run = (STAIR.z1 - STAIR.z0) / steps;
  const w = STAIR.x1 - STAIR.x0 - 0.3, cx = (STAIR.x0 + STAIR.x1) / 2 + 0.1;
  for (let k = 0; k < steps; k++) {
    const z = STAIR.z1 - run * (k + 0.5);
    box(p, w, rise * (k + 1), run, k % 2 ? '#d8b88c' : '#cfae80', cx, 0, z, { cast: false });
  }
  // stringer + handrail on the open (room) side
  const ang = Math.atan2(H, STAIR.z1 - STAIR.z0);
  const len = Math.hypot(H, STAIR.z1 - STAIR.z0);
  const rail = grp(p, STAIR.x0 + 0.08, H / 2 + 0.95, (STAIR.z0 + STAIR.z1) / 2);
  box(rail, 0.06, 0.06, len, C.woodDark, 0, 0, 0, { rx: ang });
  for (let k = 1; k < steps; k += 3) {
    const z = STAIR.z1 - run * (k + 0.5);
    box(p, 0.03, 0.95, 0.03, C.black, STAIR.x0 + 0.08, rise * (k + 1), z, { cast: false });
  }
}

function liftShaftSegment(p, n, top = false) {
  const h = top ? 3.4 : H;
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
  const lbl = makeLabel(`LIFT · ${n}F`, { height: 0.3, px: 40, depthTest: true });
  lbl.position.set(cx, 2.7, z1 + 0.15);
  p.add(lbl);
  if (top) {
    box(p, x1 - x0 + 0.2, 0.25, z1 - z0 + 0.2, '#5b4a3c', (x0 + x1) / 2, 3.4, (z0 + z1) / 2, { cast: false });
  }
}

/** Build the shell of floor n (1..5) into group p (positioned at floor height). */
export function shell(p, n) {
  const roof = n === 5;
  slab(p, n);
  liftShaftSegment(p, n, roof);
  if (n < 5) stairs(p);

  const walls = {};
  if (!roof) {
    // Side / back walls live in their own groups so they can fade out
    // when the camera looks at the building from that side.
    for (const side of ['back', 'left', 'right']) {
      walls[side] = grp(p);
      walls[side].userData.dynamic = true; // merged separately (see main.js)
      walls[side].userData.wallSide = side;
    }
    // back wall (z = -8) with windows
    box(walls.back, W, CEIL, 0.3, WALL, 0, 0, Z0 + 0.15, { cast: false });
    windowsAlongX(walls.back, Z0 + 0.15, X0 + 0.5, CORE_X - 0.5, 3.0);
    box(walls.back, W - 0.6, 0.12, 0.05, TRIM, 0, 0, Z0 + 0.32, { cast: false });
    // left wall (x = -12)
    box(walls.left, 0.3, CEIL, D, WALL, X0 + 0.15, 0, 0, { cast: false });
    windowsAlongZ(walls.left, X0 + 0.15, Z0 + 0.5, Z1 - 1.0, 3.0);
    box(walls.left, 0.05, 0.12, D - 0.6, TRIM, X0 + 0.32, 0, 0, { cast: false });
    // right wall (x = 12): outer wall of the core
    box(walls.right, 0.3, CEIL, D, WALL_OUT, X1 - 0.15, 0, 0, { cast: false });
    windowsAlongZ(walls.right, X1 - 0.15, LIFT.z1 + 0.3, Z1 - 0.3, 3.2);
    // front corner columns
    box(p, 0.5, CEIL, 0.5, WALL_OUT, X0 + 0.25, 0, Z1 - 0.25, { cast: false });
    box(p, 0.5, CEIL, 0.5, WALL_OUT, X1 - 0.25, 0, Z1 - 0.25, { cast: false });
    // upper floors get a glass balustrade along the open front
    if (n > 1) glassRail(p, X0 + 0.5, Z1 - 0.15, X1 - 0.5, Z1 - 0.15);
    // rail around the stair hole (on this floor, from the flight below)
    if (n > 1) glassRail(p, STAIR.x0 - 0.05, STAIR.z0 + 0.2, STAIR.x0 - 0.05, STAIR.z1);
  } else {
    // roof parapet (glass railing all round)
    glassRail(p, X0 + 0.1, Z1 - 0.1, X1 - 0.1, Z1 - 0.1);
    glassRail(p, X0 + 0.1, Z0 + 0.1, LIFT.x0, Z0 + 0.1);
    glassRail(p, X0 + 0.1, Z0 + 0.1, X0 + 0.1, Z1 - 0.1);
    glassRail(p, X1 - 0.1, LIFT.z1, X1 - 0.1, Z1 - 0.1);
    glassRail(p, STAIR.x0 - 0.05, STAIR.z0 + 0.2, STAIR.x0 - 0.05, STAIR.z1);
    glassRail(p, STAIR.x0, STAIR.z1 + 0.05, X1 - 0.1, STAIR.z1 + 0.05);
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
