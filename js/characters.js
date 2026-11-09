// Joe the Shih Tzu and the AI employee characters.
import * as THREE from 'three';
import { box, cyl, sphere, grp, makeLabel } from './helpers.js';

const FUR = '#fbf6ee', TAN = '#c98a4b', DARK = '#6b4126';

/** Joe the Shih Tzu, ~0.6 tall at scale 1. Front faces +Z. */
export function shihTzu(p, x, y, z, ry = 0, s = 1) {
  const g = grp(p, x, y, z, ry);
  g.scale.setScalar(s);
  // body
  sphere(g, 0.26, FUR, 0, 0.3, -0.05, { s: [1, 0.85, 1.25] });
  // legs (fluffy)
  for (const [lx, lz] of [[-0.13, 0.15], [0.13, 0.15], [-0.13, -0.25], [0.13, -0.25]]) sphere(g, 0.08, FUR, lx, 0.09, lz, { s: [1, 1.3, 1] });
  // tail plume
  sphere(g, 0.15, FUR, 0, 0.55, -0.32, { s: [1, 0.8, 1] });
  sphere(g, 0.1, TAN, 0.03, 0.62, -0.36);
  // head
  sphere(g, 0.24, FUR, 0, 0.62, 0.2);
  sphere(g, 0.11, TAN, 0, 0.82, 0.18, { s: [1.3, 0.6, 1] }); // top knot patch
  // ears (long brown)
  sphere(g, 0.12, TAN, -0.22, 0.52, 0.16, { s: [0.7, 1.6, 0.9] });
  sphere(g, 0.12, TAN, 0.22, 0.52, 0.16, { s: [0.7, 1.6, 0.9] });
  // eye patches + eyes
  sphere(g, 0.07, TAN, -0.09, 0.67, 0.38, { s: [1, 0.9, 0.5] });
  sphere(g, 0.07, TAN, 0.09, 0.67, 0.38, { s: [1, 0.9, 0.5] });
  sphere(g, 0.045, '#1c1410', -0.09, 0.67, 0.42);
  sphere(g, 0.045, '#1c1410', 0.09, 0.67, 0.42);
  sphere(g, 0.012, '#ffffff', -0.075, 0.69, 0.462, { cast: false });
  sphere(g, 0.012, '#ffffff', 0.105, 0.69, 0.462, { cast: false });
  // muzzle + nose + tongue
  sphere(g, 0.1, FUR, 0, 0.56, 0.4, { s: [1.2, 0.8, 0.8] });
  sphere(g, 0.035, '#1c1410', 0, 0.6, 0.48);
  sphere(g, 0.025, '#f08a8a', 0, 0.51, 0.47, { s: [1, 0.6, 0.6] });
  // green bow tie + gold paw tag
  sphere(g, 0.06, '#3f8a3f', -0.07, 0.42, 0.3, { s: [1, 0.7, 0.6] });
  sphere(g, 0.06, '#3f8a3f', 0.07, 0.42, 0.3, { s: [1, 0.7, 0.6] });
  sphere(g, 0.03, '#2f6f2f', 0, 0.42, 0.32);
  cyl(g, 0.035, 0.015, '#e8b84a', 0, 0.33, 0.33, { rx: Math.PI / 2, seg: 10, metalness: 0.5 });
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
