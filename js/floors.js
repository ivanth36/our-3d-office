// Contents of each floor. All coordinates are local to the floor (y=0 = floor).
// Rooms live in x -12..9.6, z -8..8 (front/street = +Z).
import * as THREE from 'three';
import {
  CEIL, box, cyl, sphere, grp, mat, glowMat, glassMat, canvasTex, panel, roundRect,
  plankTex, carpetTex, tileTex, floorSurface, faceTo,
} from './helpers.js';
import {
  C, chair, stool, roundTable, rectTable, sofa, plant, pendant, floorLamp, rug,
  bookshelf, frame, glassWall, monitor, laptop, officeChair,
} from './furniture.js';
import { employee } from './characters.js';
import { roamingJoe } from './joe.js';
import { CORE_X } from './building.js';

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

const RW = CORE_X + 12, RX = (CORE_X - 12) / 2; // room floor width / centre x

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

  // ---- round tables (chairs face inward)
  const tables = [[-1.2, -2.0], [2.8, -2.0], [6.6, -2.0], [0.6, 1.8], [4.6, 1.8], [2.6, 5.4]];
  tables.forEach(([x, z], i) => roundTable(p, x, z, { chairs: i % 2 ? 3 : 4, start: i % 2 ? 0.3 : Math.PI / 4, chair: { seat: i % 2 ? C.sage : C.fabric } }));
  for (const [x, z] of tables) pendant(p, x, z, { shade: '#c8935a' });

  // ---- cozy sofa corner (back-left)
  rug(p, -9.0, -5.0, 5.0, 4.2, '#efe2c8', '#b88a58');
  sofa(p, -9.0, -7.25, 4.0, 0, { color: '#8fae84', cushion: '#a9c49c', pillow: '#f1d08a' });
  sofa(p, -11.25, -4.4, 3.0, Math.PI / 2, { color: '#8fae84', cushion: '#a9c49c', pillow: '#f1d08a' });
  rectTable(p, -8.8, -4.8, 1.6, 0.9, { h: 0.4, top: C.woodLight });
  cyl(p, 0.1, 0.12, C.white, -8.6, 0.47, -4.8, { seg: 10 });
  floorLamp(p, -6.6, -7.2);
  plant(p, -11.3, -7.3, { tall: true });
  frame(p, -8.5, 2.0, -7.68, 1.0, 0.8, 0, '#97b88f');

  // ---- long communal table with bench along the back wall
  const lt = rectTable(p, 1.6, -5.9, 7.2, 1.0, { top: C.woodLight });
  box(p, 7.2, 0.45, 0.45, C.woodDark, 1.6, 0, -7.25);           // bench
  box(p, 7.2, 0.08, 0.5, '#d9c3a0', 1.6, 0.45, -7.25);
  box(p, 7.2, 0.5, 0.1, '#d9c3a0', 1.6, 0.5, -7.55);            // bench back cushion
  for (let i = 0; i < 6; i++) chair(p, -1.4 + i * 1.2, -4.95, Math.PI, { seat: C.sage });
  for (let i = 0; i < 4; i++) pendant(p, -1.0 + i * 1.75, -5.9, { drop: 1.2 });
  void lt;

  // plaque used under Joe's framed portrait
  const plaque = canvasTex(256, 64, (ctx, w, h) => { ctx.fillStyle = '#e8b84a'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#4a3020'; ctx.font = 'bold 34px Georgia, serif'; ctx.fillText('JOE  ♥', 70, 44); });

  // ---- framed portrait of Joe on the café's left wall (by the sofa corner)
  const pf = grp(p, -11.7, 1.4, -4.5, Math.PI / 2);
  box(pf, 1.12, 1.12, 0.06, '#5c3d26', 0, 0, 0.03, { cast: false });           // frame
  box(pf, 0.98, 0.98, 0.02, '#f6eedf', 0, 0.07, 0.06, { cast: false });         // cream mat
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.86 * JOE_ASPECT, 0.86), joePhotoMat());
  pic.position.set(0, 0.56, 0.075);
  pf.add(pic);
  box(pf, 0.5, 0.03, 0.08, '#c9a24a', 0, 1.2, 0.08, { cast: false, metalness: 0.6, roughness: 0.3 }); // picture light
  box(pf, 0.44, 0.015, 0.05, glowMat('#fff1c8'), 0, 1.185, 0.1, { cast: false });
  panel(pf, 0.42, 0.1, plaque, 0, -0.12, 0.04);

  // ---- plants
  for (const [x, z] of [[-3.6, 7.2], [8.8, 7.3], [8.8, -7.3], [-3.2, -7.3], [-11.3, 0.2]]) plant(p, x, z, { tall: (x * z) % 2 > 0 });

  // ---- façade: fascia sign, awning, mascot
  box(p, 24, 0.55, 0.25, '#f1e0c3', 0, CEIL - 0.55, 7.95, { cast: false });
  box(p, 4.0, 1.05, 0.2, '#5c3d26', -1.5, 2.67, 7.98, { cast: false });
  panel(p, 3.9, 0.975, cafeSignTex(), -1.5, 3.195, 8.09, { glow: 0.25 });
  // striped awning over the counter
  const aw = grp(p, -7.8, 2.85, 8.35);
  for (let i = 0; i < 12; i++) box(aw, 0.5, 0.05, 1.0, i % 2 ? C.white : '#4f7d4a', -2.75 + i * 0.5, 0, 0, { rx: 0.35, cast: false });
  // hanging round mascot sign by the door
  const ms = canvasTex(256, 256, (ctx, w, h) => { ctx.fillStyle = '#f6edd8'; ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#5c3d26'; ctx.lineWidth = 10; ctx.stroke(); drawDogFace(ctx, 128, 118, 70); });
  box(p, 0.06, 0.06, 0.9, C.black, 4.5, 2.95, 8.4, { cast: false });
  cyl(p, 0.6, 0.06, '#5c3d26', 4.5, 2.25, 8.75, { rx: Math.PI / 2, seg: 24 });
  panel(p, 1.1, 1.1, ms, 4.5, 2.25, 8.79);
  panel(p, 1.1, 1.1, ms, 4.5, 2.25, 8.71, { ry: Math.PI });
  // outdoor bistro tables on the sidewalk
  roundTable(p, 1.0, 9.6, { r: 0.45, chairs: 2, start: Math.PI / 2, vase: false });
  roundTable(p, 6.0, 9.6, { r: 0.45, chairs: 2, start: Math.PI / 2, vase: false });
  // ---- the real Joe, roaming around his café
  anim.joe = roamingJoe(p);
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

export function floor2(p) {
  floorSurface(p, RW, 16, RX, 0, plankTex('#d9ae7a', '#b8875a'), 3);

  // ================= LIVING ROOM (back-left, x -11.7..-1, z -7.7..1) =================
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
  frame(p, LEFT_IN + 0.02, 2.0, -3.9, 2.0, 1.1, Math.PI / 2, '#c96f4a');

  // ================= GLASS MUSIC ROOM (front-left, x -11.7..-3.4, z 1.8..7.75) =================
  const mx0 = LEFT_IN, mx1 = -3.4, mz0 = 1.8, mz1 = 7.75;
  box(p, mx1 - mx0, 0.03, mz1 - mz0, '#7d5a43', (mx0 + mx1) / 2, 0.02, (mz0 + mz1) / 2, { cast: false });
  glassWall(p, mx0, mz0, mx1, mz0, CEIL, { gap: [6.6, 7.6] });   // back side, door near the right
  glassWall(p, mx1, mz0, mx1, mz1, CEIL);
  glassWall(p, mx0, mz1, mx1, mz1, CEIL);                         // front (street side)
  const cdCols = ['#d94f3d', '#3e6b9a', '#f1c84b', '#2b2a2c', '#7ab87a', '#e8e1d0', '#9b59b6', '#f08a5d'];
  const cd = { bookColors: cdCols, bookW: 0.035, bookH: 0.16, rows: 7, color: '#3d2b1f' };
  bookshelf(p, LEFT_IN + 0.22, 5.2, 4.6, 2.9, Math.PI / 2, cd);   // CD wall
  // hi-fi: console + turntable + amp + tall speakers along the back glass (left half)
  box(p, 2.4, 0.6, 0.5, C.woodDark, -9.3, 0, 2.3);
  box(p, 0.8, 0.12, 0.4, '#c9ccd0', -9.8, 0.6, 2.3, { metalness: 0.5, roughness: 0.4 });
  box(p, 0.6, 0.08, 0.45, C.black, -8.8, 0.6, 2.3);
  cyl(p, 0.2, 0.02, '#1a1a1a', -8.8, 0.68, 2.3, { seg: 20 });
  for (const sx of [-10.9, -7.7]) {
    box(p, 0.5, 1.2, 0.45, '#2b2a2c', sx, 0, 2.3);
    cyl(p, 0.16, 0.03, '#555', sx, 0.75, 2.53, { rx: Math.PI / 2, seg: 14 });
    cyl(p, 0.09, 0.03, '#555', sx, 1.0, 2.53, { rx: Math.PI / 2, seg: 12 });
  }
  // lounge chair + ottoman facing the speakers
  const lc = grp(p, -9.3, 0, 4.6, Math.PI);
  box(lc, 0.9, 0.35, 0.85, C.woodDark, 0, 0.0, 0);
  box(lc, 0.82, 0.18, 0.78, '#3b2a20', 0, 0.35, 0.02);
  box(lc, 0.82, 0.9, 0.2, '#3b2a20', 0, 0.45, -0.4, { rx: -0.25 });
  cyl(p, 0.3, 0.35, '#3b2a20', -9.3, 0, 3.55, { seg: 14 });
  floorLamp(p, -10.9, 7.2);
  // music production desk with computer (right half, against the back glass)
  rectTable(p, -5.4, 2.35, 2.8, 0.8, { top: '#2b2a2c', leg: C.black });
  monitor(p, -5.85, 0.79, 2.25, 0);
  monitor(p, -4.95, 0.79, 2.25, 0);
  box(p, 0.9, 0.04, 0.25, '#1f1f22', -5.4, 0.79, 2.6);                                   // MIDI controller
  for (let i = 0; i < 8; i++) box(p, 0.06, 0.02, 0.06, '#f1c84b', -5.75 + i * 0.1, 0.83, 2.53);
  for (const sx of [-6.6, -4.2]) { box(p, 0.25, 0.4, 0.25, '#2b2a2c', sx, 0.79, 2.25); cyl(p, 0.07, 0.02, '#777', sx, 1.0, 2.38, { rx: Math.PI / 2, seg: 10 }); }
  officeChair(p, -5.4, 3.25, Math.PI);
  // keyboard on stand along the right glass
  keyboardOnStand(p, -4.0, 4.6, -Math.PI / 2);
  // drum kit at the front, drummer facing the street
  rug(p, -6.6, 6.2, 2.6, 2.4, '#5c3d26', '#3d2b1f');
  drumKit(p, -6.6, 6.5, 0);
  pendant(p, -9.3, 4.0, { drop: 0.7, shade: '#2f3a2c' });
  pendant(p, -5.4, 3.0, { drop: 0.7, shade: '#2f3a2c' });
  const sign = canvasTex(512, 96, (ctx) => { ctx.fillStyle = '#2f3a2c'; ctx.font = 'bold 56px -apple-system, sans-serif'; ctx.fillText('♪ Music Room', 40, 68); });
  panel(p, 1.9, 0.36, sign, -9.0, 3.1, mz0 + 0.04, { transparent: true });
  panel(p, 1.9, 0.36, sign, -9.0, 3.1, mz0 - 0.04, { transparent: true, ry: Math.PI });

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
  plant(p, -2.7, 7.2, { tall: true });
  plant(p, 8.8, 7.2, { tall: true });
  plant(p, 8.8, 0.0);
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

  // ---- AI employees on this floor
  employees.filter((e) => e.floor === n).forEach((e) => {
    const s = seat(e.seat ?? 0);
    anim.people.push(employee(p, s.x, s.z, s.ry, e));
  });

  // ---- glass meeting room (back-right)
  const rx0 = 1.6, rx1 = 9.3, rz1 = -2.4;
  box(p, rx1 - rx0, 0.03, 8 + rz1, '#cdbfa8', (rx0 + rx1) / 2, 0.02, (-8 + rz1) / 2, { cast: false });
  glassWall(p, rx0, rz1, rx1, rz1, CEIL, { gap: [0.5, 1.5] });
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
  const label = canvasTex(512, 96, (ctx) => { ctx.fillStyle = '#2f3a2c'; ctx.font = 'bold 54px -apple-system, sans-serif'; ctx.fillText(n === 3 ? 'Meeting Room A' : 'Meeting Room B', 20, 68); });
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
}

// ---------------------------------------------------------------- Floor 5 (roof)
export function floor5(p, anim) {
  floorSurface(p, RW, 16, RX, 0, plankTex('#c39a6b', '#9b7450'), 2);
  // grass patches
  box(p, 7.0, 0.05, 3.0, '#7fae5a', 4.5, 0.02, 6.0, { cast: false });
  box(p, 3.5, 0.05, 4.5, '#7fae5a', -0.2, 0.02, -5.5, { cast: false });

  // ---- glass gym (back-left)
  const gx0 = -11.8, gx1 = -2.4, gz0 = -7.8, gz1 = -0.6, gh = 3.0;
  box(p, gx1 - gx0, 0.04, gz1 - gz0, '#7d838b', (gx0 + gx1) / 2, 0.02, (gz0 + gz1) / 2, { cast: false });
  glassWall(p, gx0, gz1, gx1, gz1, gh, { gap: [7.6, 8.8] });
  glassWall(p, gx1, gz0, gx1, gz1, gh);
  glassWall(p, gx0, gz0, gx1, gz0, gh);
  glassWall(p, gx0, gz0, gx0, gz1, gh);
  // pergola beams on top (open roof so you can see in)
  for (let i = 0; i <= 6; i++) box(p, 0.08, 0.1, gz1 - gz0, C.black, gx0 + i * (gx1 - gx0) / 6, gh, (gz0 + gz1) / 2, { cast: false });
  // treadmills facing the view (+z)
  for (const tx of [-10.6, -9.0]) {
    const t = grp(p, tx, 0, -6.4);
    box(t, 0.8, 0.2, 1.9, '#2b2a2c', 0, 0, 0);
    box(t, 0.6, 0.03, 1.7, '#4a4a4f', 0, 0.2, 0);
    box(t, 0.05, 1.1, 0.05, C.metal, -0.35, 0.2, 0.85);
    box(t, 0.05, 1.1, 0.05, C.metal, 0.35, 0.2, 0.85);
    box(t, 0.8, 0.35, 0.15, '#2b2a2c', 0, 1.25, 0.9, { rx: -0.4 });
    box(t, 0.5, 0.25, 0.02, mat('#7fd0c0', { emissive: '#4fb0a0', emissiveIntensity: 0.6 }), 0, 1.3, 0.97, { rx: -0.4, cast: false });
  }
  // dumbbell rack
  const rk = grp(p, -6.6, 0, -7.4);
  box(rk, 2.0, 0.08, 0.5, C.black, 0, 0.4, 0); box(rk, 2.0, 0.08, 0.5, C.black, 0, 0.8, 0);
  for (const lx of [-0.95, 0.95]) box(rk, 0.06, 0.9, 0.5, C.black, lx, 0, 0);
  for (let i = 0; i < 6; i++) for (const ly of [0.48, 0.88]) {
    cyl(rk, 0.06 + i * 0.008, 0.08, '#555a60', -0.75 + i * 0.3 - 0.07, ly + 0.07, 0, { rz: Math.PI / 2, seg: 8 });
    cyl(rk, 0.06 + i * 0.008, 0.08, '#555a60', -0.75 + i * 0.3 + 0.07, ly + 0.07, 0, { rz: Math.PI / 2, seg: 8 });
  }
  // weight bench + barbell
  const wb = grp(p, -5.0, 0, -4.6, Math.PI / 2);
  box(wb, 0.35, 0.42, 1.3, C.black, 0, 0, 0);
  box(wb, 0.4, 0.1, 1.3, '#7a3b3b', 0, 0.42, 0);
  for (const lx of [-0.5, 0.5]) box(wb, 0.05, 1.1, 0.05, C.metal, lx, 0, -0.55);
  cyl(wb, 0.025, 1.8, C.metal, 0, 1.08, -0.55, { rz: Math.PI / 2, seg: 6 });
  for (const lx of [-0.8, 0.8]) cyl(wb, 0.2, 0.08, '#2b2a2c', lx, 1.08, -0.55, { rz: Math.PI / 2, seg: 14 });
  // yoga mats + exercise ball + mirror
  ['#a98bd6', '#7fc4b4', '#f0a3a3'].forEach((c, i) => box(p, 0.65, 0.025, 1.8, c, -10.6 + i * 1.0, 0.03, -2.2, { cast: false }));
  sphere(p, 0.33, '#8f5fd6', -7.0, 0.36, -1.6);
  box(p, 0.05, 2.2, 4.0, mat('#dfeff5', { roughness: 0.05, metalness: 0.6 }), gx0 + 0.12, 0.2, -4.2, { cast: false });
  plant(p, -3.0, -1.2);

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
  // sun loungers
  for (const lx of [-4.0, -2.2]) {
    const l = grp(p, lx, 0, 5.6);
    box(l, 0.7, 0.3, 1.8, C.wood, 0, 0, 0);
    box(l, 0.66, 0.08, 1.2, C.white, 0, 0.3, 0.25);
    box(l, 0.66, 0.08, 0.7, C.white, 0, 0.45, -0.6, { rx: -0.6 });
  }
  // planters along the edges
  for (let i = 0; i < 6; i++) {
    const px = -1.2 + i * 1.7;
    box(p, 1.4, 0.5, 0.7, C.woodDark, px, 0, 7.3);
    sphere(p, 0.45, i % 2 ? C.leaf : C.leaf2, px, 0.75, 7.3, { s: [1.4, 0.8, 0.8] });
  }
  for (const [px, pz] of [[8.8, -1.0], [8.8, 2.5], [-1.4, -7.3], [-11.2, 7.0], [-8.0, 7.0], [8.8, 5.0]]) plant(p, px, pz, { tall: true, s: 1.2 });
  // a small tree
  cyl(p, 0.5, 0.6, C.woodDark, -9.6, 0, 3.4, { seg: 10 });
  cyl(p, 0.08, 1.6, '#6b4126', -9.6, 0.6, 3.4, { seg: 6 });
  sphere(p, 0.9, C.leaf, -9.6, 2.6, 3.4, { s: [1, 0.9, 1] });
  sphere(p, 0.6, C.leaf2, -9.1, 2.3, 3.7);
  // string lights between four poles
  const poles = [[-1.4, -0.4], [8.6, -0.4], [8.6, 6.4], [-1.4, 6.4]];
  for (const [px, pz] of poles) cyl(p, 0.05, 3.0, C.black, px, 0, pz, { seg: 6 });
  const bulb = glowMat('#ffd27a');
  for (let k = 0; k < 4; k++) {
    const [ax, az] = poles[k], [bx, bz] = poles[(k + 1) % 4];
    const n = 14;
    for (let i = 1; i < n; i++) {
      const t = i / n, sag = Math.sin(t * Math.PI) * 0.45;
      sphere(p, 0.06, bulb, ax + (bx - ax) * t, 2.95 - sag, az + (bz - az) * t, { cast: false });
    }
  }
  // roof-top lift lobby sign
  void anim;
}
