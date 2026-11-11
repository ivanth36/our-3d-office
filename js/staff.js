// The AI employees come alive: they work, walk around, take the stairs or the
// lift between floors, and follow little daily routines.
//
// How it works
// - A walking map (graph of waypoints) covers every floor. Each floor's core has
//   the lift and the stairs; the stairs link floor n to n+1, the lift links all floors.
// - Each employee is an "actor" running an async routine: walk somewhere, sit,
//   wait, smoke, run… Movements are promises that finish in the animation loop.
import * as THREE from 'three';
import { H, floorY, floorAt, box, cyl, grp, mat } from './helpers.js';
import { employee } from './characters.js';
import { NODES as JOE_NODES, EDGES as JOE_EDGES } from './joe.js';
import { seat as deskSeat, PRIVATE } from './floors.js';
import { sx, raw, real2, LANE_A, LANE_B } from './building.js';   // original-layout x -> real x on the longer floors

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
  const cost = type === 'walk' ? Math.hypot(A.x - B.x, A.z - B.z) : type === 'stairs' ? (Math.min(A.f, B.f) === 1 ? 27 : 9) : 14 + Math.abs(A.f - B.f) * 2;
  adj.get(a).push({ to: b, type, cost });
  adj.get(b).push({ to: a, type, cost });
}
function chain(...ids) { for (let i = 1; i < ids.length; i++) link(ids[i - 1], ids[i]); }

const LX = 10.8; // walking line through the lift / stairs core
const STAIR_BOTTOM_Z = 6.05, STAIR_TOP_Z = 0.3;
// Points walked (local to floor `lower`) going up the stairs. Floor 1 is the tall atrium: three
// switch-back flights on two lanes with landings at the balcony levels (see atriumStairs in js/building.js).
function stairPath(lower) {
  if (lower !== 1) return [[LX, 0, STAIR_BOTTOM_Z], [LX, H, STAIR_TOP_Z]];
  const zf = 6.0, zb = 0.4;
  return [[LX, 0, STAIR_BOTTOM_Z], [LANE_A, 0, zf], [LANE_A, H, zb], [LANE_A, H, -0.3], [LANE_B, H, -0.3], [LANE_B, H, zb],
    [LANE_B, 2 * H, zf], [LANE_B, 2 * H, 6.7], [LANE_A, 2 * H, 6.7], [LANE_A, 2 * H, zf], [LANE_A, 3 * H, zb], [LX, 3 * H, STAIR_TOP_Z]];
}

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
link('1:coreW', '1:j5'); link('1:coreW', '1:j12');
link('1:coreFront', '1:j19'); link('1:coreFront', '1:j12');
node(1, 'cashier', -17.0, 7.15); link('1:cashier', '1:j20');
node(1, 'cashier2', -16.1, 7.35); link('1:cashier2', '1:j20');   // second customer waits beside

// Jennie's way from the till, out behind the counter, to the red vending machines (left wall)
chain(node(1, 'jBehind', -17.0, 2.0), node(1, 'jExit', -14.2, 1.95), node(1, 'jSide', -14.2, 0.6), node(1, 'jWest', -19.4, 0.4), node(1, 'vend1', -19.95, -0.85), node(1, 'vend2', -19.95, -1.9));

// café seats (left half): window-bar stools and round-table chairs
const CAFE_SEATS = [];
function cafeSeat(name, stand, access, x, z, ry, y = 0) {
  const id = node(1, name, stand[0], stand[1]);
  link(id, `1:${access}`);
  const seat = { node: id, x, z, ry, y };
  CAFE_SEATS.push(seat);
  return seat;
}
const barX = (k) => -19.85 + 0.8 * k;                               // back-window stools
for (const [k, acc] of [[3, 'j0'], [7, 'j1']]) cafeSeat(`bar${k}`, [barX(k), -6.1], acc, barX(k), -6.85, Math.PI, 0.26);   // the bar now ends at the café
cafeSeat('barL', [-19.8, -4.8], 'j0', -20.45, -4.8, -Math.PI / 2, 0.26);   // left-window stool
cafeSeat('t1', [-10.86, -2.36], 'j7', -11.21, -2.71, Math.PI / 4 + Math.PI);
cafeSeat('t6', [-7.76, -2.36], 'j8', -8.11, -2.71, Math.PI / 4 + Math.PI);   // second tea table (the old front tables are now the pond)
// seats used when Aida and Mary go for coffee together (next to each other)
const pairSeat = (name, stand, access, x, z, ry, y = 0) => { const id = node(1, name, stand[0], stand[1]); link(id, `1:${access}`); return { node: id, x, z, ry, y }; };
const CAFE_PAIRS = [
  [pairSeat('bar5', [barX(5), -6.1], 'j1', barX(5), -6.85, Math.PI, 0.26), pairSeat('bar6', [barX(6), -6.1], 'j1', barX(6), -6.85, Math.PI, 0.26)],
  [pairSeat('bar1', [barX(1), -6.1], 'j0', barX(1), -6.85, Math.PI, 0.26), pairSeat('bar2', [barX(2), -6.1], 'j0', barX(2), -6.85, Math.PI, 0.26)],
];
// welcome lounge (right half): the facing sofas, used by Ivan & Phil after coffee
chain('1:j9', node(1, 'loungeA', -4.3, -0.75), '1:j10');
chain('1:loungeA', node(1, 'loungeStandI', -3.1, -0.45), node(1, 'loungeStandP', -1.9, -0.45));
link('1:loungeA', node(1, 'loungeB', -4.3, 0.75)); link('1:loungeB', '1:j10');   // where Phil plays with Joe
const JOE_PLAY = [-3.55, 0.0];                       // Joe's play spot, between Ivan and Phil

// ---- Chill Home (4F): music room (glass lounge, front-left)
// music room: its only outside door is in the middle of its right wall (real x -12)
// (the old front walk to the music room is closed: the pantry's front sofas and the shoji wall are there now;
//  Ivan & Phil reach the music room through the living room)
chain(node(4, 'frontWalk', raw(-10.4), 6.8), node(4, 'musicOut', raw(-11.2), 3.85),
  node(4, 'musicIn', raw(-12.8), 3.85), node(4, 'musicMid', -5.3, 4.0), node(4, 'lounge', -8.6, 3.95));
link('4:musicMid', node(4, 'drumStand', -6.6, 5.0));
link('4:musicMid', node(4, 'pianoStand', -5.25, 5.6));
link('4:musicMid', node(4, 'composeStand', -4.6, 4.0));
// game room: entered only through the music room, by the door in the middle of the shared glass wall
chain('4:musicMid', node(4, 'musicW', raw(-16.75), 3.9), node(4, 'gameOutM', raw(-16.75), 1.0), node(4, 'gameIn', raw(-16.75), -0.9));
chain('4:gameIn', node(4, 'pcStandP', raw(-19.0), -2.2), node(4, 'pcStandI', raw(-19.0), -5.4));
chain('4:gameIn', node(4, 'consoleIn', raw(-14.45), -2.2), node(4, 'consoleStandP', raw(-14.45), -3.0), node(4, 'consoleStandI', raw(-14.45), -4.2));
const LOUNGE_SEAT = { node: '4:lounge', x: -9.3, z: 4.6, ry: Math.PI, y: 0 };
// 4F pantry lounge (the public side, by the kitchen): staff take their breaks here.
// The music room, game room, living room, tatami room and the stair up are private (Ivan & Phil only).
// Ivan & Phil's private suite: stair foot in the game room; bedroom tea and onsen spots (5F / 6F, reached by
// the spiral stair, not by the walking map, so nobody else can get there)
link('4:musicOut', node(4, 'spiralFoot', real2(PRIVATE.stairX), PRIVATE.stairZ - 1.9));   // just outside the music-room door
const OX = PRIVATE.onsen.x;
const BED_TEA = { Ivan: { node: node(5, 'bedI', real2(-28.6), 0.0), x: real2(-28.6), z: 0.82, ry: 0, y: -0.27 },
  Phil: { node: node(5, 'bedP', real2(-27.2), 2.38), x: real2(-28.6), z: 2.38, ry: Math.PI, y: -0.27 } };
const ONSEN = { Ivan: { node: node(6, 'onsenI', real2(OX - 1.0), 0.9), x: real2(OX - 1.0), z: -3.0, ry: Math.PI, y: -0.38 },
  Phil: { node: node(6, 'onsenP', real2(OX + 0.4), 0.9), x: real2(OX + 0.4), z: -3.0, ry: Math.PI, y: -0.38 } };
const PANTRY_SEAT = { node: '4:pantryStand', x: real2(-6.2), z: -3.05, ry: Math.PI, y: -0.08 };
const DRUM_SEAT = { node: '4:drumStand', x: -6.6, z: 5.8, ry: 0, y: 0.05, act: 'drum' };
const PIANO_SEAT = { node: '4:pianoStand', x: -4.6, z: 5.6, ry: Math.PI / 2, y: 0, typing: true, act: 'piano' };
const COMPOSE_SEAT = { node: '4:composeStand', x: -4.6, z: 3.25, ry: Math.PI, y: 0, typing: true };   // music PC desk
const PC_IVAN = { node: '4:pcStandI', x: raw(-19.9), z: -5.4, ry: -Math.PI / 2, y: 0, typing: true, act: 'pc' };
const PC_PHIL = { node: '4:pcStandP', x: raw(-19.9), z: -2.2, ry: -Math.PI / 2, y: 0, typing: true, act: 'pc' };
const CONSOLE_IVAN = { node: '4:consoleStandI', x: raw(-14.85), z: -4.2, ry: Math.PI / 2, y: 0.04, act: 'console' };
const CONSOLE_PHIL = { node: '4:consoleStandP', x: raw(-14.85), z: -3.0, ry: Math.PI / 2, y: 0.04, act: 'console' };

// ---- Chill Home (4F): open space, living room sofa, kitchen, dining table
node(4, 'f2mid', 1.5, -0.2);                        // open space between living room & kitchen
link('4:coreW', '4:f2mid');
link('4:f2mid', node(4, 'pantryStand', real2(-6.2), -1.9));   // pantry lounge (see PANTRY_SEAT)
// living room (moved to the middle of the floor: real positions)
chain('4:f2mid', node(4, 'livFront', raw(-3.2), -2.0), node(4, 'sofaStandA', raw(-5.3), -2.0), node(4, 'sofaStandB', raw(-7.3), -2.0));
// to the music room: up the side of the living room, then along the corridor between the game room and music room
chain('4:livFront', node(4, 'livCorner', raw(-3.0), 1.2), node(4, 'westAisle', raw(-10.6), 1.6), '4:musicOut');
chain('4:coreW', node(4, 'kIn', 8.2, -1.8), node(4, 'kLane', 8.1, -5.2));
link('4:kLane', node(4, 'stove', 6.7, -6.6));
link('4:kLane', node(4, 'islandBack', 5.6, -4.7));
link('4:kLane', node(4, 'sink', 8.25, -6.1));
link('4:stove', '4:islandBack');
chain('4:kIn', node(4, 'dineE', 8.0, 1.8), node(4, 'dineStandP', 4.68, 2.2), node(4, 'dineStandI', 3.4, 2.2));
link('4:f2mid', '4:dineStandI');
// on the low Japandi sofa (seat ~0.38 m, a little lower than a chair), facing the TV
const SOFA_TV_PHIL = { node: '4:sofaStandA', x: raw(-5.3), z: -1.2, ry: Math.PI, y: -0.08 };
const SOFA_TV_IVAN = { node: '4:sofaStandB', x: raw(-7.3), z: -1.2, ry: Math.PI, y: -0.08 };
const DINE_IVAN = { node: '4:dineStandI', x: 3.4, z: 2.85, ry: 0, y: 0 };
const DINE_PHIL = { node: '4:dineStandP', x: 4.68, z: 2.85, ry: 0, y: 0 };
// café sofa corner for the owners
const CAFE_SOFA_IVAN = { node: '1:loungeStandI', x: -3.1, z: -1.2, ry: 0, y: 0.04 };   // welcome-lounge sofa
const CAFE_SOFA_PHIL = { node: '1:loungeStandP', x: -1.9, z: -1.2, ry: 0, y: 0.04 };

// ---- Floors 3 & 4: aisle behind the shared desk + meeting room
for (const f of [2, 3]) {
  const aisle = [5, 6, 7, 8, 9].map((i) => node(f, `desk${i}`, deskSeat(i).x, -0.9));
  chain(...aisle, node(f, 'aisleE', 2.6, -0.9), `${f}:coreW`);
  chain(`${f}:aisleE`, node(f, 'meetDoorOut', 2.6, -1.8), node(f, 'meetDoorIn', 2.6, -3.0), node(f, 'meetA', 4.15, -3.0), node(f, 'meetB', 5.45, -3.0));
}
const deskSeatFor = (f, i) => ({ node: `${f}:desk${i}`, ...deskSeat(i), y: 0, typing: true });
// ---- Floor 3 manager's office (built in real positions): door at the front, Kenny's chair behind the desk
chain(node(3, 'mgrOut', raw(-4.5), -2.6), node(3, 'mgrIn', raw(-4.5), -3.85), node(3, 'mgrW', raw(-6.3), -3.85), node(3, 'mgrBack', raw(-6.3), -6.75), node(3, 'mgrChair', raw(-5.2), -6.75));
link('3:mgrOut', '3:desk9'); link('3:mgrOut', '3:aisleE');
const KENNY_SEAT = { node: '3:mgrChair', x: raw(-4.4), z: -6.6, ry: 0, y: 0, typing: true };
// team meeting in the meeting room (Kenny at the head of the table)
node(3, 'meetC', 6.75, -3.0); link('3:meetB', '3:meetC');
node(3, 'meetE', 8.0, -3.0); link('3:meetC', '3:meetE');
node(3, 'meetRStand', 8.4, -4.0); link('3:meetE', '3:meetRStand');
node(3, 'meetLStand', 2.75, -4.0); link('3:meetDoorIn', '3:meetLStand');
chain('3:meetE', node(3, 'meetCorner', 9.0, -3.4), node(3, 'meetBackE', 9.0, -6.95), node(3, 'meetBackStand', 5.45, -6.95));
const TEAM_SEATS = {
  Kenny: { node: '3:meetRStand', x: 8.35, z: -5.0, ry: -Math.PI / 2, y: 0 },
  Mary: { node: '3:meetA', x: 4.15, z: -3.65, ry: Math.PI, y: 0 },
  Aida: { node: '3:meetB', x: 5.45, z: -3.65, ry: Math.PI, y: 0 },
  Sally: { node: '3:meetC', x: 6.75, z: -3.65, ry: Math.PI, y: 0 },
  XiaoMing: { node: '3:meetLStand', x: 2.55, z: -5.0, ry: Math.PI / 2, y: 0 },
  JungKook: { node: '3:meetBackStand', x: 5.45, z: -6.35, ry: 0, y: 0 },
};
const MEET_SEATS = { mary: { node: '3:meetA', x: 4.15, z: -3.65, ry: Math.PI, y: 0 }, aida: { node: '3:meetB', x: 5.45, z: -3.65, ry: Math.PI, y: 0 } };

// ---- Floor 5: roof garden + glass gym
node(5, 'rMid', 7.6, 1.0);
node(5, 'smokeJ', 3.7, 6.1);
node(5, 'smokeE', 2.6, 6.1);
node(5, 'rPole', -1.4, -1.2);
// the big gym now fills the left end of the roof; its door is on the garden side (x = -12 real)
// (coordinates here are in the original-layout system: real x = design x - 9.6 left of x = -1)
chain('5:coreW', '5:rMid', '5:smokeJ', '5:smokeE');
link('5:rMid', '5:rPole');
link('5:coreW', '5:rPole');
node(5, 'gymOut', -1.8, -1.0);                      // outside the gym door
node(5, 'gymIn', -3.0, -1.0);                       // just inside
chain('5:rPole', '5:gymOut', '5:gymIn');
chain('5:rPole', node(5, 'meetJ', -1.6, 0.8), '5:gymOut');   // JungKook waits here, outside the gym
node(5, 'treadFront', -9.1, -4.8);                  // behind Eugene's treadmill
node(5, 'treadFront2', -9.1, -3.3);                 // behind Ivan's treadmill
link('5:treadFront', '5:treadFront2');
node(5, 'barbell', -6.6, -5.6);
node(5, 'yoga', -8.9, 5.0);
// Ivan's gym spots (next to Eugene's) and the vending machines outside
node(5, 'ivanMeet', -5.4, -1.5); link('5:ivanMeet', '5:gymIn');
node(5, 'ivanBarbell', -5.0, -5.6); link('5:ivanBarbell', '5:ivanMeet');
node(5, 'ivanYoga', -7.85, 5.0); link('5:ivanYoga', '5:ivanMeet');
node(5, 'vendFront', -1.1, -2.3); link('5:vendFront', '5:rPole');
// treadmills face the outside (-X): step on from behind, run facing the left edge
const TREAD = { stepX: -10.3, y: 0.23, eugeneZ: -4.8, ivanZ: -3.3 };

// ---- cleaners' work spots on every floor (mop the floor, water a plant, garden on the roof)
node(1, 'divW', -4.7, -3.0); link('1:divW', '1:j3'); link('1:divW', '1:j9');   // café / lounge divider planters
node(1, 'recPlant', -1.4, 6.4); link('1:recPlant', '1:j17'); link('1:recPlant', '1:j18'); // plants by reception
node(4, 'plantW', -0.1, 0.3); link('4:plantW', '4:f2mid');
for (const f of [2, 3]) { node(f, 'plantNW', -10.6, -1.2); link(`${f}:plantNW`, `${f}:desk5`); }
node(5, 'gardenF1', 5.8, 6.4); link('5:gardenF1', '5:rMid');           // front flower planters
node(5, 'gardenF0', -1.0, 6.4); link('5:gardenF0', '5:smokeE');
node(5, 'gardenB', 1.9, -6.6); link('5:gardenB', '5:rMid');            // back flower planters
node(5, 'plantE', 8.0, 2.5); link('5:plantE', '5:rMid');
const CLEAN_JOBS = {
  1: [{ n: '1:j1', k: 'mop' }, { n: '1:j4', k: 'mop' }, { n: '1:divW', k: 'water', face: [-5.4, -3.0] }, { n: '1:recPlant', k: 'water', face: [-0.6, 5.6] }],
  4: [{ n: '4:f2mid', k: 'mop' }, { n: '4:dineE', k: 'mop' }, { n: '4:plantW', k: 'water', face: [-0.8, 0.9] }, { n: '4:coreFront', k: 'water', face: [8.8, 7.2] }],
  3: [{ n: '3:aisleE', k: 'mop' }, { n: '3:desk7', k: 'mop' }, { n: '3:coreFront', k: 'water', face: [8.9, 7.2] }, { n: '3:plantNW', k: 'water', face: [-11.3, -1.5] }],
  2: [{ n: '2:aisleE', k: 'mop' }, { n: '2:desk7', k: 'mop' }, { n: '2:coreFront', k: 'water', face: [8.9, 7.2] }, { n: '2:plantNW', k: 'water', face: [-11.3, -1.5] }],
  5: [{ n: '5:rMid', k: 'mop' }, { n: '5:gardenF1', k: 'garden', face: [5.8, 7.3] }, { n: '5:gardenF0', k: 'garden', face: [-1.0, 7.3] }, { n: '5:gardenB', k: 'garden', face: [1.9, -7.35] }, { n: '5:plantE', k: 'water', face: [8.8, 2.5] }],
};

// glass doors: walking between these node pairs goes through a door
const DOOR_EDGES = {};
const doorEdge = (a, b, id) => { DOOR_EDGES[`${a}|${b}`] = id; DOOR_EDGES[`${b}|${a}`] = id; };
doorEdge('4:musicOut', '4:musicIn', '4:music');
doorEdge('4:gameOutM', '4:gameIn', '4:game');
doorEdge('3:meetDoorOut', '3:meetDoorIn', '3:meet');
doorEdge('3:mgrOut', '3:mgrIn', '3:mgr');
doorEdge('2:meetDoorOut', '2:meetDoorIn', '2:meet');
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
    bring(f) { L.target = floorY(f) + 0.02; return new Promise((r) => { L.onArrive = r; }); },
    floor() { return floorAt(car.position.y - 0.02); },
    update(dt) {
      const ty = L.target ?? L.viewY;
      const d = ty - car.position.y;
      L.moved = Math.abs(d) > 0.001;
      if (L.moved) car.position.y += Math.sign(d) * Math.min(Math.abs(d), dt * 2.4);
      else {
        if (L.onArrive && L.target !== null) { const r = L.onArrive; L.onArrive = null; r(); }
      }
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
  /** Ivan & Phil's spiral loft stair (4F -> 5F bedroom -> 6F onsen), one flight up or down. */
  spiral(lower, up) {
    const { stairX: x, stairZ: z, flights } = PRIVATE, f = flights[lower];
    const a1 = f.a0 + f.turn * Math.PI * 2, n = 48, r = 0.62, out = 1.9;
    const pts = [[x + Math.sin(f.a0) * out, 0, z + Math.cos(f.a0) * out]];
    for (let i = 0; i <= n; i++) { const a = f.a0 + (a1 - f.a0) * i / n; pts.push([x + Math.sin(a) * r, H * i / n, z + Math.cos(a) * r]); }
    pts.push([x + Math.sin(a1) * out, H, z + Math.cos(a1) * out]);
    return this.walkPath(lower, up, pts);
  }
  /** Walk the stairs between floor `lower` and `lower+1` (up or down) along STAIR_PATH. */
  climb(lower, up) {
    return this.walkPath(lower, up, stairPath(lower), true);
  }
  walkPath(lower, up, pts, core = false) {
    this.toFloor(lower);
    this.anim = 'walk';
    if (!up) pts.reverse();
    const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1], q[2] - pts[i][2]));
    let seg = 0, s = 0;
    this.g.position.set(...pts[0]);
    return this._task((dt) => {
      s += dt * 0.9;
      while (seg < lens.length && s >= lens[seg]) { s -= lens[seg]; seg++; }
      if (seg >= lens.length) {
        this.anim = 'idle';
        const f = up ? lower + 1 : lower;
        this.toFloor(f);
        const e = pts[pts.length - 1];
        if (core) this.g.position.set(LX, 0, up ? STAIR_TOP_Z : STAIR_BOTTOM_Z);
        else this.g.position.set(e[0], 0, e[2]);
        return true;
      }
      const A = pts[seg], B = pts[seg + 1], k = s / lens[seg];
      this.g.position.set(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k);
      if (Math.hypot(B[0] - A[0], B[2] - A[2]) > 0.01) { this.heading = Math.atan2(B[0] - A[0], B[2] - A[2]); this.g.rotation.y = this.heading; }
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
    this.rig.body.rotation.z = 0;
    this.rig.shoulders.forEach((q) => { q.rotation.z = 0; });
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
      } else if (this.act === 'console') {             // holding a controller, thumbs busy
        sl.rotation.x = -1.05 + Math.sin(t * 9) * 0.05; sr.rotation.x = -1.05 + Math.sin(t * 11 + 1) * 0.05;
        sl.rotation.z = -0.35; sr.rotation.z = 0.35;
        r.head.rotation.x = Math.sin(t * 2.3 + r.phase) * 0.05;
        r.body.rotation.z = Math.sin(t * 0.9 + r.phase) * 0.08;   // leaning into the game
        r.head.rotation.y = this.talking ? Math.sin(t * 0.7) * 0.35 : 0;
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
    } else if (this.act === 'mop') {                    // mopping: sweep side to side
      sl.rotation.x = -0.75; sr.rotation.x = -0.75;
      r.body.rotation.y = Math.sin(t * 2.2) * 0.4;
      r.head.rotation.x = 0.2;
      r.body.position.y = r.baseY; r.head.position.y = 1.25;
    } else if (this.act === 'water') {                  // watering a plant
      sr.rotation.x = -1.0 + Math.sin(t * 1.5) * 0.12;
      sr.rotation.z = -0.25;
      r.head.rotation.x = 0.3;
      r.body.position.y = r.baseY; r.head.position.y = 1.25;
    } else if (this.act === 'garden') {                 // bending over the planter, tending flowers
      r.body.rotation.x = 0.45;
      sl.rotation.x = -0.9 + Math.sin(t * 3) * 0.15;
      sr.rotation.x = -0.9 + Math.sin(t * 3 + 1.5) * 0.15;
      r.head.rotation.x = 0.45;
      r.body.position.y = r.baseY - 0.05; r.head.position.y = 1.15;
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
      r.body.rotation.x *= 0.8; r.body.rotation.y *= 0.8;          // straighten up after mopping / gardening
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
  teamMeeting: false, inTeamMeeting: new Set(), teamExpected: 0,
  // Ivan & Phil
  ivanGym: false, gymPhase: null, eugeneInSession: false,
  dinnerReady: false, philSeated: false, dinnerDone: false,
  philCafe: false, f2Chill: false, philF2: false, chillDone: false, ownersAtCafe: false,
};

// ---- shared gym moves (Eugene and Ivan use their own machine / spot)
async function treadmillOn(a, tz, front) {
  await a.go(front);
  a.g.position.y = TREAD.y;
  await a.moveTo(TREAD.stepX, tz, 0.6);
  await a.turnTo(-Math.PI / 2);
  a.anim = 'run';
}
async function treadmillOff(a, tz, front) {
  a.anim = 'idle';
  const n = nodes.get(front);
  await a.moveTo(n.x, n.z, 0.8);
  a.g.position.y = 0;
  a.node = front;
}
async function barbellOn(a, spot) { await a.go(spot); await a.turnTo(0.3); a.rig.barbell.visible = true; a.act = 'barbell'; }
function barbellOff(a) { a.act = null; a.rig.barbell.visible = false; }
async function yogaOn(a, spot) { await a.go(spot); await a.turnTo(0); a.act = 'yoga'; }
function yogaOff(a) { a.act = null; }

// called from a Floor 3 employee's desk loop when Kenny calls a team meeting
async function joinTeamMeeting(a, home) {
  a.status = 'Called into a team meeting by Kenny';
  await a.goSit(TEAM_SEATS[a.e.name]);
  flags.inTeamMeeting.add(a.e.name);
  a.talking = true; a.status = 'In the team meeting with Kenny';
  await a.waitFor(() => !flags.teamMeeting, 240);
  a.talking = false;
  flags.inTeamMeeting.delete(a.e.name);
  a.status = 'Back to my desk';
  await a.goSit(home);
}
const meetingCalled = () => flags.teamMeeting;

async function jungkook(a) {
  const home = deskSeatFor(3, a.e.seat);
  for (;;) {
    a.status = 'Working on the KRW analysis';
    await a.sleep(R(25, 40), meetingCalled);
    if (flags.teamMeeting) { await joinTeamMeeting(a, home); continue; }
    a.status = 'Walking up the stairs to see Eugene';
    await a.goStand('5:meetJ', 'stairs');
    await a.face(-1.8, -1.0);
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
    await a.face(-1.6, 0.8);
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
      if (cur === 'tread') await treadmillOff(a, TREAD.eugeneZ, '5:treadFront');
      else if (cur === 'barbell') barbellOff(a);
      else if (cur === 'yoga') yogaOff(a);
      a.talking = false; cur = null;
    };
    while (flags.ivanGym) {
      const ph = flags.gymPhase;
      if (ph !== cur) {
        await stop();
        if (ph === 'chat') { await a.go('5:home'); await a.face(-5.4, -1.5); a.talking = true; a.status = 'Chatting with Ivan'; holdBottle(true); }
        else if (ph === 'tread') { a.status = 'Running on the treadmill with Ivan'; holdBottle(true); await treadmillOn(a, TREAD.eugeneZ, '5:treadFront'); }
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
      await treadmillOn(a, TREAD.eugeneZ, '5:treadFront');
      await a.sleep(R(15, 25), called);
      await treadmillOff(a, TREAD.eugeneZ, '5:treadFront');
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
    await a.sleep(R(20, 35), () => flags.meetingCall || flags.teamMeeting);
    if (flags.teamMeeting) { flags.aidaAtDesk = false; await joinTeamMeeting(a, home); continue; }
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
    const seat = withMary ? flags.cafePair[0] : pick(CAFE_SEATS);
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
    await a.sleep(R(30, 45), meetingCalled);
    if (flags.teamMeeting) { await joinTeamMeeting(a, home); continue; }
    a.status = 'Walking up to the Floor 4 pantry';
    await a.goSit(PANTRY_SEAT, 'stairs');
    a.status = 'Chilling on the pantry sofa';
    await a.sleep(R(18, 30));
    a.status = 'Walking back down to Floor 3';
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
    await a.sleep(R(25, 40), () => flags.cafeInvite || flags.teamMeeting);
    if (flags.teamMeeting) { flags.maryAtDesk = false; await joinTeamMeeting(a, home); continue; }
    if (flags.cafeInvite) { await cafe(); continue; }
    if (!flags.aidaAtDesk || flags.teamMeeting) continue;   // Aida is out: keep working
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

// ---- Ivan & Phil (owners, both gamers). Ivan leads the day; Phil follows `own.phase`:
//   'gym'     Ivan trains with Eugene  -> Phil plays drums / piano / composes in the music room
//   'pc'      PC gaming together in the game room (Ivan asks Sally to cook)
//   'dinner'  dinner together at the dining table (Sally cooks, serves and clears up)
//   'coffee'  coffee together: down to Joe's Café, then the welcome-lounge sofas
//   'console' console gaming together on the game-room sofa
//   'onsen'   up the spiral stair together: tea in their bedroom (5F), then a soak in the 6F onsen facing Fuji
const own = { phase: 'gym', philAt: null, joePlay: false, tripGo: false, onsenDone: false };

/** The private trip both owners make in the 'onsen' phase (Ivan leads, Phil follows a few steps behind). */
async function privateTrip(a, lead) {
  const me = a.e.name, other = lead ? 'Phil' : 'Ivan';
  const exitX = real2(PRIVATE.stairX), exitZ = PRIVATE.stairZ - 1.9;
  a.status = `Going up to the bedroom with ${other}`;
  await a.goStand('4:spiralFoot');
  if (lead) { own.tripGo = true; } else { await a.waitFor(() => own.tripGo, 60); await a.sleep(3); }
  a.status = 'Climbing the spiral stair to the bedroom';
  await a.spiral(4, true);
  await a.sit(BED_TEA[me]);
  own.philAt = lead ? own.philAt : 'bed';
  a.status = `Tea in the bedroom with ${other} 🍵`;
  a.talking = true;
  if (lead) await a.waitFor(() => own.philAt === 'bed', 60);
  await a.sleep(R(12, 16));
  a.talking = false;
  await a.stand();
  a.status = `Up to the onsen with ${other} ♨️`;
  await a.moveTo(exitX, exitZ);
  if (!lead) await a.sleep(2);
  await a.spiral(5, true);
  await a.moveTo(real2(-23.5), 0.9);
  await a.sit(ONSEN[me]);
  own.philAt = lead ? own.philAt : 'onsen';
  a.status = `Soaking in the onsen with ${other}, facing Mt Fuji ♨️`;
  a.talking = true;
  if (lead) {
    await a.waitFor(() => own.philAt === 'onsen', 60);
    await a.sleep(R(20, 26));
    own.onsenDone = true;
  } else await a.waitFor(() => own.onsenDone, 120);
  a.talking = false;
  await a.stand();
  a.status = 'Heading back down the spiral stair';
  if (!lead) await a.sleep(3);
  await a.moveTo(real2(-23.5), 0.9);
  await a.moveTo(exitX, exitZ);
  await a.spiral(5, false);
  await a.spiral(4, false);
  a.node = '4:spiralFoot';
  a.g.position.set(sx(4, real2(PRIVATE.stairX)), 0, PRIVATE.stairZ - 1.9);
}
const philThere = (where) => () => own.philAt === where;

async function ivan(a) {
  for (;;) {
    // 1. gym session with Eugene, then a drink from the vending machine
    own.phase = 'gym';
    if (a.node !== '5:ivanMeet') { a.status = 'Taking the lift up to the gym'; await a.goStand('5:ivanMeet', 'lift'); }
    await a.face(-6.2, -1.2);
    flags.gymPhase = 'chat'; flags.ivanGym = true;
    a.status = 'Chatting with Eugene';
    a.talking = true;
    await a.waitFor(() => flags.eugeneInSession, 120);
    await a.sleep(5);
    a.talking = false;
    flags.gymPhase = 'tread';
    a.status = 'Running on the treadmill with Eugene';
    await treadmillOn(a, TREAD.ivanZ, '5:treadFront2');
    await a.sleep(R(15, 20));
    await treadmillOff(a, TREAD.ivanZ, '5:treadFront2');
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
    a.status = 'Buying a drink from the vending machine';
    await a.goStand('5:vendFront');
    await a.turnTo(-Math.PI / 2);
    await a.sleep(3);
    a.rig.drink.visible = true; a.holdCup = true; a.sipping = true;
    a.status = 'Having a protein shake by the vending machine';
    await a.sleep(R(8, 11));
    a.rig.drink.visible = false; a.holdCup = false; a.sipping = false;

    // 2. PC gaming with Phil; partway through, ask Sally to cook dinner
    own.phase = 'pc';
    a.status = 'Heading to the game room';
    await a.goSit(PC_IVAN, 'lift');
    a.status = 'Waiting for Phil to log in';
    await a.waitFor(philThere('pc'), 120);
    a.status = 'Playing PC games with Phil';
    a.talking = true;
    await a.sleep(R(20, 28));
    flags.dinnerRequest = true;                      // Sally starts cooking
    await a.waitFor(() => flags.dinnerReady, 240);   // keep playing until dinner is served
    a.talking = false;

    // 3. dinner together
    own.phase = 'dinner';
    a.status = 'Dinner is ready · heading to the dining table';
    await a.goSit(DINE_IVAN);
    await a.waitFor(philThere('dinner'), 90);
    a.act = 'eat'; a.talking = true; a.status = 'Having dinner with Phil (cooked by Sally)';
    await a.sleep(R(15, 20));
    a.act = null; a.talking = false;
    flags.dinnerReady = false; flags.dinnerDone = true;

    // 4. coffee together at Joe's Café, then the lounge sofas
    own.phase = 'coffee';
    a.status = 'Walking down to the café with Phil';
    await buyCoffee(a, '1:cashier', 'stairs');
    await a.goSit(CAFE_SOFA_IVAN);
    a.status = 'Coffee with Phil in the welcome lounge';
    await a.waitFor(philThere('coffee'), 120);
    a.talking = true;
    await a.sleep(R(8, 12));
    a.talking = false;
    // play with Joe before heading back up
    a.status = 'Calling Joe over 🐾';
    a.w.joe?.visit(...JOE_PLAY);
    own.joePlay = true;
    await a.goStand('1:loungeA');
    await a.face(...JOE_PLAY);
    await a.waitFor(() => a.w.joe?.playing, 30);
    a.act = 'garden'; a.talking = true; a.status = 'Playing with Joe with Phil';
    await a.sleep(R(14, 18));
    a.act = null; a.talking = false;
    own.joePlay = false;
    a.w.joe?.release();
    a.rig.cup.visible = false; a.holdCup = false;

    // 5. console gaming together
    own.phase = 'console';
    a.status = 'Back to the game room for console games';
    await a.goSit(CONSOLE_IVAN, 'stairs');
    await a.waitFor(philThere('console'), 120);
    a.status = 'Playing console games with Phil';
    a.talking = true;
    await a.sleep(R(20, 28));
    a.talking = false;

    // 6. up to their bedroom for tea, then the private onsen on 6F
    own.tripGo = false; own.onsenDone = false;
    own.phase = 'onsen';
    await privateTrip(a, true);
  }
}

async function phil(a) {
  for (;;) {
    const ph = own.phase;
    const changed = () => own.phase !== ph;
    own.philAt = null;
    if (ph === 'gym') {                              // music time while Ivan trains
      if (!flags.drumUser) {
        flags.drumUser = 'Phil';
        a.status = 'Playing the drums';
        await a.goSit(DRUM_SEAT);
        await a.sleep(R(10, 14), changed);
        await a.stand();
        flags.drumUser = null;
      }
      if (changed()) continue;
      a.status = 'Playing the piano';
      await a.goSit(PIANO_SEAT);
      await a.sleep(R(10, 14), changed);
      if (changed()) continue;
      a.status = 'Composing a new song on the music PC';
      await a.goSit(COMPOSE_SEAT);
      await a.sleep(R(14, 20), changed);
      continue;
    }
    if (ph === 'onsen') {
      await privateTrip(a, false);
      await a.waitFor(changed, 120);
      continue;
    }
    if (ph === 'pc') {
      a.status = 'Joining Ivan in the game room';
      await a.goSit(PC_PHIL);
      own.philAt = 'pc';
      a.talking = true; a.status = 'Playing PC games with Ivan';
    } else if (ph === 'dinner') {
      a.status = 'Dinner is ready · heading to the dining table';
      await a.goSit(DINE_PHIL);
      own.philAt = 'dinner';
      a.act = 'eat'; a.talking = true; a.status = 'Having dinner with Ivan (cooked by Sally)';
    } else if (ph === 'coffee') {
      a.status = 'Walking down to the café with Ivan';
      await buyCoffee(a, '1:cashier2', 'stairs');
      await a.goSit(CAFE_SOFA_PHIL);
      own.philAt = 'coffee';
      a.talking = true; a.status = 'Coffee with Ivan in the welcome lounge';
      await a.waitFor(() => own.joePlay || changed(), 120);
      if (own.joePlay) {
        await a.goStand('1:loungeB');
        await a.face(...JOE_PLAY);
        a.act = 'garden'; a.status = 'Playing with Joe with Ivan';
        await a.waitFor(() => !own.joePlay || changed(), 60);
        a.act = null;
      }
    } else if (ph === 'console') {
      a.status = 'Back to the game room for console games';
      await a.goSit(CONSOLE_PHIL, 'stairs');
      own.philAt = 'console';
      a.talking = true; a.status = 'Playing console games with Ivan';
    }
    await a.waitFor(changed, 600);
    if (a.act === 'eat') a.act = null;
    a.talking = false;
    a.rig.cup.visible = false; a.holdCup = false;
  }
}

// ---- Sally (nutritionist): reads research at her desk; cooks dinner for Ivan & Phil when asked
async function sally(a) {
  const home = deskSeatFor(3, a.e.seat);
  const w = a.w;
  for (;;) {
    a.status = 'Reading the latest nutrition research';
    await a.sleep(R(30, 50), () => flags.dinnerRequest || flags.teamMeeting);
    if (flags.teamMeeting && !flags.dinnerRequest) { await joinTeamMeeting(a, home); continue; }
    if (!flags.dinnerRequest) continue;
    flags.dinnerRequest = false; flags.dinnerDone = false;
    a.status = 'Heading up to cook dinner for Ivan & Phil';
    await a.goStand('4:stove', 'stairs');
    await a.turnTo(Math.PI);
    a.act = 'cook'; a.status = 'Cooking a healthy dinner';
    await a.sleep(R(12, 16));
    a.act = null;
    await a.go('4:islandBack');
    await a.turnTo(0);
    a.act = 'cook'; a.status = 'Plating up the food';
    await a.sleep(4);
    a.act = null;
    a.rig.tray.visible = true; a.carry = true;
    a.status = 'Serving dinner at the dining table';
    await a.go('4:dineStandI');
    await a.face(3.4, 3.9);
    a.rig.tray.visible = false; a.carry = false;
    w.plates.visible = true;
    flags.dinnerReady = true;
    a.status = 'Waiting in the kitchen while they eat';
    await a.go('4:islandBack');
    await a.turnTo(Math.PI);
    await a.waitFor(() => flags.dinnerDone, 240);
    a.status = 'Clearing the table';
    await a.go('4:dineStandI');
    await a.face(3.4, 3.9);
    w.plates.visible = false;
    a.rig.tray.visible = true; a.carry = true;
    await a.goStand('4:sink');
    await a.turnTo(Math.PI / 2);
    a.rig.tray.visible = false; a.carry = false;
    a.act = 'wash'; a.status = 'Washing the dishes';
    await a.sleep(R(8, 11));
    a.act = null;
    a.status = 'Walking back down to Floor 3';
    await a.goSit(home, 'stairs');
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

// ---- cleaners (Lily & Robert): push a cart around floors 1-5, never on the same floor at once
function makeCart() {
  const c = new THREE.Group();
  box(c, 0.55, 0.06, 0.8, '#5b6b7a', 0, 0.15, 0);                    // base
  box(c, 0.55, 0.06, 0.8, '#5b6b7a', 0, 0.65, 0);                    // top shelf
  for (const [x, z] of [[-0.25, -0.37], [0.25, -0.37], [-0.25, 0.37], [0.25, 0.37]]) {
    box(c, 0.04, 0.6, 0.04, '#8a96a3', x, 0.11, z);
    cyl(c, 0.05, 0.04, '#2b2a2c', x, 0.0, z, { rx: Math.PI / 2, seg: 8 });
  }
  box(c, 0.5, 0.04, 0.04, '#8a96a3', 0, 0.95, -0.42);                // push handle
  for (const x of [-0.24, 0.24]) box(c, 0.04, 0.3, 0.04, '#8a96a3', x, 0.68, -0.42);
  cyl(c, 0.2, 0.3, '#f1c84b', 0, 0.21, 0.15, { seg: 14 });           // mop bucket
  box(c, 0.32, 0.38, 0.28, '#2b2a2c', 0, 0.21, -0.2);                // trash bag
  for (let i = 0; i < 3; i++) cyl(c, 0.04, 0.2, ['#4fb0e0', '#7ab87a', '#f08a5d'][i], -0.15 + i * 0.15, 0.71, 0.2, { seg: 8 });  // sprays
  cyl(c, 0.015, 1.2, '#c9a24a', 0.22, 0.2, 0.32, { seg: 6 });        // spare mop
  box(c, 0.2, 0.25, 0.12, '#3f8a3f', -0.15, 0.71, -0.15);            // watering can
  c.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return c;
}
function makeWetSign() {
  const s = new THREE.Group();
  box(s, 0.3, 0.55, 0.03, '#f1c84b', 0, 0, 0.08, { rx: 0.25 });
  box(s, 0.3, 0.55, 0.03, '#f1c84b', 0, 0, -0.08, { rx: -0.25 });
  box(s, 0.12, 0.12, 0.01, '#2b2a2c', 0, 0.3, 0.13, { rx: 0.25 });
  s.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return s;
}
const cleaners = [];
// floors a cleaner is on or heading to: the other cleaner never goes to those
const takenBy = (me) => { const s = new Set(); for (const c of cleaners) if (c !== me) { s.add(c.floorClaim); if (c.nextClaim) s.add(c.nextClaim); } return s; };

async function cleaner(a) {
  const cart = makeCart(), sign = makeWetSign();
  const holdCart = () => { a.g.attach(cart); cart.position.set(0, 0, 0.75); cart.rotation.set(0, 0, 0); a.carry = true; };
  const parkCart = () => { a.carry = false; a.g.parent.attach(cart); };
  holdCart();
  for (;;) {
    // a few jobs on this floor
    const jobs = [...CLEAN_JOBS[a.floor]].sort(() => Math.random() - 0.5).slice(0, 3);
    for (const j of jobs) {
      a.status = j.k === 'mop' ? 'Pushing the cart to mop the floor' : j.k === 'water' ? 'Off to water the plants' : 'Going to tend the flowers';
      await a.goStand(j.n);
      parkCart();
      if (j.face) await a.face(...j.face);
      if (j.k === 'mop') {
        a.g.parent.attach(sign);
        sign.position.set(a.g.position.x + 0.9, a.g.position.y, a.g.position.z + 0.5);
        a.rig.mop.visible = true; a.act = 'mop'; a.status = `Mopping the floor (Floor ${a.floor})`;
        await a.sleep(R(9, 13));
        a.rig.mop.visible = false; sign.removeFromParent();
      } else if (j.k === 'water') {
        a.rig.can.visible = true; a.act = 'water'; a.status = `Watering the plants (Floor ${a.floor})`;
        await a.sleep(R(6, 9));
        a.rig.can.visible = false;
      } else {
        a.act = 'garden'; a.status = 'Gardening on the roof';
        await a.sleep(R(9, 13));
      }
      a.act = null;
      await a.turnTo(Math.atan2(cart.position.x - a.g.position.x, cart.position.z - a.g.position.z)); // back to the cart
      holdCart();
    }
    // next floor: one the other cleaner isn't on or heading to
    const free = [1, 2, 3, 4, 5].filter((f) => f !== a.floor && !takenBy(a).has(f));
    const next = pick(free.length ? free : [a.floor]);
    if (next === a.floor) { await a.sleep(5); continue; }
    a.nextClaim = next;
    a.status = `Taking the cart up/down to Floor ${next} in the lift`;
    await a.goStand(`${next}:liftLobby`, 'lift');
    a.floorClaim = next; a.nextClaim = null;
  }
}

// ---- Kenny (manager): works in his glass office; now and then walks the floor to check on the team
async function kenny(a) {
  a.rig.setPose('sit', { typing: true });
  for (;;) {
    a.status = 'Reviewing the team\'s work';
    await a.sleep(R(35, 55));
    // now and then: gather everyone who is at their desk on Floor 3 for a team meeting
    const atDesks = a.w.actors.filter((q) => q.e.home === 3 && q !== a && q.floor === 3 && q.seat && q.seat.typing);
    if (Math.random() < 0.45 && atDesks.length >= 2 && !flags.meetingCall && !flags.aidaInMeeting) {
      flags.teamExpected = atDesks.length;
      flags.teamMeeting = true;
      a.status = 'Calling the team into the meeting room';
      await a.goSit(TEAM_SEATS.Kenny);
      a.status = 'Waiting for the team to come in';
      await a.waitFor(() => flags.inTeamMeeting.size >= flags.teamExpected, 120);
      a.talking = true; a.status = `Leading a team meeting (${flags.inTeamMeeting.size} attending)`;
      await a.sleep(R(20, 30));
      a.talking = false;
      flags.teamMeeting = false;
      a.status = 'Back to the manager\'s office';
      await a.goSit(KENNY_SEAT);
      continue;
    }
    a.status = 'Walking the floor to check on the team';
    await a.goStand(pick(['3:desk6', '3:desk8']));
    await a.face(-4.4, 1.6);
    a.status = 'Checking everyone is on track';
    await a.sleep(R(6, 9));
    a.status = 'Back to the manager\'s office';
    await a.goSit(KENNY_SEAT);
  }
}

// ---- Lisa (barista): works the coffee machine behind the café counter
async function lisa(a) {
  for (;;) {
    a.act = 'cook'; a.status = 'Brewing coffee';
    await a.sleep(R(7, 11));
    a.act = 'wash'; a.status = 'Steaming milk';
    await a.sleep(R(4, 6));
    a.act = null; a.status = 'Wiping down the coffee machine';
    await a.sleep(R(4, 7));
  }
}

const ROUTINES = { lisa, kenny, jungkook, eugene, aida, xiaoming, mary, sally, ivan, phil, jennie, lily: cleaner, robert: cleaner };
const SPAWN = {                        // where the owners and cleaners start
  Lily: { stand: '1:j9', ry: Math.PI },
  Robert: { stand: '2:aisleE', ry: 0 },
  Kenny: { seat: KENNY_SEAT },
  Ivan: { stand: '5:ivanMeet', ry: -2.1 },
  Phil: { seat: COMPOSE_SEAT },
};

// ======================================================================== setup
export function createStaff({ floors, lift, employees, doors = {}, joe = null }) {
  const world = { floors, lift, doors, puffs: createPuffs(), serve() {}, cafeQueue: 0, jennieAtTill: true, actors: [], joe };
  // two plates of food on the 4F dining table (shown when Ivan serves dinner)
  world.plates = new THREE.Group();
  world.plates.userData.dynamic = true;
  for (const px of [3.4, 4.68]) {
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.02, 16), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }));
    pl.position.set(sx(4, px), 0.83, 3.4);
    const food = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: '#e2a356', roughness: 0.9 }));
    food.scale.set(1.3, 0.6, 1); food.position.set(sx(4, px), 0.87, 3.4);
    const veg = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: '#6aa84f', roughness: 0.9 }));
    veg.position.set(sx(4, px) + 0.06, 0.87, 3.36);
    world.plates.add(pl, food, veg);
  }
  world.plates.visible = false;
  floors[3].add(world.plates);   // dining table on the Chill Home floor (4F)
  const actors = [];
  world.actors = actors;
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
        a.g.position.set(sx(nodes.get(sp.seat.node).f, sp.seat.x), sp.seat.y ?? 0, sp.seat.z);
        a.heading = sp.seat.ry; a.g.rotation.y = sp.seat.ry;
        a.rig.setPose('sit');
        a.seat = sp.seat;
      }
      a.status = 'Here';
    } else if (e.pos) {                             // standing post (Eugene in the gym, Jennie at the till)
      const id = node(e.floor, e.name === 'Eugene' ? 'home' : `home_${e.name}`, e.pos[0], e.pos[1]);
      if (e.name === 'Eugene') for (const n of ['gymIn', 'treadFront', 'treadFront2', 'yoga', 'barbell', 'ivanMeet']) link(id, `5:${n}`);
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
    if (e.cleaner) { a.floorClaim = a.floor; cleaners.push(a); }   // reserve their starting floor right away
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
      // Rose (reception) and Jisoo (usher) greet anyone walking past
      for (const greeter of actors.filter((q) => q.e.name === 'Rose' || q.e.name === 'Jisoo')) {
        greeter.greetCool = (greeter.greetCool ?? 0) - dt;
        if (greeter.greetCool > 0) continue;
        const v = greeter.g.position;
        const near = actors.find((q) => q !== greeter && q.floor === 1 && q.g.parent === greeter.g.parent && !['Rose', 'Jisoo', 'Lisa', 'Jennie'].includes(q.e.name) && Math.hypot(q.g.position.x - v.x, q.g.position.z - v.z) < 3.0);
        if (near) {
          greeter.talkFor = 2.5; greeter.greetCool = 12;
          greeter.e.status = `Greeting ${near.e.name}`;
          setTimeout(() => { greeter.e.status = greeter.e.idle; }, 2500);
        }
      }
      world.puffs.update(dt);
    },
  };
}
