// Joe the Shih Tzu and the AI employee characters.
import * as THREE from 'three';
import { box, cyl, sphere, grp, makeLabel, mat, optimize } from './helpers.js';

const FUR = '#fbf9f5', FUR2 = '#ece6dc', BEIGE = '#d9c2a0', BEIGE2 = '#e6d6be', EAR_MID = '#b09c84', EAR_TIP = '#7d7066';

// ---------------------------------------------------------------- Joe
// Small seeded random so Joe's fur looks the same every time.
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
const LOCK = new THREE.SphereGeometry(1, 8, 6); // a soft rounded lock of fur
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Shaggy fur: soft rounded locks spread over an ellipsoid surface, hanging down.
 * c: centre [x,y,z], r: radii [rx,ry,rz]. Only points where filter(n) is true.
 * droop pulls strands downwards; colour(n, rand) picks a colour per strand.
 */
function tufts(par, c, r, n, o) {
  const rand = rng(o.seed ?? 7);
  const len = o.len ?? 0.09, thick = o.thick ?? 0.035, droop = o.droop ?? 0.5;
  const nrm = new THREE.Vector3(), dir = new THREE.Vector3();
  let placed = 0, tries = 0;
  while (placed < n && tries++ < n * 20) {
    // random point on a unit sphere
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2, q = Math.sqrt(1 - u * u);
    nrm.set(q * Math.cos(th), u, q * Math.sin(th));
    if (o.filter && !o.filter(nrm)) continue;
    const L = len * (0.7 + rand() * 0.6);
    dir.set(nrm.x / r[0], nrm.y / r[1], nrm.z / r[2]).normalize();   // outward normal on ellipsoid
    dir.y -= droop; dir.x += (rand() - 0.5) * 0.4; dir.z += (rand() - 0.5) * 0.4;
    dir.normalize();
    const color = o.color ? o.color(nrm, rand) : FUR;
    const m = new THREE.Mesh(LOCK, mat(color, { roughness: 0.95 }));
    m.scale.set(thick * (0.8 + rand() * 0.5), L * 0.5, thick * (0.8 + rand() * 0.5));
    m.quaternion.setFromUnitVectors(_up, dir);
    m.position.set(c[0] + nrm.x * r[0] * 0.85 + dir.x * L * 0.3, c[1] + nrm.y * r[1] * 0.85 + dir.y * L * 0.3, c[2] + nrm.z * r[2] * 0.85 + dir.z * L * 0.3);
    m.castShadow = o.cast ?? true;
    par.add(m);
    placed++;
  }
}
const furMix = (rand) => (rand() < 0.65 ? FUR : FUR2);

/**
 * Joe the Shih Tzu, modelled on Joe's photo: shaggy white coat, long floppy
 * beige-to-grey-brown ears, beige patches round big dark eyes, black button
 * nose, white moustache, long chest bib, beige patch on the back, big curled
 * plume tail, green bow tie with a gold tag. ~0.85 tall at scale 1, front +Z.
 * g.userData.parts = { body, head, tail, legs[] } for animation.
 */
export function shihTzu(p, x, y, z, ry = 0, s = 1, o = {}) {
  const g = grp(p, x, y, z, ry);
  g.scale.setScalar(s);
  const cast = o.cast ?? true;
  const S = (par, r, c, sx, sy, sz, opt = {}) => sphere(par, r, c, sx, sy, sz, { cast, roughness: 0.95, ...opt });

  // ---- body (torso + chest bib + beige back patch)
  const body = grp(g, 0, 0, 0);
  S(body, 1, FUR, 0, 0.42, -0.06, { s: [0.21, 0.19, 0.31] });
  tufts(body, [0, 0.42, -0.06], [0.21, 0.19, 0.31], 110, { seed: 11, len: 0.11, droop: 1.3, thick: 0.045, cast,
    color: (n, rand) => (n.y > 0.25 && n.z < 0.2 && n.x > -0.35 && rand() < 0.75 ? (rand() < 0.5 ? BEIGE : BEIGE2) : furMix(rand)) });
  S(body, 1, FUR, 0, 0.44, 0.19, { s: [0.17, 0.17, 0.13] });                    // chest
  tufts(body, [0, 0.44, 0.19], [0.17, 0.17, 0.13], 50, { seed: 21, len: 0.15, droop: 2.2, thick: 0.045, cast,
    filter: (n) => n.z > -0.2 && n.y < 0.25, color: (n, rand) => furMix(rand) }); // long shaggy bib
  // green bow tie + gold tag at the collar
  S(body, 1, '#2f5a3a', -0.09, 0.5, 0.35, { s: [0.09, 0.055, 0.04], rz: 0.25 });
  S(body, 1, '#2f5a3a', 0.09, 0.5, 0.35, { s: [0.09, 0.055, 0.04], rz: -0.25 });
  S(body, 0.035, '#244a2f', 0, 0.5, 0.37);
  cyl(body, 0.035, 0.014, '#d9a93a', 0, 0.42, 0.37, { rx: Math.PI / 2, seg: 10, metalness: 0.6, roughness: 0.3, cast });
  S(body, 0.022, '#d9a93a', 0, 0.46, 0.37, { metalness: 0.6, roughness: 0.3 });

  // ---- legs on hip pivots: fluffy "trousers" + round paws
  const legs = [];
  for (const [lx, lz, sd] of [[-0.12, 0.17, 1], [0.12, 0.17, 2], [-0.12, -0.25, 3], [0.12, -0.25, 4]]) {
    const hip = grp(g, lx, 0.3, lz);
    S(hip, 1, FUR, 0, -0.1, 0, { s: [0.075, 0.13, 0.075] });
    tufts(hip, [0, -0.11, 0], [0.075, 0.13, 0.075], 18, { seed: 31 + sd, len: 0.09, droop: 2.0, thick: 0.04, cast,
      filter: (n) => n.y < 0.6, color: (n, rand) => furMix(rand) });
    S(hip, 1, FUR, 0, -0.26, 0.03, { s: [0.07, 0.045, 0.085] });                // paw
    legs.push(hip);
  }

  // ---- big curled plume tail over the back (pivot at the base so it can wag)
  const tail = grp(body, 0, 0.55, -0.33);
  const curl = [[0, 0.05, -0.02, 0.07], [0, 0.13, -0.03, 0.08], [0, 0.2, 0.0, 0.085], [0, 0.23, 0.07, 0.08], [0, 0.19, 0.12, 0.065]];
  curl.forEach(([cx, cy, cz, r], i) => S(tail, r, i % 2 ? FUR2 : FUR, cx, cy, cz));
  tufts(tail, [0, 0.16, 0.03], [0.13, 0.13, 0.13], 80, { seed: 41, len: 0.1, droop: 0.35, thick: 0.05, cast,
    color: (n, rand) => (n.y > 0.3 && rand() < 0.3 ? BEIGE2 : furMix(rand)) });

  // ---- head (pivot at the neck)
  const head = grp(body, 0, 0.58, 0.22);
  head.scale.setScalar(1.15); // big cute head, like the photo
  S(head, 1, FUR, 0, 0.17, 0.04, { s: [0.24, 0.22, 0.22] });                  // skull
  tufts(head, [0, 0.19, 0.03], [0.24, 0.22, 0.22], 70, { seed: 51, len: 0.08, droop: 0.4, thick: 0.045, cast,
    filter: (n) => (n.y > 0.5 || n.z < 0.1) && !(n.z > 0.45 && n.y < 0.75),
    color: (n, rand) => (Math.abs(n.x) > 0.5 && n.y < 0.7 && rand() < 0.75 ? (rand() < 0.5 ? BEIGE : BEIGE2) : furMix(rand)) }); // messy top, beige at the sides
  // beige patches round the eyes, spreading to the sides
  S(head, 1, BEIGE, -0.11, 0.2, 0.215, { s: [0.12, 0.1, 0.07] });
  S(head, 1, BEIGE, 0.11, 0.2, 0.215, { s: [0.12, 0.1, 0.07] });
  S(head, 1, BEIGE2, -0.17, 0.22, 0.12, { s: [0.08, 0.09, 0.08] });
  S(head, 1, BEIGE2, 0.17, 0.22, 0.12, { s: [0.08, 0.09, 0.08] });
  // big dark shiny eyes
  for (const sd of [-1, 1]) {
    S(head, 1, '#24160f', sd * 0.095, 0.2, 0.255, { s: [0.06, 0.064, 0.05], roughness: 0.15 });
    S(head, 0.018, '#ffffff', sd * 0.095 + 0.02, 0.225, 0.3, { cast: false, roughness: 0.2 });
    S(head, 0.008, '#ffffff', sd * 0.095 - 0.015, 0.18, 0.303, { cast: false });
  }
  // muzzle, button nose, shaggy moustache & beard
  S(head, 1, FUR, 0, 0.1, 0.26, { s: [0.12, 0.09, 0.09] });
  S(head, 1, '#151010', 0, 0.14, 0.34, { s: [0.05, 0.038, 0.035], roughness: 0.3 });
  S(head, 0.012, '#6b6b6b', 0.015, 0.155, 0.37, { cast: false });
  tufts(head, [0, 0.08, 0.26], [0.12, 0.09, 0.09], 40, { seed: 61, len: 0.1, droop: 2.2, thick: 0.035, cast,
    filter: (n) => n.y < 0.2 && n.z > -0.1, color: (n, rand) => furMix(rand) });
  // long floppy ears: beige at the top, grey-brown lower down
  for (const sd of [-1, 1]) {
    const ear = grp(head, sd * 0.22, 0.27, 0.02);
    ear.rotation.z = sd * 0.22;
    S(ear, 1, BEIGE, 0, -0.06, 0, { s: [0.07, 0.11, 0.1] });
    S(ear, 1, EAR_MID, sd * 0.01, -0.19, 0.0, { s: [0.075, 0.12, 0.1] });
    S(ear, 1, EAR_TIP, sd * 0.02, -0.31, 0.0, { s: [0.065, 0.1, 0.085] });
    tufts(ear, [sd * 0.01, -0.2, 0], [0.07, 0.2, 0.09], 40, { seed: 71 + sd, len: 0.12, droop: 2.5, thick: 0.045, cast,
      color: (n, rand) => (n.y > 0.35 ? BEIGE : n.y > -0.35 ? (rand() < 0.5 ? EAR_MID : BEIGE2) : (rand() < 0.6 ? EAR_TIP : EAR_MID)) });
  }

  // Merge each moving part into a few meshes (hundreds of strands -> ~4 draw calls per part)
  for (const part of [head, tail, ...legs, body]) { part.userData.dynamic = true; optimize(part); }
  g.userData.parts = { body, head, tail, legs };
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
