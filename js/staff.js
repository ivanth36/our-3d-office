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

// ---- Floor 2: music room (glass lounge, front-left)
chain('2:coreFront', node(2, 'musicOut', -2.8, 7.15), node(2, 'musicIn', -4.0, 7.15), node(2, 'musicMid', -5.0, 4.0), node(2, 'lounge', -8.6, 3.95));
const LOUNGE_SEAT = { node: '2:lounge', x: -9.3, z: 4.6, ry: Math.PI, y: 0 };

// ---- Floors 3 & 4: aisle behind the shared desk + meeting room
for (const f of [3, 4]) {
  const aisle = [5, 6, 7, 8, 9].map((i) => node(f, `desk${i}`, deskSeat(i).x, -0.9));
  chain(...aisle, node(f, 'meetDoorOut', 2.6, -0.9), `${f}:coreW`);
  chain(`${f}:meetDoorOut`, node(f, 'meetDoorIn', 2.6, -3.0), node(f, 'meetA', 4.15, -3.0), node(f, 'meetB', 5.45, -3.0));
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
const TREAD = { x: -9.0, z: -6.3, y: 0.23 };

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
    // soft blob shadow (shadow maps are static, so moving people bring their own)
    this.g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.3, 18), new THREE.MeshBasicMaterial({ color: '#3b2a1a', transparent: true, opacity: 0.2, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.position.y = 0.012;
    this.g.add(this.blob);
  }
  set status(s) { this.e.status = s; }
  toFloor(f) { this.floor = f; this.w.floors[f - 1].add(this.g); }
  at(id) { const n = nodes.get(id); this.node = id; this.toFloor(n.f); this.g.position.set(n.x, 0, n.z); }

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
  face(x, z) { return this.turnTo(Math.atan2(x - this.g.position.x, z - this.g.position.z)); }
  moveTo(x, z, speed = 1.25) {
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
        await this.moveTo(B.x, B.z);
        if (nextLift) {                      // step into the car and turn to face the door
          lift.car.add(this.g);
          this.g.position.set(0, 0.12, 0);
          await this.turnTo(0);
        }
        if (releaseAfterWalk) { lift.release(); releaseAfterWalk = false; }
      } else if (type === 'lift') {
        await lift.bring(B.f);
        this.toFloor(B.f);
        this.g.position.set(B.x, 0, B.z);
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
  }
  async stand() {
    if (!this.seat) return;
    const n = nodes.get(this.seat.node);
    this.rig.setPose('stand');
    this.g.position.y = 0;
    this.blob.visible = true;
    this.seat = null;
    await this.moveTo(n.x, n.z, 0.8);
    this.node = n.id;
  }
  async goSit(seat, via) { await this.stand(); await this.go(seat.node, via); await this.sit(seat); }
  async goStand(id, via) { await this.stand(); await this.go(id, via); }

  update(dt, t) {
    if (this.task && this.task.fn(dt, t)) { const r = this.task.res; this.task = null; r(); }
    this.animate(dt, t);
  }
  animate(dt, t) {
    const r = this.rig, [hl, hr] = r.hips, [sl, sr] = r.shoulders;
    if (r.pose === 'sit') {
      if (r.typing) {
        r.head.rotation.x = Math.sin(t * 1.3 + r.phase) * 0.06;
        r.head.rotation.y = Math.sin(t * 0.5 + r.phase) * 0.12;
        r.body.position.y = r.baseY + Math.abs(Math.sin(t * 6 + r.phase)) * 0.008;
      } else {
        r.head.rotation.y = Math.sin(t * 0.4 + r.phase) * 0.35;
        r.head.rotation.x = this.talking ? Math.sin(t * 5) * 0.06 : 0;
        if (this.holdCup) sl.rotation.x = -0.9 - Math.max(0, Math.sin(t * 0.5 + r.phase)) * 1.2; // sip
      }
      return;
    }
    const moving = this.anim === 'walk' || this.anim === 'run';
    if (moving) {
      const run = this.anim === 'run';
      this.walkT += dt * (run ? 13 : 8.5);
      const s = Math.sin(this.walkT), amp = run ? 0.85 : 0.5;
      hl.rotation.x = s * amp; hr.rotation.x = -s * amp;
      sl.rotation.x = this.holdCup ? -0.9 : -s * amp * 0.8;
      if (!this.smoking) sr.rotation.x = s * amp * 0.8;
      r.body.position.y = r.baseY + Math.abs(Math.cos(this.walkT)) * (run ? 0.05 : 0.025);
      r.head.position.y = 1.25 + Math.abs(Math.cos(this.walkT)) * (run ? 0.05 : 0.025);
    } else {
      hl.rotation.x *= 0.8; hr.rotation.x *= 0.8;
      sl.rotation.x = this.holdCup ? -0.9 : sl.rotation.x * 0.8;
      if (!this.smoking) sr.rotation.x *= 0.8;
      r.body.position.y = r.baseY; r.head.position.y = 1.25;
      r.head.rotation.x = this.talking ? Math.sin(t * 5 + r.phase) * 0.07 : 0;
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
  aidaAtDesk: true, meetingCall: false, aidaInMeeting: false, meetingOver: false,
};

async function jungkook(a) {
  const home = deskSeatFor(3, a.e.seat);
  for (;;) {
    a.status = 'Working on the KRW analysis';
    await a.sleep(R(25, 40));
    a.status = 'Walking up the stairs to see Eugene';
    await a.goStand('5:gymOut', 'stairs');
    await a.face(-3.6, -1.3);
    a.status = 'Waiting for Eugene';
    flags.smokeCall = true;
    await a.waitFor(() => flags.eugeneReady, 90);
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
  const homeX = a.e.pos[0], homeZ = a.e.pos[1];
  const smokeTime = async () => {
    a.rig.cig.visible = false;
    a.status = 'Meeting JungKook';
    if (a.g.userData.bottle) a.g.userData.bottle.visible = true;
    await a.go('5:gymIn');
    await a.face(-3.6, 0.0);
    flags.eugeneReady = true;
    a.talking = true;
    await a.waitFor(() => flags.smokeGo, 30);
    a.talking = false;
    a.status = 'Off to the roof garden for a smoke';
    if (a.g.userData.bottle) a.g.userData.bottle.visible = false;
    await a.go('5:smokeE');
    await a.face(3.7, 6.1);
    a.status = 'Smoke break with JungKook';
    a.rig.cig.visible = true; a.smoking = true; a.talking = true;
    await a.waitFor(() => flags.smokeDone, 40);
    a.rig.cig.visible = false; a.smoking = false; a.talking = false;
    flags.smokeCall = flags.eugeneReady = flags.smokeGo = flags.smokeDone = false;
    a.status = 'Back to the gym';
    if (a.g.userData.bottle) a.g.userData.bottle.visible = true;
    await a.go('5:home');
    await a.turnTo(a.e.ry ?? 0);
  };
  for (;;) {
    if (flags.smokeCall) { await smokeTime(); continue; }
    a.status = 'Coaching in the gym';
    await a.sleep(R(10, 18), () => flags.smokeCall);
    if (flags.smokeCall) continue;
    a.status = 'Running on the treadmill';
    await a.go('5:treadFront');
    await a.moveTo(TREAD.x, -5.5);
    a.g.position.y = TREAD.y;
    await a.moveTo(TREAD.x, TREAD.z, 0.6);
    await a.turnTo(0);
    a.anim = 'run';
    await a.sleep(R(15, 25), () => flags.smokeCall);
    a.anim = 'idle';
    await a.moveTo(TREAD.x, -5.5, 0.8);
    a.g.position.y = 0;
    await a.moveTo(nodes.get('5:treadFront').x, nodes.get('5:treadFront').z);
    a.node = '5:treadFront';
    await a.go('5:home');
    await a.turnTo(a.e.ry ?? 0);
    void homeX; void homeZ;
  }
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
    // coffee run
    flags.aidaAtDesk = false;
    a.status = "Taking the lift down to Joe's Café for coffee";
    await a.goStand('1:cashier', 'lift');
    await a.turnTo(Math.PI);
    a.status = 'Buying a coffee';
    await a.sleep(4);
    a.rig.cup.visible = true; a.holdCup = true;
    const seat = pick(CAFE_SEATS);
    a.status = "Enjoying a coffee at Joe's Café";
    await a.goSit(seat);
    await a.sleep(R(14, 22));
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
    await a.sleep(R(15, 25));
    a.status = 'Walking back up to Floor 3';
    await a.goSit(home, 'stairs');
  }
}

async function mary(a) {
  const home = deskSeatFor(3, a.e.seat);
  for (;;) {
    a.status = 'Working hard at her desk';
    await a.sleep(R(25, 40));
    if (!flags.aidaAtDesk) continue;                 // Aida is out: keep working
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

const ROUTINES = { jungkook, eugene, aida, xiaoming, mary };

// ======================================================================== setup
export function createStaff({ floors, lift, employees }) {
  const world = { floors, lift, puffs: createPuffs() };
  const actors = [];
  for (const e of employees) {
    const rig = employee(floors[e.floor - 1], 0, 0, 0, e);
    const a = new Actor(world, e, rig);
    if (e.pos) {                                    // standing post (Eugene in the gym)
      const id = node(e.floor, 'home', e.pos[0], e.pos[1]);
      link(id, `${e.floor}:gymIn`);
      link(id, `${e.floor}:treadFront`);
      a.at(id);
      a.rig.setPose('stand');
      a.heading = e.ry ?? 0; a.g.rotation.y = a.heading;
      a.status = 'Coaching in the gym';
    } else {                                        // desk seat
      const s = deskSeatFor(e.floor, e.seat);
      a.at(s.node);
      a.g.position.set(s.x, 0, s.z);
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
      world.puffs.update(dt);
    },
  };
}
