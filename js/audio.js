// Ambient sounds, all synthesised with Web Audio (no sound files to download):
//   soft koto music, a shishi-odoshi bamboo fountain (water trickle + "tok"), furin wind chimes,
//   the shamisen player on the Floor 1 stage, and a train-station style chime when the lift arrives.
// Sound starts after the first tap (browsers require that). The 🔊 button mutes / unmutes and the
// choice is remembered on this device.
let ctx = null, master = null, beds = null, started = false;
let muted = false;
try { muted = localStorage.getItem('ipman.muted') === '1'; } catch (e) { /* private mode */ }
let view = 0;

const HIRAJOSHI = [293.66, 329.63, 349.23, 440.0, 466.16, 587.33, 659.25, 698.46, 880.0];   // D E F A Bb (koto scale)
const SHAMISEN = [196.0, 261.63, 293.66, 392.0, 523.25, 587.33];

function ensure() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  beds = { ambient: gainNode(0.9), stage: gainNode(0), roof: gainNode(0.6) };
  setView(view);
}
function gainNode(v) { const g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; }

// ---- plucked string (Karplus-Strong), cached per pitch
const plucks = new Map();
function pluckBuffer(freq, bright, dur) {
  const key = `${freq}|${bright}|${dur}`;
  let b = plucks.get(key);
  if (b) return b;
  const sr = ctx.sampleRate, n = Math.floor(sr * dur), N = Math.max(2, Math.round(sr / freq));
  b = ctx.createBuffer(1, n, sr);
  const d = b.getChannelData(0), ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
  const decay = 0.996 - (1 - bright) * 0.006;
  for (let i = 0, k = 0; i < n; i++) {
    const nx = (k + 1) % N;
    const v = ring[k];
    ring[k] = decay * (bright * v + (1 - bright) * 0.5 * (v + ring[nx]));
    d[i] = v * (bright > 0.8 ? Math.tanh(v * 2.2) / Math.tanh(2.2) : 1);   // a little "sawari" buzz for the shamisen
    k = nx;
  }
  plucks.set(key, b);
  return b;
}
function pluck(dest, freq, gain, o = {}) {
  if (!ctx) return;
  const s = ctx.createBufferSource();
  s.buffer = pluckBuffer(freq, o.bright ?? 0.5, o.dur ?? 2.2);
  const g = ctx.createGain(); g.gain.value = gain;
  let out = s.connect(g);
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = o.pan ?? 0; out = out.connect(p); }
  out.connect(dest);
  s.start(ctx.currentTime + (o.delay ?? 0));
}
// ---- bell (furin / chime)
function bell(dest, freq, gain, dur = 2.4, delay = 0, partials = [1, 2.76, 5.4], type = 'sine') {
  const t0 = ctx.currentTime + delay;
  partials.forEach((p, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq * p;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain / (i + 1), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur / (i + 1));
    o.connect(g).connect(dest); o.start(t0); o.stop(t0 + dur);
  });
}
function noiseBuffer(sec) {
  const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
// ---- shishi-odoshi: a hollow bamboo knock
export function knock() {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(420, t0); o.frequency.exponentialRampToValueAtTime(160, t0 + 0.12);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
  o.connect(g).connect(beds.roof); o.start(t0); o.stop(t0 + 0.3);
  const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gn = ctx.createGain();
  n.buffer = noiseBuffer(0.08); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 3;
  gn.gain.value = 0.25; n.connect(f).connect(gn).connect(beds.roof); n.start(t0);
}
function trickle() {
  const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  n.buffer = noiseBuffer(2); n.loop = true;
  f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.8;
  g.gain.value = 0.018;
  n.connect(f).connect(g).connect(beds.roof); n.start();
}

// ---- generative loops
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function kotoLoop() {
  if (!muted) {
    const i = Math.floor(Math.random() * (HIRAJOSHI.length - 1));
    pluck(beds.ambient, HIRAJOSHI[i], 0.07, { bright: 0.45, dur: 3, pan: rand(-0.4, 0.4) });
    if (Math.random() < 0.35) pluck(beds.ambient, HIRAJOSHI[i + 1], 0.05, { bright: 0.45, dur: 3, delay: 0.22 });
  }
  setTimeout(kotoLoop, rand(1600, 4200));
}
let shamiStep = 0;
function shamisenLoop() {
  if (!muted && beds.stage.gain.value > 0.001) {
    const phrase = [0, 3, 2, 3, 1, 3, 4, 3];
    const note = SHAMISEN[phrase[shamiStep % phrase.length]];
    pluck(beds.stage, note, 0.12, { bright: 0.92, dur: 1.2, pan: -0.15 });
    if (shamiStep % 4 === 0) pluck(beds.stage, note / 2, 0.06, { bright: 0.9, dur: 1.2 });
  }
  shamiStep++;
  setTimeout(shamisenLoop, shamiStep % 8 === 7 ? 1100 : 380);
}
function furinLoop() {
  if (!muted) bell(beds.ambient, pick([2093, 2349, 2637, 3136]), 0.03, 2.6, 0, [1, 2.76, 5.4]);
  setTimeout(furinLoop, rand(5000, 13000));
}

/** Lift arrival: a short train-station style melody. */
export function chime() {
  if (!ctx || muted) return;
  [659.25, 830.61, 987.77, 1318.5].forEach((f, i) => bell(master, f, 0.09, 0.9, i * 0.16, [1, 2], 'triangle'));
}

/** Which floor is on screen: the shamisen is loud on Floor 1, the fountain on the roof. */
export function setView(n) {
  view = n;
  if (!ctx) return;
  const t = ctx.currentTime;
  beds.stage.gain.setTargetAtTime(n === 1 ? 1 : n === 0 ? 0.3 : 0, t, 0.4);
  beds.roof.gain.setTargetAtTime(n === 5 ? 1 : n === 0 ? 0.5 : 0.15, t, 0.4);
  beds.ambient.gain.setTargetAtTime(0.9, t, 0.4);
}

function start() {
  if (started) return;
  ensure();
  if (!ctx) return;
  ctx.resume?.();
  started = true;
  trickle(); kotoLoop(); shamisenLoop(); furinLoop();
}

/** Wire up the mute button and start on the first tap. */
export function initAudio(button) {
  const paint = () => { button.textContent = muted ? '🔇' : '🔊'; button.setAttribute('aria-label', muted ? 'Sound off. Tap to turn on' : 'Sound on. Tap to mute'); };
  paint();
  const first = () => { if (!muted) start(); window.removeEventListener('pointerdown', first); };
  window.addEventListener('pointerdown', first);
  button.addEventListener('click', (ev) => {
    ev.stopPropagation();
    muted = !muted;
    try { localStorage.setItem('ipman.muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (!muted) start();
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.1);
    paint();
  });
}
