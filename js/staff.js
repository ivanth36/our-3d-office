// The AI employees come alive: they work, walk around, take the stairs or the
// lift between floors, and follow little daily routines.
//
// How it works
// - A walking map (graph of waypoints) covers every floor. Each floor's core has
//   the lift and the stairs; the stairs link floor n to n+1, the lift links all floors.
// - Each employee is an "actor" running an async routine: walk somewhere, sit,
//   wait, smoke, run… Movements are promises that finish in the animation loop.
import * as THREE from 'three';
import { H } from './helpers.js';
import { employee } from './characters.js';
import { NODES as JOE_NODES, EDGES as JOE_EDGES } from './joe.js';
import { seat as deskSeat } from './floors.js';
import { sx } from './building.js';   // original-layout x -> real x on the longer floors

const R = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ======================================================================== walking map
const nodes = new Map(); // id -> { id, f, x, z }
const adj = new Map();   // id -> [{ to, type, cost }]
function node(f, name, x, z) {
  const id = `${f}:${name}`;
  nodes.set(id, { id, f, x, z });
  adj.set(id, []);
  return id;
}
function link(a, b, type = 'walk') {
  const A = nodes.get(a), B = nodes.get(b);
  if (!A || !B) throw new Error(`bad link ${a} ${b}`);
  const cost = type === 'walk' ? Math.hypot(A.x - B.x, A.z - B.z) : type === 'stairs' ? 9 : 14 + Math.abs(A.f - B.f) * 2;
  adj.get(a).push({ to: b, type, cost });
  adj.get(b).push({ to: a, type, cost });
}
function chain(...ids) { for (let i = 1; i < ids.length; i++) link(ids[i - 1], ids[i]); }

const LX = 10.8; // walking line through the lift / stairs core
const STAIR_BOTTOM_Z = 6.05, STAIR_TOP_Z = 0.3;

// core of every floor: lift, lobby, landing, stairs
for (let f = 1; f <= 5; f++) {
  node(f, 'liftIn', LX, -6.8);
  node(f, 'liftLobby', LX, -4.6);
  node(f, 'landing', LX, -1.0);
  node(f, 'coreW', 9.0, -1.0);
  chain(`${f}:liftIn`, `${f}:liftLobby`, `${f}:landing`, `${f}:coreW`);
  if (f < 5) {
    node(f, 'coreFront', 9.1, 6.6);
    node(f, 'frontLanding', LX, 6.7);
    node(f, 'stairUp', LX, STAIR_BOTTOM_Z);
    chain(`${f}:coreW`, `${f}:coreFront`, `${f}:frontLanding`, `${f}:stairUp`);
  }
  if (f > 1) { node(f, 'stairDown', LX, STAIR_TOP_Z); link(`${f}:landing`, `${f}:stairDown`); }
}
for (let f = 1; f < 5; f++) link(`${f}:stairUp`, `${f + 1}:stairDown`, 'stairs');
for (let a = 1; a <= 5; a++) for (let b = a + 1; b <= 5; b++) link(`${a}:liftIn`, `${b}:liftIn`, 'lift');

// ---- Floor 1: Joe's café aisles (shared with Joe's roaming map)
JOE_NODES.forEach(([x, z], i) => node(1, `j${i}`, x, z));
JOE_EDGES.forEach(([a, b]) => link(`1:j${a}`, `1:j${b}`));
link('1:coreW', '1:j9');
link('1:coreFront', '1:j10');
node(1, 'cashier', -7.4, 7.15); link('1:cashier', '1:j5');
node(1, 'cashier2', -6.5, 7.35); link('1:cashier2', '1:j5');   // second customer waits beside

// Jennie's way from the till, out behind the counter, to the red vending machines (left wall)
chain(node(1, 'jBehind', -7.4, 2.0), node(1, 'jExit', -4.6, 1.95), node(1, 'jSide', -4.6, 0.6), node(1, 'jWest', -9.8, 0.4), node(1, 'vend1', -10.35, -0.85), node(1, 'vend2', -10.35, -1.9));

const CAFE_SEATS = [];
function cafeSeat(name, stand, access, x, z, ry, y = 0) {
  const id = node(1, name, stand[0], stand[1]);
  link(id, `1:${access}`);
  CAFE_SEATS.push({ node: id, x, z, ry, y });
}
for (const [i, acc] of [[3, 'j1'], [6, 'j1'], [10, 'j7'], [14, 'j15']]) {   // high bar stools facing the window
  const x = -5.55 + 0.8 * i;
  cafeSeat(`bar${i}`, [x, -6.1], acc, x, -6.85, Math.PI, 0.26);
}
cafeSeat('sofa', [-7.6, -6.2], 'j0', -7.7, -7.05, 0, 0.04);                    // sofa corner
cafeSeat('table5', [3.6, 4.33], 'j12', 3.26, 4.69, 2.39 + Math.PI);             // round tables
cafeSeat('table0', [-0.16, -0.96], 'j11', -0.51, -1.31, Math.PI / 4 + Math.PI);
// seats used when Aida and Mary go for coffee together (next to each other)
const pairSeat = (name, stand, access, x, z, ry, y = 0) => { const id = node(1, name, stand[0], stand[1]); link(id, `1:${access}`); return { node: id, x, z, ry, y }; };
const byNode = (id) => CAFE_SEATS.find((q) => q.node === id);
const CAFE_PAIRS = [
  [byNode('1:bar3'), pairSeat('bar4', [-2.35, -6.1], 'j1', -2.35, -6.85, Math.PI, 0.26)],
  [byNode('1:table0'), pairSeat('table0b', [-2.24, -0.96], 'j2', -1.89, -1.31, 7 * Math.PI / 4 + Math.PI)],
];

// ---- Floor 2: music room (glass lounge, front-left)
chain('2:coreFront', node(2, 'musicOut', -2.8, 7.15), node(2, 'musicIn', -4.0, 7.15), node(2, 'musicMid', -5.3, 4.0), node(2, 'lounge', -8.6, 3.95));
link('2:musicMid', node(2, 'drumStand', -6.6, 5.0));
link('2:musicMid', node(2, 'pianoStand', -5.25, 4.6));
const LOUNGE_SEAT = { node: '2:lounge', x: -9.3, z: 4.6, ry: Math.PI, y: 0 };
const DRUM_SEAT = { node: '2:drumStand', x: -6.6, z: 5.8, ry: 0, y: 0.05, act: 'drum' };
const PIANO_SEAT = { node: '2:pianoStand', x: -4.6, z: 4.6, ry: Math.PI / 2, y: 0, typing: true, act: 'piano' };
const COMPOSE_SEAT = { node: '2:musicMid', x: -5.4, z: 3.25, ry: Math.PI, y: 0, typing: true };   // music PC desk

// ---- Floor 2: open space, living room sofa, kitchen, dining table
node(2, 'f2mid', 1.5, -0.2);                        // open space between living room & kitchen
link('2:coreW', '2:f2mid');
chain('2:f2mid', node(2, 'livFront', -3.2, -2.0), node(2, 'sofaStandA', -5.3, -2.0), node(2, 'sofaStandB', -7.3, -2.0));
chain('2:livFront', node(2, 'westAisle', -2.7, 0.8), '2:musicOut');           // short way to the music room
chain('2:coreW', node(2, 'kIn', 8.2, -1.8), node(2, 'kLane', 8.1, -5.2));
link('2:kLane', node(2, 'stove', 6.7, -6.6));
link('2:kLane', node(2, 'islandBack', 5.6, -4.7));
link('2:kLane', node(2, 'sink', 8.25, -6.1));
link('2:stove', '2:islandBack');
chain('2:kIn', node(2, 'dineE', 8.0, 1.8), node(2, 'dineStandP', 4.68, 2.2), node(2, 'dineStandI', 3.4, 2.2));
link('2:f2mid', '2:dineStandI');
const SOFA_TV_PHIL = { node: '2:sofaStandA', x: -5.3, z: -1.2, ry: Math.PI, y: 0.04 };   // facing the TV
const SOFA_TV_IVAN = { node: '2:sofaStandB', x: -7.3, z: -1.2, ry: Math.PI, y: 0.04 };
const DINE_IVAN = { node: '2:dineStandI', x: 3.4, z: 2.85, ry: 0, y: 0 };
const DINE_PHIL = { node: '2:dineStandP', x: 4.68, z: 2.85, ry: 0, y: 0 };
// café sofa corner for the owners
const CAFE_SOFA_IVAN = { node: '1:sofa', x: -7.7, z: -7.05, ry: 0, y: 0.04 };
const CAFE_SOFA_PHIL = { node: '1:sofa', x: -8.7, z: -7.05, ry: 0, y: 0.04 };

// ---- Floors 3 & 4: aisle behind the shared desk + meeting room
for (const f of [3, 4]) {
  const aisle = [5, 6, 7, 8, 9].map((i) => node(f, `desk${i}`, deskSeat(i).x, -0.9));
  chain(...aisle, node(f, 'aisleE', 2.6, -0.9), `${f}:coreW`);
  chain(`${f}:aisleE`, node(f, 'meetDoorOut', 2.6, -1.8), node(f, 'meetDoorIn', 2.6, -3.0), node(f, 'meetA', 4.15, -3.0), node(f, 'meetB', 5.45, -3.0));
}
const deskSeatFor = (f, i) => ({ node: `${f}:desk${i}`, ...deskSeat(i), y: 0, typing: true });
const MEET_SEATS = { mary: { node: '3:meetA', x: 4.15, z: -3.65, ry: Math.PI, y: 0 }, aida: { node: '3:meetB', x: 5.45, z: -3.65, ry: Math.PI, y: 0 } };

// ---- Floor 5: roof garden + glass gym
node(5, 'rMid', 7.6, 1.0);
node(5, 'smokeJ', 3.7, 6.1);
node(5, 'smokeE', 2.6, 6.1);
node(5, 'rPole', -1.4, -1.2);
node(5, 'gymOut', -3.6, 0.0);
node(5, 'gymIn', -3.6, -1.3);
node(5, 'treadFront', -9.0, -4.5);
chain('5:coreW', '5:rMid', '5:smokeJ', '5:smokeE');
link('5:rMid', '5:rPole');
link('5:coreW', '5:rPole');
chain('5:rPole', '5:gymOut', '5:gymIn');
chain('5:rPole', node(5, 'meetJ', -2.6, 0.6), '5:gymOut');   // JungKook waits here, just outside the gym
node(5, 'yoga', -9.6, -2.2);
node(5, 'barbell', -5.9, -2.5);
// Ivan's gym spots (next to Eugene's) and the vending machine outside
node(5, 'ivanMeet', -6.5, -2.6); link('5:ivanMeet', '5:gymIn');
node(5, 'treadFront2', -10.6, -4.5); link('5:treadFront2', '5:gymIn'); link('5:treadFront2', '5:treadFront');
node(5, 'ivanBarbell', -4.4, -2.6); link('5:ivanBarbell', '5:gymIn'); link('5:ivanBarbell', '5:ivanMeet');
node(5, 'ivanYoga', -8.6, -2.2); link('5:ivanYoga', '5:ivanMeet');
node(5, 'vendFront', -1.1, -2.3); link('5:vendFront', '5:rPole');
const TREAD = { x: -9.0, z: -6.3, y: 0.23 };
const TREAD2_X = -10.6;

// glass doors: walking between these node pairs goes through a door
const DOOR_EDGES = {};
const doorEdge = (a, b, id) => { DOOR_EDGES[`${a}|${b}`] = id; DOOR_EDGES[`${b}|${a}`] = id; };
doorEdge('2:musicOut', '2:musicIn', '2:music');
doorEdge('3:meetDoorOut', '3:meetDoorIn', '3:meet');
doorEdge('4:meetDoorOut', '4:meetDoorIn', '4:meet');
doorEdge('5:gymOut', '5:gymIn', '5:gym');

function route(from, to, via) {
  if (from === to) return [from];
  const dist = new Map([[from, 0]]), prev = new Map(), open = new Set([from]);
  while (open.size) {
    let u = null, best = Infinity;
    for (const n of open) { const d = dist.get(n); if (d < best) { best = d; u = n; } }
    open.delete(u);
    if (u === to) break;
    for (const e of adj.get(u)) {
      if (via === 'stairs' && e.type === 'lift') continue;
      if (via === 'lift' && e.type === 'stairs') continue;
      const nd = best + e.cost;
      if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, u); open.add(e.to); }
    }
  }
  if (!prev.has(to)) throw new Error(`no route ${from} -> ${to}`);
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0]));
  return path;
}
const edgeType = (a, b) => adj.get(a).find((e) => e.to === b).type;

// ======================================================================== lift
export function createLift(car) {
  const L = {
    car, viewY: 0.02, busy: false, waiters: [], target: null, onArrive: null, moved: false,
    acquire() {
      if (!L.busy) { L.busy = true; return Promise.resolve(); }
      return new Promise((r) => L.waiters.push(r));
    },
    release() {
      const w = L.waiters.shift();
      if (w) w(); else { L.busy = false; L.target = null; }
    },
    bring(f) { L.target = (f - 1) * H + 0.02; return new Promise((r) => { L.onArrive = r; }); },
    floor() { return Math.round((car.position.y - 0.02) / H) + 1; },
    update(dt) {
      const ty = L.target ?? L.viewY;
      const d = ty - car.position.y;
      L.moved = Math.abs(d) > 0.001;
      if (L.moved) car.position.y += Math.sign(d) * Math.min(Math.abs(d), dt * 2.4);
      else if (L.onArrive && L.target !== null) { const r = L.onArrive; L.onArrive = null; r(); }
    },
  };
  return L;
}

// ======================================================================== smoke puffs
function createPuffs(n = 16) {
  const geo = new THREE.SphereGeometry(1, 8, 6);
  const pool = Array.from({ length: n }, () => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#e9e6e0', transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false;
    return { m, life: 0 };
  });
  const tmp = new THREE.Vector3();
  return {
    spawn(fromObj, parent) {
      const p = pool.find((q) => q.life <= 0);
      if (!p) return;
      fromObj.getWorldPosition(tmp);
      parent.add(p.m);
      parent.worldToLocal(p.m.position.copy(tmp));
      p.life = 2.6; p.m.visible = true;
    },
    update(dt) {
      for (const p of pool) {
        if (p.life <= 0) continue;
        p.life -= dt;
        const k = 1 - p.life / 2.6;
        p.m.position.y += dt * 0.3;
        p.m.position.x += dt * 0.05;
        p.m.scale.setScalar(0.04 + k * 0.16);
        p.m.material.opacity = 0.55 * (1 - k);
        if (p.life <= 0) p.m.visible = false;
      }
    },
  };
}

// ======================================================================== actor
class Actor {
  constructor(world, e, rig) {
    this.w = world; this.e = e; this.rig = rig; this.g = rig.group;
    this.task = null; this.anim = 'idle'; this.walkT = 0; this.heading = this.g.rotation.y;
    this.smoking = false; this.holdCup = false; this.talking = false; this.puffT = 0;
    this.talkFor = 0; this.act = null; // act: 'drum' | 'piano' | 'yoga' | 'barbell' | 'cook' | 'wash' | 'eat'
    this.carry = false; this.sipping = false;
    // soft blob shadow (shadow maps are static, so moving people bring their own)
    this.g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.3, 18), new THREE.MeshBasicMaterial({ color: '#3b2a1a', transparent: true, opacity: 0.2, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.position.y = 0.012;
    this.g.add(this.blob);
  }
  set status(s) { this.e.status = s; }
  toFloor(f) { this.floor = f; this.w.floors[f - 1].add(this.g); }
  at(id) { const n = nodes.get(id); this.node = id; this.toFloor(n.f); this.g.position.set(sx(n.f, n.x), 0, n.z); }

  // ---- promise helpers (resolved from update())
  _task(fn) { return new Promise((res) => { this.task = { fn, res }; }); }
  sleep(sec, breakIf) { let t = sec; return this._task((dt) => (t -= dt) <= 0 || (breakIf && breakIf())); }
  waitFor(cond, timeout = Infinity) { let t = timeout; return this._task((dt) => cond() || (t -= dt) <= 0); }
  turnTo(ry) {
    return this._task((dt) => {
      let d = Math.atan2(Math.sin(ry - this.heading), Math.cos(ry - this.heading));
      this.heading += d * Math.min(1, dt * 10);
      this.g.rotation.y = this.heading;
      return Math.abs(d) < 0.03;
    });
  }
  face(x, z) { x = sx(this.floor, x); return this.turnTo(Math.atan2(x - this.g.position.x, z - this.g.position.z)); }
  moveTo(x, z, speed = 1.25) {
    x = sx(this.floor, x);
    this.anim = 'walk';
    return this._task((dt) => {
      const p = this.g.position, dx = x - p.x, dz = z - p.z, dist = Math.hypot(dx, dz);
      if (dist < 0.02) { p.x = x; p.z = z; this.anim = 'idle'; return true; }
      const want = Math.atan2(dx, dz);
      const d = Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading));
      this.heading += d * Math.min(1, dt * 9);
      this.g.rotation.y = this.heading;
      if (Math.abs(d) < 0.8) { const s = Math.min(dist, speed * dt); p.x += dx / dist * s; p.z += dz / dist * s; }
      return false;
    });
  }
  /** Walk the stair flight between floor `lower` and `lower+1` (up or down). */
  climb(lower, up) {
    this.toFloor(lower);
    this.anim = 'walk';
    const len = Math.hypot(H, STAIR_BOTTOM_Z - STAIR_TOP_Z);
    let u = up ? 0 : 1;
    this.heading = up ? Math.PI : 0; this.g.rotation.y = this.heading;
    return this._task((dt) => {
      u += (up ? 1 : -1) * dt * 0.9 / len;
      const k = Math.min(1, Math.max(0, u));
      this.g.position.set(LX, H * k, STAIR_BOTTOM_Z + (STAIR_TOP_Z - STAIR_BOTTOM_Z) * k);
      if ((up && u >= 1) || (!up && u <= 0)) {
        this.anim = 'idle';
        const f = up ? lower + 1 : lower;
        this.toFloor(f);
        this.g.position.set(LX, 0, up ? STAIR_TOP_Z : STAIR_BOTTOM_Z);
        return true;
      }
      return false;
    });
  }

  /** Walk (and ride / climb) to a node. via: 'stairs' | 'lift' | undefined (fastest). */
  async go(to, via) {
    const path = route(this.node, to, via);
    const lift = this.w.lift;
    let releaseAfterWalk = false;
    for (let i = 1; i < path.length; i++) {
      const A = nodes.get(path[i - 1]), B = nodes.get(path[i]);
      const type = edgeType(A.id, B.id);
      if (type === 'walk') {
        const nextLift = i + 1 < path.length && edgeType(B.id, path[i + 1]) === 'lift';
        if (nextLift) {
          const old = this.e.status;
          this.status = 'Waiting for the lift';
          await lift.acquire();
          await lift.bring(B.f);
          this.status = old;
        }
        const door = this.w.doors[DOOR_EDGES[`${A.id}|${B.id}`]];
        if (door) {                               // open the door, walk through, let it close behind
          door.users++;
          await this.waitFor(() => door.isOpen(), 3);
        }
        await this.moveTo(B.x, B.z);
        if (door) door.users--;
        if (nextLift) {                      // step into the car and turn to face the door
          lift.car.add(this.g);
          this.g.position.set(0, 0.12, 0);
          await this.turnTo(0);
        }
        if (releaseAfterWalk) { lift.release(); releaseAfterWalk = false; }
      } else if (type === 'lift') {
        await lift.bring(B.f);
        this.toFloor(B.f);
        this.g.position.set(sx(B.f, B.x), 0, B.z);
        releaseAfterWalk = true;
      } else {                                 // stairs
        await this.climb(Math.min(A.f, B.f), B.f > A.f);
      }
      this.node = B.id;
    }
    if (releaseAfterWalk) lift.release();
  }

  async sit(seat) {
    await this.moveTo(seat.x, seat.z, 0.8);
    this.heading = seat.ry; this.g.rotation.y = seat.ry;
    this.rig.setPose('sit', { typing: !!seat.typing });
    this.g.position.y = seat.y ?? 0;
    this.blob.visible = (seat.y ?? 0) < 0.1;
    this.seat = seat;
    this.act = seat.act ?? null;
  }
  async stand() {
    if (!this.seat) return;
    const n = nodes.get(this.seat.node);
    this.act = null;
    this.rig.setPose('stand');
    this.g.position.y = 0;
    this.blob.visible = true;
    this.seat = null;
    await this.moveTo(n.x, n.z, 0.8);
    this.node = n.id;
  }
  async goSit(seat, via) {
    if (this.seat === seat) return;              // already sitting there
    await this.stand(); await this.go(seat.node, via); await this.sit(seat);
  }
  async goStand(id, via) { await this.stand(); await this.go(id, via); }

  update(dt, t) {
    if (this.talkFor > 0) this.talkFor -= dt;
    if (this.task && this.task.fn(dt, t)) { const r = this.task.res; this.task = null; r(); }
    this.animate(dt, t);
  }
  animate(dt, t) {
    const r = this.rig, [hl, hr] = r.hips, [sl, sr] = r.shoulders;
    const chatting = this.talking || this.talkFor > 0;
    const ease = (o, k, v) => { o[k] += (v - o[k]) * Math.min(1, dt * 6); };
    if (r.pose === 'sit') {
      if (this.act === 'drum') {                       // drumming: sticks up and down, head bobbing
        sl.rotation.x = -1.15 + Math.sin(t * 13) * 0.35;
        sr.rotation.x = -1.15 + Math.sin(t * 13 + Math.PI) * 0.35;
        r.head.rotation.x = Math.sin(t * 6.5) * 0.09;
        r.body.position.y = r.baseY + Math.abs(Math.sin(t * 6.5)) * 0.015;
      } else if (this.act === 'piano') {               // playing the keyboard, swaying
        r.body.position.y = r.baseY + Math.abs(Math.sin(t * 9 + r.phase)) * 0.012;
        r.body.rotation.z = Math.sin(t * 1.2) * 0.06;
        r.head.rotation.z = Math.sin(t * 1.2) * 0.1;
      } else if (this.act === 'eat') {                 // eating: fork to mouth now and then
        sr.rotation.x = -0.9 - Math.max(0, Math.sin(t * 1.6 + r.phase)) * 1.1;
        sl.rotation.x = -0.9;
        r.head.rotation.x = (this.talking ? Math.sin(t * 5) * 0.05 : 0) + 0.1;
      } else if (r.typing) {
        r.head.rotation.x = Math.sin(t * 1.3 + r.phase) * 0.06;
        r.head.rotation.y = Math.sin(t * 0.5 + r.phase) * 0.12;
        r.body.position.y = r.baseY + Math.abs(Math.sin(t * 6 + r.phase)) * 0.008;
      } else {
        r.head.rotation.y = Math.sin(t * 0.4 + r.phase) * 0.35;
        r.head.rotation.x = chatting ? Math.sin(t * 5) * 0.06 : 0;
        if (this.holdCup) sl.rotation.x = -0.9 - Math.max(0, Math.sin(t * 0.5 + r.phase)) * 1.2; // sip
      }
      return;
    }
    const moving = this.anim === 'walk' || this.anim === 'run';
    if (this.carry) { sl.rotation.x = -1.1; sr.rotation.x = -1.1; }   // carrying the tray with both hands
    if (moving) {
      const run = this.anim === 'run';
      this.walkT += dt * (run ? 13 : 8.5);
      const s = Math.sin(this.walkT), amp = run ? 0.85 : 0.5;
      hl.rotation.x = s * amp; hr.rotation.x = -s * amp;
      if (!this.carry) {
        sl.rotation.x = this.holdCup ? -0.9 : -s * amp * 0.8;
        if (!this.smoking) sr.rotation.x = s * amp * 0.8;
      }
      r.body.position.y = r.baseY + Math.abs(Math.cos(this.walkT)) * (run ? 0.05 : 0.025);
      r.head.position.y = 1.25 + Math.abs(Math.cos(this.walkT)) * (run ? 0.05 : 0.025);
    } else if (this.act === 'yoga') {                    // cycle: arms up -> tree pose -> warrior
      const c = Math.floor(t / 4) % 3;
      ease(sl.rotation, 'x', c === 2 ? 0 : -3.0); ease(sr.rotation, 'x', c === 2 ? 0 : -3.0);
      ease(sl.rotation, 'z', c === 2 ? -1.5 : 0); ease(sr.rotation, 'z', c === 2 ? 1.5 : 0);
      ease(hl.rotation, 'x', c === 2 ? 0.45 : 0); ease(hr.rotation, 'x', c === 1 ? -0.7 : c === 2 ? -0.35 : 0);
      ease(hr.rotation, 'z', c === 1 ? 0.8 : 0);
      r.body.position.y = r.baseY; r.head.position.y = 1.25;
    } else if (this.act === 'cook' || this.act === 'wash' || this.act === 'restock') {   // hands busy
      const sp = this.act === 'wash' ? 9 : 5;
      sl.rotation.x = -1.15 + Math.sin(t * sp) * 0.15;
      sr.rotation.x = -1.15 + Math.sin(t * sp + 1.7) * 0.15;
      r.head.rotation.x = 0.25;
      r.body.position.y = r.baseY; r.head.position.y = 1.25;
    } else if (this.act === 'barbell') {                 // overhead press
      const th = -2.1 - 0.8 * Math.sin(t * 1.8);
      sl.rotation.x = th; sr.rotation.x = th;
      r.barbell.position.set(0, 0.4 - 0.38 * Math.cos(th), -0.38 * Math.sin(th));
      hl.rotation.x *= 0.8; hr.rotation.x *= 0.8;
      r.body.position.y = r.baseY; r.head.position.y = 1.25;
    } else {
      hl.rotation.x *= 0.8; hr.rotation.x *= 0.8; hr.rotation.z *= 0.8;
      if (this.carry) { /* arms stay forward */ }
      else if (this.holdCup && this.sipping) sl.rotation.x = -0.9 - Math.max(0, Math.sin(t * 0.9 + r.phase)) * 1.45; // drinking
      else sl.rotation.x = this.holdCup ? -0.9 : sl.rotation.x * 0.8;
      sl.rotation.z *= 0.8;
      if (!this.smoking && !this.carry) { sr.rotation.x *= 0.8; sr.rotation.z *= 0.8; }
      r.body.position.y = r.baseY; r.head.position.y = 1.25;
      r.head.rotation.x = chatting ? Math.sin(t * 5 + r.phase) * 0.07 : 0;
      // standing still with nothing to do: look around a little
      r.head.rotation.y = chatting ? r.head.rotation.y * 0.9 : Math.sin(t * 0.45 + r.phase) * 0.45;
    }
    if (this.smoking) {
      const c = (t * 0.22 + r.phase) % 1;               // hand to mouth every ~4.5 s
      const want = c < 0.3 ? -2.45 : -0.35;
      sr.rotation.x += (want - sr.rotation.x) * Math.min(1, dt * 6);
      sr.rotation.z = c < 0.3 ? 0.35 : 0;
      this.puffT -= dt;
      if (c > 0.3 && c < 0.42 && this.puffT <= 0) {    // breathe out a puff
        this.w.puffs.spawn(r.head, this.g.parent); this.puffT = 0.25;
      } else if (Math.random() < dt * 0.8) {            // a little smoke from the cigarette
        this.w.puffs.spawn(r.cig, this.g.parent);
      }
    }
  }
}

// ======================================================================== routines
const flags = {
  smokeCall: false, eugeneReady: false, smokeGo: false, smokeDone: false,
  aidaAtDesk: true, maryAtDesk: true, meetingCall: false, aidaInMeeting: false, meetingOver: false,
  cafeInvite: false, cafePair: null, marySeated: false, cafeDone: false,
  drumUser: null,
  // Ivan & Phil
  ivanGym: false, gymPhase: null, eugeneInSession: false,
  dinnerReady: false, philSeated: false, dinnerDone: false,
  philCafe: false, f2Chill: false, philF2: false, chillDone: false, ownersAtCafe: false,
};

// ---- shared gym moves (Eugene and Ivan use their own machine / spot)
async function treadmillOn(a, tx, front) {
  await a.go(front);
  await a.moveTo(tx, -5.5);
  a.g.position.y = TREAD.y;
  await a.moveTo(tx, TREAD.z, 0.6);
  await a.turnTo(0);
  a.anim = 'run';
}
async function treadmillOff(a, tx, front) {
  a.anim = 'idle';
  await a.moveTo(tx, -5.5, 0.8);
  a.g.position.y = 0;
  const n = nodes.get(front);
  await a.moveTo(n.x, n.z);
  a.node = front;
}
async function barbellOn(a, spot) { await a.go(spot); await a.turnTo(0.3); a.rig.barbell.visible = true; a.act = 'barbell'; }
function barbellOff(a) { a.act = null; a.rig.barbell.visible = false; }
async function yogaOn(a, spot) { await a.go(spot); await a.turnTo(0); a.act = 'yoga'; }
function yogaOff(a) { a.act = null; }

async function jungkook(a) {
  const home = deskSeatFor(3, a.e.seat);
  for (;;) {
    a.status = 'Working on the KRW analysis';
    await a.sleep(R(25, 40));
    a.status = 'Walking up the stairs to see Eugene';
    await a.goStand('5:meetJ', 'stairs');
    await a.face(-3.6, 0.0);
    a.status = 'Waiting for Eugene outside the gym';
    flags.smokeCall = true;
    await a.waitFor(() => flags.eugeneReady, 240);
    if (!flags.eugeneReady) {                          // Eugene is busy training with Ivan
      flags.smokeCall = false;
      a.status = 'Eugene is busy · back to work';
      await a.goSit(home, 'lift');
      continue;
    }
    a.status = 'Chatting with Eugene';
    a.talking = true; await a.sleep(4); a.talking = false;
    flags.smokeGo = true;
    a.status = 'Off to the roof garden for a smoke';
    await a.go('5:smokeJ');
    await a.face(2.6, 6.1);
    a.status = 'Smoke break with Eugene';
    a.rig.cig.visible = true; a.smoking = true; a.talking = true;
    await a.sleep(R(12, 16));
    a.rig.cig.visible = false; a.smoking = false; a.talking = false;
    flags.smokeDone = true;
    a.status = 'Taking the lift back down to Floor 3';
    await a.goSit(home, 'lift');
  }
}

async function eugene(a) {
  const bottle = a.g.userData.bottle;
  const holdBottle = (v) => { if (bottle) bottle.visible = v; };
  const backHome = async () => { await a.go('5:home'); await a.turnTo(a.e.ry ?? 0); };
  const smokeTime = async () => {
    a.status = 'Heading out to meet JungKook';
    await a.go('5:gymOut');                          // through the glass door
    await a.face(-2.6, 0.6);
    flags.eugeneReady = true;
    a.talking = true;
    await a.waitFor(() => flags.smokeGo, 30);
    a.talking = false;
    a.status = 'Off to the roof garden for a smoke';
    holdBottle(false);
    await a.go('5:smokeE');
    await a.face(3.7, 6.1);
    a.status = 'Smoke break with JungKook';
    a.rig.cig.visible = true; a.smoking = true; a.talking = true;
    await a.waitFor(() => flags.smokeDone, 40);
    a.rig.cig.visible = false; a.smoking = false; a.talking = false;
    flags.smokeCall = flags.eugeneReady = flags.smokeGo = flags.smokeDone = false;
    a.status = 'Back to the gym';
    holdBottle(true);
    await backHome();
  };
  const called = () => flags.smokeCall || flags.ivanGym;
  // training session led by Ivan: follow his phases (chat -> treadmill -> barbell -> yoga)
  const trainWithIvan = async () => {
    flags.eugeneInSession = true;
    let cur = null;
    const stop = async () => {
      if (cur === 'tread') await treadmillOff(a, TREAD.x, '5:treadFront');
      else if (cur === 'barbell') barbellOff(a);
      else if (cur === 'yoga') yogaOff(a);
      a.talking = false; cur = null;
    };
    while (flags.ivanGym) {
      const ph = flags.gymPhase;
      if (ph !== cur) {
        await stop();
        if (ph === 'chat') { await a.go('5:home'); await a.face(-6.5, -2.6); a.talking = true; a.status = 'Chatting with Ivan'; holdBottle(true); }
        else if (ph === 'tread') { a.status = 'Running on the treadmill with Ivan'; holdBottle(true); await treadmillOn(a, TREAD.x, '5:treadFront'); }
        else if (ph === 'barbell') { a.status = 'Lifting the barbell with Ivan'; holdBottle(false); await barbellOn(a, '5:barbell'); }
        else if (ph === 'yoga') { a.status = 'Yoga with Ivan'; holdBottle(false); await yogaOn(a, '5:yoga'); }
        cur = ph;
      }
      await a.sleep(0.3);
    }
    await stop();
    holdBottle(true);
    flags.eugeneInSession = false;
    a.status = 'Back to the gym';
    await backHome();
  };
  for (;;) {
    if (flags.ivanGym) { await trainWithIvan(); continue; }
    if (flags.smokeCall) { await smokeTime(); continue; }
    const act = pick(['coach', 'treadmill', 'barbell', 'yoga']);
    if (act === 'coach') {
      a.status = 'Coaching in the gym';
      await a.sleep(R(8, 14), called);
    } else if (act === 'treadmill') {
      a.status = 'Running on the treadmill';
      await treadmillOn(a, TREAD.x, '5:treadFront');
      await a.sleep(R(15, 25), called);
      await treadmillOff(a, TREAD.x, '5:treadFront');
      await backHome();
    } else if (act === 'barbell') {
      a.status = 'Lifting the barbell';
      holdBottle(false);
      await barbellOn(a, '5:barbell');
      await a.sleep(R(12, 18), called);
      barbellOff(a); holdBottle(true);
      await backHome();
    } else {
      a.status = 'Doing yoga';
      holdBottle(false);
      await yogaOn(a, '5:yoga');
      await a.sleep(R(12, 20), called);
      yogaOff(a); holdBottle(true);
      await backHome();
    }
  }
}

async function buyCoffee(a, spot, via = 'lift') {
  a.w.cafeQueue++;                                  // Jennie heads back to the till
  await a.goStand(spot, via);
  await a.turnTo(Math.PI);
  if (!a.w.jennieAtTill) {
    const old = a.e.status;
    a.status = 'Waiting for Jennie at the counter';
    await a.waitFor(() => a.w.jennieAtTill, 60);
    a.status = old;
  }
  a.status = 'Buying a coffee from Jennie';
  a.w.serve();
  await a.sleep(4);
  a.w.cafeQueue = Math.max(0, a.w.cafeQueue - 1);
  a.rig.cup.visible = true; a.holdCup = true;
}

async function aida(a) {
  const home = deskSeatFor(3, a.e.seat);
  const meeting = async () => {
    flags.aidaAtDesk = false;
    a.status = 'Going to a meeting with Mary';
    await a.goSit(MEET_SEATS.aida);
    flags.aidaInMeeting = true;
    a.status = 'In a meeting with Mary';
    a.talking = true;
    await a.waitFor(() => flags.meetingOver, 120);
    a.talking = false;
    a.status = 'Back to my desk';
    await a.goSit(home);
    flags.aidaInMeeting = false;
    flags.aidaAtDesk = true;
  };
  for (;;) {
    flags.aidaAtDesk = true;
    a.status = 'Writing the AI newsletter';
    await a.sleep(R(20, 35), () => flags.meetingCall);
    if (flags.meetingCall) { await meeting(); continue; }
    // coffee run — sometimes she asks Mary to come along
    flags.aidaAtDesk = false;
    const withMary = flags.maryAtDesk && !flags.meetingCall && Math.random() < 0.6;
    if (withMary) {
      flags.cafePair = pick(CAFE_PAIRS);
      flags.cafeDone = false; flags.marySeated = false;
      flags.cafeInvite = true;
      a.status = "Asked Mary along · taking the lift down to Joe's Café";
    } else {
      a.status = "Taking the lift down to Joe's Café for coffee";
    }
    await buyCoffee(a, '1:cashier');
    const seat = withMary ? flags.cafePair[0] : pick(CAFE_SEATS.filter((q) => !(flags.ownersAtCafe && q.node === '1:sofa')));
    a.status = withMary ? 'Saving seats for Mary' : "Enjoying a coffee at Joe's Café";
    await a.goSit(seat);
    if (withMary) {
      await a.waitFor(() => flags.marySeated, 90);
      a.status = "Coffee with Mary at Joe's Café";
      a.talking = true;
    }
    await a.sleep(R(14, 22));
    a.talking = false;
    if (withMary) { flags.cafeDone = true; flags.cafeInvite = false; }
    a.status = 'Walking back up the stairs to Floor 3';
    await a.goSit(home, 'stairs');
    a.rig.cup.visible = false; a.holdCup = false;
    flags.aidaAtDesk = true;
  }
}

async function xiaoming(a) {
  const home = deskSeatFor(3, a.e.seat);
  for (;;) {
    a.status = 'Tracking the SGD to CNY rate';
    await a.sleep(R(30, 45));
    a.status = 'Walking down to the Floor 2 music room';
    await a.goSit(LOUNGE_SEAT, 'stairs');
    a.status = 'Chilling in the music room';
    await a.sleep(R(12, 20));
    if (!flags.drumUser) {
      flags.drumUser = 'XiaoMing';
      a.status = 'Playing the drums';
      await a.goSit(DRUM_SEAT);
      await a.sleep(R(8, 12));
      await a.stand();
      flags.drumUser = null;
    }
    a.status = 'Playing the keyboard';
    await a.goSit(PIANO_SEAT);
    await a.sleep(R(8, 12));
    a.status = 'Walking back up to Floor 3';
    await a.goSit(home, 'stairs');
  }
}

async function mary(a) {
  const home = deskSeatFor(3, a.e.seat);
  const cafe = async () => {
    flags.maryAtDesk = false;
    a.status = "Going for coffee with Aida";
    await buyCoffee(a, '1:cashier2');
    a.status = 'Joining Aida';
    await a.goSit(flags.cafePair[1]);
    flags.marySeated = true;
    a.status = "Coffee with Aida at Joe's Café";
    a.talking = true;
    await a.waitFor(() => flags.cafeDone, 120);
    a.talking = false;
    a.status = 'Walking back up the stairs to Floor 3';
    await a.goSit(home, 'stairs');
    a.rig.cup.visible = false; a.holdCup = false;
    flags.marySeated = false;
  };
  for (;;) {
    flags.maryAtDesk = true;
    a.status = 'Working hard at her desk';
    await a.sleep(R(25, 40), () => flags.cafeInvite);
    if (flags.cafeInvite) { await cafe(); continue; }
    if (!flags.aidaAtDesk) continue;                 // Aida is out: keep working
    flags.maryAtDesk = false;
    flags.meetingCall = true;
    a.status = 'Going to a meeting with Aida';
    await a.goSit(MEET_SEATS.mary);
    a.status = 'Waiting for Aida';
    await a.waitFor(() => flags.aidaInMeeting, 60);
    a.status = 'In a meeting with Aida';
    a.talking = true;
    await a.sleep(R(15, 22));
    a.talking = false;
    flags.meetingCall = false;
    flags.meetingOver = true;
    a.status = 'Back to my desk';
    await a.goSit(home);
    await a.waitFor(() => !flags.aidaInMeeting, 60);
    flags.meetingOver = false;
  }
}

// ---- Ivan (owner): gym with Eugene -> drink -> cook -> dinner with Phil -> café -> chill -> repeat
async function ivan(a) {
  const w = a.w;
  for (;;) {
    // 1. gym session with Eugene
    if (a.node !== '5:ivanMeet') { a.status = 'Taking the lift up to the gym'; await a.goStand('5:ivanMeet', 'lift'); }
    await a.face(-7.4, -3.2);
    flags.gymPhase = 'chat'; flags.ivanGym = true;
    a.status = 'Chatting with Eugene';
    a.talking = true;
    await a.waitFor(() => flags.eugeneInSession, 120);
    await a.sleep(5);
    a.talking = false;
    flags.gymPhase = 'tread';
    a.status = 'Running on the treadmill with Eugene';
    await treadmillOn(a, TREAD2_X, '5:treadFront2');
    await a.sleep(R(15, 20));
    await treadmillOff(a, TREAD2_X, '5:treadFront2');
    flags.gymPhase = 'barbell';
    a.status = 'Lifting the barbell with Eugene';
    await barbellOn(a, '5:ivanBarbell');
    await a.sleep(R(12, 16));
    barbellOff(a);
    flags.gymPhase = 'yoga';
    a.status = 'Yoga with Eugene';
    await yogaOn(a, '5:ivanYoga');
    await a.sleep(R(12, 16));
    yogaOff(a);
    flags.gymPhase = 'done'; flags.ivanGym = false;
    // 2. a drink from the vending machine outside the gym
    a.status = 'Buying a drink from the vending machine';
    await a.goStand('5:vendFront');
    await a.turnTo(-Math.PI / 2);
    await a.sleep(3);
    a.rig.drink.visible = true; a.holdCup = true; a.sipping = true;
    a.status = 'Having a protein shake by the vending machine';
    await a.sleep(R(8, 11));
    a.rig.drink.visible = false; a.holdCup = false; a.sipping = false;
    // 3. cook in the Floor 2 kitchen
    a.status = 'Taking the lift down to the kitchen';
    await a.goStand('2:stove', 'lift');
    await a.turnTo(Math.PI);
    a.act = 'cook'; a.status = 'Cooking dinner';
    await a.sleep(R(10, 14));
    a.act = null;
    await a.go('2:islandBack');
    await a.turnTo(0);
    a.act = 'cook'; a.status = 'Plating up the food';
    await a.sleep(4);
    a.act = null;
    a.rig.tray.visible = true; a.carry = true;
    a.status = 'Bringing the food to the dining table';
    await a.go('2:dineStandI');
    await a.face(3.4, 3.9);
    a.rig.tray.visible = false; a.carry = false;
    w.plates.visible = true;
    flags.dinnerReady = true;
    // 4. dinner with Phil
    await a.sit(DINE_IVAN);
    a.status = 'Waiting for Phil to join';
    await a.waitFor(() => flags.philSeated, 120);
    a.act = 'eat'; a.talking = true;
    a.status = 'Having dinner with Phil';
    await a.sleep(R(15, 20));
    a.act = null; a.talking = false;
    flags.dinnerDone = true;
    // 5. coffee at the café, then the café sofa (Phil joins after the dishes)
    a.status = 'Walking down the stairs to the café';
    flags.ownersAtCafe = true;
    await buyCoffee(a, '1:cashier', 'stairs');
    await a.goSit(CAFE_SOFA_IVAN);
    a.status = 'Coffee on the café sofa';
    await a.waitFor(() => flags.philCafe, 150);
    a.talking = true; a.status = 'Chilling with Phil at the café';
    await a.sleep(R(12, 18));
    a.talking = false;
    a.rig.cup.visible = false; a.holdCup = false;
    // 6. both chill on the Floor 2 sofa
    flags.f2Chill = true;
    a.status = 'Heading up to chill on the Floor 2 sofa';
    await a.goSit(SOFA_TV_IVAN, 'stairs');
    flags.ownersAtCafe = false;
    await a.waitFor(() => flags.philF2, 120);
    a.talking = true; a.status = 'Chilling with Phil';
    await a.sleep(R(15, 20));
    a.talking = false;
    // reset for the next round, then let Phil know we're done
    flags.dinnerReady = flags.philSeated = flags.dinnerDone = false;
    flags.philCafe = flags.f2Chill = flags.philF2 = false;
    flags.chillDone = true;
  }
}

// ---- Phil (owner, into music): TV -> drums -> composing … dinner with Ivan -> dishes -> café -> chill -> repeat
async function phil(a) {
  const w = a.w;
  const dinnerTime = () => flags.dinnerReady;
  for (;;) {
    // free time until Ivan serves dinner
    if (!flags.dinnerReady) {
      a.status = 'Watching TV';
      await a.goSit(SOFA_TV_PHIL);
      await a.sleep(R(15, 22), dinnerTime);
    }
    if (!flags.dinnerReady && !flags.drumUser) {
      flags.drumUser = 'Phil';
      a.status = 'Playing the drums';
      await a.goSit(DRUM_SEAT);
      await a.sleep(R(10, 14), dinnerTime);
      await a.stand();
      flags.drumUser = null;
    }
    if (!flags.dinnerReady) {
      a.status = 'Composing a new song on the music PC';
      await a.goSit(COMPOSE_SEAT);
      await a.sleep(R(18, 26), dinnerTime);
    }
    if (!flags.dinnerReady) continue;
    // dinner with Ivan
    a.status = 'Joining Ivan for dinner';
    await a.goSit(DINE_PHIL);
    flags.philSeated = true;
    a.act = 'eat'; a.talking = true;
    a.status = 'Having dinner with Ivan';
    await a.waitFor(() => flags.dinnerDone, 150);
    a.act = null; a.talking = false;
    // clear the table and wash up
    w.plates.visible = false;
    a.rig.tray.visible = true; a.carry = true;
    a.status = 'Bringing the dishes to the kitchen';
    await a.goStand('2:sink');
    await a.turnTo(Math.PI / 2);
    a.rig.tray.visible = false; a.carry = false;
    a.act = 'wash'; a.status = 'Washing the dishes';
    await a.sleep(R(8, 11));
    a.act = null;
    // join Ivan on the café sofa
    a.status = 'Walking down to join Ivan at the café';
    await a.goSit(CAFE_SOFA_PHIL, 'stairs');
    flags.philCafe = true;
    a.talking = true; a.status = 'Chilling with Ivan at the café';
    await a.waitFor(() => flags.f2Chill, 150);
    a.talking = false;
    // back up to the Floor 2 sofa together
    a.status = 'Heading up to the Floor 2 sofa';
    await a.goSit(SOFA_TV_PHIL, 'stairs');
    flags.philF2 = true;
    a.talking = true; a.status = 'Chilling with Ivan';
    await a.waitFor(() => flags.chillDone, 150);
    a.talking = false;
    flags.chillDone = false;
  }
}

// ---- Jennie: serves at the till; restocks the red vending machines when no one is coming
async function jennie(a) {
  const w = a.w, till = a.node;
  const busy = () => w.cafeQueue > 0;
  for (;;) {
    w.jennieAtTill = true;
    a.status = a.e.idle;
    await a.sleep(R(15, 25));
    if (busy()) { await a.waitFor(() => !busy(), 180); continue; }
    // nobody coming: restock both machines
    w.jennieAtTill = false;
    a.status = 'Restocking the vending machines';
    a.g.position.y = 0;                               // step down from the till step
    for (const v of ['1:vend1', '1:vend2']) {
      if (busy()) break;
      a.rig.crate.visible = true; a.carry = true;
      await a.go(v);
      await a.turnTo(-Math.PI / 2);
      a.rig.crate.visible = false; a.carry = false;
      a.act = 'restock';
      await a.sleep(R(6, 9), busy);
      a.act = null;
    }
    a.rig.crate.visible = false; a.carry = false;
    a.status = busy() ? 'Hurrying back to serve a customer' : 'Back to the till';
    await a.go(till);
    await a.turnTo(0);
    a.g.position.y = a.e.y ?? 0;                      // back up on the step
  }
}

const ROUTINES = { jungkook, eugene, aida, xiaoming, mary, ivan, phil, jennie };
const SPAWN = {                        // where the owners start
  Ivan: { stand: '5:ivanMeet', ry: -2.1 },
  Phil: { seat: SOFA_TV_PHIL },
};

// ======================================================================== setup
export function createStaff({ floors, lift, employees, doors = {} }) {
  const world = { floors, lift, doors, puffs: createPuffs(), serve() {}, cafeQueue: 0, jennieAtTill: true };
  // two plates of food on the Floor 2 dining table (shown when Ivan serves dinner)
  world.plates = new THREE.Group();
  world.plates.userData.dynamic = true;
  for (const px of [3.4, 4.68]) {
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.02, 16), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }));
    pl.position.set(sx(2, px), 0.83, 3.4);
    const food = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: '#e2a356', roughness: 0.9 }));
    food.scale.set(1.3, 0.6, 1); food.position.set(sx(2, px), 0.87, 3.4);
    const veg = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: '#6aa84f', roughness: 0.9 }));
    veg.position.set(sx(2, px) + 0.06, 0.87, 3.36);
    world.plates.add(pl, food, veg);
  }
  world.plates.visible = false;
  floors[1].add(world.plates);
  const actors = [];
  for (const e of employees) {
    const rig = employee(floors[e.floor - 1], 0, 0, 0, e);
    const a = new Actor(world, e, rig);
    const sp = SPAWN[e.name];
    if (sp) {                                       // owners: a starting spot
      if (sp.stand) {
        a.at(sp.stand);
        a.rig.setPose('stand');
        a.heading = sp.ry ?? 0; a.g.rotation.y = a.heading;
      } else {
        a.at(sp.seat.node);
        a.g.position.set(sx(2, sp.seat.x), sp.seat.y ?? 0, sp.seat.z);
        a.heading = sp.seat.ry; a.g.rotation.y = sp.seat.ry;
        a.rig.setPose('sit');
        a.seat = sp.seat;
      }
      a.status = 'Here';
    } else if (e.pos) {                             // standing post (Eugene in the gym, Jennie at the till)
      const id = node(e.floor, e.name === 'Eugene' ? 'home' : `home_${e.name}`, e.pos[0], e.pos[1]);
      if (e.name === 'Eugene') for (const n of ['gymIn', 'treadFront', 'yoga', 'barbell']) link(id, `5:${n}`);
      a.at(id);
      a.rig.setPose('stand');
      a.heading = e.ry ?? 0; a.g.rotation.y = a.heading;
      a.g.position.y = e.y ?? 0;                    // Jennie stands on a step behind the till
      a.status = e.idle ?? 'Here';
      if (e.name === 'Jennie') {
        link(id, '1:jBehind');
        world.serve = () => { a.talkFor = 4; a.status = 'Serving a coffee'; setTimeout(() => { if (world.jennieAtTill) a.status = e.idle; }, 4000); };
      }
    } else {                                        // desk seat
      const s = deskSeatFor(e.floor, e.seat);
      a.at(s.node);
      a.g.position.set(sx(e.floor, s.x), 0, s.z);
      a.heading = s.ry; a.g.rotation.y = s.ry;
      a.rig.setPose('sit', { typing: true });
      a.seat = s;
      a.blob.visible = true;
      a.status = 'Working';
    }
    actors.push(a);
    const routine = ROUTINES[e.name.toLowerCase()];
    if (routine) {
      // start each routine after a short random delay so they don't all move together
      a.sleep(R(3, 12)).then(() => routine(a)).catch((err) => console.error(e.name, err));
    }
  }
  return {
    actors,
    update(dt, t) {
      for (const a of actors) a.update(dt, t);
      for (const id in world.doors) world.doors[id].update(dt);
      world.puffs.update(dt);
    },
  };
}
