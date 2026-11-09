// Joe the Shih Tzu and the AI employee characters.
import * as THREE from 'three';
import { box, cyl, sphere, grp, makeLabel, mat, optimize } from './helpers.js';


// ---------------------------------------------------------------- Joe
// Simple cartoon Joe (from the "Joe Joe" logo): round white body, big round
// head, tan floppy ears, black dot eyes, little nose and "w" mouth, stubby
// legs, small curled tail, thick black outlines and flat toon shading.
const SPH_HI = new THREE.SphereGeometry(1, 24, 18);
const TORUS_ARC = new THREE.TorusGeometry(1, 0.22, 6, 14, Math.PI);
const TOON_STEPS = (() => {
  const t = new THREE.DataTexture(new Uint8Array([170, 225, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const toonCache = new Map();
function toon(color) {
  let m = toonCache.get(color);
  if (!m) { m = new THREE.MeshToonMaterial({ color, gradientMap: TOON_STEPS }); toonCache.set(color, m); }
  return m;
}
const LINE = '#1c1714';
const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: LINE, side: THREE.BackSide });
const OUT = 0.014; // outline thickness

/** Smooth ellipsoid (centre c, radii r) with an optional black cartoon outline. */
function blob(par, color, c, r, o = {}) {
  const m = new THREE.Mesh(SPH_HI, toon(color));
  m.position.set(...c);
  m.scale.set(...r);
  m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  m.castShadow = o.cast ?? false;
  par.add(m);
  if (o.outline !== false) {
    const ol = new THREE.Mesh(SPH_HI, OUTLINE_MAT);
    ol.position.copy(m.position);
    ol.rotation.copy(m.rotation);
    ol.scale.set(r[0] + OUT, r[1] + OUT, r[2] + OUT);
    par.add(ol);
  }
  return m;
}
/** Thin black curve (half torus): up=true -> ∩, up=false -> ∪. */
function arc(par, c, size, up, rz = 0) {
  const m = new THREE.Mesh(TORUS_ARC, toon(LINE));
  m.position.set(...c);
  m.scale.setScalar(size);
  m.rotation.z = (up ? 0 : Math.PI) + rz;
  par.add(m);
  return m;
}

const WHITE = '#ffffff', TAN = '#d2a062', PINK = '#f28c98';

/**
 * Joe the Shih Tzu, cartoon logo style. ~0.75 tall at scale 1, front faces +Z.
 * g.userData.parts = { body, head, tail, legs[], setExpression(name) }
 * expressions: 'neutral' | 'happy' (open mouth) | 'pleased' (eyes closed) | 'alert'
 */
export function shihTzu(p, x, y, z, ry = 0, s = 1) {
  const g = grp(p, x, y, z, ry);
  g.scale.setScalar(s);

  // ---- round body
  const body = grp(g, 0, 0, 0);
  blob(body, WHITE, [0, 0.3, -0.04], [0.22, 0.2, 0.27]);

  // ---- stubby legs (hip pivots)
  const legs = [];
  for (const [lx, lz] of [[-0.12, 0.13], [0.12, 0.13], [-0.12, -0.19], [0.12, -0.19]]) {
    const hip = grp(g, lx, 0.17, lz);
    blob(hip, WHITE, [0, -0.07, 0], [0.075, 0.1, 0.08]);
    blob(hip, WHITE, [0, -0.125, 0.025], [0.08, 0.048, 0.09]);   // round foot
    legs.push(hip);
  }

  // ---- small curled tail (pivot at its base so it can wag)
  const tail = grp(body, 0, 0.38, -0.29);
  blob(tail, WHITE, [0, 0.06, -0.03], [0.05, 0.09, 0.05], { rx: -0.6 });
  blob(tail, WHITE, [0, 0.13, -0.02], [0.05, 0.05, 0.05]);
  blob(tail, WHITE, [0, 0.14, 0.04], [0.035, 0.035, 0.035]);

  // ---- big round head (pivot at the neck)
  const head = grp(body, 0, 0.44, 0.12);
  blob(head, WHITE, [0, 0.2, 0.05], [0.3, 0.26, 0.25]);
  // tan floppy ears hanging from the upper sides
  for (const sd of [-1, 1]) blob(head, TAN, [sd * 0.29, 0.17, 0.0], [0.08, 0.17, 0.13], { rz: sd * 0.42 });
  // nose
  blob(head, LINE, [0, 0.145, 0.295], [0.042, 0.03, 0.022], { outline: false });

  // expression pieces (each its own group so they can be switched)
  const ex = { eyesOpen: grp(head), eyesUp: grp(head), eyesClosed: grp(head), smile: grp(head), mouthOpen: grp(head) };
  for (const sd of [-1, 1]) {
    blob(ex.eyesOpen, LINE, [sd * 0.105, 0.225, 0.283], [0.032, 0.035, 0.02], { outline: false });
    blob(ex.eyesUp, LINE, [sd * 0.105, 0.24, 0.28], [0.036, 0.04, 0.02], { outline: false });
    blob(ex.eyesUp, WHITE, [sd * 0.105 + 0.012, 0.255, 0.296], [0.01, 0.01, 0.005], { outline: false });
    arc(ex.eyesClosed, [sd * 0.105, 0.215, 0.291], 0.035, true);
  }
  // little "w" mouth
  arc(ex.smile, [-0.024, 0.105, 0.289], 0.024, false);
  arc(ex.smile, [0.024, 0.105, 0.289], 0.024, false);
  // happy open mouth + tongue
  blob(ex.mouthOpen, LINE, [0, 0.085, 0.275], [0.04, 0.032, 0.02], { outline: false });
  blob(ex.mouthOpen, PINK, [0, 0.072, 0.288], [0.025, 0.018, 0.01], { outline: false });

  // ---- merge pieces per part (keeps him light on phones)
  for (const k in ex) { ex[k].userData.dynamic = true; optimize(ex[k]); }
  for (const part of [head, tail, ...legs, body]) { part.userData.dynamic = true; optimize(part); }

  const setExpression = (name) => {
    ex.eyesOpen.visible = name === 'neutral' || name === 'happy';
    ex.eyesUp.visible = name === 'alert';
    ex.eyesClosed.visible = name === 'pleased';
    ex.mouthOpen.visible = name === 'happy';
    ex.smile.visible = !ex.mouthOpen.visible;
  };
  setExpression('neutral');
  g.userData.parts = { body, head, tail, legs, setExpression };
  return g;
}

/**
 * Chibi AI employee. Seated at a desk by default (front faces +Z, place at a
 * chair facing the desk); e.pose === 'stand' makes a standing figure.
 * Returns { group, head, body, baseY, phase } for animation.
 */
export function employee(p, x, z, ry, e) {
  const g = grp(p, x, 0, z, ry);
  g.userData.dynamic = true; // don't merge; we animate it
  g.userData.info = { title: e.name, employee: e };
  const skin = e.skin ?? '#f6d6bd', hair = e.hair ?? '#5a3a22', shirt = e.shirt ?? '#ffffff', pants = e.pants ?? '#3a3a3e';
  const stand = e.pose === 'stand', sport = e.outfit === 'sport';
  const lift = stand ? 0.12 : 0;            // standing figures are a little taller
  if (stand) {
    // straight legs + shoes
    box(g, 0.13, 0.6, 0.14, pants, -0.09, 0.05, 0);
    box(g, 0.13, 0.6, 0.14, pants, 0.09, 0.05, 0);
    box(g, 0.14, 0.07, 0.22, sport ? '#f4f4f4' : '#2b2a2c', -0.09, 0, 0.03);
    box(g, 0.14, 0.07, 0.22, sport ? '#f4f4f4' : '#2b2a2c', 0.09, 0, 0.03);
  } else {
    // seated: thighs forward, shins down
    box(g, 0.13, 0.12, 0.38, pants, -0.09, 0.47, 0.1);
    box(g, 0.13, 0.12, 0.38, pants, 0.09, 0.47, 0.1);
    box(g, 0.12, 0.45, 0.12, pants, -0.09, 0.05, 0.26);
    box(g, 0.12, 0.45, 0.12, pants, 0.09, 0.05, 0.26);
    box(g, 0.13, 0.07, 0.2, '#2b2a2c', -0.09, 0, 0.3);
    box(g, 0.13, 0.07, 0.2, '#2b2a2c', 0.09, 0, 0.3);
  }
  // torso
  const baseY = stand ? 0.62 : 0.55;
  const body = grp(g, 0, baseY, stand ? 0 : -0.05);
  cyl(body, 0.17, 0.42, shirt, 0, 0, 0, { top: 0.85, bottom: 1, seg: 12 });
  if (sport) {
    box(body, 0.3, 0.03, 0.3, '#ffffff', 0, 0.36, 0, { cast: false });            // collar stripe
    box(body, 0.05, 0.12, 0.02, '#ffffff', 0, 0.16, 0.165);                       // whistle cord
    cyl(body, 0.025, 0.06, '#e2b13c', 0, 0.12, 0.17, { rx: Math.PI / 2, seg: 8 }); // whistle
  } else {
    box(body, 0.03, 0.42, 0.02, '#2b2a2c', -0.08, 0, 0.15); // suspenders
    box(body, 0.03, 0.42, 0.02, '#2b2a2c', 0.08, 0, 0.15);
    box(body, 0.04, 0.24, 0.02, e.tie ?? '#2b2a2c', 0, 0.16, 0.165); // tie
  }
  if (stand) {
    // arms down by the sides; a water bottle in one hand
    box(body, 0.09, 0.36, 0.09, shirt, -0.215, 0.04, 0);
    box(body, 0.09, 0.36, 0.09, shirt, 0.215, 0.04, 0);
    sphere(body, 0.055, skin, -0.215, 0.02, 0);
    sphere(body, 0.055, skin, 0.215, 0.02, 0);
    if (sport) cyl(body, 0.045, 0.2, '#7fc4e8', 0.22, -0.08, 0.06, { seg: 10 });
  } else {
    // arms reaching forward to the desk
    box(body, 0.09, 0.09, 0.36, shirt, -0.2, 0.22, 0.14);
    box(body, 0.09, 0.09, 0.36, shirt, 0.2, 0.22, 0.14);
    sphere(body, 0.055, skin, -0.2, 0.26, 0.34);
    sphere(body, 0.055, skin, 0.2, 0.26, 0.34);
  }
  // head (big chibi head)
  const head = grp(g, 0, 1.13 + lift, stand ? 0 : -0.03);
  sphere(head, 0.27, skin, 0, 0.12, 0);
  sphere(head, 0.29, hair, 0, 0.22, -0.04, { s: [1.04, 0.85, 1] });
  sphere(head, 0.12, hair, -0.12, 0.27, 0.17, { s: [1.2, 0.6, 0.8] }); // fringe
  sphere(head, 0.12, hair, 0.1, 0.29, 0.18, { s: [1.2, 0.55, 0.8] });
  if (e.hairStyle === 'long') {
    sphere(head, 0.28, hair, 0, 0.02, -0.1, { s: [1.05, 1.25, 0.85] });       // long hair down the back
    sphere(head, 0.09, hair, -0.24, -0.04, 0.04, { s: [0.6, 1.9, 0.9] });    // side locks
    sphere(head, 0.09, hair, 0.24, -0.04, 0.04, { s: [0.6, 1.9, 0.9] });
  } else if (e.hairStyle === 'bun') {
    sphere(head, 0.11, hair, 0, 0.43, -0.13);                                  // top bun
    sphere(head, 0.07, hair, -0.25, 0.1, 0.02, { s: [0.6, 1.2, 0.9] });
    sphere(head, 0.07, hair, 0.25, 0.1, 0.02, { s: [0.6, 1.2, 0.9] });
  }
  sphere(head, 0.045, '#1c1410', -0.09, 0.1, 0.245);
  sphere(head, 0.045, '#1c1410', 0.09, 0.1, 0.245);
  sphere(head, 0.013, '#ffffff', -0.075, 0.12, 0.285, { cast: false });
  sphere(head, 0.013, '#ffffff', 0.105, 0.12, 0.285, { cast: false });
  sphere(head, 0.035, '#f2a7a0', -0.16, 0.03, 0.2, { s: [1, 0.6, 0.4], cast: false });
  sphere(head, 0.035, '#f2a7a0', 0.16, 0.03, 0.2, { s: [1, 0.6, 0.4], cast: false });
  box(head, 0.07, 0.015, 0.01, '#8a4a3a', 0, -0.0, 0.262, { cast: false });
  if (e.glasses) {
    cyl(head, 0.06, 0.01, '#1c1410', -0.09, 0.1, 0.265, { rx: Math.PI / 2, seg: 12 });
    cyl(head, 0.06, 0.01, '#1c1410', 0.09, 0.1, 0.265, { rx: Math.PI / 2, seg: 12 });
  }
  // floating name tag
  const tag = makeLabel(e.name, { dot: '#3cc35a', height: 0.5 });
  tag.position.set(0, 1.85 + lift, 0);
  g.add(tag);
  // invisible hit box to make tapping easy
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.0, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 1.0, 0);
  hit.userData.info = g.userData.info;
  g.add(hit);
  return { group: g, head, body, baseY, phase: Math.random() * 6 };
}
