// Joe roams around Floor 1 (Joe's Café) along open aisles between the furniture.
import * as THREE from 'three';
import { shihTzu } from './characters.js';
import { sx } from './building.js';

// Waypoints on Floor 1 (real positions): café half on the left, welcome lounge on the right.
// Edges are walkable straight lines between the furniture.
export const NODES = [
  [-19.6, -5.5],  // 0  café back aisle (behind the window-bar stools' tables)
  [-13.45, -5.5], // 1
  [-6.2, -5.5],   // 2
  [-4.6, -5.0],   // 3  lounge back aisle
  [1.0, -5.0],    // 4
  [9.0, -5.0],    // 5  by the lift
  [-19.2, -1.3],  // 6  café middle aisle (by the vending machines)
  [-13.45, -1.3], // 7
  [-6.2, -1.3],   // 8
  [-4.6, -1.3],   // 9  through the divider
  [-4.6, 3.8],    // 10 lounge front-left
  [1.0, 3.8],     // 11 lounge middle (Joe's nap spot by the tree sofa)
  [9.0, 3.8],     // 12
  [-6.2, 3.8],    // 13 café side of the divider gap
  [-13.45, 7.5],  // 14 café front aisle
  [-6.2, 7.4],    // 15
  [-19.6, 7.6],   // 16
  [-4.6, 7.2],    // 17 entrance, lounge side
  [2.0, 7.0],     // 18 in front of reception
  [8.0, 7.2],     // 19
  [-16.6, 7.6],   // 20 in front of the café till (Joe begs here)
];
export const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [6, 7], [7, 8], [8, 9], [9, 3], [9, 10], [10, 11], [11, 12],
  [4, 11], [1, 7], [7, 14], [2, 8], [8, 13], [13, 15], [13, 10], [15, 17], [17, 18], [18, 19], [14, 15], [14, 20], [20, 16],
  [10, 17], [12, 19], [5, 12], [6, 0]];
const NEXT = NODES.map((_, i) => EDGES.flatMap(([a, b]) => (a === i ? [b] : b === i ? [a] : [])));

const SPEED = 1.0; // m/s
const SPOTS = { 11: 'nap', 20: 'beg', 18: 'admire' }; // special things Joe likes to do at some nodes

export function roamingJoe(floor) {
  const WP = NODES.map(([x, z]) => [sx(1, x), z]); // waypoints on the (40% longer) café floor
  const joe = shihTzu(floor, WP[2][0], 0.02, WP[2][1], 0, 1.0);
  joe.userData.dynamic = true;
  // soft blob shadow (shadow maps are static for speed, so Joe brings his own)
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 20),
    new THREE.MeshBasicMaterial({ color: '#3b2a1a', transparent: true, opacity: 0.22, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.01;
  blob.scale.set(0.9, 1.3, 1);
  joe.add(blob);
  // generous invisible tap target
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.0), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.45;
  hit.userData.info = { title: 'Joe 🐾', text: "The real boss of Joe's Café!\nShih Tzu · Chief Happiness Officer\nWoof!" };
  joe.add(hit);

  const { body, head, tail, legs, setExpression } = joe.userData.parts;
  let expr = '';
  const face = (e) => { if (e !== expr) { expr = e; setExpression(e); } };
  const st = { at: 2, prev: -1, to: -1, wait: 1.5, mode: 'idle', heading: 0, walkT: 0 };

  function pickNext() {
    let opts = NEXT[st.at].filter((n) => n !== st.prev);
    if (!opts.length) opts = NEXT[st.at];
    st.prev = st.at;
    st.to = opts[Math.floor(Math.random() * opts.length)];
    st.mode = 'walk';
  }

  // ---- "come and play": someone calls Joe to a spot; he trots there and plays until released
  const nearestNode = (x, z) => { let b = 0, bd = Infinity; WP.forEach(([nx, nz], i) => { const d = Math.hypot(nx - x, nz - z); if (d < bd) { bd = d; b = i; } }); return b; };
  function nodeRoute(from, to) {                       // breadth-first search over the walking map
    const prev = new Map([[from, -1]]), q = [from];
    while (q.length) { const u = q.shift(); if (u === to) break; for (const v of NEXT[u]) if (!prev.has(v)) { prev.set(v, u); q.push(v); } }
    const path = []; for (let u = to; u !== -1 && u !== undefined; u = prev.get(u)) path.unshift(u);
    return path;
  }
  function visit(x, z) {
    const start = nearestNode(joe.position.x, joe.position.z);
    const route = nodeRoute(start, nearestNode(x, z)).map((i) => WP[i]);
    route.push([x, z]);
    st.route = route; st.mode = 'visit';
    body.scale.y = 1; body.rotation.x = 0;
  }
  function release() {
    if (st.mode !== 'visit' && st.mode !== 'play') return;
    st.route = null;
    st.at = st.prev = -1;
    st.to = nearestNode(joe.position.x, joe.position.z);
    body.position.y = 0; body.rotation.set(0, 0, 0);
    st.mode = 'walk';
  }
  function trot(tx, tz, dt) {                          // one step towards (tx, tz); returns the distance left
    const dx = tx - joe.position.x, dz = tz - joe.position.z;
    const dist = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let diff = Math.atan2(Math.sin(want - st.heading), Math.cos(want - st.heading));
    st.heading += diff * Math.min(1, dt * 8);
    joe.rotation.y = st.heading;
    const step = Math.abs(diff) > 0.6 ? 0 : Math.min(dist, SPEED * 1.4 * dt);
    joe.position.x += (dx / (dist || 1)) * step;
    joe.position.z += (dz / (dist || 1)) * step;
    st.walkT += dt * 14;
    legs.forEach((l, i) => { l.rotation.x = Math.sin(st.walkT + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.6; });
    body.position.y = Math.abs(Math.sin(st.walkT)) * 0.04;
    return dist;
  }

  function update(dt, t) {
    if (st.mode === 'visit') {                           // running over, tail going like mad
      face('happy');
      tail.rotation.z = Math.sin(t * 20) * 0.55;
      const [tx, tz] = st.route[0];
      if (trot(tx, tz, dt) < 0.03) { st.route.shift(); if (!st.route.length) st.mode = 'play'; }
      return;
    }
    if (st.mode === 'play') {                            // hop, spin and wag for the owners
      face(Math.sin(t * 1.3) > -0.3 ? 'happy' : 'pleased');
      tail.rotation.z = Math.sin(t * 20) * 0.55;
      const cycle = t % 6;
      if (cycle < 2.2) {                                 // little hops on the spot
        body.position.y = Math.abs(Math.sin(t * 7)) * 0.16;
        legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 14 + i) * 0.4; });
      } else if (cycle < 3.6) {                          // spin round in a circle
        st.heading += dt * 4.5; joe.rotation.y = st.heading;
        body.position.y = Math.abs(Math.sin(t * 10)) * 0.04;
        legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 16 + (i % 2) * Math.PI) * 0.5; });
      } else {                                           // sit up and paw at them
        body.position.y += (0.05 - body.position.y) * Math.min(1, dt * 6);
        body.rotation.x += (-0.4 - body.rotation.x) * Math.min(1, dt * 6);
        legs[0].rotation.x = -0.8 + Math.sin(t * 9) * 0.4; legs[1].rotation.x = -0.8 + Math.sin(t * 9 + 1.5) * 0.4;
        head.rotation.x = -0.25 + Math.sin(t * 5) * 0.08;
        return;
      }
      body.rotation.x *= 0.8;
      return;
    }
    tail.rotation.z = Math.sin(t * (st.mode === 'walk' ? 14 : st.mode === 'nap' ? 2 : 9)) * (st.mode === 'nap' ? 0.1 : 0.45);

    if (st.mode === 'walk') {
      face('neutral');
      const [tx, tz] = WP[st.to];
      const dx = tx - joe.position.x, dz = tz - joe.position.z;
      const dist = Math.hypot(dx, dz);
      // turn smoothly towards the target
      const want = Math.atan2(dx, dz);
      let diff = want - st.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      st.heading += diff * Math.min(1, dt * 8);
      joe.rotation.y = st.heading;
      const step = Math.abs(diff) > 0.6 ? 0 : Math.min(dist, SPEED * dt); // turn first, then trot
      joe.position.x += (dx / (dist || 1)) * step;
      joe.position.z += (dz / (dist || 1)) * step;
      st.walkT += dt * 11;
      legs.forEach((l, i) => { l.rotation.x = Math.sin(st.walkT + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.55; });
      body.position.y = Math.abs(Math.sin(st.walkT)) * 0.03;
      body.rotation.x = 0;
      head.rotation.set(Math.sin(st.walkT * 0.5) * 0.05, 0, 0);
      if (dist < 0.02) {
        st.at = st.to;
        const spot = SPOTS[st.at];
        if (spot === 'nap' && Math.random() < 0.7) { st.mode = 'nap'; st.wait = 6 + Math.random() * 6; }
        else if (spot && Math.random() < 0.7) { st.mode = spot; st.wait = 3 + Math.random() * 2; }
        else if (Math.random() < 0.35) { st.mode = 'idle'; st.wait = 1 + Math.random() * 2.5; }
        else pickNext();
      }
      return;
    }

    // not walking: settle legs
    legs.forEach((l) => { l.rotation.x *= 0.85; });
    st.wait -= dt;
    if (st.mode === 'nap') {
      face('pleased');
      body.position.y += (-0.12 - body.position.y) * Math.min(1, dt * 4); // lie down
      head.rotation.x += (0.35 - head.rotation.x) * Math.min(1, dt * 3);
      body.scale.y = 1 + Math.sin(t * 2) * 0.03;                        // breathing
    } else if (st.mode === 'beg') {
      face('happy');
      body.rotation.x += (-0.35 - body.rotation.x) * Math.min(1, dt * 5); // sit up & beg
      body.position.y += (0.05 - body.position.y) * Math.min(1, dt * 5);
      head.rotation.x = -0.25 + Math.sin(t * 4) * 0.08;
    } else {
      face(st.mode === 'admire' ? 'happy' : Math.sin(t * 0.7) > 0.3 ? 'alert' : 'neutral');
      body.position.y *= 0.85;
      body.rotation.x *= 0.85;
      head.rotation.y = Math.sin(t * 1.4) * 0.6;   // look around
      head.rotation.x = Math.sin(t * 0.9) * 0.1 - (st.mode === 'admire' ? 0.3 : 0);
    }
    if (st.wait <= 0) {
      body.scale.y = 1; body.rotation.x = 0; head.rotation.set(0, 0, 0);
      pickNext();
    }
  }

  return { group: joe, update, visit, release, get playing() { return st.mode === 'play'; } };
}
