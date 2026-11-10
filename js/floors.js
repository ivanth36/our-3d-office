// Contents of each floor. All coordinates are local to the floor (y=0 = floor).
// Rooms live in x -12..9.6, z -8..8 (front/street = +Z).
import * as THREE from 'three';
import {
  CEIL, optimize, box, cyl, sphere, grp, mat, glowMat, glassMat, canvasTex, panel, roundRect,
  plankTex, carpetTex, tileTex, floorSurface, faceTo,
} from './helpers.js';
import {
  C, chair, stool, roundTable, rectTable, sofa, plant, pendant, floorLamp, rug,
  bookshelf, frame, glassWall, glassDoor, monitor, laptop, officeChair,
} from './furniture.js';
import { roamingJoe } from './joe.js';
import { CORE_X, X0, X1, XC, EXT } from './building.js';

// Joe's photo cut-out (transparent PNG in /assets)
const JOE_ASPECT = 459 / 452;
let joeTex = null;
function joePhotoMat() {
  if (!joeTex) {
    joeTex = new THREE.TextureLoader().load('assets/joe.png');
    joeTex.colorSpace = THREE.SRGBColorSpace;
    joeTex.anisotropy = 4;
  }
  return new THREE.MeshBasicMaterial({ map: joeTex, alphaTest: 0.45, toneMapped: false, side: THREE.DoubleSide });
}

// ---- doors that people open / close (see js/staff.js). closed/open = leaf rotation.
function addDoor(anim, id, leaf, closed, open) {
  optimize(leaf);
  leaf.rotation.y = closed;
  anim.doors = anim.doors || {};
  anim.doors[id] = {
    leaf, closed, open, angle: closed, users: 0, idle: 0,
    isOpen() { return Math.abs(this.angle - this.open) < 0.05; },
    update(dt) {
      this.idle = this.users > 0 ? 0 : this.idle + dt;
      const want = this.users > 0 || this.idle < 0.6 ? (this.users > 0 ? this.open : this.angle) : this.closed;
      const d = want - this.angle;
      this.angle += Math.sign(d) * Math.min(Math.abs(d), dt * 3.2);
      leaf.rotation.y = this.angle;
    },
  };
}

const RW = CORE_X - X0, RX = (CORE_X + X0) / 2; // room floor width / centre x

// ---------------------------------------------------------------- signs
function drawDogFace(ctx, cx, cy, r) {
  const line = '#1c1714';
  ctx.lineWidth = r * 0.07; ctx.strokeStyle = line; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // tan floppy ears
  ctx.fillStyle = '#d2a062';
  for (const sd of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(cx + sd * r * 0.92, cy + r * 0.12, r * 0.3, r * 0.6, sd * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // round white head
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.88, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // dot eyes, nose, "w" mouth
  ctx.fillStyle = line;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + sd * r * 0.36, cy - r * 0.1, r * 0.1, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.18, r * 0.14, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = r * 0.06;
  ctx.beginPath(); ctx.arc(cx - r * 0.09, cy + r * 0.3, r * 0.09, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + r * 0.09, cy + r * 0.3, r * 0.09, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
}

function paw(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.25, s * 0.42, s * 0.34, 0, 0, Math.PI * 2); ctx.fill();
  for (const [dx, dy] of [[-0.42, -0.2], [-0.15, -0.45], [0.15, -0.45], [0.42, -0.2]]) {
    ctx.beginPath(); ctx.ellipse(x + dx * s, y + dy * s, s * 0.14, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function cafeSignTex() {
  return canvasTex(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#5c3d26'; roundRect(ctx, 0, 0, w, h, 40); ctx.fill();
    ctx.strokeStyle = '#e8c48a'; ctx.lineWidth = 10; roundRect(ctx, 14, 14, w - 28, h - 28, 30); ctx.stroke();
    drawDogFace(ctx, 140, 118, 78);
    ctx.fillStyle = '#fff3dc';
    ctx.font = 'bold 112px Georgia, "Times New Roman", serif';
    ctx.textBaseline = 'middle';
    ctx.fillText("Joe's Café", 270, 112);
    ctx.font = '600 42px -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = '#cfe3b0';
    ctx.fillText('MATCHA  ·  COFFEE  ·  TREATS', 276, 196);
    paw(ctx, 940, 90, 48, '#e8c48a');
  });
}

function receptionSignTex() {
  return canvasTex(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2f3a2c'; roundRect(ctx, 0, 0, w, h, 40); ctx.fill();
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 10; roundRect(ctx, 14, 14, w - 28, h - 28, 30); ctx.stroke();
    ctx.fillStyle = '#f6edd8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 92px Georgia, "Times New Roman", serif';
    ctx.fillText('IP Man Home Office', w / 2, 108);
    ctx.font = '600 42px -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = '#c9e3b0';
    ctx.fillText('WELCOME  ·  RECEPTION', w / 2, 196);
  });
}

function menuTex() {
  return canvasTex(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#2f3a2c'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c8935a'; ctx.lineWidth = 16; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#f6edd8'; ctx.font = 'bold 46px Georgia, serif'; ctx.fillText('MENU', 190, 70);
    ctx.font = '30px -apple-system, sans-serif';
    const items = [['Joe Latte', '4.8'], ['Matcha Latte', '5.2'], ['Flat White', '4.5'], ['Americano', '3.8'], ['Paw Cookie', '2.5']];
    items.forEach(([n, p], i) => { ctx.fillText(n, 40, 130 + i * 50); ctx.fillText(p, 410, 130 + i * 50); });
    paw(ctx, 440, 50, 26, '#97b88f');
  });
}

function tvTex() {
  return canvasTex(512, 288, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f7b267'); g.addColorStop(0.55, '#f4845f'); g.addColorStop(1, '#3d405b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffe8a8'; ctx.beginPath(); ctx.arc(330, 150, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3d405b';
    ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(120, 150); ctx.lineTo(220, 220); ctx.lineTo(320, 120); ctx.lineTo(512, 240); ctx.lineTo(512, h); ctx.fill();
  });
}

// ---------------------------------------------------------------- flower planter
const FLOWER_COLS = ['#f28cb0', '#f1c84b', '#e85d3d', '#a98bd6', '#ffffff', '#f08a3a', '#e8508f', '#7fa8e0'];
/** Wooden planter box with a green bush and colourful flowers on top. */
function flowerPlanter(p, x, z, i = 0) {
  box(p, 1.4, 0.5, 0.7, C.woodDark, x, 0, z);
  sphere(p, 0.45, i % 2 ? C.leaf : C.leaf2, x, 0.75, z, { s: [1.4, 0.75, 0.8] });
  for (let k = 0; k < 9; k++) {
    const fx = x - 0.5 + (k % 5) * 0.25 + ((k * 37) % 7) * 0.01, fz = z - 0.15 + (k % 3) * 0.15;
    const col = FLOWER_COLS[(i * 3 + k) % FLOWER_COLS.length];
    sphere(p, 0.07, col, fx, 0.98 + (k % 2) * 0.05, fz, { cast: false });
    sphere(p, 0.025, '#f6d64a', fx, 1.03 + (k % 2) * 0.05, fz, { cast: false });  // flower centre
  }
}

// ---------------------------------------------------------------- vending machine
/** Drinks vending machine; its front faces local +Z (use ry to turn it). */
function vendingMachine(p, x, z, ry, o = {}) {
  const vm = grp(p, x, 0, z, ry);
  const teal = o.body ?? '#2f8f83', trim = o.trim ?? '#1f6b62';
  box(vm, 0.95, 1.95, 0.55, teal, 0, 0, -0.1);                      // cabinet
  box(vm, 0.95, 0.5, 0.2, teal, 0, 0, 0.275);                       // front frame: bottom
  box(vm, 0.95, 0.33, 0.2, teal, 0, 1.62, 0.275);                   //              top
  box(vm, 0.06, 1.12, 0.2, teal, -0.445, 0.5, 0.275);               //              left
  box(vm, 0.3, 1.12, 0.2, teal, 0.325, 0.5, 0.275);                 //              right (keypad)
  box(vm, 0.95, 0.06, 0.77, trim, 0, 1.95, 0);
  box(vm, 0.6, 1.12, 0.02, mat('#d9f2ee', { emissive: '#bfe9e2', emissiveIntensity: 0.7 }), -0.12, 0.5, 0.185, { cast: false }); // lit back wall
  for (const sy of [0.62, 0.9, 1.18, 1.46]) box(vm, 0.6, 0.02, 0.18, '#c9ccd0', -0.12, sy, 0.27, { cast: false });              // shelves
  box(vm, 0.62, 1.14, 0.02, glassMat(), -0.12, 0.49, 0.37, { cast: false });                                                       // front glass
  const cols = o.cols ?? ['#f2f2f2', '#4fb0e0', '#f1c84b', '#e85d3d', '#7ab87a'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) cyl(vm, 0.04, 0.19, cols[(r + c) % 5], -0.36 + c * 0.12, 0.64 + r * 0.28, 0.27, { seg: 8, cast: false });
  box(vm, 0.18, 0.7, 0.03, '#1b1b1e', 0.33, 0.95, 0.38, { cast: false });                 // keypad panel
  for (let i = 0; i < 6; i++) box(vm, 0.04, 0.04, 0.02, '#f1c84b', 0.3 + (i % 2) * 0.07, 1.4 - Math.floor(i / 2) * 0.09, 0.4, { cast: false });
  box(vm, 0.5, 0.18, 0.04, '#1b1b1e', -0.1, 0.18, 0.39, { cast: false });                  // pick-up slot
  const sign = canvasTex(512, 128, (ctx) => { ctx.fillStyle = trim; ctx.fillRect(0, 0, 512, 128); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 50px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(o.title, 256, 62); ctx.font = '30px -apple-system, sans-serif'; ctx.fillStyle = '#bfe9e2'; ctx.fillText(o.sub, 256, 108); });
  panel(vm, 0.9, 0.22, sign, 0, 1.8, 0.385, { glow: 0.3 });
    return vm;
}

// ---------------------------------------------------------------- Floor 1
export function floor1(p, anim) {
  floorSurface(p, RW, 16, RX, 0, tileTex('#f1e6d3', '#e6d4b8'), 1.2);

  // ---- U-shaped counter, front-left. Opening faces the back.
  const top = '#f4ede2', body = '#7a4f2f', CH = 1.05;
  const cnt = grp(p, 0, 0, 0);
  // front (cashier, facing street)
  box(cnt, 5.6, CH, 0.7, body, -7.8, 0, 6.0);
  box(cnt, 5.8, 0.06, 0.85, top, -7.8, CH, 6.0);
  // left arm (coffee machine)
  box(cnt, 0.7, CH, 3.4, body, -10.25, 0, 3.95);
  box(cnt, 0.85, 0.06, 3.6, top, -10.25, CH, 3.95);
  // right arm (pick-up)
  box(cnt, 0.7, CH, 3.4, body, -5.35, 0, 3.95);
  box(cnt, 0.85, 0.06, 3.6, top, -5.35, CH, 3.95);
  // green kick panel accents
  box(cnt, 5.62, 0.25, 0.72, C.green, -7.8, 0, 6.0);
  box(cnt, 0.72, 0.25, 3.4, C.green, -5.35, 0, 3.95);

  const T = CH + 0.06;
  // coffee machine + grinder on left arm
  const cm = grp(p, -10.25, T, 4.3, Math.PI / 2);
  box(cm, 1.2, 0.55, 0.5, '#c9ccd0', 0, 0, 0, { metalness: 0.6, roughness: 0.3 });
  box(cm, 1.2, 0.08, 0.5, '#8a5a33', 0, 0.55, 0);
  for (const gx of [-0.3, 0.3]) { cyl(cm, 0.05, 0.12, C.black, gx, 0.18, 0.28, { seg: 8 }); cyl(cm, 0.05, 0.08, C.white, gx, 0.02, 0.32, { seg: 8 }); }
  const gr = grp(p, -10.25, T, 2.8);
  cyl(gr, 0.12, 0.35, C.black, 0, 0, 0, { seg: 10 });
  cyl(gr, 0.14, 0.25, '#6b4126', 0, 0.35, 0, { top: 1, bottom: 0.6, seg: 10 });
  // cashier on the front
  const reg = grp(p, -7.4, T, 6.0, Math.PI);
  box(reg, 0.4, 0.12, 0.35, C.black, 0, 0, 0);
  box(reg, 0.38, 0.28, 0.03, '#2b2a2c', 0, 0.12, -0.05, { rx: 0.4 });
  box(reg, 0.34, 0.24, 0.01, mat('#a8d5b0', { emissive: '#7fbf8a', emissiveIntensity: 0.6 }), 0, 0.13, -0.07, { rx: 0.4, cast: false });
  // tip jar
  cyl(p, 0.08, 0.2, glassMat(), -6.8, T, 6.2, { seg: 10, cast: false });
  // pastry display case on the front-left
  box(p, 1.4, 0.5, 0.6, glassMat(), -9.5, T, 6.0, { cast: false });
  box(p, 1.4, 0.04, 0.6, '#d9c3a0', -9.5, T + 0.5, 6.0);
  for (let i = 0; i < 5; i++) sphere(p, 0.09, ['#e2a356', '#c9763d', '#f1d08a', '#8a5a33', '#e2a356'][i], -10.0 + i * 0.25, T + 0.12, 6.0, { s: [1, 0.6, 1] });
  // pick-up area on the right arm: cups + sign
  for (let i = 0; i < 4; i++) {
    cyl(p, 0.06, 0.16, i % 2 ? C.white : '#a5c98a', -5.3, T, 3.0 + i * 0.35, { top: 1.15, bottom: 0.9, seg: 10 });
  }
  const pk = canvasTex(256, 96, (ctx, w, h) => { ctx.fillStyle = '#2f3a2c'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#f6edd8'; ctx.font = 'bold 44px -apple-system, sans-serif'; ctx.fillText('PICK UP', 40, 64); });
  box(p, 0.04, 0.4, 0.04, C.black, -5.35, T, 4.8);
  panel(p, 0.8, 0.3, pk, -4.9, T + 0.55, 4.8, { ry: Math.PI / 2 });
  panel(p, 0.8, 0.3, pk, -5.8, T + 0.55, 4.8, { ry: -Math.PI / 2 });
  // back bar behind barista + shelves
  box(p, 5.2, 0.95, 0.6, body, -7.8, 0, 1.4);
  box(p, 5.3, 0.05, 0.7, top, -7.8, 0.95, 1.4);
  for (let i = 0; i < 6; i++) cyl(p, 0.07, 0.25, ['#3f8a3f', '#c96f4a', '#e8c48a'][i % 3], -9.8 + i * 0.8, 1.0, 1.4, { seg: 8 });
  // stools along the counter (outside of right arm + front)
  for (const z of [2.7, 3.6, 4.5]) stool(p, -4.55, z);
  for (const x of [-9.6, -8.7]) stool(p, x, 6.85, { color: C.terracotta });
  // menu board on left wall + hanging pendants over counter
  panel(p, 2.4, 1.8, menuTex(), -11.66, 2.4, 3.9, { ry: Math.PI / 2 });
  for (const x of [-9.6, -7.8, -6.0]) pendant(p, x, 6.0, { drop: 0.9 });

  frame(p, -8.5, 2.0, -7.68, 1.0, 0.8, 0, '#97b88f');

  // ---- L-shaped high bar: along the left window up to the vending machines, then along the
  //      back window to the middle of the floor (café half). Stools face the windows.
  const barG = grp(p);
  barG.userData.noShift = true;               // built in final (real) positions
  {
  const p = barG;
  const backZ = -7.68, leftX = X0 + 0.3, bx1 = -6.0, lz1 = -2.5;
  const walnut = '#6b4423', walnut2 = '#7a4e2a', iron = '#262426';
  // live-edge walnut tops: short segments with a gently wavy front edge
  for (let x = leftX; x < bx1 - 0.01; x += 0.5) {
    const w = Math.min(0.5, bx1 - x), d = 0.46 + Math.sin(x * 1.3) * 0.04 + Math.sin(x * 3.1) * 0.02;
    box(p, w + 0.01, 0.06, d, (Math.floor(x * 2) % 2) ? walnut : walnut2, x + w / 2, 0.99, backZ + d / 2);
  }
  for (let z = backZ + 0.46; z < lz1 - 0.01; z += 0.5) {
    const w = Math.min(0.5, lz1 - z), d = 0.46 + Math.sin(z * 1.3) * 0.04 + Math.sin(z * 3.1) * 0.02;
    box(p, d, 0.06, w + 0.01, (Math.floor(z * 2) % 2) ? walnut : walnut2, leftX + d / 2, 0.99, z + w / 2);
  }
  box(p, bx1 - leftX, 0.03, 0.3, walnut, (leftX + bx1) / 2, 0.72, backZ + 0.17);            // lower shelves
  box(p, 0.3, 0.03, lz1 - backZ - 0.46, walnut, leftX + 0.17, 0.72, (backZ + 0.46 + lz1) / 2);
  // black sled-leg frames
  const frameX = (x) => {
    box(p, 0.05, 0.99, 0.05, iron, x, 0, backZ + 0.06); box(p, 0.05, 0.99, 0.05, iron, x, 0, backZ + 0.4);
    box(p, 0.05, 0.05, 0.4, iron, x, 0, backZ + 0.23); box(p, 0.05, 0.05, 0.4, iron, x, 0.94, backZ + 0.23);
  };
  const frameZ = (z) => {
    box(p, 0.05, 0.99, 0.05, iron, leftX + 0.06, 0, z); box(p, 0.05, 0.99, 0.05, iron, leftX + 0.4, 0, z);
    box(p, 0.4, 0.05, 0.05, iron, leftX + 0.23, 0, z); box(p, 0.4, 0.05, 0.05, iron, leftX + 0.23, 0.94, z);
  };
  for (let i = 0; i <= 5; i++) frameX(leftX + 0.6 + i * (bx1 - 0.1 - leftX - 0.6) / 5);
  for (let i = 0; i <= 2; i++) frameZ(backZ + 0.8 + i * (lz1 - 0.1 - backZ - 0.8) / 2);
  // high stools with round walnut seats + curved backrests, facing the window
  const barStool = (sx, sz, ry) => {
    const g = grp(p, sx, 0, sz, ry);                 // front (+Z) turned to face the window
    for (const [lx, lz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) {
      box(g, 0.03, 0.74, 0.03, iron, lx, 0, lz, { rx: lz * 0.5, rz: -lx * 0.5 });   // slightly splayed legs
    }
    for (const [fx, fz, w, d] of [[0, -0.13, 0.27, 0.025], [0, 0.13, 0.27, 0.025], [-0.13, 0, 0.025, 0.27], [0.13, 0, 0.025, 0.27]]) box(g, w, 0.025, d, iron, fx, 0.26, fz); // footrest ring
    cyl(g, 0.2, 0.05, walnut2, 0, 0.74, 0, { seg: 18 });
    box(g, 0.025, 0.36, 0.025, iron, -0.1, 0.76, -0.16, { rx: -0.15 });
    box(g, 0.025, 0.36, 0.025, iron, 0.1, 0.76, -0.16, { rx: -0.15 });
    box(g, 0.34, 0.13, 0.03, walnut2, 0, 1.0, -0.2, { rx: -0.15 });              // curved-ish backrest
  };
  for (let x = -19.85; x < bx1 - 0.2; x += 0.8) barStool(x, -6.85, Math.PI);   // back window
  for (let z = -6.4; z <= -3.0; z += 0.8) barStool(leftX + 0.85, z, -Math.PI / 2); // left window
  // things on the bar
  const barTop = 1.05;
  laptop(p, -18.0, barTop, -7.4, 0);
  laptop(p, -9.5, barTop, -7.4, 0);
  for (const cx of [-16.0, -12.5, -8.2]) { cyl(p, 0.09, 0.012, C.white, cx, barTop, -7.35, { seg: 14 }); cyl(p, 0.045, 0.07, C.white, cx, barTop + 0.012, -7.35, { seg: 10 }); }
  for (const cz of [-5.2, -3.6]) { cyl(p, 0.09, 0.012, C.white, leftX + 0.25, barTop, cz, { seg: 14 }); cyl(p, 0.045, 0.07, C.white, leftX + 0.25, barTop + 0.012, cz, { seg: 10 }); }
  cyl(p, 0.18, 0.06, '#e8e1d0', -14.2, barTop, -7.42, { seg: 16 });                      // fruit bowl
  for (let i = 0; i < 4; i++) sphere(p, 0.055, ['#8a3b4a', '#c98a4b', '#8a3b4a', '#e2a356'][i], -14.28 + (i % 2) * 0.14, barTop + 0.08, -7.46 + Math.floor(i / 2) * 0.1);
  for (const px of [-11.2, -6.6]) plant(p, px, -7.48, { s: 0.35, y: barTop });
  plant(p, leftX + 0.22, -7.45, { s: 0.35, y: barTop });                                  // corner
  const love = canvasTex(256, 96, (ctx) => { ctx.fillStyle = '#1f1d1e'; ctx.fillRect(0, 0, 256, 96); ctx.fillStyle = '#e9dcc4'; ctx.font = 'italic 52px Georgia, serif'; ctx.fillText('Joe ♥', 52, 64); });
  box(p, 0.42, 0.17, 0.05, '#1f1d1e', -13.0, barTop, -7.5, { rx: -0.15 });
  panel(p, 0.4, 0.15, love, -13.0, barTop + 0.085, -7.47, { rx: -0.15 });
  for (let i = 0; i < 6; i++) pendant(p, -19.6 + i * 2.6, -7.25, { drop: 1.05, shade: '#2f3a2c' });
  for (const pz of [-6.0, -3.6]) pendant(p, leftX + 0.45, pz, { drop: 1.05, shade: '#2f3a2c' });
  }

  // ---- two red vending machines against the left wall (between the sofa corner and the counter)
  vendingMachine(p, -11.32, -1.9, Math.PI / 2, { body: '#c8312b', trim: '#9c1f1b', title: 'COLD DRINKS', sub: 'ice cold 🧊', cols: ['#e85d3d', '#f2f2f2', '#2b2a2c', '#f1c84b', '#4fb0e0'] });
  vendingMachine(p, -11.32, -0.85, Math.PI / 2, { body: '#c8312b', trim: '#9c1f1b', title: 'SNACKS & JUICE', sub: 'treat yourself 🍪', cols: ['#f1c84b', '#e2a356', '#7ab87a', '#f08a3a', '#c96f4a'] });

  // ---- Jennie's step behind the till, so customers can see her over the register
  box(p, 0.9, 0.3, 0.6, C.woodDark, -7.4, 0, 5.3);
  box(p, 0.92, 0.03, 0.62, '#3d2b1f', -7.4, 0.3, 5.3);

  // ---- big indoor tree between the tables, just reaching the ceiling
  {
    const tx = 4.7, tz = 0.0;
    cyl(p, 0.72, 0.55, C.woodDark, tx, 0, tz, { seg: 20 });                        // planter
    cyl(p, 0.66, 0.04, '#5a3b26', tx, 0.55, tz, { seg: 20 });                       // soil
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; sphere(p, 0.08, '#cfc6b8', tx + Math.sin(a) * 0.5, 0.6, tz + Math.cos(a) * 0.5, { s: [1, 0.6, 1] }); } // pebbles
    cyl(p, 0.17, 2.6, '#7a5233', tx, 0.55, tz, { top: 0.6, bottom: 1, seg: 9 });   // trunk
    const branch = (ang, tilt, len, y) => cyl(p, 0.06, len, '#7a5233', tx + Math.sin(ang) * len * 0.35, y, tz + Math.cos(ang) * len * 0.35, { top: 0.5, seg: 6, rx: Math.cos(ang) * tilt, rz: -Math.sin(ang) * tilt });
    branch(0.5, 0.7, 1.1, 2.2); branch(2.6, 0.7, 1.0, 2.4); branch(4.4, 0.65, 1.1, 2.3);
    const leafCols = ['#4f8a43', '#5f9a4c', '#6aa84f', '#47803d'];
    const blobs = [[0, 3.75, 0, 0.75], [0.7, 3.4, 0.3, 0.6], [-0.65, 3.45, 0.25, 0.6], [0.2, 3.35, -0.7, 0.6], [-0.3, 3.5, 0.75, 0.55], [0.6, 3.0, -0.35, 0.5], [-0.6, 3.0, -0.4, 0.5], [0.05, 3.05, 0.7, 0.5], [0.95, 2.95, 0.5, 0.42], [-0.95, 2.95, 0.4, 0.42], [0.25, 4.0, 0.15, 0.45]];
    blobs.forEach(([bx, by, bz, r], i) => sphere(p, r, leafCols[i % 4], tx + bx, by + (CEIL - 4.5), tz + bz, { s: [1.1, 0.85, 1.1] }));
  }

  // ---- plants
  for (const [x, z] of [[8.8, 7.3], [-11.3, 0.55]]) plant(p, x, z, { tall: (x * z) % 2 > 0 });

  // ---- façade: fascia sign, awning, mascot
  box(p, X1 - X0, 0.55, 0.25, '#f1e0c3', XC, CEIL - 0.55, 7.95, { cast: false }).userData.noShift = true;
  const sy = CEIL - 3.7; // signs sit relative to the ceiling
  const signs = grp(p);
  signs.userData.noShift = true;              // real positions
  box(signs, 4.0, 1.05, 0.2, '#5c3d26', -11.0, 2.67 + sy, 7.98, { cast: false });
  panel(signs, 3.9, 0.975, cafeSignTex(), -11.0, 3.195 + sy, 8.09, { glow: 0.25 });
  box(signs, 4.0, 1.05, 0.2, '#2f3a2c', 2.0, 2.67 + sy, 7.98, { cast: false });
  panel(signs, 3.9, 0.975, receptionSignTex(), 2.0, 3.195 + sy, 8.09, { glow: 0.25 });
  // striped awning over the counter
  const aw = grp(p, -7.8, 2.85, 8.35);
  for (let i = 0; i < 12; i++) box(aw, 0.5, 0.05, 1.0, i % 2 ? C.white : '#4f7d4a', -2.75 + i * 0.5, 0, 0, { rx: 0.35, cast: false });
  // hanging round mascot sign by the café entrance + outdoor bistro tables
  const ms = canvasTex(256, 256, (ctx, w, h) => { ctx.fillStyle = '#f6edd8'; ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#5c3d26'; ctx.lineWidth = 10; ctx.stroke(); drawDogFace(ctx, 128, 118, 70); });
  box(signs, 0.06, 0.06, 0.9, C.black, -7.6, 2.95, 8.4, { cast: false });
  cyl(signs, 0.6, 0.06, '#5c3d26', -7.6, 2.25, 8.75, { rx: Math.PI / 2, seg: 24 });
  panel(signs, 1.1, 1.1, ms, -7.6, 2.25, 8.79);
  panel(signs, 1.1, 1.1, ms, -7.6, 2.25, 8.71, { ry: Math.PI });
  roundTable(signs, -11.5, 9.6, { r: 0.45, chairs: 2, start: Math.PI / 2, vase: false });
  roundTable(signs, -8.5, 9.6, { r: 0.45, chairs: 2, start: Math.PI / 2, vase: false });
  // ---- the real Joe, roaming around his café
  anim.joe = roamingJoe(p);
  anim.joe.group.userData.noShift = true;   // Joe positions himself on the (already shifted) map

  // ================= LEFT HALF: café tables + divider (real positions) =================
  const cafeG = grp(p);
  cafeG.userData.noShift = true;
  [[-11.9, -3.4], [-8.8, -3.4], [-11.2, 0.8], [-8.0, 1.0], [-11.6, 4.7], [-8.4, 4.8]].forEach(([x, z], i) => {
    roundTable(cafeG, x, z, { chairs: 4, start: Math.PI / 4, chair: { seat: i % 2 ? C.sage : C.fabric } });
    pendant(cafeG, x, z, { shade: '#c8935a' });
  });
  // low planter divider between the café and the lounge (gaps to walk through)
  [[-3.4, 2.4], [1.1, 3.0], [5.6, 2.0]].forEach(([cz, len], i) => {
    box(cafeG, 0.5, 0.7, len, C.woodDark, -5.4, 0, cz);
    for (let k = 0; k < len / 0.45; k++) {
      const bz = cz - len / 2 + 0.25 + k * 0.45;
      sphere(cafeG, 0.24, k % 2 ? C.leaf : C.leaf2, -5.4, 0.85, bz, { s: [1, 0.8, 1] });
      sphere(cafeG, 0.06, FLOWER_COLS[(i * 5 + k) % FLOWER_COLS.length], -5.32, 1.02, bz + 0.08, { cast: false });
    }
  });

  // ================= RIGHT HALF: welcome lounge with reception (real positions) =================
  const lg = grp(p);
  lg.userData.noShift = true;
  // reception desk at the entrance; Rose stands behind it, facing the street
  const rd = grp(lg, 2.0, 0, 5.6);
  box(rd, 4.0, 1.05, 0.7, '#f4ede2', 0, 0, 0);
  box(rd, 4.0, 0.14, 0.72, C.green, 0, 0, 0);
  box(rd, 4.12, 0.06, 0.86, '#5c3d26', 0, 1.05, 0);                       // walnut top
  box(rd, 3.7, 0.05, 0.42, '#5c3d26', 0, 0.8, -0.5);                     // work shelf (staff side)
  panel(rd, 2.8, 0.56, receptionSignTex(), 0, 0.6, 0.36, { glow: 0.15 });
  monitor(rd, -0.9, 1.11, -0.1, Math.PI);                                 // faces Rose
  box(rd, 0.42, 0.02, 0.14, '#e8e4dc', -0.9, 1.11, -0.32);
  cyl(rd, 0.06, 0.05, '#c9a24a', 0.9, 1.11, 0.15, { seg: 12, metalness: 0.6, roughness: 0.3 });   // service bell
  cyl(rd, 0.07, 0.25, C.white, 1.5, 1.11, -0.1, { seg: 10 });            // flowers
  for (let i = 0; i < 5; i++) sphere(rd, 0.07, FLOWER_COLS[i], 1.45 + (i % 3) * 0.05, 1.42 + (i % 2) * 0.05, -0.12 + (i % 2) * 0.05);
  box(rd, 0.3, 0.3, 0.05, C.woodDark, 0.25, 1.11, 0.2, { rx: -0.3 });     // brochure stand
  for (let i = 0; i < 3; i++) box(rd, 0.08, 0.2, 0.01, ['#7fa8e0', '#f1c84b', '#97b88f'][i], 0.15 + i * 0.1, 1.2, 0.23, { rx: -0.3, cast: false });
  box(lg, 1.1, 0.25, 0.6, C.woodDark, 2.0, 0, 4.55);                     // Rose's step behind the desk
  pendant(lg, 1.0, 5.6, { drop: 1.0, shade: '#c9a24a' });
  pendant(lg, 3.0, 5.6, { drop: 1.0, shade: '#c9a24a' });
  plant(lg, -0.6, 5.6, { tall: true });
  plant(lg, 4.6, 5.6, { tall: true });
  // round sofa circling the big tree
  rug(lg, 4.7, 0.0, 4.6, 4.6, '#efe2c8', '#a77b4f');
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    const seg = grp(lg, 4.7 + Math.sin(a) * 1.25, 0, Math.cos(a) * 1.25, a);   // faces outward
    const col = k % 2 ? '#c96f4a' : '#d9a441';
    box(seg, 0.68, 0.4, 0.62, col, 0, 0, 0);
    box(seg, 0.66, 0.1, 0.55, '#f3e7d2', 0, 0.4, 0.03);
    box(seg, 0.68, 0.45, 0.14, col, 0, 0.4, -0.25);
  }
  // two sofas facing each other around a coffee table — centred on the same line as the tree sofa (z = 0)
  rug(lg, -2.5, 0.0, 4.6, 4.6, '#efe2c8', '#a77b4f');                     // same size and colours as the tree-sofa rug
  sofa(lg, -2.5, -1.7, 2.4, 0, { color: '#8fae84', cushion: '#a9c49c', pillow: '#f1d08a' });
  sofa(lg, -2.5, 1.7, 2.4, Math.PI, { color: '#8fae84', cushion: '#a9c49c', pillow: '#f1d08a' });
  rectTable(lg, -2.5, 0.0, 1.4, 0.7, { h: 0.4, top: C.woodLight });
  cyl(lg, 0.08, 0.2, C.white, -2.3, 0.47, 0.0, { seg: 10 });
  sphere(lg, 0.1, '#f28cb0', -2.3, 0.75, 0.0);
  box(lg, 0.5, 0.04, 0.35, '#e9e1cf', -2.9, 0.47, -0.05);                 // magazines
  floorLamp(lg, -0.8, -2.0);
  floorLamp(lg, -0.8, 2.0);
  pendant(lg, -2.5, 0.0, { drop: 0.9, shade: '#e8c48a' });
  // long built-in sofa along the back wall with little side tables
  for (const bx of [-2.7, 1.1, 4.9]) {
    sofa(lg, bx, -7.25, 3.6, 0, { color: '#d9c3a0', pillow: '#8fae84' });
    roundTable(lg, bx, -6.1, { r: 0.35, h: 0.45, vase: true });
  }
  plant(lg, -4.9, -7.2, { tall: true });
  plant(lg, 7.6, -7.2, { tall: true });
  // magazine rack + water dispenser
  const mr = grp(lg, -3.6, 0, 5.4);
  box(mr, 0.7, 0.9, 0.3, C.woodDark, 0, 0, 0);
  for (let i = 0; i < 4; i++) box(mr, 0.15, 0.22, 0.02, ['#e85d3d', '#7fa8e0', '#f1c84b', '#97b88f'][i], -0.24 + i * 0.16, 0.7, 0.16, { rx: -0.2, cast: false });
  const wd = grp(lg, 6.6, 0, 5.2);
  box(wd, 0.4, 1.0, 0.4, '#e9e6e0', 0, 0, 0);
  cyl(wd, 0.15, 0.45, mat('#bfe0ee', { transparent: true, opacity: 0.6 }), 0, 1.0, 0, { seg: 14, cast: false });

}

// ---------------------------------------------------------------- Floor 2
// Back-left: living room · Front-left: glass music room · Back-right: kitchen
// Front-right: dining for 12 · Middle: open space between living room & kitchen.
const BACK_IN = -7.7, LEFT_IN = -11.7; // inner faces of the back / left walls

function drumKit(p, x, z, ry) {
  const g = grp(p, x, 0, z, ry);       // drummer sits at local (0,0,-0.7), kit faces +Z
  const shell = '#b3261e', chrome = '#c9ccd0', gold = '#d9b24a', head = '#f4efe6';
  // bass drum lying on its side, front head facing +Z
  cyl(g, 0.3, 0.45, shell, 0, 0.3, 0.15, { rx: Math.PI / 2, seg: 20 });
  cyl(g, 0.27, 0.02, head, 0, 0.3, 0.38, { rx: Math.PI / 2, seg: 20 });
  // snare + toms + floor tom
  cyl(g, 0.17, 0.12, shell, -0.38, 0.62, -0.2, { seg: 16 }); cyl(g, 0.16, 0.01, head, -0.38, 0.74, -0.2, { seg: 16 });
  cyl(g, 0.02, 0.62, chrome, -0.38, 0, -0.2, { seg: 6 });
  cyl(g, 0.14, 0.14, shell, -0.16, 0.82, 0.08, { seg: 14, rx: -0.3 });
  cyl(g, 0.15, 0.15, shell, 0.18, 0.82, 0.08, { seg: 14, rx: -0.3 });
  cyl(g, 0.21, 0.42, shell, 0.5, 0.0, -0.25, { seg: 16 }); cyl(g, 0.2, 0.01, head, 0.5, 0.42, -0.25, { seg: 16 });
  // cymbals on stands + hi-hat
  for (const [cx, cz, h] of [[-0.62, 0.15, 1.25], [0.55, 0.3, 1.35]]) {
    cyl(g, 0.015, h, chrome, cx, 0, cz, { seg: 6 });
    cyl(g, 0.24, 0.015, gold, cx, h, cz, { seg: 18, top: 0.3, bottom: 1, metalness: 0.6, roughness: 0.3 });
  }
  cyl(g, 0.015, 0.85, chrome, -0.72, 0, -0.3, { seg: 6 });
  cyl(g, 0.17, 0.012, gold, -0.72, 0.85, -0.3, { seg: 16, metalness: 0.6, roughness: 0.3 });
  cyl(g, 0.17, 0.012, gold, -0.72, 0.88, -0.3, { seg: 16, metalness: 0.6, roughness: 0.3 });
  // drum throne
  cyl(g, 0.03, 0.5, chrome, 0, 0, -0.7, { seg: 6 });
  cyl(g, 0.2, 0.08, C.black, 0, 0.5, -0.7, { seg: 14 });
  return g;
}

function keyboardOnStand(p, x, z, ry) {
  const g = grp(p, x, 0, z, ry);       // player at local -Z side
  box(g, 0.05, 0.75, 0.05, C.black, -0.55, 0, 0, { rz: 0.35 });
  box(g, 0.05, 0.75, 0.05, C.black, 0.55, 0, 0, { rz: -0.35 });
  box(g, 1.4, 0.1, 0.35, '#1f1f22', 0, 0.75, 0);
  box(g, 1.3, 0.025, 0.16, '#f8f6f0', 0, 0.85, -0.08);                 // white keys
  for (let i = 0; i < 26; i++) if (i % 7 !== 2 && i % 7 !== 6) box(g, 0.022, 0.03, 0.09, '#111', -0.62 + i * 0.05, 0.86, -0.04);
  box(g, 0.7, 0.05, 0.3, C.black, 0, 0.45, -0.6);                     // bench
  box(g, 0.6, 0.45, 0.25, C.black, 0, 0, -0.6);
  return g;
}

export function floor2(p, anim = {}) {
  floorSurface(p, RW, 16, RX, 0, plankTex('#d9ae7a', '#b8875a'), 3);

  // ================= LIVING ROOM (middle-back, real x -11.7..-1, z -7.7..1) =================
  // Built in real positions (it was moved into the middle when the game room took its old spot).
  const livG = grp(p);
  livG.userData.noShift = true;
  {
  const p = livG;
  const tvx = -6.3;
  // wall-mounted TV
  box(p, 4.3, 2.45, 0.08, '#1b1b1e', tvx, 1.15, BACK_IN + 0.04);
  panel(p, 4.1, 2.3, tvTex(), tvx, 1.15 + 1.225, BACK_IN + 0.09, { glow: 0.55 });
  box(p, 0.3, 0.3, 0.06, '#2b2a2c', tvx, 1.0, BACK_IN + 0.03);                  // wall bracket hint
  // floating TV console + soundbar
  box(p, 5.4, 0.45, 0.5, C.woodDark, tvx, 0.3, BACK_IN + 0.25);
  for (let i = 0; i < 4; i++) box(p, 1.25, 0.35, 0.02, C.wood, tvx - 2.0 + i * 1.33, 0.35, BACK_IN + 0.51);
  box(p, 1.6, 0.1, 0.12, '#2b2a2c', tvx, 0.75, BACK_IN + 0.3);
  plant(p, tvx - 2.2, BACK_IN + 0.25, { s: 0.55, y: 0.75 });
  // bookshelves flanking the TV
  bookshelf(p, -10.4, BACK_IN + 0.2, 2.0, 2.4, 0);
  bookshelf(p, -2.2, BACK_IN + 0.2, 2.0, 2.4, 0);
  // rug, two long sofas, armchair, coffee table
  rug(p, tvx, -3.7, 8.2, 5.6, '#efe2c8', '#a77b4f');
  sofa(p, tvx, -1.1, 5.2, Math.PI, { color: '#d9c3a0' });                                 // facing the TV
  sofa(p, -11.05, -3.9, 4.4, Math.PI / 2, { color: '#d9c3a0', pillow: '#c96f4a' });       // along the left wall
  sofa(p, -2.2, -4.0, 1.3, -Math.PI / 2, { color: '#8fae84', cushion: '#a9c49c', pillow: '#f1d08a' }); // armchair
  rectTable(p, tvx, -3.8, 2.4, 1.2, { h: 0.4, top: C.woodLight });
  sphere(p, 0.16, '#c96f4a', tvx + 0.5, 0.56, -3.7, { s: [1, 0.6, 1] });
  box(p, 0.5, 0.06, 0.35, '#e9e1cf', tvx - 0.6, 0.47, -3.9);                                // magazines
  rectTable(p, -10.9, -0.9, 0.6, 0.6, { h: 0.55, top: C.woodLight });                        // side tables
  rectTable(p, -2.2, -2.7, 0.6, 0.6, { h: 0.55, top: C.woodLight });
  floorLamp(p, -10.9, -6.8);
  floorLamp(p, -2.2, -5.4);
  plant(p, -11.2, -0.1, { tall: true });
  for (let i = 0; i < 3; i++) pendant(p, tvx - 1.6 + i * 1.6, -3.8, { drop: 0.6, shade: '#e8c48a' });
  }

  // ================= GLASS MUSIC ROOM (front-left, x -11.7..-3.4, z 1.8..7.75) =================
  // The music room and the game room behind it form one glass block (same width, real x -21.45..-12):
  // one shared glass wall at z = 0 with a door in its middle; the only outside door is in the
  // middle of the music room's right wall. Glass + floor are built in real positions.
  const mz0 = 0.0, mz1 = 7.75;
  {
    const mg = grp(p);
    mg.userData.noShift = true;
    const rx0 = X0 + 0.15, rx1 = -12.0;
    box(mg, rx1 - rx0 - 0.15, 0.03, mz1 - mz0, '#7d5a43', (rx0 + rx1) / 2 + 0.075, 0.02, (mz0 + mz1) / 2, { cast: false });
    glassWall(mg, rx1, mz0, rx1, mz1, CEIL, { gap: [3.35, 4.35] });          // right side, door in the middle
    addDoor(anim, '2:music', glassDoor(mg, rx1, mz0 + 3.35, 1.0, CEIL, -Math.PI / 2), -Math.PI / 2, 0);
    glassWall(mg, rx0, mz1, rx1, mz1, CEIL);                                 // front (street side)
  }
  const cdCols = ['#d94f3d', '#3e6b9a', '#f1c84b', '#2b2a2c', '#7ab87a', '#e8e1d0', '#9b59b6', '#f08a5d'];
  const cd = { bookColors: cdCols, bookW: 0.035, bookH: 0.16, rows: 7, color: '#3d2b1f' };
  bookshelf(p, LEFT_IN + 0.22, 5.2, 4.6, 2.9, Math.PI / 2, cd);   // CD wall
  // hi-fi: console + turntable + amp + tall speakers along the back glass (left half)
  box(p, 2.4, 0.6, 0.5, C.woodDark, -9.9, 0, 0.6);
  box(p, 0.8, 0.12, 0.4, '#c9ccd0', -10.4, 0.6, 0.6, { metalness: 0.5, roughness: 0.4 });
  box(p, 0.6, 0.08, 0.45, C.black, -9.4, 0.6, 0.6);
  cyl(p, 0.2, 0.02, '#1a1a1a', -9.4, 0.68, 0.6, { seg: 20 });
  for (const sx of [-11.3, -8.3]) {
    box(p, 0.5, 1.2, 0.45, '#2b2a2c', sx, 0, 0.6);
    cyl(p, 0.16, 0.03, '#555', sx, 0.75, 0.83, { rx: Math.PI / 2, seg: 14 });
    cyl(p, 0.09, 0.03, '#555', sx, 1.0, 0.83, { rx: Math.PI / 2, seg: 12 });
  }
  // lounge chair + ottoman facing the speakers
  const lc = grp(p, -9.3, 0, 4.6, Math.PI);
  box(lc, 0.9, 0.35, 0.85, C.woodDark, 0, 0.0, 0);
  box(lc, 0.82, 0.18, 0.78, '#3b2a20', 0, 0.35, 0.02);
  box(lc, 0.82, 0.9, 0.2, '#3b2a20', 0, 0.45, -0.4, { rx: -0.25 });
  cyl(p, 0.3, 0.35, '#3b2a20', -9.3, 0, 3.55, { seg: 14 });
  floorLamp(p, -10.9, 7.2);
  // music production desk with computer (right half, against the back glass)
  rectTable(p, -4.6, 2.35, 2.8, 0.8, { top: '#2b2a2c', leg: C.black });
  monitor(p, -5.05, 0.79, 2.25, 0);
  monitor(p, -4.15, 0.79, 2.25, 0);
  box(p, 0.9, 0.04, 0.25, '#1f1f22', -4.6, 0.79, 2.6);                                   // MIDI controller
  for (let i = 0; i < 8; i++) box(p, 0.06, 0.02, 0.06, '#f1c84b', -4.95 + i * 0.1, 0.83, 2.53);
  for (const sx of [-5.8, -3.4]) { box(p, 0.25, 0.4, 0.25, '#2b2a2c', sx, 0.79, 2.25); cyl(p, 0.07, 0.02, '#777', sx, 1.0, 2.38, { rx: Math.PI / 2, seg: 10 }); }
  officeChair(p, -4.6, 3.25, Math.PI);
  // keyboard on stand along the right glass
  keyboardOnStand(p, -4.0, 5.6, Math.PI / 2);   // player sits on the room side, facing the right glass
  // drum kit at the front, drummer facing the street
  rug(p, -6.6, 6.2, 2.6, 2.4, '#5c3d26', '#3d2b1f');
  drumKit(p, -6.6, 6.5, 0);
  pendant(p, -9.3, 4.0, { drop: 0.7, shade: '#2f3a2c' });
  pendant(p, -4.6, 3.0, { drop: 0.7, shade: '#2f3a2c' });
  const sign = canvasTex(512, 96, (ctx) => { ctx.fillStyle = '#2f3a2c'; ctx.font = 'bold 56px -apple-system, sans-serif'; ctx.fillText('♪ Music Room', 40, 68); });
  panel(p, 1.9, 0.36, sign, -9.0, 3.1, mz0 + 0.04, { transparent: true });           // on the shared glass wall

  // ================= KITCHEN (back-right, x 2.5..9.3, z -7.7..-0.8) =================
  const kx0 = 2.5, kx1 = 9.3, cab = '#7f9f6e', cabLight = '#8fae84', quartz = '#f4ede2', steel = '#c9ccd0';
  // tall units: double fridge + oven tower + pantry
  box(p, 1.3, 2.3, 0.75, steel, kx0 + 0.65, 0, BACK_IN + 0.38, { metalness: 0.5, roughness: 0.35 });
  box(p, 0.02, 2.2, 0.02, '#888', kx0 + 0.65, 0.05, BACK_IN + 0.76);
  for (const hx of [-0.08, 0.08]) box(p, 0.03, 0.9, 0.04, '#555', kx0 + 0.65 + hx, 0.9, BACK_IN + 0.78);
  box(p, 0.75, 2.3, 0.7, cab, kx0 + 1.68, 0, BACK_IN + 0.35);
  for (const oy of [0.75, 1.4]) {
    box(p, 0.62, 0.55, 0.02, '#2b2a2c', kx0 + 1.68, oy, BACK_IN + 0.71);
    box(p, 0.5, 0.25, 0.01, mat('#ffb36b', { emissive: '#ff9a4a', emissiveIntensity: 0.4 }), kx0 + 1.68, oy + 0.12, BACK_IN + 0.72, { cast: false });
  }
  // base run along the back wall
  const bx0 = kx0 + 2.05;
  box(p, kx1 - bx0, 0.88, 0.65, cab, (bx0 + kx1) / 2, 0, BACK_IN + 0.33);
  box(p, kx1 - bx0 + 0.05, 0.05, 0.7, quartz, (bx0 + kx1) / 2, 0.88, BACK_IN + 0.35);
  for (let x = bx0 + 0.3; x < kx1 - 0.1; x += 0.6) box(p, 0.25, 0.02, 0.02, '#c9a77a', x, 0.75, BACK_IN + 0.67); // handles
  box(p, kx1 - bx0, 0.7, 0.02, '#e9f1ee', (bx0 + kx1) / 2, 0.93, BACK_IN + 0.01, { cast: false }); // backsplash
  // upper cabinets with an open shelf in the middle
  box(p, 1.6, 0.8, 0.38, cabLight, bx0 + 0.8, 1.8, BACK_IN + 0.19);
  box(p, 1.2, 0.8, 0.38, cabLight, kx1 - 0.6, 1.8, BACK_IN + 0.19);
  // range + chimney hood (centre)
  const hx = (bx0 + kx1) / 2 - 0.2;
  box(p, 0.9, 0.04, 0.55, C.black, hx, 0.93, BACK_IN + 0.35);
  for (const [ox, oz] of [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.12], [0.2, 0.12]]) cyl(p, 0.09, 0.01, '#444', hx + ox, 0.97, BACK_IN + 0.35 + oz, { seg: 12 });
  box(p, 1.0, 0.25, 0.5, steel, hx, 1.75, BACK_IN + 0.25, { metalness: 0.5 });
  box(p, 0.35, 1.2, 0.3, steel, hx, 2.0, BACK_IN + 0.15, { metalness: 0.5 });
  cyl(p, 0.16, 0.2, '#b84a3a', hx - 0.2, 0.97, BACK_IN + 0.23, { seg: 12 });                // pot
  // open shelves between uppers: plates & jars
  for (const sy of [1.9, 2.3]) box(p, 0.8, 0.04, 0.3, C.wood, hx + 0.93, sy, BACK_IN + 0.15);
  for (let i = 0; i < 4; i++) cyl(p, 0.07, 0.18, ['#e8e1d0', '#c96f4a', '#97b88f', '#f1d08a'][i], hx + 0.63 + i * 0.2, 1.94, BACK_IN + 0.15, { seg: 10 });
  for (let i = 0; i < 5; i++) cyl(p, 0.11, 0.02, '#f8f6f0', hx + 0.93, 2.34 + i * 0.02, BACK_IN + 0.15, { seg: 14 });
  // countertop items: coffee machine, kettle, toaster, utensils, cutting board, fruit
  box(p, 0.35, 0.4, 0.35, '#2b2a2c', bx0 + 0.4, 0.93, BACK_IN + 0.3);
  cyl(p, 0.1, 0.22, steel, bx0 + 0.9, 0.93, BACK_IN + 0.32, { seg: 12, metalness: 0.5 });
  box(p, 0.35, 0.2, 0.2, '#e8c48a', kx1 - 0.6, 0.93, BACK_IN + 0.3);
  cyl(p, 0.07, 0.2, '#e8e1d0', kx1 - 1.2, 0.93, BACK_IN + 0.3, { seg: 10 });
  box(p, 0.5, 0.03, 0.3, C.woodLight, hx + 1.1, 0.93, BACK_IN + 0.38);
  // L-return along the right (toward the lift side)
  box(p, 0.65, 0.88, 2.6, cab, kx1 - 0.33, 0, BACK_IN + 0.65 + 1.3);
  box(p, 0.7, 0.05, 2.65, quartz, kx1 - 0.33, 0.88, BACK_IN + 0.65 + 1.3);
  box(p, 0.5, 0.03, 0.6, '#d0d4d8', kx1 - 0.33, 0.92, BACK_IN + 1.6, { metalness: 0.6 });    // second sink
  box(p, 0.05, 0.35, 0.05, steel, kx1 - 0.08, 0.93, BACK_IN + 1.6, { metalness: 0.6 });
  // big island with waterfall ends, sink, stools
  const ix = 5.6, iz = -3.4;
  box(p, 4.0, 0.9, 1.5, cab, ix, 0, iz);
  box(p, 4.2, 0.07, 1.65, quartz, ix, 0.9, iz);
  box(p, 0.08, 0.9, 1.65, quartz, ix - 2.07, 0, iz);
  box(p, 0.08, 0.9, 1.65, quartz, ix + 2.07, 0, iz);
  box(p, 0.7, 0.03, 0.45, '#d0d4d8', ix - 0.9, 0.95, iz - 0.2, { metalness: 0.6 });
  cyl(p, 0.025, 0.4, steel, ix - 0.9, 0.95, iz - 0.5, { seg: 8, metalness: 0.6 });
  cyl(p, 0.28, 0.08, C.white, ix + 0.8, 0.97, iz, { seg: 16 });                        // fruit bowl
  for (let i = 0; i < 4; i++) sphere(p, 0.08, ['#e85d3d', '#f1c84b', '#7ab87a', '#e85d3d'][i], ix + 0.65 + i * 0.1, 1.09, iz + (i % 2) * 0.08);
  plant(p, ix + 1.7, iz, { s: 0.45, y: 0.97 });
  for (let i = 0; i < 4; i++) stool(p, ix - 1.5 + i * 1.0, iz + 1.15, { color: C.wood });
  for (let i = 0; i < 3; i++) pendant(p, ix - 1.4 + i * 1.4, iz, { drop: 1.2, shade: '#f4ede2' });
  rug(p, ix, iz + 1.0, 5.4, 1.2, '#e8dcc6', '#c9a77a');

  // ================= OPEN SPACE between living room & kitchen =================
  plant(p, 0.7, BACK_IN + 0.4, { tall: true, s: 1.2 });
  frame(p, 0.7, 1.6, BACK_IN + 0.02, 1.4, 1.0, 0, '#97b88f');

  // ================= DINING FOR 12 (front-right) =================
  const dx = 3.4, dz = 3.9, L = 6.4;
  rug(p, dx, dz, L + 2.4, 3.6, '#efe7d6', '#c9a77a');
  rectTable(p, dx, dz, L, 1.4, { top: C.wood });
  for (let i = 0; i < 5; i++) {
    const x = dx - L / 2 + (i + 0.5) * L / 5;
    chair(p, x, dz - 1.05, 0, { seat: C.sage });
    chair(p, x, dz + 1.05, Math.PI, { seat: C.sage });
  }
  chair(p, dx - L / 2 - 0.45, dz, Math.PI / 2, { seat: C.sage });
  chair(p, dx + L / 2 + 0.45, dz, -Math.PI / 2, { seat: C.sage });
  for (let i = 0; i < 4; i++) pendant(p, dx - 2.4 + i * 1.6, dz, { drop: 1.3, shade: '#c8935a' });
  for (let i = 0; i < 3; i++) { cyl(p, 0.07, 0.2, C.white, dx - 1.5 + i * 1.5, 0.82, dz, { seg: 8 }); sphere(p, 0.1, ['#f2a1a8', '#f1d08a', '#f2a1a8'][i], dx - 1.5 + i * 1.5, 1.1, dz); }
  plant(p, -0.8, 0.9, { tall: true });

  // ================= GLASS GAME ROOM (inner left, real x -21.3..-12, z -7.7..0.6) =================
  const gr = grp(p);
  gr.userData.noShift = true;
  {
    const p = gr;
    const x0 = X0 + 0.3, x1 = -12.0, z0 = -7.7, z1 = 0.0;
    box(p, x1 - x0, 0.03, z1 - z0, '#2a2d3a', (x0 + x1) / 2, 0.02, (z0 + z1) / 2, { cast: false });   // dark carpet
    rug(p, -16.4, -3.6, 4.6, 3.4, '#3a3f5c', '#7a5cff');
    glassWall(p, x0 - 0.15, z1, x1, z1, CEIL, { gap: [4.2, 5.2] });   // shared wall with the music room, door in the middle
    glassWall(p, x1, -7.85, x1, z1, CEIL);                              // right side (no outside door)
    addDoor(anim, '2:game', glassDoor(p, -17.25, z1, 1.0, CEIL, 0), 0, -1.45);
    const sign = canvasTex(512, 96, (ctx) => { ctx.fillStyle = '#7a5cff'; ctx.font = 'bold 58px -apple-system, sans-serif'; ctx.fillText('🎮 Game Room', 40, 70); });
    panel(p, 1.9, 0.36, sign, -14.4, 3.1, z1 + 0.04, { transparent: true });         // seen from the music room
    panel(p, 1.9, 0.36, sign, -16.75, 3.1, z1 - 0.04, { transparent: true, ry: Math.PI });
    const neon = (c) => mat(c, { emissive: c, emissiveIntensity: 1.4 });
    box(p, 0.04, 0.04, z1 - z0 - 0.4, neon('#7a5cff'), x0 + 0.05, CEIL - 0.25, (z0 + z1) / 2, { cast: false });   // LED strips
    box(p, x1 - x0 - 0.4, 0.04, 0.04, neon('#22d3ee'), (x0 + x1) / 2, CEIL - 0.25, z0 + 0.05, { cast: false });

    // two gaming desks against the left wall, each with a gaming PC, two monitors and a gaming chair
    const gamingChair = (cx, cz, accent) => {
      const g = grp(p, cx, 0, cz, -Math.PI / 2);                      // faces the desk (-X)
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; box(g, 0.05, 0.04, 0.34, C.black, Math.sin(a) * 0.16, 0.04, Math.cos(a) * 0.16, { ry: a }); }
      cyl(g, 0.04, 0.42, C.metal, 0, 0.05, 0, { seg: 8 });
      box(g, 0.56, 0.12, 0.54, '#1b1b1e', 0, 0.45, 0);
      box(g, 0.4, 0.13, 0.5, accent, 0, 0.46, 0.0);                     // seat stripe
      box(g, 0.56, 1.05, 0.14, '#1b1b1e', 0, 0.55, -0.28, { rx: -0.12 }); // tall racing back
      box(g, 0.26, 0.95, 0.15, accent, 0, 0.58, -0.27, { rx: -0.12 });
      box(g, 0.24, 0.16, 0.08, '#1b1b1e', 0, 1.42, -0.36, { rx: -0.12 }); // head pillow
      for (const sx of [-0.31, 0.31]) box(g, 0.06, 0.22, 0.38, '#1b1b1e', sx, 0.55, 0.02);
    };
    [[-5.4, '#e8384f'], [-2.2, '#3b82f6']].forEach(([dz, accent]) => {
      const d = grp(p, x0 + 0.45, 0, dz, Math.PI / 2);                 // desk front faces +X (into the room)
      box(d, 1.9, 0.05, 0.8, '#1b1b1e', 0, 0.74, 0);
      box(d, 1.9, 0.02, 0.8, neon(accent), 0, 0.72, 0, { cast: false });  // RGB glow under the top
      for (const lx of [-0.9, 0.9]) box(d, 0.08, 0.74, 0.7, '#2b2a2c', lx, 0, 0);
      monitor(d, -0.35, 0.79, -0.15, 0.25);                             // two angled monitors
      monitor(d, 0.35, 0.79, -0.15, -0.25);
      box(d, 0.5, 0.025, 0.16, '#111', 0, 0.79, 0.15);                  // keyboard
      box(d, 0.48, 0.01, 0.14, neon(accent), 0, 0.815, 0.15, { cast: false });
      box(d, 0.3, 0.005, 0.25, '#2b2a2c', 0.42, 0.79, 0.15);            // mouse pad + mouse
      box(d, 0.06, 0.03, 0.1, '#111', 0.42, 0.795, 0.15);
      const pc = grp(d, 0.72, 0.79, -0.1);                              // RGB gaming tower on the desk
      box(pc, 0.22, 0.48, 0.45, '#111', 0, 0, 0);
      box(pc, 0.01, 0.42, 0.4, glassMat(), 0.115, 0.03, 0, { cast: false });
      for (const fy of [0.12, 0.3]) cyl(pc, 0.07, 0.02, neon(accent), 0.1, fy, 0.05, { rz: Math.PI / 2, seg: 14, cast: false });
      sphere(d, 0.08, '#1b1b1e', -0.75, 0.86, 0.1, { s: [1, 0.4, 1] });  // headset
      gamingChair(x0 + 1.4, dz, accent);
    });

    // TV with a game console on the other side (against the right glass wall)
    const tv = grp(p, x1 - 0.45, 0, -3.6, -Math.PI / 2);               // faces -X (into the room)
    box(tv, 2.6, 0.5, 0.5, '#1b1b1e', 0, 0, 0);                         // media unit
    box(tv, 2.5, 0.02, 0.02, neon('#7a5cff'), 0, 0.02, 0.26, { cast: false });
    box(tv, 0.1, 0.9, 0.1, '#2b2a2c', 0, 0.5, -0.1);
    box(tv, 2.4, 1.4, 0.08, '#111', 0, 1.3, -0.1);                      // TV
    const game = canvasTex(512, 288, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5b8cff'); g.addColorStop(1, '#a8e6ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#4caf50'; ctx.fillRect(0, h - 60, w, 60);
      ctx.fillStyle = '#8d5a2b'; for (const bx of [140, 172, 204]) ctx.fillRect(bx, 150, 30, 30);
      ctx.fillStyle = '#f1c84b'; ctx.beginPath(); ctx.arc(330, 120, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8384f'; ctx.fillRect(70, h - 100, 28, 40);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 26px -apple-system, sans-serif'; ctx.fillText('1UP  ★ 1,250', 16, 34);
    });
    panel(tv, 2.3, 1.29, game, 0, 1.3 + 0.7 - 0.005, -0.055, { glow: 0.6 });
    box(tv, 0.42, 0.08, 0.3, '#f4f4f4', -0.6, 0.5, 0.0);               // game console
    box(tv, 0.38, 0.01, 0.02, neon('#3b82f6'), -0.6, 0.55, 0.15, { cast: false });
    for (const [cx, col] of [[0.35, '#f4f4f4'], [0.65, '#1b1b1e']]) box(tv, 0.16, 0.04, 0.1, col, cx, 0.5, 0.1);   // controllers
    for (const sx of [-1.45, 1.45]) box(tv, 0.22, 0.9, 0.22, '#1b1b1e', sx, 0, -0.05);   // speakers
    // comfy seating facing the TV: a sofa and two bean bags
    sofa(p, -15.0, -3.6, 2.4, Math.PI / 2, { color: '#3a3f5c', cushion: '#4a5070', pillow: '#7a5cff' });
    sphere(p, 0.42, '#e8384f', -14.0, 0.32, -1.6, { s: [1, 0.7, 1] });
    sphere(p, 0.42, '#3b82f6', -14.0, 0.32, -5.6, { s: [1, 0.7, 1] });
    rectTable(p, -13.9, -3.6, 0.6, 1.1, { h: 0.38, top: '#2b2a2c' });
    for (const pz of [-5.4, -2.2]) pendant(p, x0 + 1.0, pz, { drop: 1.2, shade: '#2b2a2c' });
    plant(p, x1 - 0.5, -7.2, { tall: true });
  }
  plant(p, 8.8, 7.2, { tall: true });
}

// ---------------------------------------------------------------- Floors 3 & 4 (office)
export const DESK = { x: -4.4, z: 1.6, L: 10.0, W: 2.0, perSide: 5 };

/** World-local seat position for seat index i (0..9). Seats 0-4 front (+z), 5-9 back. */
export function seat(i) {
  const side = i < DESK.perSide ? 1 : -1;
  const k = i % DESK.perSide;
  const x = DESK.x - DESK.L / 2 + (k + 0.5) * DESK.L / DESK.perSide;
  const z = DESK.z + side * (DESK.W / 2 + 0.45);
  return { x, z, ry: side > 0 ? Math.PI : 0 };
}

export function officeFloor(p, n, employees, anim) {
  floorSurface(p, RW, 16, RX, 0, carpetTex(n === 3 ? '#a3a8ad' : '#a9a49c'), 2.5);
  const accent = n === 3 ? '#7f9f6e' : '#6f8fb0';

  // ---- big shared desk (like a bench system: one long top, centre spine + screens)
  const { x, z, L, W } = DESK;
  const dg = grp(p, x, 0, z);
  for (let i = 0; i <= 5; i++) {
    const lx = -L / 2 + 0.1 + i * (L - 0.2) / 5;
    box(dg, 0.07, 0.74, 0.07, C.black, lx, 0, -W / 2 + 0.1);
    box(dg, 0.07, 0.74, 0.07, C.black, lx, 0, W / 2 - 0.1);
    box(dg, 0.06, 0.06, W - 0.2, C.black, lx, 0.1, 0);
  }
  box(dg, L, 0.06, W, '#d8b384', 0, 0.74, 0);
  box(dg, L - 0.4, 0.32, 0.4, '#2b2a2c', 0, 0.8, 0);                 // cable/storage spine
  for (let i = 0; i < 5; i++) box(dg, L / 5 - 0.15, 0.4, 0.04, accent, -L / 2 + (i + 0.5) * L / 5, 1.12, 0); // screens
  for (let i = 0; i < 10; i++) {
    const s = seat(i);
    const lx = s.x - x, lz = (s.z - z) * 0.55;
    if (i % 2) laptop(dg, lx, 0.8, lz, s.ry + Math.PI);
    else monitor(dg, lx, 0.8, lz * 0.75, s.ry + Math.PI);
    box(dg, 0.4, 0.02, 0.14, '#e8e4dc', lx + 0.25, 0.8, lz * 0.9); // keyboard / notebook
    officeChair(p, s.x, s.z, s.ry);
  }
  for (let i = 0; i < 5; i++) pendant(p, x - L / 2 + 1 + i * 2, z, { drop: 1.0, shade: '#2f3a2c' });

  // ---- live FX board (Floor 3): hangs from the ceiling behind the desk, facing the room
  if (n === 3 && anim.fxBoard) {
    const bw = 4.8, bh = bw * 448 / 1024, by = 2.2, bz = -2.3;
    box(p, bw + 0.16, bh + 0.16, 0.08, '#1b1b1e', DESK.x, by - 0.08, bz - 0.05);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: anim.fxBoard.texture, toneMapped: false }));
    scr.position.set(DESK.x, by + bh / 2, bz);
    p.add(scr);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(scr.position);
    hit.userData.dynamic = true;
    hit.userData.info = { title: 'FX Board 💱', fx: true };
    p.add(hit);
    for (const cx of [-1.4, 1.4]) cyl(p, 0.012, CEIL - (by + bh), '#2b2a2c', DESK.x + cx, by + bh, bz - 0.05, { seg: 4, cast: false });
  }

  // ---- glass meeting room (back-right)
  const rx0 = 1.6, rx1 = 9.3, rz1 = -2.4;
  box(p, rx1 - rx0, 0.03, 8 + rz1, '#cdbfa8', (rx0 + rx1) / 2, 0.02, (-8 + rz1) / 2, { cast: false });
  glassWall(p, rx0, rz1, rx1, rz1, CEIL, { gap: [0.5, 1.5] });
  addDoor(anim, `${n}:meet`, glassDoor(p, rx0 + 0.5, rz1, 1.0, CEIL, 0), 0, -1.45);
  glassWall(p, rx0, -7.85, rx0, rz1, CEIL);
  glassWall(p, rx1, -7.85, rx1, rz1, CEIL);
  const mcx = (rx0 + rx1) / 2, mcz = -5.0;
  // oval table: scale a cylinder
  const oval = cyl(p, 1, 0.06, '#d8b384', mcx, 0.74, mcz, { seg: 28 });
  oval.scale.set(2.2, 0.06, 0.9);
  box(p, 0.5, 0.74, 0.5, C.black, mcx - 1.2, 0, mcz);
  box(p, 0.5, 0.74, 0.5, C.black, mcx + 1.2, 0, mcz);
  for (let i = 0; i < 3; i++) {
    const cx = mcx - 1.3 + i * 1.3;
    officeChair(p, cx, mcz + 1.35, Math.PI, { color: accent });
    officeChair(p, cx, mcz - 1.35, 0, { color: accent });
  }
  officeChair(p, mcx - 2.9, mcz, Math.PI / 2, { color: accent });
  officeChair(p, mcx + 2.9, mcz, -Math.PI / 2, { color: accent });
  box(p, 2.6, 1.5, 0.08, C.black, mcx, 1.1, -7.64);                                   // meeting TV
  box(p, 2.45, 1.35, 0.02, mat('#4b7aa8', { emissive: '#35618c', emissiveIntensity: 0.5 }), mcx, 1.17, -7.59, { cast: false });
  box(p, 2.4, 1.2, 0.05, '#ffffff', rx1 - 0.08, 1.0, mcz, { ry: Math.PI / 2 });         // whiteboard
  pendant(p, mcx - 1, mcz, { drop: 1.1, shade: '#f4ede2' });
  pendant(p, mcx + 1, mcz, { drop: 1.1, shade: '#f4ede2' });
  plant(p, rx0 + 0.5, -7.3);
  const label = canvasTex(512, 96, (ctx) => { ctx.fillStyle = '#2f3a2c'; ctx.font = 'bold 54px -apple-system, sans-serif'; ctx.fillText('Meeting Room', 20, 68); });
  panel(p, 1.8, 0.34, label, rx0 + 3.0, 3.1, rz1 + 0.04, { transparent: true });

  // ---- bookshelves along the back wall + lounge corner
  bookshelf(p, -9.0, -7.6, 4.0, 2.6, 0);
  bookshelf(p, -4.6, -7.6, 4.0, 2.6, 0);
  box(p, 1.2, 0.8, 0.5, C.woodDark, -1.5, 0, -7.55);
  cyl(p, 0.2, 0.04, '#5b8fb0', -1.5, 1.05, -7.55, { seg: 6 }); // globe base
  sphere(p, 0.22, '#5b8fb0', -1.5, 1.3, -7.55);
  rug(p, 5.5, 4.6, 5.0, 3.4, '#ece2cf', '#a77b4f');
  sofa(p, 5.5, 3.3, 3.0, 0, { color: n === 3 ? '#8fae84' : '#9ab0c8' });
  rectTable(p, 5.5, 4.7, 1.4, 0.7, { h: 0.4, top: C.woodLight });
  chair(p, 3.6, 5.6, faceTo(3.6, 5.6, 5.5, 4.7));
  chair(p, 7.4, 5.6, faceTo(7.4, 5.6, 5.5, 4.7));
  // coffee point
  box(p, 1.8, 0.9, 0.6, C.woodDark, -10.9, 0, 5.8, { ry: Math.PI / 2 });
  box(p, 0.4, 0.45, 0.35, '#c9ccd0', -10.9, 0.9, 5.6, { metalness: 0.5 });
  for (const [px, pz] of [[-11.3, -1.5], [-11.3, 7.2], [0.8, 7.2], [8.9, 7.2], [1.1, -7.3]]) plant(p, px, pz, { tall: true });
  frame(p, -11.68, 2.1, -4.5, 1.6, 1.0, Math.PI / 2, accent);

  // ---- the new space (building is 40% longer): breakout lounge + more bookshelves
  {
    const nb = grp(p);
    nb.userData.noShift = true;
    bookshelf(nb, -6.4, -7.6, 3.6, 2.6, 0);
    bookshelf(nb, -2.4, -7.6, 3.6, 2.6, 0);

    // manager's office: glass room at the back of the new space (around the bookshelves)
    const ox0 = -8.6, ox1 = -0.3, oz1 = -3.4;
    box(nb, ox1 - ox0, 0.03, 8 + oz1, '#7a5a43', (ox0 + ox1) / 2, 0.02, (-8 + oz1) / 2, { cast: false });   // wood floor
    rug(nb, -4.4, -5.6, 4.2, 2.8, '#d9c7a8', '#7a5a43');
    glassWall(nb, ox0, oz1, ox1, oz1, CEIL, { gap: [3.6, 4.6] });           // front, door in the middle
    glassWall(nb, ox0, -7.85, ox0, oz1, CEIL);
    glassWall(nb, ox1, -7.85, ox1, oz1, CEIL);
    addDoor(anim, `${n}:mgr`, glassDoor(nb, ox0 + 3.6, oz1, 1.0, CEIL, 0), 0, -1.45);
    const mgrSign = canvasTex(512, 96, (ctx) => { ctx.fillStyle = '#2f3a2c'; ctx.font = 'bold 54px -apple-system, sans-serif'; ctx.fillText("Manager's Office", 30, 68); });
    panel(nb, 1.9, 0.36, mgrSign, -2.2, 3.1, oz1 + 0.04, { transparent: true });
    // executive desk (walnut, with a modesty panel) facing the door
    const ed = grp(nb, -4.4, 0, -5.7);
    box(ed, 2.4, 0.06, 1.0, '#5c3d26', 0, 0.74, 0);
    box(ed, 0.08, 0.74, 0.95, '#4a3020', -1.15, 0, 0);
    box(ed, 0.08, 0.74, 0.95, '#4a3020', 1.15, 0, 0);
    box(ed, 2.3, 0.55, 0.04, '#4a3020', 0, 0.15, 0.45);                     // modesty panel (front)
    box(ed, 0.5, 0.6, 0.85, '#4a3020', 0.85, 0.12, 0);                      // drawer pedestal
    monitor(ed, -0.4, 0.8, 0.05, Math.PI);        // screens face the manager's chair
    laptop(ed, 0.35, 0.8, -0.05, Math.PI);
    box(ed, 0.42, 0.02, 0.14, '#e8e4dc', -0.4, 0.8, -0.3);                  // keyboard (manager's side)
    cyl(ed, 0.07, 0.02, C.black, -1.0, 0.8, -0.25, { seg: 10 });            // desk lamp
    box(ed, 0.03, 0.4, 0.03, C.black, -1.0, 0.82, -0.25, { rz: 0.3 });
    cyl(ed, 0.1, 0.12, '#e8c48a', -0.93, 1.12, -0.25, { top: 0.4, bottom: 1, seg: 10, emissive: '#ffcf80', emissiveIntensity: 0.5 });
    const np = canvasTex(256, 64, (ctx) => { ctx.fillStyle = '#c9a24a'; ctx.fillRect(0, 0, 256, 64); ctx.fillStyle = '#2b2a2c'; ctx.font = 'bold 34px Georgia, serif'; ctx.fillText('MANAGER', 50, 44); });
    box(ed, 0.5, 0.11, 0.06, '#2b2a2c', 0.0, 0.8, 0.38, { rx: -0.3 });      // nameplate
    panel(ed, 0.46, 0.09, np, 0.0, 0.86, 0.42, { rx: -0.3 });
    box(ed, 0.18, 0.06, 0.12, C.black, 0.85, 0.8, 0.25);                    // desk phone
    cyl(ed, 0.04, 0.09, C.white, 1.0, 0.8, -0.3, { seg: 10 });              // coffee mug
    box(ed, 0.3, 0.02, 0.22, '#f6f2ea', 0.5, 0.8, 0.2, { ry: 0.2 });        // papers
    // high-back leather executive chair behind the desk, two guest chairs in front
    const ec = grp(nb, -4.4, 0, -6.6, 0);
    for (let i = 0; i < 5; i++) { const ang = i / 5 * Math.PI * 2; box(ec, 0.05, 0.04, 0.34, C.black, Math.sin(ang) * 0.16, 0.04, Math.cos(ang) * 0.16, { ry: ang }); }
    cyl(ec, 0.04, 0.42, C.metal, 0, 0.05, 0, { seg: 8 });
    box(ec, 0.58, 0.12, 0.55, '#2b1d14', 0, 0.45, 0);
    box(ec, 0.56, 0.95, 0.12, '#2b1d14', 0, 0.55, -0.27, { rx: -0.08 });   // tall back
    box(ec, 0.4, 0.18, 0.1, '#3a2a20', 0, 1.42, -0.32, { rx: -0.08 });     // headrest
    for (const sxx of [-0.3, 0.3]) box(ec, 0.06, 0.22, 0.4, '#2b1d14', sxx, 0.55, 0.02);
    for (const gx of [-5.1, -3.7]) chair(nb, gx, -4.4, Math.PI, { seat: '#7a3b3b', color: '#4a3020' });
    // corner lounge chair, side table, filing cabinet, plant, wall clock, awards shelf
    sofa(nb, -7.7, -4.2, 1.2, Math.PI / 2 + 0.4, { color: '#3b2a20', cushion: '#5c3d26', pillow: '#c9a24a' });
    rectTable(nb, -7.8, -5.3, 0.5, 0.5, { h: 0.55, top: '#5c3d26' });
    box(nb, 0.5, 1.3, 0.6, '#6f757d', -0.9, 0, -4.2);                        // filing cabinet
    for (let i = 0; i < 3; i++) box(nb, 0.04, 0.03, 0.02, C.metal, -0.9, 0.3 + i * 0.4, -3.89, { cast: false });
    plant(nb, -0.9, -7.2, { tall: true });
    box(nb, 0.9, 0.05, 0.3, '#5c3d26', -1.4, 1.55, -5.6, { ry: Math.PI / 2 });  // awards shelf on the side glass? keep it free-standing
    for (let i = 0; i < 3; i++) cyl(nb, 0.05, 0.22, '#c9a24a', -1.4, 1.6, -5.9 + i * 0.3, { top: 0.6, seg: 8, metalness: 0.6, roughness: 0.3 });
    cyl(nb, 0.03, 1.55, '#5c3d26', -1.4, 0, -5.6, { seg: 6 });
    pendant(nb, -4.4, -5.7, { drop: 1.0, shade: '#c9a24a' });
    floorLamp(nb, -7.9, -7.0);
    rug(nb, -3.8, 5.3, 5.0, 3.0, '#ece2cf', '#a77b4f');
    sofa(nb, -3.8, 6.4, 3.0, Math.PI, { color: n === 3 ? '#c8935a' : '#8fa6c0' });
    rectTable(nb, -3.8, 5.2, 1.4, 0.7, { h: 0.4, top: C.woodLight });
    chair(nb, -5.6, 4.4, faceTo(-5.6, 4.4, -3.8, 5.2));
    chair(nb, -2.0, 4.4, faceTo(-2.0, 4.4, -3.8, 5.2));
    pendant(nb, -3.8, 5.3, { drop: 1.0, shade: '#2f3a2c' });
    plant(nb, -8.0, 4.2, { tall: true });
    plant(nb, 0.3, 4.8, { tall: true });
  }
}

// ---------------------------------------------------------------- Floor 5 (roof)
export function floor5(p, anim) {
  floorSurface(p, RW, 16, RX, 0, plankTex('#c39a6b', '#9b7450'), 2);
  // grass patches
  box(p, 7.0, 0.05, 3.0, '#7fae5a', 4.5, 0.02, 6.0, { cast: false });
  box(p, 3.5, 0.05, 4.5, '#7fae5a', -0.2, 0.02, -5.5, { cast: false });

  // ---- big glass gym filling the whole left end of the roof (built in final positions)
  const gymG = grp(p);
  gymG.userData.noShift = true;
  {
    const p = gymG;
    const gx0 = X0 + 0.2, gx1 = -12.0, gz0 = -7.8, gz1 = 7.7, gh = 3.0, gcx = (gx0 + gx1) / 2;
    const rubber = '#6f757d', dark = '#2b2a2c';
    box(p, gx1 - gx0, 0.04, gz1 - gz0, rubber, gcx, 0.02, (gz0 + gz1) / 2, { cast: false });  // rubber floor
    box(p, 4.4, 0.045, 3.4, '#5c626a', -18.6, 0.02, 5.0, { cast: false });                     // stretching zone
    glassWall(p, gx0, gz1, gx1, gz1, gh);                                    // front
    glassWall(p, gx0, gz0, gx1, gz0, gh);                                    // back
    glassWall(p, gx0, gz0, gx0, gz1, gh);                                    // left (building edge)
    glassWall(p, gx1, gz0, gx1, gz1, gh, { gap: [6.2, 7.4] });              // right, door to the garden
    addDoor(anim, '5:gym', glassDoor(p, gx1, -1.6, 1.2, gh, -Math.PI / 2), -Math.PI / 2, 0);
    for (let i = 0; i <= 10; i++) box(p, 0.08, 0.1, gz1 - gz0, C.black, gx0 + i * (gx1 - gx0) / 10, gh, (gz0 + gz1) / 2, { cast: false }); // pergola
    const sign = canvasTex(512, 96, (ctx) => { ctx.fillStyle = '#2f3a2c'; ctx.font = 'bold 60px -apple-system, sans-serif'; ctx.fillText('💪 GYM', 150, 70); });
    panel(p, 1.6, 0.3, sign, gx1 + 0.03, 2.6, -1.0, { ry: Math.PI / 2, transparent: true });

    // treadmills along the left edge, facing outside (-X)
    for (const tz of [-6.3, -4.8, -3.3, -1.8]) {
      const t = grp(p, -20.0, 0, tz, -Math.PI / 2);
      box(t, 0.8, 0.2, 1.9, dark, 0, 0, 0);
      box(t, 0.6, 0.03, 1.7, '#4a4a4f', 0, 0.2, 0);
      box(t, 0.05, 1.1, 0.05, C.metal, -0.35, 0.2, 0.85);
      box(t, 0.05, 1.1, 0.05, C.metal, 0.35, 0.2, 0.85);
      box(t, 0.8, 0.35, 0.15, dark, 0, 1.25, 0.9, { rx: -0.4 });
      box(t, 0.5, 0.25, 0.02, mat('#7fd0c0', { emissive: '#4fb0a0', emissiveIntensity: 0.6 }), 0, 1.3, 0.97, { rx: -0.4, cast: false });
    }
    // exercise bikes (also facing outside)
    for (const bz of [0.1, 1.5]) {
      const b = grp(p, -20.2, 0, bz, -Math.PI / 2);
      box(b, 0.5, 0.08, 1.1, dark, 0, 0, 0);
      box(b, 0.1, 0.75, 0.1, C.metal, 0, 0.08, -0.25, { rx: -0.2 });
      box(b, 0.3, 0.08, 0.35, dark, 0, 0.82, -0.32);                      // saddle
      box(b, 0.08, 0.9, 0.08, C.metal, 0, 0.08, 0.35, { rx: 0.25 });
      box(b, 0.5, 0.05, 0.08, dark, 0, 1.0, 0.48);                        // handlebar
      cyl(b, 0.22, 0.12, '#c8312b', 0, 0.2, 0.25, { rz: Math.PI / 2, seg: 16 }); // flywheel
    }
    // rowing machine
    const rw = grp(p, -14.2, 0, 2.6, Math.PI / 2);
    box(rw, 0.35, 0.12, 2.2, dark, 0, 0, 0);
    box(rw, 0.4, 0.08, 0.4, '#3a3d42', 0, 0.2, -0.3);
    cyl(rw, 0.28, 0.12, C.metal, 0, 0.12, 0.95, { rx: Math.PI / 2, seg: 18 });
    // weights zone (back): dumbbell racks, squat rack, cable tower, bench
    for (const rx of [-17.4, -14.4]) {
      const rk = grp(p, rx, 0, -7.4);
      box(rk, 2.2, 0.08, 0.5, C.black, 0, 0.4, 0); box(rk, 2.2, 0.08, 0.5, C.black, 0, 0.8, 0);
      for (const lx of [-1.05, 1.05]) box(rk, 0.06, 0.9, 0.5, C.black, lx, 0, 0);
      for (let i = 0; i < 7; i++) for (const ly of [0.48, 0.88]) {
        cyl(rk, 0.06 + i * 0.007, 0.08, '#555a60', -0.9 + i * 0.3 - 0.07, ly + 0.07, 0, { rz: Math.PI / 2, seg: 8 });
        cyl(rk, 0.06 + i * 0.007, 0.08, '#555a60', -0.9 + i * 0.3 + 0.07, ly + 0.07, 0, { rz: Math.PI / 2, seg: 8 });
      }
    }
    box(p, 3.0, 2.0, 0.04, mat('#dfeff5', { roughness: 0.05, metalness: 0.6 }), -15.9, 0.6, gz0 + 0.1, { cast: false }); // mirror
    const sr = grp(p, -13.0, 0, -3.4);                                    // squat / power rack
    for (const [lx, lz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) box(sr, 0.08, 2.3, 0.08, C.black, lx, 0, lz);
    for (const lz of [-0.6, 0.6]) box(sr, 1.28, 0.08, 0.08, C.black, 0, 2.22, lz);
    cyl(sr, 0.025, 1.8, C.metal, 0, 1.35, -0.1, { rz: Math.PI / 2, seg: 6 });
    for (const lx of [-0.75, 0.75]) cyl(sr, 0.22, 0.08, dark, lx, 1.35, -0.1, { rz: Math.PI / 2, seg: 14 });
    const ct = grp(p, -12.8, 0, -6.9);                                    // cable tower
    box(ct, 0.6, 2.3, 0.5, '#3a3d42', 0, 0, 0);
    box(ct, 0.4, 0.9, 0.06, C.metal, 0, 0.3, 0.28);
    const wb = grp(p, -13.0, 0, -5.4);                                    // flat bench
    box(wb, 0.35, 0.42, 1.2, C.black, 0, 0, 0);
    box(wb, 0.4, 0.1, 1.2, '#7a3b3b', 0, 0.42, 0);
    // kettlebells + medicine balls along the right wall
    for (let i = 0; i < 6; i++) {
      const kz = 0.7 + i * 0.32;
      sphere(p, 0.1 + i * 0.008, '#2b2a2c', -12.45, 0.11, kz, { s: [1, 0.95, 1] });
      cyl(p, 0.05, 0.08, '#2b2a2c', -12.45, 0.2, kz, { rx: Math.PI / 2, seg: 8 });
    }
    // punching bag hanging from the pergola
    cyl(p, 0.015, 0.6, C.black, -15.8, gh - 0.6, 3.0, { seg: 4 });
    cyl(p, 0.2, 1.0, '#7a3b3b', -15.8, gh - 1.6, 3.0, { seg: 14 });
    // yoga & stretching: 5 mats, balls, foam rollers, blocks
    ['#a98bd6', '#7fc4b4', '#f0a3a3', '#f1c84b', '#8fb0e0'].forEach((c, i) => box(p, 0.65, 0.025, 1.8, c, -20.6 + i * 1.05, 0.05, 5.0, { cast: false }));
    sphere(p, 0.33, '#8f5fd6', -20.7, 0.38, 3.0);
    sphere(p, 0.3, '#4fb0a0', -20.0, 0.35, 3.1);
    for (let i = 0; i < 3; i++) cyl(p, 0.07, 0.45, ['#4fb0e0', '#e85d3d', '#2b2a2c'][i], -16.4, 0.07, 6.6 + i * 0.2, { rz: Math.PI / 2, seg: 10 });
    for (let i = 0; i < 4; i++) box(p, 0.15, 0.1, 0.23, '#a98bd6', -17.2 + i * 0.2, 0.05, 6.7);
    // lockers, towel shelf, water cooler by the door
    for (let i = 0; i < 4; i++) {
      box(p, 0.5, 1.9, 0.45, i % 2 ? '#4f7d6a' : '#5f8f7a', -15.2 + i * 0.52, 0.05, gz1 - 0.3);
      box(p, 0.04, 0.12, 0.02, C.metal, -15.05 + i * 0.52, 1.0, gz1 - 0.53, { cast: false });
    }
    const ts = grp(p, -12.45, 0, 4.6, -Math.PI / 2);
    box(ts, 1.2, 0.04, 0.35, C.wood, 0, 0.6, 0); box(ts, 1.2, 0.04, 0.35, C.wood, 0, 1.1, 0);
    for (const lx of [-0.58, 0.58]) box(ts, 0.04, 1.3, 0.35, C.wood, lx, 0, 0);
    for (let i = 0; i < 4; i++) box(ts, 0.22, 0.12, 0.3, ['#ffffff', '#cfe3b0', '#ffffff', '#bfe0ee'][i], -0.4 + i * 0.27, 0.64, 0);
    const wc = grp(p, -12.5, 0, 6.6);
    box(wc, 0.4, 1.0, 0.4, '#e9e6e0', 0, 0, 0);
    cyl(wc, 0.15, 0.45, mat('#bfe0ee', { transparent: true, opacity: 0.6 }), 0, 1.0, 0, { seg: 14, cast: false });
    plant(p, -12.6, -7.3, { tall: true });
    plant(p, -20.9, 7.2, { tall: true });
  }
  // vending machines outside the gym door: 2 green, 2 blue
  {
    const vg = grp(p);
    vg.userData.noShift = true;
    vendingMachine(vg, -11.55, -2.3, Math.PI / 2, { title: 'PROTEIN · ISOTONIC', sub: 'stay hydrated 💧' });
    vendingMachine(vg, -11.55, -3.35, Math.PI / 2, { body: '#3f9a4a', trim: '#2c7336', title: 'GREEN SMOOTHIES', sub: 'fresh & healthy 🥬', cols: ['#7ab87a', '#a5c98a', '#f2f2f2', '#5f8a5b', '#cfe3b0'] });
    vendingMachine(vg, -11.55, -4.4, Math.PI / 2, { body: '#2f6fb0', trim: '#1f4f85', title: 'SPORTS DRINKS', sub: 'recharge ⚡', cols: ['#4fb0e0', '#f1c84b', '#f2f2f2', '#2f6fb0', '#e85d3d'] });
    vendingMachine(vg, -11.55, -5.45, Math.PI / 2, { body: '#2f6fb0', trim: '#1f4f85', title: 'PROTEIN BARS', sub: 'refuel 🍫', cols: ['#8a5a33', '#e2a356', '#f2f2f2', '#c96f4a', '#f1c84b'] });
  }

  // ---- chill area: lounge set, umbrella table, loungers, planters, string lights
  rug(p, 2.2, 2.2, 5.0, 3.4, '#f0e6d2', '#c8935a');
  sofa(p, 2.2, 0.9, 3.2, 0, { color: '#efe4cf', cushion: '#f8f1e3', pillow: '#7f9f6e' });
  sofa(p, 0.0, 2.7, 2.2, Math.PI / 2, { color: '#efe4cf', cushion: '#f8f1e3', pillow: '#f1c84b' });
  rectTable(p, 2.4, 2.4, 1.6, 0.9, { h: 0.4, top: C.wood });
  cyl(p, 0.25, 0.12, '#3a3a3a', 2.4, 0.47, 2.4, { seg: 14 });               // fire bowl
  sphere(p, 0.15, glowMat('#ffb347'), 2.4, 0.62, 2.4, { s: [1, 0.6, 1], cast: false });
  chair(p, 4.6, 2.6, -Math.PI / 2, { color: C.wood, seat: '#efe4cf' });
  // umbrella table
  roundTable(p, 5.4, -4.6, { r: 0.6, vase: false, chairs: 4, start: Math.PI / 4, chair: { color: C.wood, seat: '#efe4cf' } });
  cyl(p, 0.03, 2.4, C.woodDark, 5.4, 0.75, -4.6, { seg: 6 });
  cyl(p, 1.6, 0.5, '#f4ede2', 5.4, 2.7, -4.6, { top: 0.02, bottom: 1, seg: 8, cast: true });
  // sun loungers (in the garden, next to the gym)
  const lgr = grp(p);
  lgr.userData.noShift = true;
  for (const lx of [-10.1, -9.2]) {
    const l = grp(lgr, lx, 0, 5.9);
    box(l, 0.7, 0.3, 1.8, C.wood, 0, 0, 0);
    box(l, 0.66, 0.08, 1.2, C.white, 0, 0.3, 0.25);
    box(l, 0.66, 0.08, 0.7, C.white, 0, 0.45, -0.6, { rx: -0.6 });
  }
  // planters along the front edge (whole longer roof)
  const pg = grp(p);
  pg.userData.noShift = true;
  for (let i = 0; i < 11; i++) flowerPlanter(pg, -11.2 + i * 1.7, 7.3, i);
  // and a new row along the back edge, from the vending machines to the lift
  for (let i = 0; i < 11; i++) flowerPlanter(pg, -10.0 + i * 1.7, -7.35, i + 5);
  // a flower bed by the sun loungers
  for (let k = 0; k < 14; k++) sphere(pg, 0.09, FLOWER_COLS[k % FLOWER_COLS.length], -11.3 + (k % 7) * 0.22, 0.1, 4.0 + Math.floor(k / 7) * 0.3, { cast: false });
  box(pg, 1.7, 0.06, 0.9, '#6b8f4a', -10.65, 0.02, 4.15, { cast: false });
  for (const [px, pz] of [[8.8, -2.6], [8.8, 2.5], [-1.4, -7.3], [8.8, 5.0]]) plant(p, px, pz, { tall: true, s: 1.2 });
  // string lights between four poles (spanning the longer garden)
  const lg = grp(p);
  lg.userData.noShift = true;
  const poles = [[-1.4 - EXT, -0.4], [8.6, -0.4], [8.6, 6.4], [-1.4 - EXT, 6.4]];
  for (const [px, pz] of poles) cyl(lg, 0.05, 3.0, C.black, px, 0, pz, { seg: 6 });
  const bulb = glowMat('#ffd27a');
  for (let k = 0; k < 4; k++) {
    const [ax, az] = poles[k], [bx, bz] = poles[(k + 1) % 4];
    const n = Math.round(Math.hypot(bx - ax, bz - az) / 0.7);
    for (let i = 1; i < n; i++) {
      const t = i / n, sag = Math.sin(t * Math.PI) * 0.45;
      sphere(lg, 0.06, bulb, ax + (bx - ax) * t, 2.95 - sag, az + (bz - az) * t, { cast: false });
    }
  }
  // ---- the new space (building is 40% longer): outdoor dining under a pergola
  {
    const nb = grp(p);
    nb.userData.noShift = true;
    box(nb, 6.0, 0.05, 3.6, '#7fae5a', -6.0, 0.02, -4.4, { cast: false });   // lawn
    rectTable(nb, -6.0, 3.5, 4.0, 1.2, { top: C.wood });
    for (let i = 0; i < 4; i++) {
      chair(nb, -7.5 + i * 1.0, 2.55, 0, { color: C.wood, seat: '#efe4cf' });
      chair(nb, -7.5 + i * 1.0, 4.45, Math.PI, { color: C.wood, seat: '#efe4cf' });
    }
    for (const [px, pz] of [[-8.6, 1.9], [-3.4, 1.9], [-8.6, 5.1], [-3.4, 5.1]]) box(nb, 0.12, 2.8, 0.12, C.woodDark, px, 0, pz);
    for (const pz of [1.9, 5.1]) box(nb, 5.4, 0.14, 0.14, C.woodDark, -6.0, 2.8, pz);
    for (let i = 0; i < 7; i++) box(nb, 0.1, 0.1, 3.5, C.wood, -8.6 + i * 0.87, 2.94, 3.5);
    plant(nb, -9.4, 1.4, { tall: true });
    plant(nb, -2.6, 1.4, { tall: true });
  }
  void anim;
}
