// Joe the Shih Tzu and the AI employee characters.
import * as THREE from 'three';
import { box, cyl, sphere, grp, makeLabel } from './helpers.js';

const FUR = '#fbf8f3', BEIGE = '#dcc6a6', EAR_MID = '#b5a38e', EAR_TIP = '#7f756b';

/**
 * Joe the Shih Tzu (modelled on Joe's photo): fluffy white coat, long floppy
 * beige-to-grey ears, beige patches round big shiny eyes, open smile + tongue.
 * ~0.75 tall at scale 1. Front faces +Z.
 * g.userData.parts = { body, head, tail, legs[] } so he can be animated.
 */
export function shihTzu(p, x, y, z, ry = 0, s = 1, o = {}) {
  const g = grp(p, x, y, z, ry);
  g.scale.setScalar(s);
  const cast = o.cast ?? true;
  const S = (par, r, c, sx, sy, sz, opt = {}) => sphere(par, r, c, sx, sy, sz, { cast, ...opt });
  const body = grp(g, 0, 0, 0);
  // fluffy body + chest fluff + a hint of beige on the hips
  S(body, 0.27, FUR, 0, 0.31, -0.06, { s: [1, 0.88, 1.25] });
  S(body, 0.19, FUR, 0, 0.36, 0.17, { s: [1.05, 1.1, 0.9] });
  S(body, 0.12, FUR, 0, 0.22, 0.22, { s: [1.2, 0.8, 0.8] });
  S(body, 0.1, BEIGE, -0.2, 0.32, -0.22, { s: [0.6, 1, 1.2] });
  S(body, 0.1, BEIGE, 0.2, 0.32, -0.22, { s: [0.6, 1, 1.2] });
  // legs on hip pivots, with round white paws
  const legs = [];
  for (const [lx, lz] of [[-0.13, 0.15], [0.13, 0.15], [-0.13, -0.25], [0.13, -0.25]]) {
    const hip = grp(g, lx, 0.2, lz);
    S(hip, 0.085, FUR, 0, -0.09, 0, { s: [1, 1.25, 1] });
    S(hip, 0.075, FUR, 0, -0.16, 0.035, { s: [1, 0.6, 1.25] });
    legs.push(hip);
  }
  // plume tail (pivot at its base so it can wag)
  const tail = grp(body, 0, 0.47, -0.32);
  S(tail, 0.15, FUR, 0, 0.1, -0.02, { s: [1, 0.85, 1] });
  S(tail, 0.1, BEIGE, 0.04, 0.18, -0.07);
  // ---- head (pivot at the neck); big chibi head
  const head = grp(body, 0, 0.5, 0.15);
  S(head, 0.27, FUR, 0, 0.17, 0.06);                                  // skull
  for (const [hx, hy, hz, r] of [[0, 0.42, 0.03, 0.11], [-0.11, 0.39, 0.08, 0.09], [0.11, 0.39, 0.08, 0.09], [0, 0.37, 0.16, 0.08], [-0.06, 0.45, -0.04, 0.07], [0.07, 0.44, -0.05, 0.07]]) S(head, r, FUR, hx, hy, hz); // messy top tuft
  S(head, 0.13, FUR, -0.13, 0.03, 0.2, { s: [1, 0.9, 0.9] });         // fluffy cheeks
  S(head, 0.13, FUR, 0.13, 0.03, 0.2, { s: [1, 0.9, 0.9] });
  S(head, 0.13, FUR, 0, -0.03, 0.18, { s: [1.25, 0.85, 0.9] });       // beard / chin
  S(head, 0.09, BEIGE, -0.11, 0.2, 0.25, { s: [1.15, 1, 0.55] });     // beige eye patches
  S(head, 0.09, BEIGE, 0.11, 0.2, 0.25, { s: [1.15, 1, 0.55] });
  S(head, 0.07, BEIGE, 0, 0.3, 0.22, { s: [1.6, 0.6, 0.6] });         // beige across the brow
  for (const sd of [-1, 1]) {                                          // big shiny eyes
    S(head, 0.064, '#ffffff', sd * 0.1, 0.19, 0.29, { cast: false });
    S(head, 0.058, '#15100c', sd * 0.1, 0.19, 0.3, { roughness: 0.2 });
    S(head, 0.017, '#ffffff', sd * 0.1 + 0.02, 0.215, 0.35, { cast: false });
  }
  S(head, 0.11, FUR, 0, 0.1, 0.28, { s: [1.2, 0.85, 0.75] });         // muzzle
  S(head, 0.045, '#15100c', 0, 0.12, 0.37, { s: [1.35, 0.95, 0.9], roughness: 0.3 }); // nose
  S(head, 0.075, '#2a1712', 0, 0.02, 0.32, { s: [1.3, 0.65, 0.5] });  // open mouth
  S(head, 0.045, '#f08a96', 0, -0.03, 0.35, { s: [1, 1.3, 0.55] });   // tongue
  // long floppy ears: beige top, grey-brown lower fringe
  for (const sd of [-1, 1]) {
    const ear = grp(head, sd * 0.25, 0.2, 0.04);
    ear.rotation.z = sd * 0.18;
    S(ear, 0.12, BEIGE, 0, -0.04, 0, { s: [0.7, 1.15, 0.95] });
    S(ear, 0.11, EAR_MID, sd * 0.01, -0.17, 0, { s: [0.68, 1.15, 0.9] });
    S(ear, 0.085, EAR_TIP, sd * 0.02, -0.3, 0.0, { s: [0.7, 1.1, 0.85] });
  }
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
