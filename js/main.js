import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { H, CEIL, floorY, floorH, box, cyl, sphere, mat, makeLabel, optimize, GLOW, WINDOWS } from './helpers.js';
import { shell, liftCar, LIFT, X0, XC, EXT, SPLIT, KANJI } from './building.js';
import { floor1, floor2, officeFloor, floor5, vendingMachine } from './floors.js';
import { placeDarumas, stoneLantern } from './japan.js';
import { createEnv, mtFuji, isFriday } from './env.js';
import { EMPLOYEES } from './employees.js';
import { createStaff, createLift } from './staff.js';
import { createFxBoard } from './fx.js';
import { createPanel } from './panel.js';

const FLOORS = [
  { n: 1, name: "Joe's Café", sub: 'Atrium tea house · stage · welcome lounge' },
  { n: 2, name: 'Outsource AI Team', sub: 'Office for client work (future)' },
  { n: 3, name: 'In-house Office', sub: 'My in-house AI team' },
  { n: 4, name: 'Chill Home', sub: 'Living room · tatami room · jazz kissa · omakase' },
  { n: 5, name: 'Japanese Garden', sub: 'Dojo · roof garden · hinoki bath facing Fuji' },
];

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // static scene: update shadows only when needed

const scene = new THREE.Scene();
{
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#8fb8de'); g.addColorStop(0.55, '#f5cfa8'); g.addColorStop(1, '#f7e2c4');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t;
}
scene.fog = new THREE.Fog('#f3dcc0', 90, 220);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.3, 700);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 4;
controls.maxDistance = 140;
controls.maxPolarAngle = Math.PI * 0.49;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.9;
controls.screenSpacePanning = true;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

// ---------------------------------------------------------------- lights
const hemi = new THREE.HemisphereLight('#fff4e0', '#b9a07f', 1.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe2b8', 2.2);
sun.position.set(18, 40, 26);
sun.target.position.set(XC, 16, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -44, right: 44, top: 46, bottom: -44, near: 1, far: 140 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#ffd9a8', 0.6);
fill.position.set(-20, 10, 30);
scene.add(fill);

// ---------------------------------------------------------------- ground & surroundings
function surroundings() {
  const g = new THREE.Group();
  const grass = new THREE.Mesh(new THREE.CircleGeometry(120, 40), mat('#a9c47f'));
  grass.rotation.x = -Math.PI / 2; grass.position.y = -0.32; grass.receiveShadow = true;
  g.add(grass);
  box(g, 34 + EXT, 0.32, 22, '#e3d6c3', XC, -0.32, 0.5, { cast: false });      // plaza / sidewalk
  box(g, 120, 0.05, 8, '#6f6a66', 0, -0.32, 16, { cast: false });       // street
  for (let x = -56; x < 60; x += 6) box(g, 2.5, 0.02, 0.25, '#f5f0e6', x, -0.27, 16, { cast: false });
  const tree = (x, z, s = 1) => {
    cyl(g, 0.25 * s, 2 * s, '#7a5233', x, -0.3, z, { seg: 7 });
    sphere(g, 1.6 * s, '#6f9f52', x, 2.6 * s, z, { s: [1, 1.1, 1] });
    sphere(g, 1.1 * s, '#86b562', x + 0.7 * s, 3.3 * s, z + 0.3 * s);
  };
  [[-17, 4, 1.2], [-17, -6, 1.4], [17, 6, 1.1], [17, -5, 1.5], [-22, 12, 1], [23, 11, 1.2], [-6, -16, 1.6], [8, -15, 1.3], [-30, -8, 1.8], [30, -10, 1.6]]
    .forEach(([x, z, s]) => tree(x < -12 ? x - EXT : x, z, s));   // keep the left-side trees clear of the longer building
  for (const x of [-13.5 - EXT, 13.5]) {     // street lamps
    cyl(g, 0.08, 4.2, '#3a3a3a', x, -0.3, 11.5, { seg: 6 });
    sphere(g, 0.25, mat('#ffe2a0', { emissive: '#ffd27a' }), x, 4.0, 11.5, { cast: false });
  }
  // a glowing drinks vending machine on the street, by the entrance
  vendingMachine(g, 9.3, 11.0, 0, { body: '#2f6fb0', trim: '#1f4f86', title: 'つめた〜い COLD', sub: 'green tea · ramune', cols: ['#7ab87a', '#4fb0e0', '#f2f2f2', '#e85d3d', '#f1c84b'] });
  stoneLantern(g, 13.6, 9.6, 1.1);
  optimize(g);
  scene.add(g);

}

const fuji = mtFuji();
scene.add(fuji);
surroundings();

// ---------------------------------------------------------------- see-through walls
// Each side wall gets its own copy of its materials so it can fade on its own.
const WALL_SIDES = {
  left: { normal: new THREE.Vector3(-1, 0, 0), mats: new Map(), fade: 1 },
  right: { normal: new THREE.Vector3(1, 0, 0), mats: new Map(), fade: 1 },
  back: { normal: new THREE.Vector3(0, 0, -1), mats: new Map(), fade: 1 },
};
function addWall(side, group) {
  optimize(group);
  const ws = WALL_SIDES[side];
  group.traverse((o) => {
    if (!o.isMesh) return;
    let m = ws.mats.get(o.material);
    if (!m) {
      m = o.material.clone();
      m.userData.baseOpacity = m.opacity;
      m.userData.baseTransparent = m.transparent;
      ws.mats.set(o.material, m);
    }
    if (WINDOWS.has(o.material)) WINDOWS.add(m);             // keep night lighting working on the faded copies
    if (GLOW.has(o.material)) GLOW.set(m, GLOW.get(o.material));
    o.material = m;
  });
}
const MIN_WALL_OPACITY = 0.1;
const _dir = new THREE.Vector3();
function updateWalls() {
  // direction from the building's centre to the camera
  _dir.set(camera.position.x - XC, camera.position.y - controls.target.y, camera.position.z).normalize();
  for (const side in WALL_SIDES) {
    const ws = WALL_SIDES[side];
    // facing = 1 when looking straight at that wall from outside
    const facing = _dir.dot(ws.normal);
    const k = THREE.MathUtils.smoothstep(facing, 0.42, 0.68);
    const want = 1 - k * (1 - MIN_WALL_OPACITY);
    if (Math.abs(want - ws.fade) < 0.005) continue;
    ws.fade = want;
    for (const m of ws.mats.values()) {
      const solid = want > 0.995 && !m.userData.baseTransparent;
      m.opacity = m.userData.baseOpacity * want;
      if (m.transparent === solid) { m.transparent = !solid; m.needsUpdate = true; }
      m.depthWrite = solid;
    }
  }
}

// ---------------------------------------------------------------- the building
const anim = { fxBoard: createFxBoard() };
const floorGroups = [];
const floorLabels = [];
for (const f of FLOORS) {
  const g = new THREE.Group();
  g.position.y = floorY(f.n);
  g.name = `floor${f.n}`;
  scene.add(g);
  const walls = shell(g, f.n);
  // furniture goes in its own group: it was laid out for the original 24 m floor, so
  // everything left of SPLIT moves left with the wall (the building is now 40% longer)
  const c = new THREE.Group();
  g.add(c);
  if (f.n === 1) floor1(c, anim);
  else if (f.n === 4) floor2(c, anim);   // Chill Home (built by floor2(), now on the 4th floor)
  else if (f.n === 5) floor5(c, anim);
  else officeFloor(c, f.n, [], anim);
  c.updateMatrixWorld(true);
  const _bb = new THREE.Box3(), _bc = new THREE.Vector3();
  for (const o of [...c.children]) {
    if (o.userData.noShift) continue;
    _bb.setFromObject(o).getCenter(_bc);           // judge by where the piece actually is
    if (_bc.x < SPLIT[f.n]) o.position.x -= EXT;
  }
  optimize(g);
  for (const side in walls) addWall(side, walls[side]);
  const lbl = makeLabel(`${KANJI[f.n]} ${f.n}F  ${f.name}`, { height: 0.75, px: 60 });
  lbl.position.set(X0 - 0.6, floorY(f.n) + Math.min(floorH(f.n), H) - 0.8, 8.6);
  lbl.center.set(0, 0.5);
  scene.add(lbl);
  floorLabels.push(lbl);
  floorGroups.push(g);
}
// Fridays (Singapore time): JungKook, XiaoMing and Kenny come to work in yukata
if (isFriday()) {
  const YUKATA = { JungKook: ['#2f3f6a', '#c9a24a'], XiaoMing: ['#3f5a4a', '#e8d6a8'], Kenny: ['#2a2a35', '#a8442e'] };
  for (const e of EMPLOYEES) {
    const y = YUKATA[e.name];
    if (y) Object.assign(e, { outfit: 'yukata', shirt: y[0], pants: y[0], obi: y[1], collar: '#f4efe4', tie: undefined });
  }
}
const car = liftCar(scene);
car.traverse((o) => { o.castShadow = false; });   // it moves a lot now; keep the static shadow map valid
const lift = createLift(car);
// the AI employees (they work, walk, take the stairs / lift — see js/staff.js)
const staff = createStaff({ floors: floorGroups, lift, employees: EMPLOYEES, doors: anim.doors || {}, joe: anim.joe });
anim.fxBoard.start();
// seasons + day/night (Singapore time)
const env = createEnv({ scene, renderer, hemi, sun, fill, fuji, roofY: floorY(5) });
// day / night button: Auto (Singapore time) -> Day -> Night
{
  const btn = document.getElementById('sky'), MODES = ['auto', 'day', 'night'];
  const LOOK = { auto: ['🕒', 'Sky: follows Singapore time. Tap for day'], day: ['☀️', 'Sky: day. Tap for night'], night: ['🌙', 'Sky: night. Tap for Singapore time'] };
  let mode = 'auto';
  try { mode = MODES.includes(localStorage.getItem('ipman.sky')) ? localStorage.getItem('ipman.sky') : 'auto'; } catch (e) { /* private mode */ }
  const set = (m) => {
    mode = m; env.setMode(m);
    btn.textContent = LOOK[m][0]; btn.setAttribute('aria-label', LOOK[m][1]); btn.title = LOOK[m][1];
    try { localStorage.setItem('ipman.sky', m); } catch (e) { /* ignore */ }
  };
  set(mode);
  btn.addEventListener('click', (ev) => { ev.stopPropagation(); set(MODES[(MODES.indexOf(mode) + 1) % 3]); });
}
const panel = createPanel({ employees: EMPLOYEES, floors: FLOORS });
// Kenny's daruma wall on Floor 3: one daruma per scheduled task (private tasks stay off the public site)
if (anim.darumaShelf) {
  const tasks = EMPLOYEES.flatMap((e) => (e.tasks || []).filter((t) => !t.private).map((t) => ({ name: t.name, owner: e.name })));
  const wall = placeDarumas(anim.darumaShelf, tasks);
  fetch(`reports/latest.json?t=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.status) wall.update(j.status); }).catch(() => {});
}

// ---------------------------------------------------------------- camera presets
const TOTAL_H = floorY(5) + 3.5;
const BUILD_CENTER = new THREE.Vector3(XC, TOTAL_H * 0.5, 0);
const VIEW_DIR = new THREE.Vector3(0.55, 0.5, 1).normalize();

function fitDistance(w, h) {
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  return Math.max(h / 2 / Math.tan(vfov / 2), w / 2 / Math.tan(hfov / 2));
}

function preset(n) {
  if (n === 0) {
    const d = fitDistance(40, TOTAL_H + 7) + 10;
    return { target: BUILD_CENTER.clone(), pos: BUILD_CENTER.clone().addScaledVector(VIEW_DIR, d) };
  }
  // Floor 1 is a tall atrium: look in from the open street side, just under the roof beams
  const target = new THREE.Vector3(XC - 0.5, floorY(n) + (n === 1 ? 2.5 : 0.5), n === 1 ? -0.5 : 0.5);
  const dir = new THREE.Vector3(0.28, n === 1 ? 0.5 : 1.15, 1).normalize();
  const d = fitDistance(35, 15) * 0.82 + (n === 1 ? 3 : 4);
  return { target, pos: target.clone().addScaledVector(dir, d) };
}

let current = -1;
let tween = null;
function goTo(n, instant = false) {
  current = n;
  // hide floors above the selected one so you can look inside
  floorGroups.forEach((g, i) => { g.visible = n === 0 || i + 1 <= n; });
  floorLabels.forEach((l, i) => { l.visible = n === 0 || i + 1 === n; });
  renderer.shadowMap.needsUpdate = true;
  // lift travels to the selected floor
  lift.viewY = (n === 0 ? 0 : floorY(n)) + 0.02; // idle lift waits on the floor you're viewing
  const p = preset(n);
  if (instant) {
    camera.position.copy(p.pos); controls.target.copy(p.target); controls.update();
  } else {
    tween = { t: 0, fromPos: camera.position.clone(), fromTgt: controls.target.clone(), toPos: p.pos, toTgt: p.target };
  }
  // UI
  document.querySelectorAll('#floors button').forEach((b) => b.classList.toggle('active', +b.dataset.floor === n));
  const info = n === 0 ? { name: 'IP Man Home Office', sub: '5 floors · pick a floor below' } : FLOORS[n - 1];
  document.getElementById('floorTitle').textContent = n === 0 ? info.name : `${n}F · ${info.name}`;
  document.getElementById('floorSub').textContent = info.sub;
  hideCard();
  if (typeof panel !== 'undefined') panel.show(n);   // floor team panel (hidden for the whole building)
  if (typeof env !== 'undefined') env.setView(n);
}

// ---------------------------------------------------------------- UI
const nav = document.getElementById('floors');
const btns = [{ n: 0, label: '🏢', small: 'All' }, ...[...FLOORS].reverse().map((f) => ({ n: f.n, label: `${f.n}`, small: f.name.split(' ')[0].replace("'s", '') }))];
for (const b of btns) {
  const el = document.createElement('button');
  el.dataset.floor = b.n;
  el.innerHTML = `<span class="big">${b.label}</span><span class="small">${b.small}</span>`;
  el.addEventListener('click', () => goTo(b.n));
  nav.appendChild(el);
}

const card = document.getElementById('card');
// ---- employee cards: role + scheduled tasks with the time until each next run
const SGT = 8 * 3600e3; // schedules are in Singapore time (UTC+8)
function msUntil(at, now = Date.now()) {
  const t = new Date(now + SGT);          // read UTC fields as Singapore wall-clock time
  const c = new Date(t); c.setUTCSeconds(0, 0);
  if (at.every === 'hour') {
    c.setUTCMinutes(at.m);
    if (c <= t) c.setUTCHours(c.getUTCHours() + 1);
    const n = at.n ?? 1, h0 = at.h0 ?? 0;            // every n hours, starting from hour h0
    while ((c.getUTCHours() - h0 + 24) % n) c.setUTCHours(c.getUTCHours() + 1);
  } else {
    c.setUTCHours(at.h, at.m);
    if (at.every === 'week') {
      c.setUTCDate(c.getUTCDate() + ((at.dow - c.getUTCDay() + 7) % 7));
      if (c <= t) c.setUTCDate(c.getUTCDate() + 7);
    } else if (c <= t) c.setUTCDate(c.getUTCDate() + 1);
  }
  return c - t;
}
function fmtIn(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return m ? `${h} h ${m} min` : `${h} h`;
  const d = Math.floor(h / 24), rh = h % 24;
  return rh ? `${d} d ${rh} h` : `${d} d`;
}
function employeeText(e) {
  const lines = [`${e.role} · Floor ${e.floor}`];
  if (e.status) lines.push(`Now: ${e.status}`);
  lines.push('');
  if (!e.tasks?.length) lines.push(e.owner ? 'No scheduled tasks · just enjoying the house 🏠' : e.cleaner ? 'No scheduled tasks · keeping the house clean 🧹' : 'No scheduled tasks yet');
  for (const task of e.tasks ?? []) {
    lines.push(`📋 ${task.name}`);
    lines.push(task.at ? `     ${task.when} (SGT) · next in ${fmtIn(msUntil(task.at))}` : `     ${task.when}`);
  }
  return lines.join('\n');
}
let cardInfo = null;
setInterval(() => { if (cardInfo && card.classList.contains('show')) showCard(cardInfo); }, 1000); // live "Now:" line
const cardBtn = document.getElementById('cardBtn');
function fxText() {
  const s = anim.fxBoard.state, n = s.now;
  if (s.refreshing) return 'Getting the latest rates…';
  if (!n) return s.error ? 'Live rates are unavailable right now.' : 'Loading live rates…';
  const at = new Date(n.at).toLocaleString('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
  return `1 SGD = ${n.krw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KRW\n1 SGD = ${n.cny.toFixed(4)} CNY\n\nAs of ${at} SGT · ${n.source}${s.error ? '\n(last refresh failed — showing the previous rate)' : ''}\nRefreshes by itself every hour.`;
}
cardBtn.addEventListener('click', async (ev) => {
  ev.stopPropagation();                      // don't close the card
  cardBtn.disabled = true;
  cardBtn.textContent = 'Refreshing…';
  anim.fxBoard.state.refreshing = true;
  if (cardInfo) showCard(cardInfo);
  await anim.fxBoard.refresh();
  anim.fxBoard.state.refreshing = false;
  if (cardInfo) showCard(cardInfo);
});
function showCard(info) {
  cardInfo = info;
  card.querySelector('h3').textContent = info.employee ? `${info.title} 🟢` : info.title;
  card.querySelector('p').textContent = info.employee ? employeeText(info.employee) : info.fx ? fxText() : info.text;
  cardBtn.hidden = !info.fx;
  if (info.fx && !anim.fxBoard.state.refreshing) { cardBtn.disabled = false; cardBtn.textContent = '🔄 Refresh rates'; }
  card.classList.toggle('emp', !!info.employee);
  card.classList.add('show');
}
function hideCard() { card.classList.remove('show'); }
card.addEventListener('click', hideCard);

// tap (not drag) on a character / Joe / the FX board to see info
const ray = new THREE.Raycaster();
function pickInfo(clientX, clientY) {
  const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const targets = [];
  scene.traverseVisible((o) => { if (o.userData.info && o.isMesh) targets.push(o); });
  return ray.intersectObjects(targets, false)[0]?.object.userData.info ?? null;
}
// on a computer: show a hand cursor over things you can click
let hoverT = 0;
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons) return;
  const now = performance.now();
  if (now - hoverT < 120) return;
  hoverT = now;
  canvas.style.cursor = pickInfo(e.clientX, e.clientY) ? 'pointer' : '';
});
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const quick = performance.now() - down.t < 400;
  down = null;
  if (moved > 8 || !quick) return;
  const info = pickInfo(e.clientX, e.clientY);
  if (info) showCard(info); else hideCard();
});

// ---------------------------------------------------------------- resize & loop
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// keyboard shortcuts on a computer: 0 / A = whole building, 1-5 = floors
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k >= '0' && k <= '5') goTo(+k);
  else if (k === 'a') goTo(0);
  else if (k === 'escape') hideCard();
});

const clock = new THREE.Clock();
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  if (tween) {
    tween.t = Math.min(1, tween.t + dt / 0.9);
    const k = ease(tween.t);
    camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
    controls.target.lerpVectors(tween.fromTgt, tween.toTgt, k);
    if (tween.t >= 1) tween = null;
  }
  controls.update();
  // lift: serves employees first, otherwise waits on the floor you're viewing
  const simDt = dt * (window.__staffSpeed || 1); // __staffSpeed: testing only
  lift.update(simDt);
  car.visible = current === 0 || lift.floor() <= current;
  updateWalls();
  // Joe roams the café
  if (anim.joe) anim.joe.update(dt, t);
  for (const tick of anim.tickers || []) tick(dt, t);   // koi, the shamisen player, steam…
  env.update(dt, t);
  // employees: routines, walking, smoking…
  staff.update(simDt, t);
  // only show name tags of people on the floor you're looking at (all of them in the whole-building view)
  for (const p of staff.actors) p.rig.tag.visible = current === 0 || p.floor === current;
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

goTo(0, true);
window.__app = { camera, controls, scene, goTo, anim, THREE, staff, lift, renderer };
renderer.shadowMap.needsUpdate = true;
document.getElementById('loading').classList.add('done');
requestAnimationFrame(loop);
void LIFT;
