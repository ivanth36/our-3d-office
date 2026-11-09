// Joe the Shih Tzu and the AI employee characters.
import * as THREE from 'three';
import { box, cyl, sphere, grp, makeLabel, mat, optimize } from './helpers.js';

const FUR = '#fdfaf5';

// ---------------------------------------------------------------- Joe
// Plush, cartoon-style Joe (from the Joe character sheet): smooth white coat,
// big caramel ears, caramel patches round big glossy brown eyes, white blaze,
// green bow tie with a gold paw tag, fluffy plume tail curled over the back.
const SPH_HI = new THREE.SphereGeometry(1, 24, 18);   // smoother spheres for close-ups
const TORUS_ARC = new THREE.TorusGeometry(1, 0.2, 6, 14, Math.PI);

/** Smooth ellipsoid: c = centre [x,y,z], r = radii [rx,ry,rz]. */
function blob(par, color, c, r, o = {}) {
  const m = new THREE.Mesh(SPH_HI, typeof color === 'string' ? mat(color, { roughness: o.rough ?? 0.9, metalness: o.metal ?? 0 }) : color);
  m.position.set(...c);
  m.scale.set(...r);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  m.castShadow = o.cast ?? true;
  m.receiveShadow = true;
  par.add(m);
  return m;
}
/** Thin curved line (half torus) e.g. closed eyes / smile. up=true -> ∩, false -> ∪. */
function arc(par, color, c, size, up, rz = 0) {
  const m = new THREE.Mesh(TORUS_ARC, mat(color, { roughness: 0.6 }));
  m.position.set(...c);
  m.scale.set(size, size, size);
  m.rotation.z = (up ? 0 : Math.PI) + rz;
  par.add(m);
  return m;
}

const CARAMEL = '#c98a4b', CARAMEL_D = '#b4763c', CARAMEL_L = '#dba468', CREAM = '#f5efe6';
const BOW = '#3f8a3f', BOW_D = '#2f6f2f', GOLD = '#e2b13c';

/**
 * Joe the Shih Tzu. ~0.85 tall at scale 1, front faces +Z.
 * g.userData.parts = { body, head, tail, legs[], setExpression(name) }
 * expressions: 'neutral' | 'happy' (open mouth) | 'pleased' (eyes closed) | 'alert'
 */
export function shihTzu(p, x, y, z, ry = 0, s = 1, o = {}) {
  const g = grp(p, x, y, z, ry);
  g.scale.setScalar(s);
  const cast = o.cast ?? true;
  const B = (par, col, c, r, opt = {}) => blob(par, col, c, r, { cast, ...opt });

  // ---- body: rounded torso, fluffy chest, soft fur skirt
  const body = grp(g, 0, 0, 0);
  B(body, FUR, [0, 0.36, -0.05], [0.205, 0.185, 0.3]);
  B(body, FUR, [0, 0.39, 0.15], [0.18, 0.19, 0.15]);                 // chest
  B(body, CREAM, [0, 0.3, 0.17], [0.14, 0.12, 0.11]);                // chest fluff (shade)
  B(body, FUR, [0, 0.43, -0.28], [0.15, 0.14, 0.1]);                 // rump

  // collar + bow tie + gold paw tag
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 24), mat(BOW, { roughness: 0.7 }));
  collar.position.set(0, 0.5, 0.15); collar.rotation.x = Math.PI / 2 - 0.45; collar.castShadow = cast;
  body.add(collar);
  B(body, BOW, [-0.085, 0.47, 0.3], [0.085, 0.055, 0.035], { rz: 0.3, rough: 0.6 });
  B(body, BOW, [0.085, 0.47, 0.3], [0.085, 0.055, 0.035], { rz: -0.3, rough: 0.6 });
  B(body, BOW_D, [0, 0.47, 0.315], [0.032, 0.035, 0.03], { rough: 0.6 });
  const tag = grp(body, 0, 0.395, 0.315);
  tag.rotation.x = -0.2;
  B(tag, GOLD, [0, 0, 0], [0.04, 0.036, 0.012], { rough: 0.3, metal: 0.7 });   // paw pad
  for (const [tx, ty] of [[-0.03, 0.04], [-0.011, 0.055], [0.011, 0.055], [0.03, 0.04]]) B(tag, GOLD, [tx, ty, 0], [0.013, 0.015, 0.01], { rough: 0.3, metal: 0.7 });
  B(body, GOLD, [0, 0.445, 0.31], [0.012, 0.02, 0.01], { rough: 0.3, metal: 0.7 }); // ring

  // ---- legs (hip pivots): sturdy fluffy legs, round paws
  const legs = [];
  for (const [lx, lz] of [[-0.11, 0.15], [0.11, 0.15], [-0.12, -0.22], [0.12, -0.22]]) {
    const hip = grp(g, lx, 0.27, lz);
    B(hip, FUR, [0, -0.1, 0], [0.088, 0.135, 0.092]);
    B(hip, FUR, [0, 0.0, 0], [0.085, 0.06, 0.085]);                           // fluff where the leg meets the body
    B(hip, FUR, [0, -0.215, 0.025], [0.08, 0.052, 0.098]);           // paw
    for (const tx of [-0.035, 0, 0.035]) B(hip, CREAM, [tx, -0.225, 0.11], [0.018, 0.02, 0.012], { cast: false }); // toe lines
    legs.push(hip);
  }

  // ---- fluffy plume tail curling over the back (pivot at its base)
  const tail = grp(body, 0, 0.5, -0.3);
  B(tail, FUR, [0, 0.05, -0.03], [0.075, 0.08, 0.075]);
  B(tail, FUR, [0, 0.15, -0.05], [0.1, 0.1, 0.1]);
  B(tail, FUR, [0, 0.25, 0.01], [0.15, 0.12, 0.15]);
  B(tail, CREAM, [0, 0.21, 0.1], [0.11, 0.09, 0.1]);
  B(tail, FUR, [0.08, 0.22, 0.03], [0.09, 0.09, 0.1]);
  B(tail, FUR, [-0.08, 0.22, 0.03], [0.09, 0.09, 0.1]);
  B(tail, FUR, [0, 0.31, -0.03], [0.09, 0.07, 0.09]);

  // ---- head (pivot at the neck): big round chibi head
  const head = grp(body, 0, 0.52, 0.17);
  B(head, FUR, [0, 0.17, 0.03], [0.25, 0.23, 0.22]);                 // skull
  B(head, FUR, [-0.11, 0.07, 0.11], [0.12, 0.1, 0.1]);             // soft cheeks
  B(head, FUR, [0.11, 0.07, 0.11], [0.12, 0.1, 0.1]);
  B(head, FUR, [0, 0.03, 0.12], [0.11, 0.08, 0.09]);                // chin
  // soft top-knot tuft
  B(head, FUR, [0, 0.38, 0.0], [0.07, 0.06, 0.06], { rz: 0.2 });
  B(head, FUR, [-0.05, 0.37, 0.05], [0.05, 0.05, 0.05]);
  B(head, FUR, [0.06, 0.38, 0.02], [0.05, 0.05, 0.05]);
  B(head, FUR, [0.02, 0.42, -0.02], [0.035, 0.05, 0.035], { rz: -0.4 });
  // caramel patches round the eyes, white blaze down the middle
  B(head, CARAMEL, [-0.105, 0.215, 0.165], [0.11, 0.115, 0.09], { rz: -0.3 });
  B(head, CARAMEL, [0.105, 0.215, 0.165], [0.11, 0.115, 0.09], { rz: 0.3 });
  B(head, CARAMEL, [-0.15, 0.29, 0.1], [0.08, 0.07, 0.08]);         // patches spread up to the ears
  B(head, CARAMEL, [0.15, 0.29, 0.1], [0.08, 0.07, 0.08]);
  B(head, FUR, [0, 0.25, 0.2], [0.045, 0.14, 0.06]);                 // white blaze
  // muzzle + nose
  B(head, FUR, [0, 0.1, 0.2], [0.095, 0.07, 0.075]);
  B(head, '#141010', [0, 0.135, 0.275], [0.037, 0.028, 0.026], { rough: 0.25 });
  B(head, '#7a7a7a', [0.011, 0.146, 0.297], [0.009, 0.006, 0.004], { cast: false, rough: 0.3 }); // nose shine

  // expression pieces (each in its own group so they can be switched)
  const ex = {
    eyesOpen: grp(head), eyesClosed: grp(head), eyesUp: grp(head), smile: grp(head), mouthOpen: grp(head),
  };
  for (const [sd, gr, dy] of [[-1, ex.eyesOpen, 0], [1, ex.eyesOpen, 0], [-1, ex.eyesUp, 0.012], [1, ex.eyesUp, 0.012]]) {
    const ex0 = sd * 0.1, ey = 0.205;
    B(gr, '#5a331c', [ex0, ey, 0.235], [0.066, 0.072, 0.05], { rough: 0.15 });           // brown iris
    B(gr, '#120b07', [ex0, ey + dy, 0.265], [0.045, 0.05, 0.026], { rough: 0.1 });         // pupil
    B(gr, '#ffffff', [ex0 + 0.02, ey + 0.028 + dy, 0.284], [0.02, 0.022, 0.01], { cast: false, rough: 0.2 });
    B(gr, '#ffffff', [ex0 - 0.018, ey - 0.02, 0.28], [0.009, 0.009, 0.006], { cast: false });
  }
  for (const sd of [-1, 1]) arc(ex.eyesClosed, '#2a1a12', [sd * 0.1, 0.195, 0.262], 0.04, true);
  // little "w" smile under the nose
  arc(ex.smile, '#3a2418', [-0.02, 0.095, 0.268], 0.02, false);
  arc(ex.smile, '#3a2418', [0.02, 0.095, 0.268], 0.02, false);
  // open happy mouth with tongue
  B(ex.mouthOpen, '#3a1c16', [0, 0.07, 0.255], [0.05, 0.04, 0.025], { cast: false });
  B(ex.mouthOpen, '#f07f8c', [0, 0.055, 0.27], [0.03, 0.025, 0.014], { cast: false });
  arc(ex.mouthOpen, '#3a2418', [-0.02, 0.1, 0.272], 0.018, false);
  arc(ex.mouthOpen, '#3a2418', [0.02, 0.1, 0.272], 0.018, false);

  // big caramel ears hanging like long smooth curtains, framing the face
  for (const sd of [-1, 1]) {
    const ear = grp(head, sd * 0.2, 0.31, -0.01);
    ear.rotation.z = sd * 0.12;
    B(ear, CARAMEL, [0, -0.04, 0.0], [0.08, 0.09, 0.11]);                  // top, blends into the head
    B(ear, CARAMEL, [sd * 0.025, -0.19, 0.01], [0.1, 0.2, 0.13]);           // long flowing ear
    B(ear, CARAMEL_D, [sd * 0.03, -0.33, 0.015], [0.095, 0.09, 0.12]);      // rounded, slightly darker ends
    B(ear, CARAMEL_L, [sd * 0.045, -0.17, 0.05], [0.06, 0.16, 0.08]);       // soft sheen
  }

  // ---- merge static pieces per part (keeps it light on phones)
  for (const k in ex) { ex[k].userData.dynamic = true; optimize(ex[k]); }
  for (const part of [head, tail, ...legs, body]) { part.userData.dynamic = true; optimize(part); }

  const setExpression = (name) => {
    ex.eyesOpen.visible = name === 'neutral' || name === 'happy';
    ex.eyesUp.visible = name === 'alert';
    ex.eyesClosed.visible = name === 'pleased';
    ex.mouthOpen.visible = name === 'happy';
    ex.smile.visible = !ex.mouthOpen.visible;
  };
  setExpression(o.expression ?? 'neutral');
  g.userData.parts = { body, head, tail, legs, setExpression };
  return g;
}

/**
 * Seated chibi AI employee. Front faces +Z (place at a chair facing the desk).
 * Returns { group, head, tag } for animation.
 */
export function employee(p, x, z, ry, e) {
  const g = grp(p, x, 0, z, ry);
  g.userData.dynamic = true; // don't merge; we animate it
  g.userData.info = { title: e.name, text: `${e.role}\nAI employee · Floor ${e.floor}` };
  const skin = e.skin ?? '#f6d6bd', hair = e.hair ?? '#5a3a22', shirt = e.shirt ?? '#ffffff', pants = e.pants ?? '#3a3a3e';
  // legs (seated: thighs forward, shins down)
  box(g, 0.13, 0.12, 0.38, pants, -0.09, 0.47, 0.1);
  box(g, 0.13, 0.12, 0.38, pants, 0.09, 0.47, 0.1);
  box(g, 0.12, 0.45, 0.12, pants, -0.09, 0.05, 0.26);
  box(g, 0.12, 0.45, 0.12, pants, 0.09, 0.05, 0.26);
  box(g, 0.13, 0.07, 0.2, '#2b2a2c', -0.09, 0, 0.3);
  box(g, 0.13, 0.07, 0.2, '#2b2a2c', 0.09, 0, 0.3);
  // torso
  const body = grp(g, 0, 0.55, -0.05);
  cyl(body, 0.17, 0.42, shirt, 0, 0, 0, { top: 0.85, bottom: 1, seg: 12 });
  box(body, 0.03, 0.42, 0.02, '#2b2a2c', -0.08, 0, 0.15); // suspenders
  box(body, 0.03, 0.42, 0.02, '#2b2a2c', 0.08, 0, 0.15);
  box(body, 0.04, 0.24, 0.02, e.tie ?? '#2b2a2c', 0, 0.16, 0.165); // tie
  // arms reaching forward to the desk
  box(body, 0.09, 0.09, 0.36, shirt, -0.2, 0.22, 0.14);
  box(body, 0.09, 0.09, 0.36, shirt, 0.2, 0.22, 0.14);
  sphere(body, 0.055, skin, -0.2, 0.26, 0.34);
  sphere(body, 0.055, skin, 0.2, 0.26, 0.34);
  // head (big chibi head)
  const head = grp(g, 0, 1.13, -0.03);
  sphere(head, 0.27, skin, 0, 0.12, 0);
  sphere(head, 0.29, hair, 0, 0.22, -0.04, { s: [1.04, 0.85, 1] });
  sphere(head, 0.12, hair, -0.12, 0.27, 0.17, { s: [1.2, 0.6, 0.8] }); // fringe
  sphere(head, 0.12, hair, 0.1, 0.29, 0.18, { s: [1.2, 0.55, 0.8] });
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
  tag.position.set(0, 1.85, 0);
  g.add(tag);
  // invisible hit box to make tapping easy
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.9, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 0.95, 0);
  hit.userData.info = g.userData.info;
  g.add(hit);
  return { group: g, head, body, phase: Math.random() * 6 };
}
