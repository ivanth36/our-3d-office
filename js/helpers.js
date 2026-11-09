// Small helpers for building low-poly furniture quickly.
// Every piece is made from a few shared geometries (box / cylinder / sphere),
// and each floor is "optimized" (merged by material) so phones only draw a
// handful of meshes per floor.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

export const H = 4;        // floor-to-floor height
export const SLAB = 0.3;   // slab thickness
export const CEIL = H - SLAB; // clear room height

// ---------- materials ----------
const matCache = new Map();
export function mat(color, o = {}) {
  const key = color + '|' + JSON.stringify(o);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: o.roughness ?? 0.85,
      metalness: o.metalness ?? 0,
      transparent: !!o.transparent,
      opacity: o.opacity ?? 1,
      depthWrite: o.transparent ? false : true,
      emissive: o.emissive ?? '#000000',
      emissiveIntensity: o.emissiveIntensity ?? 1,
      side: o.side ?? THREE.FrontSide,
    });
    matCache.set(key, m);
  }
  return m;
}
export const glassMat = () => mat('#cfeaf2', { transparent: true, opacity: 0.22, roughness: 0.1 });
export const glowMat = (c = '#ffd98a') => mat(c, { emissive: c, emissiveIntensity: 1.2 });

function toMat(c, o) { return (typeof c === 'string') ? mat(c, o) : c; }

// ---------- geometry ----------
const BOX = new THREE.BoxGeometry(1, 1, 1);
const SPH = new THREE.SphereGeometry(1, 14, 10);
const cylCache = new Map();
function cylGeo(rt, rb, seg) {
  const k = `${rt}|${rb}|${seg}`;
  let g = cylCache.get(k);
  if (!g) { g = new THREE.CylinderGeometry(rt, rb, 1, seg); cylCache.set(k, g); }
  return g;
}

function finish(m, parent, o) {
  m.castShadow = o.cast ?? true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Box with its BOTTOM at y. */
export function box(parent, w, h, d, color, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(BOX, toMat(color, o));
  m.scale.set(w, h, d);
  m.position.set(x, y + h / 2, z);
  if (o.ry) m.rotation.y = o.ry;
  if (o.rx) m.rotation.x = o.rx;
  if (o.rz) m.rotation.z = o.rz;
  return finish(m, parent, o);
}

/** Cylinder with its BOTTOM at y. Radii are relative (rt, rb), scaled by r. */
export function cyl(parent, r, h, color, x = 0, y = 0, z = 0, o = {}) {
  const rt = o.top ?? 1, rb = o.bottom ?? 1, seg = o.seg ?? 16;
  const m = new THREE.Mesh(cylGeo(rt, rb, seg), toMat(color, o));
  m.scale.set(r, h, r * (o.sz ?? 1));
  m.position.set(x, y + h / 2, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.rz) m.rotation.z = o.rz;
  if (o.ry) m.rotation.y = o.ry;
  return finish(m, parent, o);
}

/** Sphere centred at (x,y,z). o.s = [sx,sy,sz] multipliers. */
export function sphere(parent, r, color, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(SPH, toMat(color, o));
  const s = o.s ?? [1, 1, 1];
  m.scale.set(r * s[0], r * s[1], r * s[2]);
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  return finish(m, parent, o);
}

/** A positioned / rotated sub-group. ry in radians. */
export function grp(parent, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}

/** Rotation (around Y) that makes an object whose front is +Z face a point. */
export function faceTo(x, z, tx, tz) { return Math.atan2(tx - x, tz - z); }

// ---------- canvas textures ----------
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A flat textured panel (plane), facing +Z. Centre at (x,y,z). */
export function panel(parent, w, h, tex, x, y, z, o = {}) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: o.glow ? '#ffffff' : '#000000', emissiveMap: o.glow ? tex : null, emissiveIntensity: o.glow ?? 0, transparent: !!o.transparent })
  );
  m.position.set(x, y, z);
  if (o.ry) m.rotation.y = o.ry;
  if (o.rx) m.rotation.x = o.rx;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export { roundRect };

/** Floating text label (always faces the camera). */
export function makeLabel(text, o = {}) {
  const font = `600 ${o.px ?? 54}px -apple-system, "Segoe UI", Roboto, sans-serif`;
  const tmp = document.createElement('canvas').getContext('2d');
  tmp.font = font;
  const dotW = o.dot ? 46 : 0;
  const pad = 30;
  const w = Math.ceil(tmp.measureText(text).width + pad * 2 + dotW);
  const h = (o.px ?? 54) + 40;
  const tex = canvasTex(w, h, (ctx) => {
    ctx.font = font;
    ctx.fillStyle = o.bg ?? 'rgba(255,248,236,0.95)';
    roundRect(ctx, 2, 2, w - 4, h - 4, h / 2 - 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = o.border ?? 'rgba(120,80,40,0.35)';
    ctx.stroke();
    if (o.dot) {
      ctx.fillStyle = o.dot;
      ctx.beginPath(); ctx.arc(pad + 12, h / 2, 13, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = o.fg ?? '#4a3020';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pad + dotW, h / 2 + 2);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: o.depthTest ?? false, transparent: true }));
  const sh = o.height ?? 0.45;
  sp.scale.set(sh * w / h, sh, 1);
  sp.renderOrder = 20;
  return sp;
}

// ---------- procedural floor textures ----------
export function plankTex(base = '#d6a873', line = '#b8875a') {
  const t = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      const y = r * h / rows;
      ctx.fillStyle = `rgba(0,0,0,${0.03 + (r % 3) * 0.025})`;
      ctx.fillRect(0, y, w, h / rows);
      ctx.fillStyle = line; ctx.fillRect(0, y, w, 2);
      const off = (r * 97) % w;
      ctx.fillRect(off, y, 2, h / rows);
      ctx.fillRect((off + 128) % w, y, 2, h / rows);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export function carpetTex(base = '#9aa1a8') {
  const t = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.fillStyle = 'rgba(140,200,90,0.35)';
    for (let i = 0; i < 14; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 6, 3);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export function tileTex(a = '#efe4d2', b = '#e3d3bb') {
  const t = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = a; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = b; ctx.fillRect(0, 0, w / 2, h / 2); ctx.fillRect(w / 2, h / 2, w / 2, h / 2);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** Thin textured floor surface (top at y=0.02). Repeat ~1 tile per `tile` metres. */
export function floorSurface(parent, w, d, x, z, tex, tile = 2) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.repeat.set(w / tile, d / tile);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.015, z);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ---------- merge static meshes ----------
export function optimize(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const remove = [];
  const visit = (o) => {
    if (o.userData.dynamic && o !== root) return;
    if (o.isMesh && o !== root) {
      const key = o.material.uuid + (o.castShadow ? 'c' : 'n');
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { mat: o.material, cast: o.castShadow, geos: [] }));
      const g = o.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      b.geos.push(g);
      remove.push(o);
    }
    o.children.forEach(visit);
  };
  visit(root);
  remove.forEach((o) => o.removeFromParent());
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    b.geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, b.mat);
    m.castShadow = b.cast;
    m.receiveShadow = true;
    root.add(m);
  }
}
