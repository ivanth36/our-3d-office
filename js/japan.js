// Japanese props shared by all floors: lanterns, trees, noren, kanban sign, tatami, shoji,
// daruma, cushions… Everything glowing uses emissive materials (no real lights) so it runs
// smoothly on iPhone; js/env.js brightens them at night.
import * as THREE from 'three';
import { box, cyl, sphere, grp, mat, glowMat, registerGlow, canvasTex, panel, roundRect, nightMat } from './helpers.js';

// ---------------------------------------------------------------- seasonal materials
// Tree canopies / fallen petals share these materials; js/env.js recolours them by season
// (sakura in spring, green in summer, momiji in autumn, snow-dusted in winter).
const seasonCache = new Map();
export const SEASON_MATS = { blossom: [], petal: [], momiji: [] };
export function seasonMat(kind, i = 0) {
  const key = `${kind}${i}`;
  let m = seasonCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: '#f4b3c5', roughness: 0.9 });
    m.userData.variant = i;
    seasonCache.set(key, m);
    SEASON_MATS[kind].push(m);
  }
  return m;
}

// ---------------------------------------------------------------- the café logo (assets/joe-logo.png)
let logoImg = null;
/** Promise of the logo image (loaded once). */
export function logoImage() {
  if (!logoImg) {
    logoImg = new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = 'assets/joe-logo.png';
    });
  }
  return logoImg;
}
/** Canvas texture drawn twice: now without the logo, again once the logo has loaded. */
export function logoCanvasTex(w, h, draw) {
  const tex = canvasTex(w, h, (ctx) => draw(ctx, w, h, null));
  logoImage().then((im) => {
    if (!im) return;
    const ctx = tex.image.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h, im);
    tex.needsUpdate = true;
  });
  return tex;
}

/** Dark wooden shop sign (kanban) with the logo and the café name. 1024 x 256. */
export function kanbanTex() {
  return logoCanvasTex(1024, 256, (ctx, w, h, logo) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3a2518'); g.addColorStop(1, '#24170f');
    ctx.fillStyle = g; roundRect(ctx, 0, 0, w, h, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;               // wood grain
    for (let y = 12; y < h; y += 9) { ctx.beginPath(); ctx.moveTo(0, y + Math.sin(y) * 2); ctx.bezierCurveTo(w * 0.3, y + 4, w * 0.6, y - 4, w, y + Math.cos(y) * 2); ctx.stroke(); }
    ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 6; roundRect(ctx, 12, 12, w - 24, h - 24, 12); ctx.stroke();
    if (logo) ctx.drawImage(logo, 30, 18, 222, 222);
    ctx.fillStyle = '#f3e3c3';
    ctx.font = 'bold 112px Georgia, "Times New Roman", serif';
    ctx.textBaseline = 'middle';
    ctx.fillText("Joe's Café", 270, 106);
    ctx.font = '600 42px -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = '#cfe3b0';
    ctx.fillText('MATCHA  ·  COFFEE  ·  TREATS', 276, 194);
    ctx.fillStyle = '#c8352a'; ctx.fillRect(w - 92, 40, 52, 176);                  // red seal with 茶 (tea)
    ctx.fillStyle = '#f3e3c3'; ctx.font = 'bold 44px "Hiragino Mincho ProN", "Yu Mincho", serif';
    ctx.fillText('茶', w - 88, 88); ctx.fillText('屋', w - 88, 168);
  });
}

/** Indigo noren curtain with the café logo, split into strips. Faces +Z. */
export function noren(p, x, y, z, w = 2.4, h = 1.25, o = {}) {
  const strips = o.strips ?? 3, col = o.color ?? '#1f3556';
  const tex = logoCanvasTex(768, 400, (ctx, cw, ch, logo) => {
    ctx.fillStyle = col; ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < cw; i += 24) ctx.fillRect(i, 0, 2, ch);                   // cloth weave
    if (logo) {
      ctx.fillStyle = '#f6efe2'; ctx.beginPath(); ctx.arc(cw / 2, ch * 0.47, ch * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(logo, cw / 2 - ch * 0.33, ch * 0.47 - ch * 0.33, ch * 0.66, ch * 0.66);
    }
    ctx.fillStyle = '#f6efe2'; ctx.font = 'bold 40px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(o.text ?? "Joe's Café", cw / 2, ch - 22);
  });
  const g = grp(p, x, y, z);
  box(g, w + 0.3, 0.06, 0.06, '#3d2618', 0, 0.02, 0);                             // hanging rod
  const sw = w / strips;
  for (let i = 0; i < strips; i++) {
    const t = tex.clone(); t.needsUpdate = true;
    t.repeat.set(1 / strips, 1); t.offset.set(i / strips, 0);
    tex.addEventListener?.('dispose', () => t.dispose());
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sw - 0.03, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, side: THREE.DoubleSide }));
    m.position.set(-w / 2 + sw * (i + 0.5), -h / 2, 0);
    m.userData.dynamic = true;                                                     // keep its own texture slice
    g.add(m);
    logoImage().then(() => { t.needsUpdate = true; });
  }
  return g;
}

// ---------------------------------------------------------------- night lighting (no real lights)
/** Soft pool of light on the ground (night only). */
export function lightPool(p, x, y, z, r = 0.7, o = {}) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), nightMat(o.color ?? '#ffd590', o.opacity ?? 0.22));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.025, z);
  p.add(m);
  return m;
}
const _up = new THREE.Vector3(0, 1, 0);
/** Spotlight beam: a faint cone of light from (x,y,z) to (tx,ty,tz), with a lamp and a pool where it lands (night only). */
export function spotBeam(p, x, y, z, tx, ty, tz, o = {}) {
  const dir = new THREE.Vector3(tx - x, ty - y, tz - z), len = dir.length();
  const geo = new THREE.CylinderGeometry(o.r0 ?? 0.08, o.r1 ?? 1.0, len, 20, 1, true);
  geo.translate(0, len / 2, 0);
  const cone = new THREE.Mesh(geo, nightMat(o.color ?? '#fff0cc', o.opacity ?? 0.09));
  cone.position.set(x, y, z);
  cone.quaternion.setFromUnitVectors(_up, dir.normalize());
  p.add(cone);
  // the lamp itself: a small dark can with a glowing face
  const lamp = grp(p, x, y, z);
  const can = cyl(lamp, 0.09, 0.16, '#2b2a2c', 0, -0.08, 0, { seg: 10, cast: false });
  const face = cyl(lamp, 0.075, 0.01, glowMat('#fff3d0', 0.8), 0, 0.08, 0, { seg: 10, cast: false });
  lamp.quaternion.setFromUnitVectors(_up, dir);
  void can; void face;
  if (o.pool !== false) lightPool(p, tx, o.poolY ?? ty, tz, o.poolR ?? (o.r1 ?? 1.0) * 0.9, { opacity: 0.16 });
  return cone;
}

// ---------------------------------------------------------------- lanterns
/** Hanging paper lantern (chōchin). top = ceiling height, drop = cord length. */
export function chochin(p, x, z, o = {}) {
  const top = o.top ?? 4.5, drop = o.drop ?? 1.0, r = o.r ?? 0.18, h = o.h ?? 0.42;
  const red = o.color === 'red';
  const m = red ? glowMat('#d8402e', 0.6) : glowMat('#f6e6c8', 0.75);
  cyl(p, 0.008, drop, '#2b2a2c', x, top - drop, z, { seg: 4, cast: false });
  cyl(p, r * 0.7, 0.05, '#1b1b1e', x, top - drop - 0.05, z, { seg: 10, cast: false });
  const l = cyl(p, r, h, m, x, top - drop - 0.05 - h, z, { top: 0.82, bottom: 0.82, seg: 14, cast: false });
  l.scale.x = l.scale.z = r * 1.15;                                                 // fuller in the middle
  sphere(p, r * 1.05, m, x, top - drop - 0.05 - h / 2, z, { s: [1, h / r / 2.2, 1], cast: false });
  cyl(p, r * 0.7, 0.05, '#1b1b1e', x, top - drop - h - 0.12, z, { seg: 10, cast: false });
}
/** Tall cylindrical paper floor lantern (andon) along walkways. */
export function floorLantern(p, x, z, o = {}) {
  const h = o.h ?? 0.9, y = o.y ?? 0;
  cyl(p, 0.17, 0.05, '#2b1d14', x, y, z, { seg: 12 });
  cyl(p, 0.14, h, glowMat('#fbecc8', 0.85), x, y + 0.05, z, { seg: 14, cast: false });
  for (const fy of [0.05, h + 0.02]) cyl(p, 0.15, 0.04, '#2b1d14', x, y + fy, z, { seg: 12, cast: false });
  if (o.pool !== false) lightPool(p, x, y, z, 0.75);
}
/** Stone lantern (tōrō). */
export function stoneLantern(p, x, z, sc = 1, y = 0) {
  const stone = '#9a958c', stoneD = '#7d786f';
  const t = grp(p, x, y, z); t.scale.setScalar(sc);
  cyl(t, 0.32, 0.12, stoneD, 0, 0, 0, { seg: 6 });
  cyl(t, 0.09, 0.6, stone, 0, 0.12, 0, { seg: 8 });
  box(t, 0.4, 0.08, 0.4, stoneD, 0, 0.72, 0);
  box(t, 0.3, 0.26, 0.3, '#b5afa5', 0, 0.8, 0);
  box(t, 0.18, 0.12, 0.32, glowMat('#ffd27a'), 0, 0.86, 0, { cast: false });
  box(t, 0.32, 0.12, 0.18, glowMat('#ffd27a'), 0, 0.86, 0, { cast: false });
  cyl(t, 0.36, 0.22, stoneD, 0, 1.06, 0, { top: 0.25, bottom: 1, seg: 6 });
  sphere(t, 0.07, stone, 0, 1.33, 0);
  lightPool(t, 0, 0, 0, 0.9, { opacity: 0.18 });
  return t;
}

// ---------------------------------------------------------------- trees & plants
/** Cherry tree: blossoms follow the season (see SEASON_MATS). */
export function sakuraTree(p, x, z, sc = 1, o = {}) {
  const t = grp(p, x, o.y ?? 0, z); t.scale.setScalar(sc);
  if (o.planter !== false) cyl(t, 0.45, 0.4, '#2e2b29', 0, 0, 0, { seg: 10 });
  cyl(t, 0.12, 1.8, '#5a3b2b', 0, 0.4, 0, { top: 0.6, seg: 7, rz: 0.12 });
  [[0, 2.5, 0, 0.85], [0.7, 2.2, 0.3, 0.6], [-0.7, 2.25, -0.2, 0.62], [0.2, 2.9, -0.5, 0.55], [-0.3, 2.85, 0.55, 0.55]]
    .forEach(([bx, by, bz, r], i) => sphere(t, r, seasonMat('blossom', i % 4), bx, by, bz, { s: [1.15, 0.8, 1.15] }));
  for (let i = 0; i < 6; i++) sphere(t, 0.05, seasonMat('petal'), Math.sin(i * 2.1) * 0.9, 0.02, Math.cos(i * 2.1) * 0.8, { s: [1, 0.2, 1], cast: false });
  return t;
}
/** Cloud-pruned pine. */
export function pineTree(p, x, z, sc = 1) {
  const t = grp(p, x, 0, z); t.scale.setScalar(sc);
  cyl(t, 0.4, 0.35, '#2e2b29', 0, 0, 0, { seg: 10 });
  cyl(t, 0.1, 1.6, '#4a3020', 0, 0.35, 0, { top: 0.6, seg: 6, rz: -0.25 });
  for (const [bx, by, bz, r] of [[0.45, 1.95, 0, 0.6], [-0.35, 1.5, 0.2, 0.5], [0.1, 2.35, -0.1, 0.42], [-0.6, 2.0, -0.3, 0.38]]) sphere(t, r, '#3f6b3a', bx, by, bz, { s: [1.5, 0.45, 1.2] });
  return t;
}
/** Clump of bamboo. */
export function bamboo(p, x, z, o = {}) {
  const n = o.n ?? 9, hmax = o.h ?? 2.6, y = o.y ?? 0;
  for (let i = 0; i < n; i++) {
    const bx = x + Math.sin(i * 2.4) * 0.35, bz = z + Math.cos(i * 2.4) * 0.35, h = hmax + (i % 3) * 0.5;
    cyl(p, 0.035, h, '#7f9f45', bx, y, bz, { seg: 6 });
    for (let k = 0.6; k < h; k += 0.6) cyl(p, 0.04, 0.03, '#6a8a38', bx, y + k, bz, { seg: 6, cast: false });   // nodes
    sphere(p, 0.22, '#6aa84f', bx, y + h, bz, { s: [1, 1.6, 1] });
  }
}
/** Bonsai in a shallow tray (desk size). */
export function bonsai(p, x, y, z, sc = 1) {
  const g = grp(p, x, y, z); g.scale.setScalar(sc);
  box(g, 0.34, 0.06, 0.22, '#3b4a5a', 0, 0, 0);
  box(g, 0.3, 0.02, 0.18, '#6b5a40', 0, 0.06, 0);
  cyl(g, 0.025, 0.2, '#5a3b2b', 0.02, 0.07, 0, { top: 0.6, rz: -0.5, seg: 6 });
  for (const [bx, by, bz, r] of [[0.1, 0.24, 0, 0.09], [-0.06, 0.2, 0.03, 0.07], [0.04, 0.3, -0.02, 0.06]]) sphere(g, r, '#3f6b3a', bx, by, bz, { s: [1.5, 0.55, 1.2] });
  return g;
}
/** Ikebana: low dish with a few stems, a branch and flowers. */
export function ikebana(p, x, y, z) {
  const g = grp(p, x, y, z);
  cyl(g, 0.16, 0.05, '#2b2a2c', 0, 0, 0, { seg: 16 });
  cyl(g, 0.14, 0.01, '#3f7f8f', 0, 0.05, 0, { seg: 16, cast: false });
  cyl(g, 0.012, 0.55, '#5a3b2b', 0, 0.05, 0, { rz: 0.35, seg: 5 });
  cyl(g, 0.01, 0.4, '#6a8a38', 0.02, 0.05, 0, { rz: -0.25, seg: 5 });
  cyl(g, 0.01, 0.28, '#6a8a38', -0.03, 0.05, 0.02, { rx: 0.3, seg: 5 });
  sphere(g, 0.05, '#e8508f', -0.16, 0.55, 0);
  sphere(g, 0.045, '#ffffff', 0.12, 0.42, 0);
  sphere(g, 0.04, '#f1c84b', -0.01, 0.33, 0.08);
  for (const [lx, ly] of [[-0.1, 0.4], [-0.13, 0.48]]) sphere(g, 0.035, '#5f9a4c', lx, ly, 0, { s: [1.4, 0.4, 1] });
  return g;
}

// ---------------------------------------------------------------- furniture
/** Low Japandi sofa: exposed oak platform frame on short legs, thick linen seat and back cushions,
 *  a low back and flat wide wooden armrests (handy for a cup of tea). Seat ~0.38 m high. Front faces +Z. */
export function japaneseSofa(p, x, z, len, ry = 0, o = {}) {
  const oak = o.wood ?? '#b88a5a', oakD = '#8a6440', linen = o.fabric ?? '#e3d6bf', linen2 = o.back ?? '#d6c7aa';
  const g = grp(p, x, 0, z, ry), d = 0.95, inner = len - 0.36;
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, 0.07, 0.1, 0.07, oakD, lx * (len / 2 - 0.1), 0, lz * (d / 2 - 0.08));
  box(g, len, 0.08, d, oak, 0, 0.1, 0);                                              // platform
  for (let i = 0; i < Math.round(len / 0.35); i++) box(g, 0.02, 0.06, d - 0.04, oakD, -len / 2 + 0.17 + i * 0.35, 0.12, 0, { cast: false });   // slat lines
  box(g, len, 0.42, 0.08, oak, 0, 0.1, -d / 2 + 0.04);                               // low back rail
  for (const sx of [-1, 1]) {
    box(g, 0.16, 0.3, d, oak, sx * (len / 2 - 0.08), 0.18, 0);                       // side panels
    box(g, 0.22, 0.04, d + 0.04, oakD, sx * (len / 2 - 0.08), 0.48, 0);             // flat armrest
  }
  const n = Math.max(1, Math.round(inner / 0.8)), cw = inner / n;
  for (let i = 0; i < n; i++) {
    const cx = -inner / 2 + cw * (i + 0.5);
    box(g, cw - 0.03, 0.18, d - 0.22, linen, cx, 0.18, 0.06);                        // seat cushion
    box(g, cw - 0.05, 0.4, 0.16, linen2, cx, 0.34, -d / 2 + 0.16, { rx: -0.12 });    // back cushion
  }
  if (o.pillows !== false) for (const sx of [-1, 1]) box(g, 0.34, 0.3, 0.1, o.pillow ?? '#2f4a6a', sx * (inner / 2 - 0.3), 0.36, -d / 2 + 0.3, { rx: -0.25, ry: sx * 0.15 });
  return g;
}
export function zabuton(p, x, z, color = '#a8442e', y = 0) {   // floor cushion
  box(p, 0.55, 0.08, 0.55, color, x, y, z);
}
/** Low wooden table (chabudai) with floor cushions around it. */
export function lowTable(p, x, z, o = {}) {
  const w = o.w ?? 1.2, d = o.d ?? 0.7, y = o.y ?? 0, wood = o.wood ?? '#5a3b26';
  box(p, w, 0.05, d, wood, x, y + 0.3, z);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(p, 0.06, 0.3, 0.06, wood, x + lx * (w / 2 - 0.08), y, z + lz * (d / 2 - 0.08));
  const cc = o.cushion ?? '#a8442e';
  zabuton(p, x, z - d / 2 - 0.4, cc, y); zabuton(p, x, z + d / 2 + 0.4, cc, y);
  if (o.tea !== false) {
    cyl(p, 0.05, 0.07, '#5f7a3a', x - 0.15, y + 0.35, z, { seg: 10 });          // matcha bowls
    cyl(p, 0.05, 0.07, '#2b2a2c', x + 0.15, y + 0.35, z, { seg: 10 });
    cyl(p, 0.035, 0.012, '#8fb35a', x - 0.15, y + 0.415, z, { seg: 10, cast: false });
  }
}

// ---------------------------------------------------------------- textures
export function tatamiTex() {
  return canvasTex(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#d6cc93'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,110,60,0.25)'; ctx.lineWidth = 1;
    for (let y = 2; y < h; y += 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = '#3d4a3a'; ctx.fillRect(0, 0, 14, h); ctx.fillRect(w - 14, 0, 14, h);   // heri (borders)
    ctx.fillStyle = 'rgba(80,70,40,0.35)'; ctx.fillRect(0, 0, w, 3); ctx.fillRect(0, h - 3, w, 3);
  });
}
/** Lay tatami mats (1 x 2 m) over a rectangle. */
export function tatamiFloor(p, x0, z0, x1, z1, y = 0.03) {
  const tex = tatamiTex(), m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
  for (let x = x0; x < x1 - 0.2; x += 1.0) {
    for (let z = z0, k = 0; z < z1 - 0.2; z += 2.0, k++) {
      const w = Math.min(1.0, x1 - x), d = Math.min(2.0, z1 - z);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.01, d - 0.01), m);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x + w / 2, y, z + d / 2);
      mesh.receiveShadow = true;
      p.add(mesh);
    }
  }
}
export function shojiTex() {
  return canvasTex(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f7f1e3'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#7a5a3c'; ctx.lineWidth = 7;
    for (let x = 0; x <= w; x += w / 3) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += h / 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.lineWidth = 14; ctx.strokeRect(0, 0, w, h);
  });
}
let shojiMatCache = null;
/** Translucent shoji paper material (glows softly at night). */
export function shojiMat() {
  if (!shojiMatCache) shojiMatCache = registerGlow(new THREE.MeshStandardMaterial({ map: shojiTex(), transparent: true, opacity: 0.88, roughness: 0.95, emissive: '#fff1d0', emissiveIntensity: 0.12, side: THREE.DoubleSide, depthWrite: false }), 3.5);
  return shojiMatCache;
}
/** A row of shoji sliding panels from (x1,z1) to (x2,z2). */
export function shojiScreen(p, x1, z1, x2, z2, h = 2.1) {
  const len = Math.hypot(x2 - x1, z2 - z1), ry = Math.atan2(x2 - x1, z2 - z1) - Math.PI / 2;
  const g = grp(p, (x1 + x2) / 2, 0, (z1 + z2) / 2, ry);
  const n = Math.max(1, Math.round(len / 0.9)), pw = len / n;
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(pw - 0.02, h - 0.1), shojiMat());
    m.position.set(-len / 2 + pw * (i + 0.5), h / 2, (i % 2) * 0.05 - 0.025);    // panels on two tracks
    g.add(m);
  }
  box(g, len, 0.06, 0.12, '#5a3b26', 0, 0, 0);                                     // sill
  box(g, len, 0.08, 0.12, '#5a3b26', 0, h, 0);                                     // lintel
  return g;
}
/** Frosted shoji-style glass for office meeting rooms. */
export const frostedMat = () => mat('#f4f1ea', { transparent: true, opacity: 0.72, roughness: 0.6 });

// ---------------------------------------------------------------- Kenny's daruma wall (Floor 3)
// One daruma per scheduled task:
//   one eye painted = task set up · both eyes = last run OK · red with a frown = error.
// Status comes from reports/latest.json ("status": { task name: "ok" | "error" | "setup" }).
export function darumaShelf(p, x, z) {
  const g = grp(p, x, 0, z);
  box(g, 3.2, 2.3, 0.06, '#e3cfa8', 0, 0.55, 0.03);                                // pale wood backboard
  for (const sy of [0.95, 1.75]) box(g, 3.1, 0.05, 0.3, '#c8a77a', 0, sy, 0.17);
  box(g, 3.2, 0.05, 0.32, '#c8a77a', 0, 2.85, 0.16);
  const title = canvasTex(512, 80, (ctx, w, h) => { ctx.fillStyle = '#2a1f19'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#f3e3c3'; ctx.font = 'bold 40px "Hiragino Mincho ProN", -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('達磨  Team status', w / 2, 54); });
  panel(g, 1.6, 0.25, title, 0, 2.55, 0.07);
  return { group: g, slots: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [-1.17 + (i % 4) * 0.78, i < 4 ? 1.75 : 0.95]) };
}
const DARUMA_COLS = ['#f4efe4', '#d9a441', '#5f8a6e', '#3f5a8a'];
/** Fill the shelf: tasks = [{ name, owner }], status = { name: 'ok' | 'error' | 'setup' }. */
export function placeDarumas(shelf, tasks, status = {}) {
  const items = [];
  tasks.slice(0, shelf.slots.length).forEach((t, i) => {
    const [sx, sy] = shelf.slots[i];
    const d = grp(shelf.group, sx, sy + 0.025, 0.18);
    d.userData.dynamic = true;
    const body = new THREE.MeshStandardMaterial({ color: DARUMA_COLS[i % 4], roughness: 0.5 });
    const bm = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), body);
    bm.scale.set(0.17, 0.21, 0.16); bm.position.y = 0.2; d.add(bm);
    sphere(d, 0.12, '#f6d6bd', 0, 0.26, 0.09, { s: [0.85, 0.8, 0.45], cast: false });    // face
    sphere(d, 0.05, '#c9a24a', 0, 0.09, 0.14, { s: [1.6, 0.6, 0.4], cast: false });      // gold belly mark
    const eyes = [-0.045, 0.045].map((ex) => {
      sphere(d, 0.028, '#ffffff', ex, 0.29, 0.14, { cast: false });
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat('#111111'));
      pupil.scale.setScalar(0.018); pupil.position.set(ex, 0.29, 0.162); d.add(pupil);
      return pupil;
    });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 4, 10, Math.PI), mat('#3a2418'));
    smile.position.set(0, 0.215, 0.155); d.add(smile);
    const plate = canvasTex(256, 64, (ctx, w, h) => { ctx.fillStyle = '#f6efe2'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#2a1f19'; ctx.font = 'bold 22px -apple-system, sans-serif'; ctx.textAlign = 'center'; const words = t.name.split(' '); const a = words.slice(0, Math.ceil(words.length / 2)).join(' '), b = words.slice(Math.ceil(words.length / 2)).join(' '); ctx.fillText(a, w / 2, 26); ctx.fillText(b, w / 2, 52); });
    panel(d, 0.62, 0.155, plate, 0, -0.06, 0.14);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.35), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.2; d.add(hit);
    const item = {
      set(st) {
        const err = st === 'error', ok = st === 'ok';
        body.color.set(err ? '#c8352a' : DARUMA_COLS[i % 4]);
        eyes[0].visible = true;                    // first eye painted when the task is set up
        eyes[1].visible = ok;                      // second eye when it ran OK
        smile.rotation.z = err ? 0 : Math.PI;      // frown on error
        smile.position.y = err ? 0.2 : 0.215;
        hit.userData.info = { title: `Daruma · ${t.name}`, text: `${t.owner ? `${t.owner}'s task\n` : ''}${err ? '🔴 Last run had a problem (Kenny will flag it).' : ok ? '✅ Both eyes painted: last run OK.' : '👁️ One eye painted: set up, no run recorded yet.'}` };
      },
    };
    item.set(status[t.name] ?? 'setup');
    items.push([t.name, item]);
  });
  return { update(status) { for (const [n, it] of items) it.set(status[n] ?? 'setup'); } };
}

// ---------------------------------------------------------------- spiral loft staircase
/** Spiral stair around a cedar pole, from y0 up by `rise` (Ivan & Phil's private stair, 4F -> 5F -> 6F). */
export function spiralStair(p, x, z, y0, rise, o = {}) {
  const r = o.r ?? 1.15, steps = Math.round(rise / 0.2), turn = o.turn ?? 1.6, a0 = o.start ?? 0;
  const g = grp(p, x, y0, z);
  cyl(g, 0.11, rise + 0.9, '#8a5a3c', 0, 0, 0, { seg: 12 });
  const glow = glowMat('#ffcf80', 0.5);
  for (let k = 0; k < steps; k++) {
    const a = a0 + (k / steps) * turn * Math.PI * 2, y = rise * (k + 1) / steps;
    const t = grp(g, 0, y - 0.07, 0, a);
    box(t, 0.36, 0.07, r, k % 2 ? '#c99a63' : '#bf8f58', 0, 0, r / 2, { cast: false });
    if (k % 2 === 0) box(t, 0.03, 0.02, r - 0.2, glow, 0.17, -0.03, r / 2 + 0.05, { cast: false });
    box(t, 0.04, 0.95, 0.04, '#3d2618', 0, 0.07, r - 0.04, { cast: false });                    // baluster
    box(t, 0.36, 0.05, 0.06, '#3d2618', 0, 1.0, r - 0.04, { cast: false });                     // handrail piece
  }
  return g;
}
/** Square stair opening in a floor (dark well + wooden rail with an entry gap on the -x side). */
export function stairWell(p, x, z, s = 2.7) {
  box(p, s, 0.012, s, '#1b1410', x, 0.005, z, { cast: false });
  const rail = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1), ry = Math.atan2(x2 - x1, z2 - z1) - Math.PI / 2;
    const g = grp(p, (x1 + x2) / 2, 0, (z1 + z2) / 2, ry);
    for (let i = 0; i <= Math.round(len / 0.9); i++) box(g, 0.06, 1.0, 0.06, '#5a3b26', -len / 2 + len * i / Math.round(len / 0.9), 0, 0, { cast: false });
    box(g, len, 0.06, 0.09, '#5a3b26', 0, 1.0, 0, { cast: false });
  };
  const h = s / 2;
  rail(x - h, z - h, x + h, z - h); rail(x + h, z - h, x + h, z + h); rail(x - h, z + h, x + h, z + h);
}

