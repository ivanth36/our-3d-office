// Joe roams around Floor 1 (Joe's Café) along open aisles between the furniture.
import * as THREE from 'three';
import { shihTzu } from './characters.js';

// Waypoints in the café's open aisles (floor-local x, z). Edges = walkable straight lines.
const NODES = [
  [-7.4, -3.3],  // 0 nap spot on the sofa-corner rug
  [-3.3, -3.8],  // 1
  [-3.3, -0.1],  // 2
  [-3.3, 3.6],   // 3
  [-2.6, 7.75],  // 4
  [-6.5, 7.75],  // 5 in front of the cashier
  [-10.0, 7.75], // 6
  [2.6, -3.8],   // 7
  [8.4, -3.8],   // 8
  [8.4, -0.1],   // 9
  [8.4, 3.6],    // 10
  [2.6, -0.1],   // 11
  [2.6, 3.6],    // 12
  [5.2, 7.3],    // 13 by the entrance
  [0.5, 7.3],    // 14
  [7.5, -6.2],   // 15
];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [1, 7], [7, 8], [8, 9], [9, 10], [2, 11], [11, 9],
  [3, 12], [12, 10], [4, 14], [14, 13], [13, 10], [8, 15], [11, 12]];
const NEXT = NODES.map((_, i) => EDGES.flatMap(([a, b]) => (a === i ? [b] : b === i ? [a] : [])));

const SPEED = 1.0; // m/s
const SPOTS = { 0: 'nap', 5: 'beg', 13: 'admire' }; // 'admire' = sits and looks up at the street // special things Joe likes to do at some nodes

export function roamingJoe(floor) {
  const joe = shihTzu(floor, NODES[2][0], 0.02, NODES[2][1], 0, 1.0);
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

  function update(dt, t) {
    tail.rotation.z = Math.sin(t * (st.mode === 'walk' ? 14 : st.mode === 'nap' ? 2 : 9)) * (st.mode === 'nap' ? 0.1 : 0.45);

    if (st.mode === 'walk') {
      face('neutral');
      const [tx, tz] = NODES[st.to];
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

  return { group: joe, update };
}
