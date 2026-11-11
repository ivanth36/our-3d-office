// Contents of each floor. All coordinates are local to the floor (y=0 = floor).
// Rooms live in x -12..9.6, z -8..8 (front/street = +Z).
import * as THREE from 'three';
import {
  CEIL, H, H1, SLAB, registerGlow, optimize, box, cyl, sphere, grp, mat, glowMat, glassMat, canvasTex, panel, roundRect,
  plankTex, carpetTex, tileTex, floorSurface, faceTo,
} from './helpers.js';
import {
  C, chair, stool, roundTable, rectTable, sofa, plant, pendant, floorLamp, rug,
  bookshelf, frame, glassWall, glassDoor, monitor, laptop, officeChair,
} from './furniture.js';
import { roamingJoe } from './joe.js';
import { employee } from './characters.js';
import {
  chochin, floorLantern, stoneLantern, sakuraTree, pineTree, bamboo, bonsai, ikebana, zabuton, lowTable,
  kanbanTex, noren, logoCanvasTex, tatamiFloor, shojiScreen, frostedMat, seasonMat, darumaShelf, japaneseSofa,
} from './japan.js';
import { CORE_X, X0, X1, XC, EXT } from './building.js';

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
const BACK_IN = -7.7, LEFT_IN = -11.7; // inner faces of the back / left walls

// ---------------------------------------------------------------- signs
function paw(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.25, s * 0.42, s * 0.34, 0, 0, Math.PI * 2); ctx.fill();
  for (const [dx, dy] of [[-0.42, -0.2], [-0.15, -0.45], [0.15, -0.45], [0.42, -0.2]]) {
    ctx.beginPath(); ctx.ellipse(x + dx * s, y + dy * s, s * 0.14, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function cafeSignTex() {
  const draw = (ctx, w, h, logo) => {
    ctx.fillStyle = '#5c3d26'; roundRect(ctx, 0, 0, w, h, 40); ctx.fill();
    ctx.strokeStyle = '#e8c48a'; ctx.lineWidth = 10; roundRect(ctx, 14, 14, w - 28, h - 28, 30); ctx.stroke();
    if (logo) ctx.drawImage(logo, 30, 18, 222, 222);           // Joe's Café logo (Joe sipping matcha)
    ctx.fillStyle = '#fff3dc';
    ctx.font = 'bold 112px Georgia, "Times New Roman", serif';
    ctx.textBaseline = 'middle';
    ctx.fillText("Joe's Café", 270, 112);
    ctx.font = '600 42px -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = '#cfe3b0';
    ctx.fillText('MATCHA  ·  COFFEE  ·  TREATS', 276, 196);
    paw(ctx, 940, 90, 48, '#e8c48a');
  };
  const tex = canvasTex(1024, 256, (ctx, w, h) => draw(ctx, w, h));
  const logo = new Image();
  logo.onload = () => { draw(tex.image.getContext('2d'), 1024, 256, logo); tex.needsUpdate = true; };
  logo.src = 'assets/joe-logo.png';
  return tex;
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
const AZALEA = ['#f28cb0', '#ffffff', '#e8508f', '#f7c6d4', '#d23a2e'];
function flowerPlanter(p, x, z, i = 0, japanese = false) {
  box(p, 1.4, japanese ? 0.35 : 0.5, 0.7, japanese ? '#2e2b29' : C.woodDark, x, 0, z);
  sphere(p, 0.45, i % 2 ? C.leaf : C.leaf2, x, japanese ? 0.6 : 0.75, z, { s: japanese ? [1.4, 0.6, 0.8] : [1.4, 0.75, 0.8] });
  for (let k = 0; k < 9; k++) {
    const fx = x - 0.5 + (k % 5) * 0.25 + ((k * 37) % 7) * 0.01, fz = z - 0.15 + (k % 3) * 0.15;
    const col = japanese ? AZALEA[(i + k) % AZALEA.length] : FLOWER_COLS[(i * 3 + k) % FLOWER_COLS.length];
    sphere(p, 0.07, col, fx, 0.98 + (k % 2) * 0.05, fz, { cast: false });
    sphere(p, 0.025, '#f6d64a', fx, 1.03 + (k % 2) * 0.05, fz, { cast: false });  // flower centre
  }
}

// ---------------------------------------------------------------- vending machine
/** Drinks vending machine; its front faces local +Z (use ry to turn it). */
export function vendingMachine(p, x, z, ry, o = {}) {
  const vm = grp(p, x, 0, z, ry);
  const teal = o.body ?? '#2f8f83', trim = o.trim ?? '#1f6b62';
  box(vm, 0.95, 1.95, 0.55, teal, 0, 0, -0.1);                      // cabinet
  box(vm, 0.95, 0.5, 0.2, teal, 0, 0, 0.275);                       // front frame: bottom
  box(vm, 0.95, 0.33, 0.2, teal, 0, 1.62, 0.275);                   //              top
  box(vm, 0.06, 1.12, 0.2, teal, -0.445, 0.5, 0.275);               //              left
  box(vm, 0.3, 1.12, 0.2, teal, 0.325, 0.5, 0.275);                 //              right (keypad)
  box(vm, 0.95, 0.06, 0.77, trim, 0, 1.95, 0);
  box(vm, 0.6, 1.12, 0.02, registerGlow(mat('#d9f2ee', { emissive: '#bfe9e2', emissiveIntensity: 0.7 }), 2.0), -0.12, 0.5, 0.185, { cast: false }); // lit back wall
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
  floorSurface(p, RW, 16, RX, 0, plankTex('#c99a63', '#a8784a'), 2.2);   // warm cedar floor

  // ---- U-shaped counter, front-left. Opening faces the back.
  const top = '#e6c897', body = '#4a3020', CH = 1.05;   // hinoki top, dark wood body
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
  box(cnt, 5.62, 0.25, 0.72, '#2a1f19', -7.8, 0, 6.0);
  box(cnt, 0.72, 0.25, 3.4, '#2a1f19', -5.35, 0, 3.95);
  for (let i = 0; i < 9; i++) box(cnt, 0.05, CH - 0.3, 0.02, '#3a2618', -10.3 + i * 0.6, 0.25, 6.36, { cast: false }); // slatted front

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
  // wagashi display case on the front-left: mochi, dango skewers, sakura & matcha sweets
  box(p, 1.4, 0.5, 0.6, glassMat(), -9.5, T, 6.0, { cast: false });
  box(p, 1.4, 0.04, 0.6, '#3d2618', -9.5, T + 0.5, 6.0);
  box(p, 1.36, 0.03, 0.56, '#2a1f19', -9.5, T, 6.0);
  ['#f7c6d4', '#8fb35a', '#f6efe2', '#f1d08a', '#c96f8a'].forEach((c, i) => {
    cyl(p, 0.08, 0.02, '#f6efe2', -10.0 + i * 0.25, T + 0.03, 6.1, { seg: 12 });               // little plates
    sphere(p, 0.06, c, -10.0 + i * 0.25, T + 0.09, 6.1, { s: [1, 0.7, 1] });
  });
  for (let i = 0; i < 3; i++) {                                                                  // dango
    box(p, 0.01, 0.01, 0.28, '#d9c3a0', -9.9 + i * 0.4, T + 0.06, 5.88);
    ['#f7c6d4', '#f6efe2', '#8fb35a'].forEach((c, k) => sphere(p, 0.035, c, -9.9 + i * 0.4, T + 0.07, 5.8 + k * 0.08));
  }
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
  // chawan (tea bowls) + chasen (bamboo whisks) on display shelves above the back bar
  for (const sy of [1.55, 2.05]) box(p, 5.0, 0.04, 0.32, '#3d2618', -7.8, sy, 1.25);
  for (const sxx of [-10.3, -5.3]) box(p, 0.06, 1.15, 0.32, '#3d2618', sxx, 0.95, 1.25);
  const bowls = ['#5f7a3a', '#2b2a2c', '#c9a77a', '#8a5a3c', '#e8e1d0', '#3f5a6a', '#a8442e'];
  for (let i = 0; i < 8; i++) {
    const bx = -9.95 + i * 0.6;
    cyl(p, 0.11, 0.09, bowls[i % 7], bx, 1.59, 1.25, { top: 1, bottom: 0.65, seg: 14 });         // chawan
    cyl(p, 0.035, 0.06, '#d9c08a', bx, 2.09, 1.25, { seg: 8 });                                    // chasen handle
    cyl(p, 0.06, 0.08, '#e6d3a0', bx, 2.15, 1.25, { top: 1, bottom: 0.5, seg: 10 });               // whisk tines
  }
  for (let i = 0; i < 4; i++) cyl(p, 0.06, 0.16, ['#1f3556', '#5f7a3a', '#a8442e', '#2b2a2c'][i], -9.6 + i * 1.2, 1.0, 1.4, { seg: 10 });   // matcha tins
  const menuJ = canvasTex(512, 96, (ctx) => { ctx.fillStyle = '#2a1f19'; ctx.fillRect(0, 0, 512, 96); ctx.fillStyle = '#e6d3a0'; ctx.font = 'bold 44px "Hiragino Mincho ProN", serif'; ctx.fillText('抹茶 · 和菓子 · Matcha & wagashi', 18, 62); });
  panel(p, 2.6, 0.48, menuJ, -7.8, 2.45, 1.08);
  // stools along the counter (outside of right arm + front)
  for (const z of [2.7, 3.6, 4.5]) stool(p, -4.55, z);
  for (const x of [-9.6, -8.7]) stool(p, x, 6.85, { color: C.terracotta });
  // menu board on left wall + hanging pendants over counter
  panel(p, 2.4, 1.8, menuTex(), -11.66, 2.4, 3.9, { ry: Math.PI / 2 });

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
  // little standing card with the café logo (same logo as the sign)
  const love = logoCanvasTex(256, 128, (ctx, w, h, logo) => { ctx.fillStyle = '#1f1d1e'; ctx.fillRect(0, 0, w, h); if (logo) ctx.drawImage(logo, 8, 8, 112, 112); ctx.fillStyle = '#e9dcc4'; ctx.font = 'italic 44px Georgia, serif'; ctx.fillText('Joe ♥', 128, 78); });
  box(p, 0.42, 0.22, 0.05, '#1f1d1e', -13.0, barTop, -7.5, { rx: -0.15 });
  panel(p, 0.4, 0.2, love, -13.0, barTop + 0.11, -7.47, { rx: -0.15 });
  // paper lanterns hang from the balcony above the window bar
  for (let i = 0; i < 6; i++) chochin(p, -19.6 + i * 2.6, -7.1, { top: H - 0.25, drop: 1.6 });
  for (const pz of [-4.6, -2.8]) chochin(p, leftX + 0.45, pz, { top: H - 0.25, drop: 1.6 });
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
    cyl(p, 0.2, 4.4, '#6b4a33', tx, 0.55, tz, { top: 0.55, bottom: 1, seg: 9 });   // trunk (the atrium is tall now)
    const branch = (ang, tilt, len, y) => cyl(p, 0.06, len, '#7a5233', tx + Math.sin(ang) * len * 0.35, y, tz + Math.cos(ang) * len * 0.35, { top: 0.5, seg: 6, rx: Math.cos(ang) * tilt, rz: -Math.sin(ang) * tilt });
    branch(0.5, 0.7, 1.4, 3.6); branch(2.6, 0.7, 1.3, 3.9); branch(4.4, 0.65, 1.4, 3.7);
    const leafCols = [0, 1, 2, 3].map((i) => seasonMat('momiji', i));            // a maple: momiji red in autumn
    const blobs = [[0, 3.75, 0, 0.75], [0.7, 3.4, 0.3, 0.6], [-0.65, 3.45, 0.25, 0.6], [0.2, 3.35, -0.7, 0.6], [-0.3, 3.5, 0.75, 0.55], [0.6, 3.0, -0.35, 0.5], [-0.6, 3.0, -0.4, 0.5], [0.05, 3.05, 0.7, 0.5], [0.95, 2.95, 0.5, 0.42], [-0.95, 2.95, 0.4, 0.42], [0.25, 4.0, 0.15, 0.45]];
    blobs.forEach(([bx, by, bz, r], i) => sphere(p, r * 1.5, leafCols[i % 4], tx + bx * 1.5, by * 1.25 + 1.0, tz + bz * 1.5, { s: [1.1, 0.8, 1.1] }));
  }

  // ---- plants
  for (const [x, z] of [[8.8, 7.3], [-11.3, 0.55]]) plant(p, x, z, { tall: (x * z) % 2 > 0 });

  // ---- façade: fascia sign, awning, mascot
  const sy = 0.8;     // signs: 3.5 m above the street
  frontCanopy(p);
  const signs = grp(p);
  signs.userData.noShift = true;              // real positions
  box(signs, 4.0, 1.05, 0.2, '#5c3d26', -11.0, 2.67 + sy, 7.98, { cast: false });
  panel(signs, 3.9, 0.975, kanbanTex(), -11.0, 3.195 + sy, 8.09, { glow: 0.2 });
  box(signs, 4.0, 1.05, 0.2, '#2f3a2c', 2.0, 2.67 + sy, 7.98, { cast: false });
  panel(signs, 3.9, 0.975, receptionSignTex(), 2.0, 3.195 + sy, 8.09, { glow: 0.25 });
  counterRoof(p);
  entrance(p, signs);
  // outdoor bistro tables
  roundTable(signs, -11.5, 9.6, { r: 0.45, chairs: 2, start: Math.PI / 2, vase: false });
  roundTable(signs, -8.5, 9.6, { r: 0.45, chairs: 2, start: Math.PI / 2, vase: false });
  // ---- the real Joe, roaming around his café
  anim.joe = roamingJoe(p);
  anim.joe.group.userData.noShift = true;   // Joe positions himself on the (already shifted) map

  // ================= LEFT HALF: café tables + divider (real positions) =================
  const cafeG = grp(p);
  cafeG.userData.noShift = true;
  [[-11.9, -3.4], [-8.8, -3.4]].forEach(([x, z]) => {
    roundTable(cafeG, x, z, { chairs: 4, start: Math.PI / 4, top: '#8a5f3c', chair: { seat: '#a8442e', color: '#4a3020' } });
    floorLantern(cafeG, x - 1.15, z - 0.4);
  });
  lowTable(cafeG, -16.6, -3.3, { w: 1.4, d: 0.8 });                                  // low tea table on the ground
  // low planter divider between the café and the lounge (gaps to walk through)
  [[-3.4, 2.4], [1.1, 3.0], [5.6, 2.0]].forEach(([cz, len], i) => {
    box(cafeG, 0.5, 0.5, len, '#2e2b29', -5.4, 0, cz);                         // bamboo planters
    bamboo(cafeG, -5.4, cz, { n: 3, h: 2.0 + i * 0.3, y: 0.5 });
    for (let k = 0; k < len / 0.45; k++) sphere(cafeG, 0.2, k % 2 ? '#4f7a3a' : '#5f8a45', -5.4, 0.6, cz - len / 2 + 0.25 + k * 0.45, { s: [1, 0.6, 1] });   // moss
    void FLOWER_COLS;
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
  floorLantern(lg, -0.3, 4.6);
  floorLantern(lg, 4.3, 4.6);
  plant(lg, -0.6, 5.6, { tall: true });
  plant(lg, 4.6, 5.6, { tall: true });
  // round sofa circling the big tree
  rug(lg, 4.7, 0.0, 4.6, 4.6, '#d9c7a0', '#5a3b26');
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2;
    const seg = grp(lg, 4.7 + Math.sin(a) * 1.25, 0, Math.cos(a) * 1.25, a);   // faces outward
    const col = k % 2 ? '#2f4a6a' : '#5a3b26';
    box(seg, 0.68, 0.4, 0.62, col, 0, 0, 0);
    box(seg, 0.66, 0.1, 0.55, '#f3e7d2', 0, 0.4, 0.03);
    box(seg, 0.68, 0.45, 0.14, col, 0, 0.4, -0.25);
  }
  // two sofas facing each other around a coffee table — centred on the same line as the tree sofa (z = 0)
  rug(lg, -2.5, 0.0, 4.6, 4.6, '#d9c7a0', '#5a3b26');                     // same size and colours as the tree-sofa rug
  sofa(lg, -2.5, -1.7, 2.4, 0, { color: '#3d2a1e', cushion: '#2f4a6a', pillow: '#c8a24a' });
  sofa(lg, -2.5, 1.7, 2.4, Math.PI, { color: '#3d2a1e', cushion: '#2f4a6a', pillow: '#c8a24a' });
  rectTable(lg, -2.5, 0.0, 1.4, 0.7, { h: 0.4, top: C.woodLight });
  cyl(lg, 0.08, 0.2, C.white, -2.3, 0.47, 0.0, { seg: 10 });
  sphere(lg, 0.1, '#f28cb0', -2.3, 0.75, 0.0);
  box(lg, 0.5, 0.04, 0.35, '#e9e1cf', -2.9, 0.47, -0.05);                 // magazines
  floorLantern(lg, -0.8, -2.0);
  floorLantern(lg, -0.8, 2.0);
  // (the back wall is now the foot of the wooden staircase up to the balconies)
  plant(lg, 7.6, -7.2, { tall: true });
  // magazine rack + water dispenser
  const mr = grp(lg, -3.6, 0, 5.4);
  box(mr, 0.7, 0.9, 0.3, C.woodDark, 0, 0, 0);
  for (let i = 0; i < 4; i++) box(mr, 0.15, 0.22, 0.02, ['#e85d3d', '#7fa8e0', '#f1c84b', '#97b88f'][i], -0.24 + i * 0.16, 0.7, 0.16, { rx: -0.2, cast: false });
  const wd = grp(lg, 6.6, 0, 5.2);
  box(wd, 0.4, 1.0, 0.4, '#e9e6e0', 0, 0, 0);
  cyl(wd, 0.15, 0.45, mat('#bfe0ee', { transparent: true, opacity: 0.6 }), 0, 1.0, 0, { seg: 14, cast: false });

  atrium(p, anim);
}

// ---------------------------------------------------------------- Floor 1: the atrium tea house
// All in real positions (noShift). Walkways kept clear for Joe and the staff: x = -13.45 and
// x = -6.2 either side of the pond, z = -1.3 behind it and z ~7.4 in front.
const CEIL1 = H1 - SLAB;
const RED = '#c8352a', CEDAR = '#8a5a3c', BEAM = '#5a3b26';
function realGroup(p) { const g = grp(p); g.userData.noShift = true; return g; }

/** Short tiled canopies over the two shop signs (kept short so the atrium stays open to the street). */
function frontCanopy(p) {
  const g = realGroup(p);
  for (const [cx0, w] of [[-11.0, 4.6], [2.0, 4.6]]) {
    const cv = grp(g, cx0, 4.75, 8.0);
    box(cv, w, 0.08, 0.8, '#3a3d42', 0, 0, 0.35, { rx: 0.3, cast: false });
    for (let x = -w / 2 + 0.15; x < w / 2; x += 0.3) box(cv, 0.05, 0.05, 0.8, '#2c2e33', x, 0.06, 0.35, { rx: 0.3, cast: false });
    for (const bx of [-w / 2 + 0.3, w / 2 - 0.3]) box(cv, 0.08, 0.08, 0.7, BEAM, bx, -0.3, 0.3, { rx: 0.6, cast: false });
  }
}

/** Small tea-house roof over the café counter, with lanterns and a noren along its front. */
function counterRoof(p) {
  const g = realGroup(p);
  const x0 = -20.5, x1 = -14.45, zb = 0.9, zf = 7.05, eaveY = 3.1, ridgeY = 3.75, zr = (zb + zf) / 2;
  for (const [px, pz] of [[x0 + 0.1, zb + 0.1], [x1 - 0.1, zb + 0.1], [x0 + 0.1, zf - 0.1], [x1 - 0.1, zf - 0.1]]) box(g, 0.16, eaveY, 0.16, BEAM, px, 0, pz);
  box(g, x1 - x0, 0.14, 0.14, BEAM, (x0 + x1) / 2, eaveY - 0.14, zf - 0.1);
  box(g, x1 - x0, 0.14, 0.14, BEAM, (x0 + x1) / 2, eaveY - 0.14, zb + 0.1);
  const half = zf - zr, ang = Math.atan2(ridgeY - eaveY, half), len = Math.hypot(half, ridgeY - eaveY) + 0.35;
  for (const sd of [1, -1]) {
    const rp = grp(g, (x0 + x1) / 2, (eaveY + ridgeY) / 2 - 0.05, zr + sd * half / 2);
    box(rp, x1 - x0 + 0.5, 0.08, len, '#3a3d42', 0, 0, 0, { rx: sd * ang, cast: false });
    for (let x = -(x1 - x0) / 2; x < (x1 - x0) / 2 + 0.2; x += 0.3) box(rp, 0.05, 0.05, len, '#2c2e33', x, 0.06, 0, { rx: sd * ang, cast: false });
  }
  box(g, x1 - x0 + 0.5, 0.12, 0.16, '#2c2e33', (x0 + x1) / 2, ridgeY, zr);
  for (const lx of [-19.6, -15.3]) chochin(g, lx, zf + 0.05, { top: eaveY, drop: 0.12 });
  noren(g, (x0 + x1) / 2, eaveY - 0.05, zf + 0.1, 2.8, 0.55, { text: '抹茶 · Matcha' });
}

/** Front entrance: genkan with slippers, stone lanterns, a sakura tree and red tea benches. */
function entrance(p, signs) {
  const g = realGroup(p);
  // genkan: stone entry floor, then a wooden step up where slippers wait
  box(g, 1.6, 0.012, 0.9, '#5d5b57', -2.6, 0.0, 7.35, { cast: false });
  box(g, 1.6, 0.15, 0.55, '#a87a4f', -2.6, 0, 6.575);
  box(g, 1.64, 0.03, 0.06, '#5a3b26', -2.6, 0.15, 6.85, { cast: false });
  [['#2f4a6a', -3.15], ['#a8442e', -2.6], ['#5f7a3a', -2.05]].forEach(([c, sx]) => {
    for (const o of [-0.07, 0.07]) { box(g, 0.1, 0.03, 0.24, c, sx + o, 0.15, 6.6); box(g, 0.1, 0.02, 0.1, '#f4efe4', sx + o, 0.18, 6.66, { cast: false }); }
  });
  const shoe = grp(g, -4.0, 0, 6.45);                                     // getabako (shoe cabinet)
  box(shoe, 0.55, 0.95, 0.45, '#5a3b26', 0, 0, 0);
  for (let i = 0; i < 3; i++) box(shoe, 0.5, 0.02, 0.02, '#2a1f19', 0, 0.25 + i * 0.3, 0.23, { cast: false });
  stoneLantern(g, -5.9, 9.0, 1.1);
  stoneLantern(g, 0.7, 9.0, 1.1);
  sakuraTree(g, 6.2, 10.1, 1.35);
  // red tea benches with a big parasol where the bistro tables used to be
  for (const bx of [-11.5, -8.5]) {
    const b = grp(signs, bx, 0, 9.6);
    box(b, 1.6, 0.42, 0.55, '#5a3b26', 0, 0, 0);
    box(b, 1.65, 0.05, 0.6, RED, 0, 0.42, 0);
  }
  cyl(signs, 0.03, 2.7, '#5a3b26', -10.0, 0, 9.9, { seg: 6 });
  cyl(signs, 1.7, 0.45, RED, -10.0, 2.5, 9.9, { top: 0.03, bottom: 1, seg: 16 });
}

function railX(p, y, z, x0, x1, col = BEAM) {
  for (let x = x0; x <= x1 + 0.01; x += 1.2) box(p, 0.07, 1.0, 0.07, col, Math.min(x, x1), y, z, { cast: false });
  box(p, x1 - x0, 0.07, 0.1, col, (x0 + x1) / 2, y + 1.0, z, { cast: false });
  box(p, x1 - x0, 0.04, 0.05, col, (x0 + x1) / 2, y + 0.5, z, { cast: false });
}
function railZ(p, y, x, z0, z1, col = BEAM) {
  for (let z = z0; z <= z1 + 0.01; z += 1.2) box(p, 0.07, 1.0, 0.07, col, x, y, Math.min(z, z1), { cast: false });
  box(p, 0.1, 0.07, z1 - z0, col, x, y + 1.0, (z0 + z1) / 2, { cast: false });
  box(p, 0.05, 0.04, z1 - z0, col, x, y + 0.5, (z0 + z1) / 2, { cast: false });
}
/** Balcony floor slab (top at y) with planks on top and brackets underneath. */
function deck(p, y, x0, x1, z0, z1) {
  box(p, x1 - x0, 0.25, z1 - z0, '#6b4a33', (x0 + x1) / 2, y - 0.25, (z0 + z1) / 2, { cast: false });
  box(p, x1 - x0 - 0.04, 0.02, z1 - z0 - 0.04, '#c99a63', (x0 + x1) / 2, y - 0.01, (z0 + z1) / 2, { cast: false });
}
/** Straight wooden staircase from A to B (B higher), floating treads with soft step lights. */
function stairRun(p, ax, ay, az, bx, by, bz, w = 1.1) {
  const dx = bx - ax, dz = bz - az, run = Math.hypot(dx, dz), rise = by - ay;
  const n = Math.round(rise / 0.2), g = grp(p, ax, ay, az, Math.atan2(dx, dz));
  const glow = glowMat('#ffcf80', 0.5);
  for (let k = 0; k < n; k++) {
    const z = run * (k + 0.5) / n, y = rise * (k + 1) / n;
    box(g, w, 0.08, run / n + 0.03, k % 2 ? '#c99a63' : '#bf8f58', 0, y - 0.08, z, { cast: false });
    if (k % 2 === 0) box(g, w - 0.1, 0.03, 0.04, glow, 0, y - 0.11, z + run / n / 2 - 0.02, { cast: false });
  }
  const len = Math.hypot(run, rise), ang = Math.atan2(rise, run);
  for (const sx of [-w / 2, w / 2]) {
    const st = grp(g, sx, rise / 2, run / 2);
    box(st, 0.08, 0.28, len, '#5a3b26', 0, -0.32, 0, { rx: -ang });
    box(st, 0.06, 0.06, len, '#3d2618', 0, 0.75, 0, { rx: -ang });
  }
  for (let k = 3; k < n; k += 6) for (const sx of [-w / 2, w / 2]) box(g, 0.04, 0.95, 0.04, '#3d2618', sx, rise * (k + 1) / n, run * (k + 0.5) / n, { cast: false });
}

function atrium(p, anim) {
  const g = realGroup(p);
  const L1 = H, L2 = 2 * H;
  // ---- tall cedar pillars around the pond, and two by the right balconies
  for (const [px, pz] of [[-12.55, -0.15], [-7.15, -0.15], [-12.55, 6.55], [-7.15, 6.55], [7.8, -3.0], [7.8, 3.0]]) {
    cyl(g, 0.34, 0.25, '#7d786f', px, 0, pz, { seg: 8 });                       // stone footing
    cyl(g, 0.24, CEIL1 - 0.25, CEDAR, px, 0.25, pz, { top: 0.92, seg: 12 });
  }
  // ---- exposed roof beams with little spotlights
  for (const bz of [-5.85, -2.0, 2.0, 5.85]) box(g, CORE_X - X0 - 0.4, 0.45, 0.3, BEAM, (X0 + CORE_X) / 2, CEIL1 - 0.45, bz, { cast: false });
  for (const bx of [-19.65, -16.1, -12.55, -7.15, -3.0, 1.0, 4.5, 7.8]) {
    box(g, 0.3, 0.35, 15.6, BEAM, bx, CEIL1 - 0.8, 0, { cast: false });
    for (const bz of [-5.85, -2.0, 2.0, 5.85]) cyl(g, 0.11, 0.06, glowMat('#fff0c8', 1.4), bx, CEIL1 - 0.88, bz, { seg: 10, cast: false });
  }
  // ---- two levels of wraparound balconies (back, left and right; the street side stays open)
  for (const y of [L1, L2]) {
    deck(g, y, X0 + 0.15, -4.5, -7.85, -5.85);                                  // back, left part
    deck(g, y, 3.5, CORE_X, -7.85, -5.85);                                      // back, right part
    deck(g, y, X0 + 0.15, -19.65, -5.85, 7.6);                                  // left
    deck(g, y, 7.8, CORE_X, -5.85, 7.6);                                        // right (meets the core landings)
    railX(g, y, -5.85, -19.65, -4.5);
    railX(g, y, -5.85, 3.5, 7.8);
    railZ(g, y, 7.8, -5.85, 7.6);
    railX(g, y, 7.6, 7.8, CORE_X);
    railX(g, y, 7.6, X0 + 0.15, -19.65);
    for (let x = -19.0; x < -4.5; x += 2.4) box(g, 0.12, 0.12, 0.9, BEAM, x, y - 0.6, -6.3, { rx: -0.7, cast: false }); // brackets
    for (let z = -4.6; z < 7.6; z += 2.4) { box(g, 0.9, 0.12, 0.12, BEAM, -20.1, y - 0.6, z, { rz: 0.7, cast: false }); box(g, 0.9, 0.12, 0.12, BEAM, 8.25, y - 0.6, z, { rz: -0.7, cast: false }); }
  }
  railZ(g, L1, -19.65, -5.85, 6.0);                                             // left rails, with gaps for the side stair
  railZ(g, L2, -19.65, -5.85, -1.7);
  railZ(g, L2, -19.65, -0.5, 7.6);
  railZ(g, L1, -4.5, -7.85, -5.85);                                             // around the gaps over the back stairs
  railZ(g, L2, 3.5, -7.85, -5.85);
  deck(g, L1, -19.65, -18.45, 6.75, 7.6);                                       // landings for the side stair
  deck(g, L2, -19.65, -18.45, -1.7, -0.5);
  // ---- staircases criss-crossing between the ground and the balconies
  stairRun(g, -4.0, 0, -7.15, 3.5, L1, -7.15);                                  // ground -> 1st balcony (along the back)
  stairRun(g, 3.5, L1, -5.75, -4.5, L2, -6.15);                                 // 1st -> 2nd balcony (back, crossing over it)
  stairRun(g, -19.05, L1, 6.75, -19.05, L2, -0.5);                              // 1st -> 2nd balcony (left side)
  // ---- low tables on the balconies, overlooking the stage
  for (const [x, y] of [[-16.0, L1], [-11.0, L1], [-6.8, L1], [-17.0, L2], [-12.5, L2], [-8.0, L2]]) lowTable(g, x, -6.85, { w: 1.1, d: 0.6, y });
  lowTable(g, 8.7, 2.4, { w: 0.8, d: 0.55, y: L1, cushion: '#2f4a6a' });
  lowTable(g, -20.55, 3.0, { w: 0.8, d: 0.55, y: L2, cushion: '#2f4a6a' });
  for (const y of [L1, L2]) {
    for (const x of [-18.2, -13.6, -9.2, -5.2, 5.0]) floorLantern(g, x, -6.05, { y, h: 0.75 });
    for (const z of [-3.6, 0.6, 4.8]) { floorLantern(g, 8.05, z, { y, h: 0.75 }); floorLantern(g, -19.9, z, { y, h: 0.75 }); }
  }

  // ---- shallow indoor pond + stream, rocks and koi; the stage stands above the water
  const cx = -9.85, cz = 3.2, rx = 3.05, rz = 3.65;
  const ell = (r, h, color, y, o = {}) => { const m = cyl(g, 1, h, color, cx, y, cz, { seg: 40, ...o }); m.scale.set(rx * r, h, rz * r); return m; };
  ell(1.0, 0.14, '#7d786f', 0);                                                  // stone rim
  ell(0.95, 0.03, '#5b5a4c', 0.11, { cast: false });                             // pebble bed
  const water = ell(0.95, 0.02, mat('#4f8f9a', { transparent: true, opacity: 0.72, roughness: 0.1, metalness: 0.1 }), 0.13, { cast: false });
  water.receiveShadow = false;
  for (let i = 0; i < 20; i++) {                                                 // rocks round the edge
    const a = i / 20 * Math.PI * 2;
    sphere(g, 0.2 + (i % 3) * 0.07, i % 2 ? '#9a958c' : '#7d786f', cx + Math.cos(a) * rx * 0.98, 0.12, cz + Math.sin(a) * rz * 0.98, { s: [1.3, 0.7, 1.1] });
  }
  for (const [ox, oz, r] of [[2.0, 1.6, 0.55], [-2.0, -1.9, 0.45], [1.7, -2.5, 0.38], [-1.6, 2.3, 0.4]]) sphere(g, r, '#8e8a80', cx + ox, 0.15, cz + oz, { s: [1.4, 0.7, 1.1] });
  // stream: a little cascade over stacked rocks at the back-left, running into the pond
  for (const [ox, oy, oz, r] of [[-1.9, 0.2, -2.9, 0.42], [-1.6, 0.55, -3.1, 0.36], [-2.2, 0.75, -3.25, 0.3]]) sphere(g, r, '#8e8a80', cx + ox, oy, cz + oz, { s: [1.2, 0.8, 1] });
  box(g, 0.45, 0.6, 0.03, mat('#cfe8ee', { transparent: true, opacity: 0.6, emissive: '#cfe8ee', emissiveIntensity: 0.2 }), cx - 1.75, 0.15, cz - 2.75, { rx: -0.3, cast: false });
  for (let i = 0; i < 6; i++) box(g, 0.32, 0.015, 0.4, mat('#6fb0bd', { transparent: true, opacity: 0.8 }), cx - 1.7 + i * 0.28, 0.135, cz - 2.4 + i * 0.32, { ry: 0.6, cast: false });
  bamboo(g, -12.35, 5.95, { n: 5, h: 3.2 });
  bamboo(g, -7.35, 0.45, { n: 5, h: 2.8 });
  // koi (they swim: see anim.tickers)
  const koi = ['#f08a3a', '#ffffff', '#e85d3d', '#f4f1ea', '#f1c84b', '#2b2a2c'].map((c, i) => {
    const k = grp(p, cx, 0.15, cz);
    k.userData.dynamic = true; k.userData.noShift = true;
    sphere(k, 0.16, c, 0, 0, 0, { s: [0.45, 0.25, 1], cast: false });
    sphere(k, 0.07, c, 0, 0, -0.19, { s: [1, 0.3, 0.8], cast: false });
    if (i % 2) sphere(k, 0.06, '#e85d3d', 0, 0.03, 0.04, { s: [1, 0.4, 1], cast: false });
    return { k, r: 0.55 + (i % 3) * 0.22, sp: 0.18 + i * 0.03, ph: i * 1.1, dir: i % 2 ? 1 : -1 };
  });
  // ---- the stage: raised wooden platform, red carpet, red railings, open to the front
  const sx0 = cx - 1.8, sx1 = cx + 1.8, sz0 = 1.0, sz1 = 4.3, SH = 0.9;
  for (const [px, pz] of [[sx0 + 0.15, sz0 + 0.15], [sx1 - 0.15, sz0 + 0.15], [sx0 + 0.15, sz1 - 0.15], [sx1 - 0.15, sz1 - 0.15]]) box(g, 0.22, SH - 0.15, 0.22, '#5a3b26', px, 0, pz);
  box(g, sx1 - sx0, 0.18, sz1 - sz0, '#8a5f3c', cx, SH - 0.18, (sz0 + sz1) / 2);
  box(g, sx1 - sx0 - 0.3, 0.02, sz1 - sz0 - 0.3, RED, cx, SH, (sz0 + sz1) / 2, { cast: false });
  const redRailX = (z) => { for (let x = sx0; x <= sx1 + 0.01; x += 0.9) box(g, 0.08, 0.65, 0.08, RED, Math.min(x, sx1), SH, z); box(g, sx1 - sx0, 0.07, 0.1, RED, cx, SH + 0.65, z); box(g, sx1 - sx0, 0.04, 0.05, RED, cx, SH + 0.3, z); };
  const redRailZ = (x) => { for (let z = sz0; z <= sz1 + 0.01; z += 0.9) box(g, 0.08, 0.65, 0.08, RED, x, SH, Math.min(z, sz1)); box(g, 0.1, 0.07, sz1 - sz0, RED, x, SH + 0.65, (sz0 + sz1) / 2); box(g, 0.05, 0.04, sz1 - sz0, RED, x, SH + 0.3, (sz0 + sz1) / 2); };
  redRailX(sz0); redRailZ(sx0); redRailZ(sx1);
  for (const [x, z] of [[sx0, sz0], [sx1, sz0], [sx0, sz1], [sx1, sz1]]) sphere(g, 0.07, '#c9a24a', x, SH + 0.75, z, { metalness: 0.6, roughness: 0.3 });   // giboshi caps
  // walkway from the front of the pond up onto the stage
  const wl = Math.hypot(6.95 - sz1, SH);
  const wk = grp(g, cx, SH / 2, (sz1 + 6.95) / 2);
  box(wk, 1.1, 0.1, wl, '#a87a4f', 0, -0.05, 0, { rx: Math.atan2(SH, 6.95 - sz1) });
  // folding screen (byōbu) behind the musician
  const by = grp(g, cx, SH, sz0 + 0.35);
  const scr = canvasTex(512, 256, (ctx, w, h) => { ctx.fillStyle = '#d9b45a'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 9; i++) ctx.fillRect(i * 64, 0, 3, h); ctx.fillStyle = '#e9e2d0'; ctx.beginPath(); ctx.ellipse(170, 150, 140, 40, -0.1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3f6b3a'; ctx.beginPath(); ctx.ellipse(330, 110, 90, 26, 0.1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c8352a'; ctx.beginPath(); ctx.arc(420, 60, 26, 0, Math.PI * 2); ctx.fill(); });
  for (let i = 0; i < 4; i++) panel(by, 0.62, 1.15, scr, -0.93 + i * 0.62, 0.6, 0.0, { ry: (i % 2 ? -0.18 : 0.18) });
  zabuton(g, cx, 2.55, '#5a2a3a', SH);
  // the musician: seated on the stage, playing the shamisen
  const hana = employee(g, cx, 2.45, 0, { name: 'Hana', outfit: 'yukata', shirt: '#2f3f6a', pants: '#2f3f6a', obi: RED, pattern: '#f7c6d4', hair: '#1a1210', hairStyle: 'bun', pose: 'sit', tasks: [] });
  hana.group.position.y = SH - 0.28;
  hana.tag.visible = false;
  Object.assign(hana.group.userData.info, { title: 'Hana 🎶', text: 'Shamisen player on the tea-house stage.' });
  delete hana.group.userData.info.employee;
  const sham = grp(hana.body, 0.04, 0.12, 0.24, 0, 0);
  box(sham, 0.2, 0.2, 0.08, '#f4ead6', 0, -0.1, 0, { rz: 0.15 });                  // drum body
  box(sham, 0.22, 0.22, 0.06, '#5a3b26', 0, -0.11, -0.02, { rz: 0.15 });
  const neck = grp(sham, -0.04, 0.05, 0);
  box(neck, 0.035, 0.85, 0.03, '#2a1f19', 0, 0, 0, { rz: 0.9 });                   // long neck up to the left
  const bachi = grp(hana.shoulders[1], 0, -0.4, 0.08);
  box(bachi, 0.12, 0.02, 0.09, '#e6d3a0', 0, 0, 0.04);                              // plectrum
  hana.shoulders[0].rotation.set(-1.0, 0, 0.6);
  // ---- floor lanterns along the walkways round the pond
  for (const [x, z] of [[-12.0, 7.05], [-11.05, 6.9], [-8.65, 6.9], [-7.6, 7.05], [-13.0, 2.6], [-6.7, 2.6], [-1.2, 7.0]]) floorLantern(g, x, z);

  anim.tickers = anim.tickers || [];
  anim.tickers.push((dt, t) => {
    for (const q of koi) {
      const a = q.ph + t * q.sp * q.dir;
      q.k.position.set(cx + Math.cos(a) * rx * q.r * 0.9, 0.15, cz + Math.sin(a) * rz * q.r * 0.9);
      q.k.rotation.y = Math.atan2(-Math.sin(a) * q.dir * rx, Math.cos(a) * q.dir * rz);
    }
    hana.shoulders[1].rotation.set(-0.9 + Math.sin(t * 7) * 0.18, 0, -0.3);       // strumming
    hana.head.rotation.z = Math.sin(t * 0.8) * 0.06;
  });
}

// ---------------------------------------------------------------- Chill Home (now on the 4th floor)
// Back-left: living room · Front-left: glass music room · Back-right: kitchen
// Front-right: dining for 12 · Middle: open space between living room & kitchen.


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
  // living room: oak floor with a woven rug, a low Japandi sofa (exposed oak frame, linen cushions)
  rug(p, tvx, -3.2, 7.6, 5.2, '#d9cbb0', '#8a6a48');
  japaneseSofa(p, tvx, -1.1, 4.4, Math.PI);                                        // facing the TV (Ivan & Phil sit here)
  japaneseSofa(p, -10.95, -3.7, 3.0, Math.PI / 2);                                 // along the left wall
  const zt = grp(p, tvx, 0, -3.4);                                                  // low oak coffee table (zataku height)
  box(zt, 2.0, 0.06, 0.9, '#c49a68', 0, 0.32, 0);
  for (const [lx, lz] of [[-0.9, -0.36], [0.9, -0.36], [-0.9, 0.36], [0.9, 0.36]]) box(zt, 0.08, 0.32, 0.08, '#a87c4f', lx, 0, lz);
  box(zt, 1.8, 0.03, 0.7, '#a87c4f', 0, 0.08, 0);                                  // lower shelf
  cyl(zt, 0.07, 0.12, '#5f7a3a', -0.5, 0.38, 0.1, { seg: 10 });                     // teapot + cups
  for (const cx of [-0.25, -0.05]) cyl(zt, 0.04, 0.06, '#f4efe4', cx, 0.38, -0.15, { seg: 8 });
  ikebana(zt, 0.55, 0.38, 0);
  for (const zx of [-0.6, 0.6]) zabuton(p, tvx + zx, -4.4, '#2f4a6a');             // floor cushions on the far side
  // wall-mounted TV
  box(p, 4.3, 2.45, 0.08, '#1b1b1e', tvx, 1.15, BACK_IN + 0.04);
  panel(p, 4.1, 2.3, tvTex(), tvx, 1.15 + 1.225, BACK_IN + 0.09, { glow: 0.55 });
  box(p, 0.3, 0.3, 0.06, '#2b2a2c', tvx, 1.0, BACK_IN + 0.03);                  // wall bracket hint
  // low oak TV board + soundbar
  box(p, 5.4, 0.4, 0.5, '#a87c4f', tvx, 0.0, BACK_IN + 0.25);
  for (let i = 0; i < 4; i++) box(p, 1.25, 0.3, 0.02, '#c49a68', tvx - 2.0 + i * 1.33, 0.05, BACK_IN + 0.51);
  box(p, 1.6, 0.1, 0.12, '#2b2a2c', tvx, 0.4, BACK_IN + 0.3);
  bonsai(p, tvx - 2.2, 0.4, BACK_IN + 0.25, 1.3);
  // bookshelves flanking the TV
  bookshelf(p, -10.4, BACK_IN + 0.2, 2.0, 2.4, 0);
  bookshelf(p, -2.2, BACK_IN + 0.2, 2.0, 2.4, 0);
  shojiScreen(p, -1.0, BACK_IN + 0.1, -1.0, -2.7);                                  // shoji on the kitchen side
  floorLantern(p, -10.9, -6.8, { h: 0.7 });
  floorLantern(p, -2.0, -5.4, { h: 0.7 });
  floorLantern(p, -2.0, -0.6, { h: 0.7 });
  const scroll = canvasTex(128, 384, (ctx, w, h) => { ctx.fillStyle = '#f4ecd8'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#6b4a33'; ctx.fillRect(0, 0, w, 18); ctx.fillRect(0, h - 18, w, 18); ctx.fillStyle = '#1b1b1e'; ctx.font = 'bold 74px "Hiragino Mincho ProN", serif'; ctx.textAlign = 'center'; ctx.fillText('和', w / 2, 140); ctx.fillText('楽', w / 2, 250); });
  panel(p, 0.5, 1.5, scroll, -1.25, 1.9, BACK_IN + 0.05);
  for (let i = 0; i < 3; i++) chochin(p, tvx - 1.6 + i * 1.6, -3.3, { top: CEIL, drop: 1.6 });

  // ---- washitsu (tatami room) in front of the living room: raised tatami, shoji, kotatsu, tansu
  const wx0 = -10.0, wx1 = -2.4, wz0 = 2.3, wz1 = 6.0, wcx = (wx0 + wx1) / 2, wcz = (wz0 + wz1) / 2;
  box(p, wx1 - wx0, 0.16, wz1 - wz0, '#6b4a33', wcx, 0, wcz);                       // raised floor
  box(p, wx1 - wx0 + 0.04, 0.04, 0.08, '#3d2618', wcx, 0.13, wz1, { cast: false });  // front edge (kamachi)
  tatamiFloor(p, wx0 + 0.05, wz0 + 0.05, wx1 - 0.05, wz1 - 0.05, 0.165);
  const shoji = grp(p, 0, 0.16, 0);
  shojiScreen(shoji, wx0, wz0, wx0 + 1.8, wz0);                                     // back: slid open in the middle
  shojiScreen(shoji, wx1 - 1.8, wz0, wx1, wz0);
  shojiScreen(shoji, wx0, wz0, wx0, wz1);                                           // left side
  const kt = grp(p, wcx + 0.6, 0.16, wcz);
  box(kt, 2.2, 0.36, 1.3, '#7a3b3b', 0, 0, 0);                                     // kotatsu quilt
  box(kt, 2.35, 0.04, 1.45, '#a8442e', 0, 0.06, 0, { cast: false });
  for (let i = 0; i < 5; i++) box(kt, 0.08, 0.3, 1.32, '#c9a24a', -0.88 + i * 0.44, 0.03, 0, { cast: false });
  box(kt, 2.1, 0.05, 1.2, '#5a3b26', 0, 0.36, 0);
  cyl(kt, 0.22, 0.08, '#e9dcc4', 0.4, 0.41, 0, { seg: 14 });                        // mikan bowl
  for (let i = 0; i < 4; i++) sphere(kt, 0.05, '#f08a3a', 0.32 + (i % 2) * 0.12, 0.52, -0.06 + Math.floor(i / 2) * 0.12);
  for (const cx of [-0.5, -0.2]) cyl(kt, 0.04, 0.06, '#f4efe4', cx, 0.41, 0.1, { seg: 8 });
  for (const zx of [-0.55, 0.55]) { zabuton(p, wcx + 0.6 + zx, wcz - 1.05, '#2f4a6a', 0.16); zabuton(p, wcx + 0.6 + zx, wcz + 1.05, '#2f4a6a', 0.16); }
  zabuton(p, wcx + 0.6 - 1.45, wcz, '#a8442e', 0.16); zabuton(p, wcx + 0.6 + 1.45, wcz, '#a8442e', 0.16);
  const ta = grp(p, wx0 + 0.4, 0.16, wcz, Math.PI / 2);                             // tansu chest
  box(ta, 1.8, 1.1, 0.5, '#6b4a33', 0, 0, 0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { box(ta, 0.82, 0.3, 0.02, '#7d5a40', -0.44 + c * 0.88, 0.1 + r * 0.33, 0.26, { cast: false }); box(ta, 0.12, 0.03, 0.03, '#2b2a2c', -0.44 + c * 0.88, 0.25 + r * 0.33, 0.28, { cast: false }); }
  bonsai(p, wx0 + 0.4, 1.26, wcz - 0.4, 1.4);
  for (const [lx, lz] of [[wx1 - 0.35, wz0 + 0.35], [wx1 - 0.35, wz1 - 0.35]]) floorLantern(p, lx, lz, { h: 0.6, y: 0.16 });
  chochin(p, wcx + 0.6, wcz, { top: CEIL, drop: 1.7 });
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
    // Tokyo-style jazz kissa: dark wood floor, warm amber glass, records wall, dim lamps
    box(mg, rx1 - rx0 - 0.15, 0.03, mz1 - mz0, '#3d2a1e', (rx0 + rx1) / 2 + 0.075, 0.02, (mz0 + mz1) / 2, { cast: false });
    glassWall(mg, rx1, mz0, rx1, mz1, CEIL, { gap: [3.35, 4.35], frame: '#3d2618', glass: mat('#e8b878', { transparent: true, opacity: 0.25, roughness: 0.1 }) });
    addDoor(anim, '4:music', glassDoor(mg, rx1, mz0 + 3.35, 1.0, CEIL, -Math.PI / 2), -Math.PI / 2, 0);
    glassWall(mg, rx0, mz1, rx1, mz1, CEIL, { frame: '#3d2618', glass: mat('#e8b878', { transparent: true, opacity: 0.25, roughness: 0.1 }) });
    // listening bar along the front glass: counter, stools, whisky shelf
    box(mg, 1.9, 1.0, 0.5, '#4a3020', -20.15, 0, 7.25);
    box(mg, 2.0, 0.05, 0.6, '#7a4e2a', -20.15, 1.0, 7.25);
    for (let i = 0; i < 6; i++) cyl(mg, 0.04, 0.24, ['#8a4a1f', '#c99a3a', '#2f5a3a'][i % 3], -20.95 + i * 0.3, 1.05, 7.35, { seg: 8 });
    for (const bx of [-20.6, -19.7]) { cyl(mg, 0.03, 0.72, '#2a1f19', bx, 0, 6.6, { seg: 6 }); cyl(mg, 0.18, 0.06, '#7a3b3b', bx, 0.72, 6.6, { seg: 12 }); }
    for (const lx of [-20.6, -19.3, -17.2, -14.0]) chochin(mg, lx, lx < -19 ? 7.0 : 2.0, { top: CEIL, drop: 1.9, r: 0.14 });
    box(mg, rx1 - rx0 - 0.2, 0.06, 0.06, registerGlow(mat('#ffb36b', { emissive: '#ff9a4a', emissiveIntensity: 0.9 }), 1.6), (rx0 + rx1) / 2, CEIL - 0.2, 0.15, { cast: false });   // amber cove light
  }
  const cdCols = ['#d94f3d', '#3e6b9a', '#f1c84b', '#2b2a2c', '#7ab87a', '#e8e1d0', '#9b59b6', '#f08a5d', '#1b1b1e', '#c9a24a'];
  const cd = { bookColors: cdCols, bookW: 0.022, bookH: 0.31, rows: 7, color: '#2a1f19' };
  bookshelf(p, LEFT_IN + 0.22, 3.9, 6.6, 3.6, Math.PI / 2, cd);   // wall of vinyl records
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
  floorLantern(p, -10.2, 4.6, { h: 0.6 });
  const sign = canvasTex(512, 96, (ctx) => { ctx.fillStyle = '#c99a3a'; ctx.font = 'bold 50px "Hiragino Mincho ProN", -apple-system, sans-serif'; ctx.fillText('♪ ジャズ喫茶 Jazz Kissa', 10, 66); });
  panel(p, 1.9, 0.36, sign, -9.0, 3.1, mz0 + 0.04, { transparent: true });           // on the shared glass wall

  // ================= KITCHEN (back-right, x 2.5..9.3, z -7.7..-0.8) =================
  const kx0 = 2.5, kx1 = 9.3, cab = '#5a3b28', cabLight = '#6b4a33', quartz = '#e8cfa0', steel = '#c9ccd0';   // dark wood + hinoki
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
  // omakase: glass neta case on the counter, sushi on wooden geta plates in front of each seat
  box(p, 3.0, 0.28, 0.4, glassMat(), ix, 0.97, iz - 0.25, { cast: false });
  box(p, 2.96, 0.02, 0.36, '#dfe8ea', ix, 0.97, iz - 0.25, { cast: false });
  for (let i = 0; i < 8; i++) sphere(p, 0.06, ['#e8604a', '#f4f1ea', '#f08a3a', '#e85d3d'][i % 4], ix - 1.3 + i * 0.37, 1.03, iz - 0.25, { s: [1.6, 0.6, 1] });
  for (let i = 0; i < 4; i++) {
    const sxx = ix - 1.5 + i * 1.0;
    box(p, 0.4, 0.04, 0.2, '#c99a63', sxx, 0.97, iz + 0.45);
    for (let k = 0; k < 3; k++) { box(p, 0.08, 0.04, 0.05, '#f4f1ea', sxx - 0.1 + k * 0.1, 1.01, iz + 0.45); box(p, 0.08, 0.02, 0.05, ['#e8604a', '#f08a3a', '#e85d3d'][k], sxx - 0.1 + k * 0.1, 1.05, iz + 0.45, { cast: false }); }
    cyl(p, 0.03, 0.06, '#2b2a2c', sxx + 0.25, 0.97, iz + 0.5, { seg: 8 });       // soy dish
  }
  for (let i = 0; i < 4; i++) stool(p, ix - 1.5 + i * 1.0, iz + 1.15, { color: '#7a3b3b', leg: '#2a1f19' });
  for (let i = 0; i < 3; i++) chochin(p, ix - 1.4 + i * 1.4, iz, { top: CEIL, drop: 1.7 });
  noren(p, ix, 2.55, BACK_IN + 0.75, 2.2, 0.6, { text: 'おまかせ Omakase', color: '#f4efe4' }).children.forEach(() => {});
  rug(p, ix, iz + 1.0, 5.4, 1.2, '#cdbb8f', '#5a3b26');

  // ================= OPEN SPACE between living room & kitchen =================
  plant(p, 0.7, BACK_IN + 0.4, { tall: true, s: 1.2 });
  frame(p, 0.7, 1.6, BACK_IN + 0.02, 1.4, 1.0, 0, '#97b88f');

  // ================= DINING FOR 12 (front-right) =================
  const dx = 3.4, dz = 3.9, L = 6.4;
  rug(p, dx, dz, L + 2.4, 3.6, '#efe7d6', '#c9a77a');
  rectTable(p, dx, dz, L, 1.4, { top: '#7a4e2a', leg: '#4a3020' });
  for (let i = 0; i < 5; i++) {
    const x = dx - L / 2 + (i + 0.5) * L / 5;
    chair(p, x, dz - 1.05, 0, { seat: '#7a3b3b', color: '#4a3020' });
    chair(p, x, dz + 1.05, Math.PI, { seat: '#7a3b3b', color: '#4a3020' });
  }
  chair(p, dx - L / 2 - 0.45, dz, Math.PI / 2, { seat: '#7a3b3b', color: '#4a3020' });
  chair(p, dx + L / 2 + 0.45, dz, -Math.PI / 2, { seat: '#7a3b3b', color: '#4a3020' });
  for (let i = 0; i < 5; i++) chochin(p, dx - 2.6 + i * 1.3, dz, { top: CEIL, drop: 1.5, color: 'red', r: 0.2 });   // izakaya feel
  for (let i = 0; i < 3; i++) { cyl(p, 0.05, 0.28, '#e8e1d0', dx - 2.2 + i * 2.2, 0.82, dz + 0.3, { seg: 8 }); box(p, 0.06, 0.08, 0.01, '#1b1b1e', dx - 2.2 + i * 2.2, 0.92, dz + 0.355, { cast: false }); }   // sake bottles
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
    addDoor(anim, '4:game', glassDoor(p, -17.25, z1, 1.0, CEIL, 0), 0, -1.45);
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
  // minimal Kyoto / Muji style: pale oak floor, light wood, paper lanterns, linen
  floorSurface(p, RW, 16, RX, 0, plankTex('#e6d3b3', '#d3bd97'), 2.4);
  const accent = n === 3 ? '#b9c4a8' : '#b8c4cf', oak = '#c8a77a';

  // ---- big shared desk (like a bench system: one long top, centre spine + screens)
  const { x, z, L, W } = DESK;
  const dg = grp(p, x, 0, z);
  for (let i = 0; i <= 5; i++) {
    const lx = -L / 2 + 0.1 + i * (L - 0.2) / 5;
    box(dg, 0.07, 0.74, 0.07, oak, lx, 0, -W / 2 + 0.1);
    box(dg, 0.07, 0.74, 0.07, oak, lx, 0, W / 2 - 0.1);
    box(dg, 0.06, 0.06, W - 0.2, oak, lx, 0.1, 0);
  }
  box(dg, L, 0.06, W, '#e8d2ad', 0, 0.74, 0);
  box(dg, L - 0.4, 0.32, 0.4, '#d6c3a0', 0, 0.8, 0);                 // cable/storage spine
  for (let i = 0; i < 5; i++) box(dg, L / 5 - 0.15, 0.4, 0.04, accent, -L / 2 + (i + 0.5) * L / 5, 1.12, 0); // linen screens
  bonsai(dg, -L / 2 + 0.25, 0.8, 0, 1.3);                             // bonsai at both ends of the shared desk
  bonsai(dg, L / 2 - 0.25, 0.8, 0, 1.3);
  for (let i = 0; i < 10; i++) {
    const s = seat(i);
    const lx = s.x - x, lz = (s.z - z) * 0.55;
    if (i % 2) laptop(dg, lx, 0.8, lz, s.ry + Math.PI);
    else monitor(dg, lx, 0.8, lz * 0.75, s.ry + Math.PI);
    box(dg, 0.4, 0.02, 0.14, '#e8e4dc', lx + 0.25, 0.8, lz * 0.9); // keyboard / notebook
    officeChair(p, s.x, s.z, s.ry);
  }
  for (let i = 0; i < 5; i++) chochin(p, x - L / 2 + 1 + i * 2, z, { top: CEIL, drop: 1.9 });

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
  const shoji = { frame: oak, glass: frostedMat(), shoji: true };       // frosted shoji-style glass
  glassWall(p, rx0, rz1, rx1, rz1, CEIL, { gap: [0.5, 1.5], ...shoji });
  addDoor(anim, `${n}:meet`, glassDoor(p, rx0 + 0.5, rz1, 1.0, CEIL, 0), 0, -1.45);
  glassWall(p, rx0, -7.85, rx0, rz1, CEIL, shoji);
  glassWall(p, rx1, -7.85, rx1, rz1, CEIL, shoji);
  const mcx = (rx0 + rx1) / 2, mcz = -5.0;
  // oval table: scale a cylinder
  const oval = cyl(p, 1, 0.06, '#e3c99c', mcx, 0.74, mcz, { seg: 28 });
  oval.scale.set(2.2, 0.06, 0.9);
  ikebana(p, mcx, 0.8, mcz);                                                          // ikebana in the middle of the table
  box(p, 0.5, 0.74, 0.5, oak, mcx - 1.2, 0, mcz);
  box(p, 0.5, 0.74, 0.5, oak, mcx + 1.2, 0, mcz);
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
  chochin(p, mcx - 1, mcz, { top: CEIL, drop: 1.8 });
  chochin(p, mcx + 1, mcz, { top: CEIL, drop: 1.8 });
  plant(p, rx0 + 0.5, -7.3);
  const label = canvasTex(512, 96, (ctx) => { ctx.fillStyle = '#2f3a2c'; ctx.font = 'bold 54px -apple-system, sans-serif'; ctx.fillText('会議室 Meeting Room', 6, 68); });
  panel(p, 1.8, 0.34, label, rx0 + 3.0, 3.1, rz1 + 0.04, { transparent: true });

  // ---- bookshelves along the back wall + lounge corner
  bookshelf(p, -9.0, -7.6, 4.0, 2.6, 0);
  bookshelf(p, -4.6, -7.6, 4.0, 2.6, 0);
  box(p, 1.2, 0.8, 0.5, C.woodDark, -1.5, 0, -7.55);
  cyl(p, 0.2, 0.04, '#5b8fb0', -1.5, 1.05, -7.55, { seg: 6 }); // globe base
  sphere(p, 0.22, '#5b8fb0', -1.5, 1.3, -7.55);
  rug(p, 5.5, 4.6, 5.0, 3.4, '#ece2cf', '#a77b4f');
  sofa(p, 5.5, 3.3, 3.0, 0, { color: '#d9cdb5', cushion: '#efe6d3', pillow: n === 3 ? '#9fae8a' : '#9ab0c8' });
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
    glassWall(nb, ox0, oz1, ox1, oz1, CEIL, { gap: [3.6, 4.6], frame: '#c8a77a' });   // front, door in the middle
    glassWall(nb, ox0, -7.85, ox0, oz1, CEIL, { frame: '#c8a77a' });
    glassWall(nb, ox1, -7.85, ox1, oz1, CEIL, { frame: '#c8a77a' });
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
    if (n === 3) {                                                          // Kenny's hanko (name seal) + red ink pad
      cyl(ed, 0.025, 0.11, '#e8d6a8', 0.25, 0.8, -0.3, { seg: 10 });
      cyl(ed, 0.026, 0.012, '#c8352a', 0.25, 0.8, -0.3, { seg: 10, cast: false });
      cyl(ed, 0.05, 0.025, '#2b2a2c', 0.4, 0.8, -0.32, { seg: 14 });
      cyl(ed, 0.042, 0.005, '#c8352a', 0.4, 0.825, -0.32, { seg: 14, cast: false });
      box(ed, 0.14, 0.003, 0.1, '#f6f2ea', 0.55, 0.8, -0.3, { cast: false });
      cyl(ed, 0.022, 0.004, '#c8352a', 0.55, 0.803, -0.3, { seg: 12, cast: false });   // a stamp on the paper
    }
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
    if (n === 3) anim.darumaShelf = darumaShelf(nb, -10.4, BACK_IN + 0.05);       // Kenny's team status wall
  }
}

// ---------------------------------------------------------------- Floor 5 (roof)
export function floor5(p, anim) {
  floorSurface(p, RW, 16, RX, 0, plankTex('#c39a6b', '#9b7450'), 2);

  // ---- big glass gym filling the whole left end of the roof (built in final positions)
  const gymG = grp(p);
  gymG.userData.noShift = true;
  {
    const p = gymG;
    const gx0 = X0 + 0.2, gx1 = -12.0, gz0 = -7.8, gz1 = 7.7, gh = 3.0, gcx = (gx0 + gx1) / 2;
    const rubber = '#6f757d', dark = '#2b2a2c';
    // the gym is now a dojo: polished wooden floor, tatami for stretching, timber frames, low wooden panels
    box(p, gx1 - gx0, 0.04, gz1 - gz0, '#c9a66b', gcx, 0.02, (gz0 + gz1) / 2, { cast: false });
    for (let x = gx0 + 0.6; x < gx1; x += 0.6) box(p, 0.015, 0.003, gz1 - gz0, '#b08d58', x, 0.06, (gz0 + gz1) / 2, { cast: false });   // floor boards
    tatamiFloor(p, -21.0, 3.3, -16.2, 6.7, 0.065);
    const wf = { frame: '#5a3b26' };
    glassWall(p, gx0, gz1, gx1, gz1, gh, wf);                                // front
    glassWall(p, gx0, gz0, gx1, gz0, gh, wf);                                // back
    glassWall(p, gx0, gz0, gx0, gz1, gh, wf);                                // left (building edge)
    glassWall(p, gx1, gz0, gx1, gz1, gh, { gap: [6.2, 7.4], ...wf });       // right, door to the garden
    box(p, gx1 - gx0, 0.55, 0.06, '#8a5f3c', gcx, 0, gz0 + 0.04);            // koshi-ita: low wooden panels
    box(p, 0.06, 0.55, gz1 - gz0, '#8a5f3c', gx0 + 0.04, 0, (gz0 + gz1) / 2);
    // kamiza: a calligraphy scroll and a little shrine shelf on the back wall
    const kake = canvasTex(128, 384, (ctx, w, h) => { ctx.fillStyle = '#f4ecd8'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#6b4a33'; ctx.fillRect(0, 0, w, 16); ctx.fillRect(0, h - 16, w, 16); ctx.fillStyle = '#1b1b1e'; ctx.font = 'bold 96px "Hiragino Mincho ProN", serif'; ctx.textAlign = 'center'; ctx.fillText('道', w / 2, 150); ctx.font = 'bold 60px "Hiragino Mincho ProN", serif'; ctx.fillText('心', w / 2, 260); ctx.fillStyle = '#c8352a'; ctx.fillRect(w / 2 - 12, 300, 24, 24); });
    panel(p, 0.55, 1.6, kake, -19.6, 1.55, gz0 + 0.12);
    box(p, 1.2, 0.06, 0.3, '#e3c58f', -19.6, 2.55, gz0 + 0.2);
    box(p, 0.5, 0.35, 0.22, '#e3c58f', -19.6, 2.61, gz0 + 0.2);
    box(p, 0.6, 0.06, 0.28, '#3a3d42', -19.6, 2.96, gz0 + 0.2, { rx: 0.1 });
    for (const sx of [-0.4, 0.4]) cyl(p, 0.04, 0.2, '#5f7a3a', -19.6 + sx, 2.61, gz0 + 0.24, { seg: 8 });
    addDoor(anim, '5:gym', glassDoor(p, gx1, -1.6, 1.2, gh, -Math.PI / 2), -Math.PI / 2, 0);
    for (let i = 0; i <= 10; i++) box(p, 0.1, 0.14, gz1 - gz0, '#5a3b26', gx0 + i * (gx1 - gx0) / 10, gh, (gz0 + gz1) / 2, { cast: false }); // timber pergola
    const sign = canvasTex(512, 96, (ctx) => { ctx.fillStyle = '#2a1f19'; ctx.fillRect(0, 0, 512, 96); ctx.fillStyle = '#f3e3c3'; ctx.font = 'bold 58px "Hiragino Mincho ProN", -apple-system, sans-serif'; ctx.fillText('道場 DOJO', 120, 70); });
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
    sphere(p, 0.3, '#5f7a3a', -20.6, 0.35, 2.9);
    for (let i = 0; i < 3; i++) cyl(p, 0.07, 0.45, ['#4fb0e0', '#e85d3d', '#2b2a2c'][i], -16.4, 0.07, 6.6 + i * 0.2, { rz: Math.PI / 2, seg: 10 });
    for (let i = 0; i < 4; i++) box(p, 0.15, 0.1, 0.23, '#a98bd6', -17.2 + i * 0.2, 0.05, 6.7);
    // lockers, towel shelf, water cooler by the door
    for (let i = 0; i < 4; i++) {
      box(p, 0.5, 1.9, 0.45, i % 2 ? '#8a5f3c' : '#7a5236', -15.2 + i * 0.52, 0.05, gz1 - 0.3);
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

  // ================= JAPANESE GARDEN (everything outside the gym; real positions) =================
  // Walkways kept clear: lift/stairs -> gym (z about -1.3..1.0 across the roof), the smoke-break
  // spot by the pond (z ~6), and the cleaners' spots by the front and back planters.
  const jg = grp(p);
  jg.userData.noShift = true;
  {
    const p = jg;
    const vermilion = '#c8352a', charcoal = '#2e2b29', stone = '#9a958c', stoneD = '#7d786f';
    const sakuraPink = ['#f7c6d4', '#f4b3c5', '#fad6e0', '#f0a8bd'];
    // -- the approach: stepping-stone path from the lift to the gym
    for (let x = 8.4; x > -10.6; x -= 0.95) cyl(p, 0.36 + ((x * 7) % 3) * 0.04, 0.05, x % 2 > 0 ? stone : stoneD, x, 0.0, -0.15 + Math.sin(x * 1.7) * 0.18, { seg: 9, cast: false });
    // -- torii gate where you arrive from the lift and stairs
    const torii = grp(p, 6.3, 0, -0.1);
    for (const tz of [-1.8, 1.6]) {
      cyl(torii, 0.16, 3.2, vermilion, 0, 0, tz, { top: 0.85, bottom: 1, seg: 12 });
      cyl(torii, 0.22, 0.35, charcoal, 0, 0, tz, { seg: 12 });                       // black feet
    }
    box(torii, 0.34, 0.22, 4.4, vermilion, 0, 2.55, -0.1);                            // nuki (lower beam)
    box(torii, 0.42, 0.24, 5.0, vermilion, 0, 3.2, -0.1);                             // kasagi (top beam)
    box(torii, 0.46, 0.12, 5.4, charcoal, 0, 3.44, -0.1);                             // black cap
    for (const tz of [-2.55, 2.35]) box(torii, 0.46, 0.14, 0.4, charcoal, 0, 3.5, tz, { rx: tz > 0 ? 0.25 : -0.25 }); // upturned ends
    box(torii, 0.12, 0.6, 0.5, charcoal, 0, 2.62, -0.1);                              // name plaque
    // -- stone lanterns (toro)
    const toro = (x, z, sc = 1) => {
      const t = grp(p, x, 0, z); t.scale.setScalar(sc);
      cyl(t, 0.32, 0.12, stoneD, 0, 0, 0, { seg: 6 });
      cyl(t, 0.09, 0.6, stone, 0, 0.12, 0, { seg: 8 });
      box(t, 0.4, 0.08, 0.4, stoneD, 0, 0.72, 0);
      box(t, 0.3, 0.26, 0.3, '#b5afa5', 0, 0.8, 0);
      box(t, 0.18, 0.12, 0.32, glowMat('#ffd27a'), 0, 0.86, 0, { cast: false });       // glowing window
      cyl(t, 0.36, 0.22, stoneD, 0, 1.06, 0, { top: 0.25, bottom: 1, seg: 6 });       // roof
      sphere(t, 0.07, stone, 0, 1.33, 0);
    };
    toro(5.6, -2.9); toro(5.4, 2.4); toro(-2.2, 2.0, 0.9); toro(3.9, 4.6, 0.9); toro(-7.6, -3.3); toro(-4.0, 6.2, 0.9);
    // -- koi pond with a red arched bridge
    const pond = grp(p, 0.8, 0, 3.6);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.12, 32), mat('#7d786f'));
    rim.scale.set(2.75, 1, 1.45); rim.position.y = 0.06; rim.receiveShadow = true; pond.add(rim);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.02, 32), mat('#3f7f8f', { roughness: 0.15, metalness: 0.1 }));
    water.scale.set(2.55, 1, 1.28); water.position.y = 0.12; pond.add(water);
    for (let i = 0; i < 12; i++) {                                                     // rocks around the edge
      const a = i / 12 * Math.PI * 2;
      sphere(pond, 0.16 + (i % 3) * 0.05, i % 2 ? stone : stoneD, Math.cos(a) * 2.75, 0.12, Math.sin(a) * 1.45, { s: [1.2, 0.7, 1] });
    }
    [['#f08a3a', 0.6, 0.3], ['#ffffff', -0.9, -0.4], ['#e85d3d', 1.4, -0.5], ['#f4f1ea', -1.6, 0.4], ['#f1c84b', 0.1, 0.6]].forEach(([c, kx, kz], i) => {
      const k = grp(pond, kx, 0.14, kz, i * 1.3);                                      // koi
      sphere(k, 0.14, c, 0, 0, 0, { s: [0.45, 0.25, 1], cast: false });
      sphere(k, 0.06, c, 0, 0, -0.17, { s: [1, 0.3, 0.8], cast: false });
    });
    for (const [lx, lz] of [[-1.3, 0.7], [1.9, 0.2], [-0.2, -0.8]]) cyl(pond, 0.22, 0.01, '#5f9a4c', lx, 0.135, lz, { seg: 10, cast: false });   // lily pads
    sphere(pond, 0.06, '#f7c6d4', -1.3, 0.17, 0.7, { cast: false });
    const br = grp(pond, 0, 0, 0);                                                     // arched bridge across the pond
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, z = -1.75 + t * 3.5, y = 0.12 + Math.sin(t * Math.PI) * 0.55;
      box(br, 1.1, 0.07, 0.38, '#a8442e', 0, y, z, { rx: Math.cos(t * Math.PI) * -0.45 });
      if (i % 2 === 0) for (const bx of [-0.55, 0.55]) box(br, 0.07, 0.6, 0.07, vermilion, bx, y, z);
    }
    for (const bx of [-0.55, 0.55]) for (let i = 0; i < 10; i++) {
      const t = (i + 0.5) / 10, z = -1.75 + t * 3.5, y = 0.12 + Math.sin(t * Math.PI) * 0.55 + 0.6;
      box(br, 0.07, 0.07, 0.4, vermilion, bx, y, z, { rx: Math.cos(t * Math.PI) * -0.45 });
    }
    // -- shishi-odoshi: a bamboo tube fills from a spout, tips, knocks on a stone and swings back
    {
      const sx0 = -2.7, sz0 = 3.4;
      sphere(p, 0.38, stone, sx0, 0.12, sz0, { s: [1.3, 0.55, 1.1] });                       // stone basin
      cyl(p, 0.24, 0.02, '#3f7f8f', sx0, 0.33, sz0, { seg: 14, cast: false });
      for (const ox of [-0.25, 0.25]) box(p, 0.05, 0.75, 0.05, '#7f9f45', sx0 + 0.55, 0, sz0 + ox);   // pivot posts
      cyl(p, 0.035, 0.7, '#7f9f45', sx0 + 0.95, 0.55, sz0, { rz: 1.1, seg: 8 });               // spout pouring in
      const pivot = grp(p, sx0 + 0.55, 0.62, sz0);
      pivot.userData.dynamic = true;
      cyl(pivot, 0.06, 0.9, '#8fae4f', 0, 0, 0, { rz: Math.PI / 2, seg: 10 });                 // the rocking tube
      pivot.children[0].position.set(0.05, 0, 0);
      anim.tickers = anim.tickers || [];
      anim.tickers.push((dt, t) => {
        const k = (t % 12) / 12;                                                              // one cycle every 12 s
        const tip = k < 0.85 ? -0.25 + k * 0.12 : k < 0.9 ? -0.15 - (k - 0.85) / 0.05 * 0.45 : -0.6 + (k - 0.9) / 0.1 * 0.35;
        pivot.rotation.z = -tip;
      });
    }
    // -- zen rock garden (raked gravel, three rocks, moss)
    const zx0 = -7.0, zx1 = 0.0, zz0 = -6.9, zz1 = -3.7;
    box(p, zx1 - zx0 + 0.3, 0.12, zz1 - zz0 + 0.3, charcoal, (zx0 + zx1) / 2, 0, (zz0 + zz1) / 2, { cast: false });   // timber edge
    box(p, zx1 - zx0, 0.13, zz1 - zz0, '#e7e2d6', (zx0 + zx1) / 2, 0, (zz0 + zz1) / 2, { cast: false });
    for (let z = zz0 + 0.25; z < zz1; z += 0.28) box(p, zx1 - zx0 - 0.2, 0.012, 0.03, '#cfc8b8', (zx0 + zx1) / 2, 0.13, z, { cast: false }); // raked lines
    for (const [rx, rz, r] of [[-5.3, -5.5, 0.55], [-2.4, -4.6, 0.4], [-1.0, -6.0, 0.32]]) {
      for (let ring = 1; ring <= 3; ring++) {                                          // raked rings round each rock
        const ringM = new THREE.Mesh(new THREE.TorusGeometry(r + ring * 0.22, 0.015, 4, 28), mat('#cfc8b8'));
        ringM.rotation.x = Math.PI / 2; ringM.position.set(rx, 0.135, rz); p.add(ringM);
      }
      sphere(p, r + 0.06, '#7f9a5a', rx, 0.13, rz, { s: [1.2, 0.25, 1.1], cast: false });                     // moss
      sphere(p, r, '#6f6a62', rx, 0.13 + r * 0.45, rz, { s: [1.1, 0.9, 0.9] });
    }
    // -- tea pavilion (azumaya) with tatami, low table and cushions
    const tp = grp(p, -6.0, 0, 3.6);
    box(tp, 3.6, 0.35, 3.6, '#6b4a33', 0, 0, 0);                                      // raised floor
    box(tp, 3.3, 0.04, 3.3, '#d9cf9c', 0, 0.35, 0);                                   // tatami
    for (let i = 0; i < 3; i++) box(tp, 0.03, 0.045, 3.3, '#a89a62', -0.55 + i * 0.55, 0.35, 0);
    for (const [px, pz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) box(tp, 0.16, 2.6, 0.16, '#4a3020', px, 0.35, pz);
    cyl(tp, 3.0, 0.9, charcoal, 0, 2.95, 0, { top: 0.12, bottom: 1, seg: 4, ry: Math.PI / 4 });   // pyramid roof
    box(tp, 4.3, 0.08, 4.3, charcoal, 0, 2.9, 0);                                     // wide eaves
    sphere(tp, 0.12, '#c9a24a', 0, 3.9, 0, { metalness: 0.6, roughness: 0.3 });     // roof finial
    box(tp, 1.3, 0.28, 0.8, '#3d2b1f', 0, 0.39, 0);                                   // low table
    cyl(tp, 0.07, 0.1, '#f4ede2', -0.3, 0.67, 0, { seg: 10 });                         // tea cups + pot
    cyl(tp, 0.07, 0.1, '#f4ede2', 0.3, 0.67, 0, { seg: 10 });
    sphere(tp, 0.12, '#5c6b4a', 0, 0.75, -0.15, { s: [1, 0.8, 1] });
    for (const [cx, cz] of [[-0.95, 0], [0.95, 0], [0, -0.75], [0, 0.75]]) box(tp, 0.55, 0.08, 0.55, '#a8442e', cx, 0.39, cz);    // zabuton cushions
    const chochinTP = mat('#f4ede2', { emissive: '#ffcf80', emissiveIntensity: 0.5 });
    for (const [lx, lz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) cyl(tp, 0.14, 0.32, chochinTP, lx, 2.45, lz, { seg: 12, cast: false });
    // -- nodate: red parasol over a low red bench
    const nd = grp(p, 7.3, 0, -4.2);
    box(nd, 1.9, 0.42, 0.55, '#6b4a33', 0, 0, 0);
    box(nd, 1.95, 0.05, 0.6, vermilion, 0, 0.42, 0);                                  // red felt (mōsen)
    cyl(nd, 0.03, 2.6, '#6b4a33', 0, 0, -0.45, { seg: 6 });
    cyl(nd, 1.5, 0.45, vermilion, 0, 2.4, -0.45, { top: 0.03, bottom: 1, seg: 16 });
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; box(nd, 0.02, 0.02, 1.5, '#e8d6b8', Math.sin(a) * 0.75, 2.62, -0.45 + Math.cos(a) * 0.75, { ry: a }); }
    // -- trees: sakura (cherry blossom), sculpted pines, bamboo
    sakuraTree(p, 8.3, 5.6); sakuraTree(p, -3.1, 5.6, 0.9); sakuraTree(p, -9.5, -5.6); sakuraTree(p, 2.4, -4.3, 0.8);
    // -- hinoki hot-spring tub at the back, facing Mt Fuji (steam rises: see anim.tickers)
    const tub = grp(p, 4.4, 0, -5.6);
    box(tub, 1.9, 0.12, 1.4, '#7d786f', 0, 0, 0);                                     // stone base
    box(tub, 1.8, 0.62, 1.3, '#e3c58f', 0, 0.12, 0);                                  // hinoki tub
    for (const by of [0.22, 0.58]) box(tub, 1.84, 0.05, 1.34, '#8a5f3c', 0, by, 0, { cast: false });   // bands
    box(tub, 1.6, 0.02, 1.1, mat('#8fd0d8', { transparent: true, opacity: 0.85, roughness: 0.05, emissive: '#7fc8d0', emissiveIntensity: 0.15 }), 0, 0.68, 0, { cast: false });
    box(tub, 1.8, 0.35, 0.1, '#e3c58f', 0, 0.74, 0.6);                                 // backrest (you lean back and face Fuji)
    box(tub, 0.9, 0.18, 0.4, '#c99a63', 0.2, 0, 0.95);                                 // step
    cyl(tub, 0.13, 0.18, '#e3c58f', -0.75, 0.74, -0.45, { seg: 12 });                  // wooden bucket
    box(tub, 0.2, 0.03, 0.12, '#f4efe4', -0.45, 0.74, -0.5, { cast: false });         // folded towel
    const steam = Array.from({ length: 6 }, (_, i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, depthWrite: false }));
      m.userData.dynamic = true;
      p.add(m);
      return { m, ph: i / 6 };
    });
    anim.tickers = anim.tickers || [];
    anim.tickers.push((dt, t) => {
      for (const q of steam) {
        const k = (t * 0.12 + q.ph) % 1;
        q.m.position.set(4.4 - 0.5 + (q.ph * 7) % 1, 0.75 + k * 1.6, -5.6 - 0.3 + Math.sin(t + q.ph * 9) * 0.25);
        q.m.scale.setScalar(0.12 + k * 0.35);
        q.m.material.opacity = 0.22 * (1 - k);
      }
    });
    const pine = (x, z, sc = 1) => {
      const t = grp(p, x, 0, z); t.scale.setScalar(sc);
      cyl(t, 0.4, 0.35, charcoal, 0, 0, 0, { seg: 10 });
      cyl(t, 0.1, 1.6, '#4a3020', 0, 0.35, 0, { top: 0.6, seg: 6, rz: -0.25 });
      for (const [bx, by, bz, r] of [[0.45, 1.95, 0, 0.6], [-0.35, 1.5, 0.2, 0.5], [0.1, 2.35, -0.1, 0.42], [-0.6, 2.0, -0.3, 0.38]]) sphere(t, r, '#3f6b3a', bx, by, bz, { s: [1.5, 0.45, 1.2] });   // flat cloud-pruned pads
    };
    pine(-10.3, 5.6); pine(-0.8, -3.0, 0.8); pine(-8.6, -2.3, 0.75);
    const bamboo = (x, z) => {
      for (let i = 0; i < 9; i++) {
        const bx = x + Math.sin(i * 2.4) * 0.35, bz = z + Math.cos(i * 2.4) * 0.35, h = 2.6 + (i % 3) * 0.5;
        cyl(p, 0.035, h, '#7f9f45', bx, 0, bz, { seg: 6 });
        sphere(p, 0.22, '#6aa84f', bx, h, bz, { s: [1, 1.6, 1] });
      }
    };
    bamboo(8.6, -6.6); bamboo(-10.9, 3.2);
    // -- paper lanterns (chochin) on lines across the garden, replacing the string lights
    const poles = [[-11.0, -0.4], [8.6, -0.4], [8.6, 6.4], [-11.0, 6.4]];
    for (const [px, pz] of poles) cyl(p, 0.06, 3.0, '#4a3020', px, 0, pz, { seg: 6 });
    const redL = mat('#d23a2e', { emissive: '#ff6a3a', emissiveIntensity: 0.55 }), whiteL = mat('#f4ede2', { emissive: '#ffcf80', emissiveIntensity: 0.6 });
    for (let k = 0; k < 4; k++) {
      const [ax, az] = poles[k], [bx, bz] = poles[(k + 1) % 4];
      const n = Math.round(Math.hypot(bx - ax, bz - az) / 1.5);
      for (let i = 1; i < n; i++) {
        const t = i / n, sag = Math.sin(t * Math.PI) * 0.4, lx = ax + (bx - ax) * t, lz = az + (bz - az) * t;
        cyl(p, 0.012, 0.2, '#2b2a2c', lx, 2.75 - sag, lz, { seg: 4, cast: false });
        cyl(p, 0.13, 0.3, i % 2 ? redL : whiteL, lx, 2.45 - sag, lz, { top: 0.85, bottom: 0.85, seg: 12, cast: false });
      }
    }
    // -- planters along the front and back edges: low beds with clipped shrubs and azaleas
    for (let i = 0; i < 11; i++) flowerPlanter(p, -11.2 + i * 1.7, 7.3, i, true);
    for (let i = 0; i < 11; i++) flowerPlanter(p, -10.0 + i * 1.7, -7.35, i + 5, true);
    plant(p, 8.8, 2.5, { tall: true, s: 1.2 });                                        // the one the cleaners water
  }
  void anim;
}
