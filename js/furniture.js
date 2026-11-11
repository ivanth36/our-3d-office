// Reusable low-poly furniture. Convention: each piece's "front" faces +Z
// before rotation; pass ry (radians) to turn it. Use faceTo() to aim at a table.
import { CEIL, box, cyl, sphere, grp, glowMat, glassMat, mat } from './helpers.js';

export const C = {
  wood: '#c8935a', woodLight: '#ddb27c', woodDark: '#8a5a33',
  cream: '#f4e8d4', white: '#fbf7f0', black: '#2b2a2c', metal: '#9a9ea3',
  green: '#5f8a5b', sage: '#97b88f', olive: '#6f7f45', terracotta: '#c96f4a',
  pot: '#efe9df', leaf: '#4f8a43', leaf2: '#6aa84f', fabric: '#e7d3b3',
  sofa: '#d9c3a0', sofaGreen: '#7f9f6e', rug: '#e9dcc4',
};

export function chair(p, x, z, ry, o = {}) {
  const g = grp(p, x, 0, z, ry);
  const col = o.color ?? C.wood, seat = o.seat ?? C.fabric;
  for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) box(g, 0.05, 0.45, 0.05, col, lx, 0, lz);
  box(g, 0.48, 0.08, 0.48, seat, 0, 0.45, 0);
  box(g, 0.46, 0.5, 0.07, col, 0, 0.53, -0.21);
  return g;
}

export function stool(p, x, z, o = {}) {
  const g = grp(p, x, 0, z);
  cyl(g, 0.04, 0.75, o.leg ?? C.black, 0, 0, 0, { seg: 8 });
  cyl(g, 0.18, 0.03, o.leg ?? C.black, 0, 0.25, 0, { seg: 12 });
  cyl(g, 0.2, 0.08, o.color ?? C.green, 0, 0.75, 0, { seg: 14 });
  cyl(g, 0.17, 0.03, C.black, 0, 0, 0, { seg: 12 });
  return g;
}

export function roundTable(p, x, z, o = {}) {
  const r = o.r ?? 0.55, h = o.h ?? 0.75;
  const g = grp(p, x, 0, z);
  cyl(g, 0.25, 0.04, C.black, 0, 0, 0, { seg: 12 });
  cyl(g, 0.05, h, C.black, 0, 0, 0, { seg: 8 });
  cyl(g, r, 0.05, o.top ?? C.woodLight, 0, h, 0, { seg: 20 });
  if (o.vase !== false) { cyl(g, 0.06, 0.15, C.white, 0, h + 0.05, 0, { seg: 8 }); sphere(g, 0.08, '#f2a1a8', 0, h + 0.25, 0); }
  const n = o.chairs ?? 0;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (o.start ?? 0);
    const cx = Math.sin(a) * (r + 0.42), cz = Math.cos(a) * (r + 0.42);
    chair(g, cx, cz, a + Math.PI, o.chair ?? {}); // face centre
  }
  return g;
}

export function rectTable(p, x, z, w, d, o = {}) {
  const h = o.h ?? 0.75, g = grp(p, x, 0, z, o.ry ?? 0);
  const legC = o.leg ?? C.woodDark;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.08, h, 0.08, legC, sx * (w / 2 - 0.1), 0, sz * (d / 2 - 0.1));
  box(g, w, 0.07, d, o.top ?? C.wood, 0, h, 0);
  return g;
}

export function sofa(p, x, z, len, ry, o = {}) {
  const g = grp(p, x, 0, z, ry);
  const c = o.color ?? C.sofa, d = 0.9;
  box(g, len, 0.35, d, c, 0, 0.08, 0);                     // base
  box(g, len, 0.75, 0.25, c, 0, 0.08, -d / 2 + 0.12);      // back
  box(g, 0.22, 0.6, d, c, -len / 2 + 0.11, 0.08, 0);       // arms
  box(g, 0.22, 0.6, d, c, len / 2 - 0.11, 0.08, 0);
  const n = Math.max(1, Math.round((len - 0.4) / 0.85));
  const cw = (len - 0.5) / n;
  for (let i = 0; i < n; i++) box(g, cw - 0.04, 0.14, d - 0.3, o.cushion ?? '#f3e7d2', -len / 2 + 0.25 + cw * (i + 0.5), 0.43, 0.1);
  if (o.pillows !== false) {
    sphere(g, 0.18, o.pillow ?? C.sofaGreen, -len / 2 + 0.45, 0.7, -0.2, { s: [1, 1, 0.5] });
    sphere(g, 0.18, o.pillow ?? C.sofaGreen, len / 2 - 0.45, 0.7, -0.2, { s: [1, 1, 0.5] });
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.06, 0.08, 0.06, C.woodDark, sx * (len / 2 - 0.1), 0, sz * (d / 2 - 0.1));
  return g;
}

export function plant(p, x, z, o = {}) {
  const s = o.s ?? 1, g = grp(p, x, o.y ?? 0, z);
  cyl(g, 0.22 * s, 0.4 * s, o.pot ?? C.pot, 0, 0, 0, { top: 1, bottom: 0.75, seg: 12 });
  if (o.tall) {
    cyl(g, 0.03 * s, 1.2 * s, C.woodDark, 0, 0.4 * s, 0, { seg: 6 });
    sphere(g, 0.42 * s, C.leaf, 0, 1.6 * s, 0, { s: [1, 1.2, 1] });
    sphere(g, 0.3 * s, C.leaf2, 0.2 * s, 1.3 * s, 0.1 * s);
  } else {
    sphere(g, 0.32 * s, C.leaf, 0, 0.6 * s, 0, { s: [1, 0.9, 1] });
    sphere(g, 0.22 * s, C.leaf2, 0.15 * s, 0.8 * s, 0.05 * s);
    sphere(g, 0.2 * s, C.leaf2, -0.15 * s, 0.75 * s, -0.08 * s);
  }
  return g;
}

export function pendant(p, x, z, o = {}) {
  // drop is given for a 3.7 m ceiling; extra ceiling height lengthens the cord so lamps stay at the same height
  const top = o.ceil ?? CEIL, drop = (o.drop ?? 1.1) + (o.ceil === undefined ? CEIL - 3.7 : 0);
  const g = grp(p, x, 0, z);
  cyl(g, 0.01, drop, C.black, 0, top - drop, 0, { seg: 4, cast: false });
  cyl(g, 0.22, 0.22, o.shade ?? '#2f3a2c', 0, top - drop - 0.18, 0, { top: 0.25, bottom: 1, seg: 14, cast: false });
  sphere(g, 0.09, glowMat(), 0, top - drop - 0.18, 0, { cast: false });
  return g;
}

export function floorLamp(p, x, z) {
  const g = grp(p, x, 0, z);
  cyl(g, 0.18, 0.03, C.black, 0, 0, 0, { seg: 10 });
  cyl(g, 0.02, 1.5, C.black, 0, 0, 0, { seg: 6 });
  cyl(g, 0.25, 0.35, '#f5e3c0', 0, 1.45, 0, { top: 0.7, bottom: 1, seg: 12, emissive: '#ffcf80', emissiveIntensity: 0.6 });
  return g;
}

export function rug(p, x, z, w, d, color = C.rug, border = '#c9a77a') {
  box(p, w, 0.02, d, border, x, 0.02, z, { cast: false });
  box(p, w - 0.3, 0.025, d - 0.3, color, x, 0.02, z, { cast: false });
}

export function bookshelf(p, x, z, w, h, ry = 0, o = {}) {
  const g = grp(p, x, 0, z, ry);
  const c = o.color ?? C.woodDark, d = 0.4;
  box(g, w, h, 0.04, c, 0, 0, -d / 2 + 0.02);
  box(g, 0.05, h, d, c, -w / 2, 0, 0); box(g, 0.05, h, d, c, w / 2, 0, 0);
  const rows = o.rows ?? Math.floor(h / 0.42);
  const bookCols = o.bookColors ?? ['#a8553b', '#3e6b5a', '#d6b46a', '#6b4f7a', '#e9e1cf', '#4a6c8c', '#b9824a'];
  for (let r = 0; r <= rows; r++) {
    const y = r * (h - 0.04) / rows;
    box(g, w, 0.04, d, c, 0, y, 0);
    if (r === rows || o.empty) continue;
    let bx = -w / 2 + 0.06;
    let i = r * 3;
    while (bx < w / 2 - 0.12) {
      const bw = o.bookW ?? (0.05 + ((i * 37) % 5) * 0.012);
      const bh = o.bookH ?? (0.24 + ((i * 13) % 4) * 0.025);
      if ((i * 7) % 11 !== 0) box(g, bw, bh, d - 0.12, bookCols[i % bookCols.length], bx + bw / 2, y + 0.04, 0.02);
      bx += bw + 0.008; i++;
    }
  }
  return g;
}

export function frame(p, x, y, z, w, h, ry, color = '#e8c48a') {
  const g = grp(p, x, y, z, ry);
  box(g, w, h, 0.04, C.woodDark, 0, 0, 0);
  box(g, w - 0.1, h - 0.1, 0.05, color, 0, 0.05, 0.005);
  return g;
}

/** Glass partition from (x1,z1) to (x2,z2) with dark frame. Optional door gap [from,to] along the length. */
export function glassWall(p, x1, z1, x2, z2, h = CEIL, o = {}) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const ry = Math.atan2(x2 - x1, z2 - z1) - Math.PI / 2;
  const g = grp(p, (x1 + x2) / 2, 0, (z1 + z2) / 2, ry);
  const fc = o.frame ?? C.black;
  const segs = o.gap ? [[-len / 2, o.gap[0] - len / 2], [o.gap[1] - len / 2, len / 2]] : [[-len / 2, len / 2]];
  for (const [a, b] of segs) {
    if (b - a < 0.05) continue;
    box(g, b - a, h, 0.04, o.glass ?? glassMat(), (a + b) / 2, 0, 0, { cast: false });
    const n = Math.max(1, Math.round((b - a) / 1.2));
    for (let i = 0; i <= n; i++) box(g, 0.05, h, 0.07, fc, a + (b - a) * i / n, 0, 0, { cast: false });
    if (o.shoji) for (let y = 0.45; y < h - 0.2; y += 0.45) box(g, b - a, 0.035, 0.06, fc, (a + b) / 2, y, 0, { cast: false });   // kumiko bars
  }
  box(g, len, 0.06, 0.08, fc, 0, h - 0.06, 0, { cast: false });
  box(g, len, 0.06, 0.08, fc, 0, 0, 0, { cast: false });
  if (o.gap) { box(g, 0.05, h, 0.07, fc, o.gap[0] - len / 2, 0, 0); box(g, 0.05, h, 0.07, fc, o.gap[1] - len / 2, 0, 0); }
  return g;
}

export function monitor(p, x, y, z, ry = 0) {
  const g = grp(p, x, y, z, ry);
  box(g, 0.2, 0.02, 0.15, C.black, 0, 0, 0);
  box(g, 0.04, 0.25, 0.04, C.black, 0, 0, -0.03);
  box(g, 0.6, 0.36, 0.03, C.black, 0, 0.2, 0);
  box(g, 0.55, 0.31, 0.01, mat('#7fb2e0', { emissive: '#5b8fc2', emissiveIntensity: 0.5 }), 0, 0.225, 0.016, { cast: false });
  return g;
}

export function laptop(p, x, y, z, ry = 0) {
  const g = grp(p, x, y, z, ry);
  box(g, 0.36, 0.02, 0.25, '#b9bcc0', 0, 0, 0);
  box(g, 0.36, 0.24, 0.015, '#b9bcc0', 0, 0.02, -0.12, { rx: -0.25 });
  return g;
}

export function officeChair(p, x, z, ry, o = {}) {
  const g = grp(p, x, 0, z, ry);
  const c = o.color ?? '#3a3b3f';
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    box(g, 0.05, 0.04, 0.32, c, Math.sin(a) * 0.15, 0.04, Math.cos(a) * 0.15, { ry: a });
  }
  cyl(g, 0.035, 0.42, C.metal, 0, 0.05, 0, { seg: 8 });
  box(g, 0.5, 0.09, 0.48, c, 0, 0.45, 0);
  box(g, 0.46, 0.6, 0.06, '#4b4d52', 0, 0.58, -0.24, { rx: -0.1 });
  box(g, 0.04, 0.2, 0.3, c, -0.26, 0.54, 0); box(g, 0.04, 0.2, 0.3, c, 0.26, 0.54, 0);
  return g;
}

/**
 * Hinged glass door for a gap in a glassWall. The hinge is at (hx, hz); the
 * closed leaf runs along local +X (ry turns it to match the wall). Adds a
 * fixed glass transom above the door up to wallH. Returns the moving leaf
 * (rotate leaf.rotation.y to open/close).
 */
export function glassDoor(p, hx, hz, width, wallH, ry, doorH = 2.3) {
  const t = grp(p, hx, 0, hz, ry);                       // fixed transom + header
  if (wallH - doorH > 0.05) box(t, width, wallH - doorH, 0.04, glassMat(), width / 2, doorH, 0, { cast: false });
  box(t, width, 0.07, 0.09, C.black, width / 2, doorH - 0.04, 0, { cast: false });
  const leaf = grp(p, hx, 0, hz, ry);
  leaf.userData.dynamic = true;                          // it moves, so it is merged on its own
  const w = width - 0.03, h = doorH - 0.06;
  box(leaf, w - 0.08, h - 0.1, 0.03, glassMat(), w / 2, 0.06, 0, { cast: false });
  box(leaf, 0.05, h, 0.06, C.black, 0.025, 0.01, 0, { cast: false });
  box(leaf, 0.05, h, 0.06, C.black, w - 0.025, 0.01, 0, { cast: false });
  box(leaf, w, 0.06, 0.06, C.black, w / 2, 0.01, 0, { cast: false });
  box(leaf, w, 0.05, 0.06, C.black, w / 2, h - 0.04, 0, { cast: false });
  for (const s of [-1, 1]) box(leaf, 0.03, 0.4, 0.03, '#c9ccd0', w - 0.13, 0.9, s * 0.05, { cast: false, metalness: 0.7, roughness: 0.3 }); // pull handles
  return leaf;
}
