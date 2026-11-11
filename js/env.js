// Seasons and day/night, synced to Singapore time.
//   Seasons follow Japan's calendar: sakura in spring (Mar-May), green in summer, momiji in
//   autumn (Sep-Nov), snow-dusted trees and a fuller snow cap on Mt Fuji in winter.
//   Day/night: sky, fog and lights follow the clock in Singapore; lanterns, windows and the
//   vending machines glow brighter after dark (glowing materials, no extra real-time lights).
// Preview overrides in the address bar: ?season=spring|summer|autumn|winter  ?time=21.5  ?friday=1
import * as THREE from 'three';
import { GLOW, WINDOWS, NIGHT_MATS } from './helpers.js';
import { SEASON_MATS } from './japan.js';
import { shift2 } from './building.js';

const params = new URLSearchParams(location.search);
function sgt() {
  const d = new Date(Date.now() + 8 * 3600e3);              // read UTC fields as Singapore wall-clock time
  return { h: d.getUTCHours() + d.getUTCMinutes() / 60, month: d.getUTCMonth(), dow: d.getUTCDay() };
}
export const hourSGT = () => (params.has('time') ? +params.get('time') : sgt().h);
// the ☀️/🌙 button: 'auto' follows Singapore time, 'day' / 'night' force it
let skyMode = 'auto';
const skyHour = () => (skyMode === 'day' ? 12 : skyMode === 'night' ? 22 : hourSGT());
export function seasonNow() {
  const s = params.get('season');
  if (['spring', 'summer', 'autumn', 'winter'].includes(s)) return s;
  const m = sgt().month;
  return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter';
}
export const isFriday = () => (params.has('friday') ? params.get('friday') === '1' : sgt().dow === 5);

const PALETTE = {
  blossom: {
    spring: ['#f7c6d4', '#f4b3c5', '#fad6e0', '#f0a8bd'], summer: ['#5f9a4c', '#6aa84f', '#4f8a43', '#7ab85a'],
    autumn: ['#c8352a', '#e0602a', '#d94c2b', '#f0a03a'], winter: ['#eef2f5', '#e4e9ee', '#f6f8fa', '#dde3e8'],
  },
  momiji: {
    spring: ['#9cc76a', '#b5d67a', '#8ab85a', '#a8cf70'], summer: ['#4f8a43', '#5f9a4c', '#6aa84f', '#47803d'],
    autumn: ['#c8352a', '#e0602a', '#b8322a', '#f08a3a'], winter: ['#a8442e', '#8a3a2a', '#b85a3a', '#7a3324'],
  },
  petal: { spring: ['#f7c6d4'], summer: ['#6aa84f'], autumn: ['#d9542a'], winter: ['#f4f6f8'] },
};
const FALL = { spring: ['#f7c6d4', '#fad6e0'], autumn: ['#c8352a', '#e0602a', '#f0a03a'], winter: ['#ffffff'], summer: null };
const SNOWLINE = { spring: 0.6, summer: 0.86, autumn: 0.72, winter: 0.38 };

// ---------------------------------------------------------------- Mt Fuji
/** Far behind the building: concave cone, jagged snow cap (by season), hazy blue foot. Ignores fog. */
export function mtFuji() {
  const H = 56, R = 150, pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector2(R * Math.pow(1 - t, 1.9) + 9, H * t)); }
  pts.push(new THREE.Vector2(0, H - 1.5));
  const geo = new THREE.LatheGeometry(pts, 96);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, fog: false }));
  m.position.set(-105, -38, -295);   // foot sunk below the horizon so the peak sits in view
  const rock = new THREE.Color('#5d6f93'), haze = new THREE.Color('#a9b6cf'), snow = new THREE.Color('#f7f9fc'), c = new THREE.Color();
  m.userData.setSeason = (season) => {
    const pos = geo.attributes.position, col = geo.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x);
      const line = H * SNOWLINE[season] + Math.sin(a * 9) * 4 + Math.sin(a * 23 + 1) * 2.5;
      if (y > line) c.copy(snow); else c.copy(haze).lerp(rock, Math.min(1, y / (H * 0.45)));
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  };
  return m;
}

// ---------------------------------------------------------------- falling petals / leaves / snow
function fallers(scene, spots, n = 36) {
  const geo = new THREE.PlaneGeometry(0.09, 0.06);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }), n);
  mesh.frustumCulled = false;
  const cols = [];
  const items = Array.from({ length: n }, (_, i) => {
    const s = spots[i % spots.length];
    return { s, x: s[0] + (Math.random() - 0.5) * 3, y: s[1] + Math.random() * 3.2, z: s[2] + (Math.random() - 0.5) * 3, ph: Math.random() * 6, sp: 0.25 + Math.random() * 0.25 };
  });
  scene.add(mesh);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  return {
    mesh,
    setColors(list) {
      mesh.visible = !!list;
      if (!list) return;
      cols.length = 0;
      for (let i = 0; i < n; i++) mesh.setColorAt(i, new THREE.Color(list[i % list.length]));
      mesh.instanceColor.needsUpdate = true;
    },
    update(dt, t, show) {
      if (!mesh.visible) return;
      items.forEach((it, i) => {
        if (!show(it.s)) { m4.makeScale(0, 0, 0); mesh.setMatrixAt(i, m4); return; }
        it.y -= dt * it.sp;
        it.x += Math.sin(t * 1.3 + it.ph) * dt * 0.25;
        if (it.y < it.s[1] - 0.1 + (it.s[3] ?? 0)) { it.y = it.s[1] + 3.2; it.x = it.s[0] + (Math.random() - 0.5) * 3; it.z = it.s[2] + (Math.random() - 0.5) * 3; }
        e.set(t * 2 + it.ph, t * 1.5 + it.ph, 0); q.setFromEuler(e);
        m4.compose(v.set(it.x, Math.max(it.y, it.s[1]), it.z), q, one);
        mesh.setMatrixAt(i, m4);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------- the environment
const SKY = {
  day: ['#8fb8de', '#f5cfa8', '#f7e2c4'], dusk: ['#3b4a7a', '#e88a5a', '#f4b37a'], night: ['#0b1430', '#1d2a52', '#3a3a5e'],
};
const FOG = { day: '#f3dcc0', dusk: '#b98a72', night: '#1a2240' };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function createEnv({ scene, renderer, hemi, sun, fill, fuji, roofY }) {
  const season = seasonNow();
  // seasonal colours
  for (const kind of ['blossom', 'momiji', 'petal']) for (const m of SEASON_MATS[kind]) m.color.set(PALETTE[kind][season][(m.userData.variant ?? 0) % PALETTE[kind][season].length]);
  fuji.userData.setSeason(season);
  // falling petals / leaves / snow around the trees (front of the building + roof garden)
  const spots = [[6.2, 0.1, 10.1, 0], [8.3, roofY, 5.6, 0], [1.0, roofY, 3.6, 0], [-9.5, roofY, -5.6, 0], [2.4, roofY, -4.3, 0]]
    .map(([x, y, z, k]) => [x + (y > 1 ? shift2(5, x) : 0), y, z, k]);   // roof trees left of the split moved with the longer building
  const fall = fallers(scene, spots);
  fall.setColors(FALL[season]);

  // sky canvas
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const sky = new THREE.CanvasTexture(c); sky.colorSpace = THREE.SRGBColorSpace;
  scene.background = sky;
  // moon + stars (night only)
  const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 20, 14), new THREE.MeshBasicMaterial({ color: '#fff6dc', fog: false }));
  moon.position.set(120, 140, -320);
  const starGeo = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI * 2, el = 0.15 + Math.random() * 1.2, r = 380; sp.push(Math.cos(a) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(a) * Math.cos(el) * r); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true }));
  scene.add(moon, stars);

  const ca = new THREE.Color(), cb = new THREE.Color();
  const mix3 = (k, d, n, out) => {                      // blend day -> dusk -> night
    out.set(d);
    if (k.dusk > 0) out.lerp(cb.set(k.duskC), k.dusk);
    if (k.night > 0) out.lerp(cb.set(n), k.night);
    return out;
  };
  const winDay = new THREE.Color('#bfe0ee'), winDayE = new THREE.Color('#9fc8de'), winNight = new THREE.Color('#ffe1a8'), winNightE = new THREE.Color('#ffc870');
  let last = -1;
  const state = { season, night: 0 };
  function apply() {
    const h = skyHour();
    const day = smooth(6.4, 7.6, h) * (1 - smooth(18.8, 19.9, h));
    const dusk = Math.max(0, 1 - Math.abs(h - 7.0) / 0.9) + Math.max(0, 1 - Math.abs(h - 19.3) / 0.9);
    const night = 1 - day;
    state.night = night;
    // sky gradient
    const ctx = c.getContext('2d'), g = ctx.createLinearGradient(0, 0, 0, 256);
    [0, 0.55, 1].forEach((stop, i) => {
      ca.set(SKY.day[i]).lerp(cb.set(SKY.night[i]), night);
      if (dusk > 0) ca.lerp(cb.set(SKY.dusk[i]), Math.min(1, dusk) * 0.8);
      g.addColorStop(stop, `#${ca.getHexString()}`);
    });
    ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 256); sky.needsUpdate = true;
    ca.set(FOG.day).lerp(cb.set(FOG.night), night); if (dusk > 0) ca.lerp(cb.set(FOG.dusk), Math.min(1, dusk) * 0.6);
    scene.fog.color.copy(ca);
    // lights
    // at night the rooms stay warmly lit (as if by the lanterns); only the sky and street go dark
    hemi.intensity = 0.95 + 0.55 * day;
    hemi.color.set('#fff4e0').lerp(cb.set('#d8c0a0'), night);
    hemi.groundColor.set('#b9a07f').lerp(cb.set('#6a4a30'), night);
    sun.intensity = 2.2 * day + 0.3 * night;
    sun.color.set('#ffe2b8').lerp(cb.set('#9fb6ff'), night);
    if (dusk > 0) sun.color.lerp(cb.set('#ff9a5a'), Math.min(1, dusk) * 0.5);
    fill.intensity = 0.6 * day + 0.12;
    renderer.toneMappingExposure = 1.05 - 0.1 * night;
    moon.visible = night > 0.5; stars.visible = night > 0.5; stars.material.opacity = night;
    // glowing things: lanterns, signs, vending machines, windows
    for (const [m, g2] of GLOW) m.emissiveIntensity = g2.base * (1 + (g2.night - 1) * night);
    // spotlight beams + pools of light, and the spotlit tree canopies
    for (const [m, op] of NIGHT_MATS) { m.visible = night > 0.3; m.opacity = op * night; }
    for (const kind of ['blossom', 'momiji']) for (const m of SEASON_MATS[kind]) { m.emissive.copy(m.color); m.emissiveIntensity = 0.32 * night; }
    for (const m of WINDOWS) {
      m.color.copy(winDay).lerp(winNight, night * 0.85);
      m.emissive.copy(winDayE).lerp(winNightE, night);
      m.emissiveIntensity = 0.35 + 0.65 * night;
    }
    renderer.shadowMap.needsUpdate = true;
  }
  apply();
  let view = 0, acc = 0;
  return {
    state,
    setView(n) { view = n; },
    setMode(m) { skyMode = m; last = -1; apply(); },
    update(dt, t) {
      acc += dt;
      if (acc > 60) { acc = 0; const h = Math.floor(skyHour() * 12); if (h !== last) { last = h; apply(); } }   // re-check every minute
      fall.update(dt, t, (s) => (s[1] < 1 ? true : view === 0 || view === 5));
    },
  };
}
