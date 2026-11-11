// Live FX board for Floor 3: 1 SGD -> KRW and 1 SGD -> CNY, refreshed every hour.
// Rates are fetched in the browser from free, key-less public APIs:
//   1. Coinbase exchange rates (updates every few minutes)
//   2. ExchangeRate-API open endpoint (daily) as a fallback
import * as THREE from 'three';
import { roundRect } from './helpers.js';

const KRW_TARGET = 1150;              // same target as the "SGD rate target watch (silent)" task
const REFRESH_MS = 60 * 60 * 1000;    // hourly

async function getJSON(url, ms = 8000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timer); }
}

async function fetchRates() {
  try {
    const j = await getJSON('https://api.coinbase.com/v2/exchange-rates?currency=SGD');
    const krw = parseFloat(j?.data?.rates?.KRW), cny = parseFloat(j?.data?.rates?.CNY);
    if (krw > 0 && cny > 0) return { krw, cny, at: Date.now(), source: 'Coinbase' };
  } catch (e) { /* try the fallback */ }
  const j = await getJSON('https://open.er-api.com/v6/latest/SGD');
  const krw = j?.rates?.KRW, cny = j?.rates?.CNY;
  if (!(krw > 0 && cny > 0)) throw new Error('no rates');
  return { krw, cny, at: (j.time_last_update_unix ?? Date.now() / 1000) * 1000, source: 'ExchangeRate-API (daily)' };
}

const sgtTime = (ms, withDate = false) => new Date(ms).toLocaleString('en-GB', {
  timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', ...(withDate ? { day: 'numeric', month: 'short' } : {}),
});

export function createFxBoard() {
  const W = 1024, Hh = 448;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = Hh;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const state = { now: null, prev: null, error: '', loading: true };

  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, Hh);
    bg.addColorStop(0, '#0f2236'); bg.addColorStop(1, '#0a1624');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, Hh);
    ctx.textBaseline = 'middle';
    // header
    ctx.fillStyle = '#7fd0c0'; ctx.font = 'bold 34px -apple-system, "Segoe UI", sans-serif';
    ctx.fillText('💱 FX BOARD · SGD', 36, 44);
    ctx.fillStyle = '#9fb3c8'; ctx.font = '600 30px -apple-system, "Segoe UI", sans-serif';
    const clock = `${sgtTime(Date.now())} SGT`;
    ctx.fillText(clock, W - 36 - ctx.measureText(clock).width, 44);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(36, 78, W - 72, 2);

    const n = state.now;
    if (!n) {
      ctx.fillStyle = '#dfe9f3'; ctx.font = '600 40px -apple-system, sans-serif';
      ctx.fillText(state.loading ? 'Loading live rates…' : 'Live rates unavailable right now', 36, 220);
      if (state.error) { ctx.fillStyle = '#9fb3c8'; ctx.font = '28px -apple-system, sans-serif'; ctx.fillText('Will retry automatically.', 36, 280); }
      texture.needsUpdate = true;
      return;
    }
    const row = (y, label, value, digits, prevValue) => {
      ctx.fillStyle = '#9fb3c8'; ctx.font = '600 34px -apple-system, sans-serif';
      ctx.fillText(label, 36, y);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 76px -apple-system, "Segoe UI", sans-serif';
      const txt = value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
      ctx.fillText(txt, 300, y);
      const tw = ctx.measureText(txt).width;
      if (prevValue) {
        const d = value - prevValue, up = d >= 0;
        ctx.fillStyle = up ? '#5fd38a' : '#ff7a7a'; ctx.font = 'bold 32px -apple-system, sans-serif';
        ctx.fillText(`${up ? '▲' : '▼'} ${Math.abs(d / prevValue * 100).toFixed(2)}%`, 300 + tw + 24, y + 6);
      }
    };
    row(150, '1 SGD → KRW', n.krw, 2, state.prev?.krw);
    row(260, '1 SGD → CNY', n.cny, 4, state.prev?.cny);
    // KRW target progress
    const pct = Math.min(1, n.krw / KRW_TARGET);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(ctx, 36, 330, W - 72, 22, 11); ctx.fill();
    ctx.fillStyle = n.krw >= KRW_TARGET ? '#5fd38a' : '#f1c84b'; roundRect(ctx, 36, 330, Math.max(22, (W - 72) * pct), 22, 11); ctx.fill();
    ctx.fillStyle = '#dfe9f3'; ctx.font = '600 28px -apple-system, sans-serif';
    ctx.fillText(n.krw >= KRW_TARGET ? `🎯 KRW target ${KRW_TARGET.toLocaleString()} reached!` : `KRW target ${KRW_TARGET.toLocaleString()} · ${(pct * 100).toFixed(1)}% there`, 36, 382);
    ctx.fillStyle = '#7d93aa'; ctx.font = '24px -apple-system, sans-serif';
    const foot = `As of ${sgtTime(n.at, true)} SGT · ${n.source} · tap the board to refresh`;
    ctx.fillText(foot, 36, 422);
    texture.needsUpdate = true;
  }

  async function refresh() {
    try {
      const r = await fetchRates();
      if (state.now) state.prev = state.now;
      state.now = r; state.error = '';
    } catch (e) {
      state.error = String(e?.message || e);
      if (!state.now) setTimeout(refresh, 5 * 60 * 1000); // no rate yet: retry sooner
    }
    state.loading = false;
    draw();
  }

  draw();
  return {
    texture,
    state,
    refresh,          // returns a promise; used by the "Refresh rates" button
    start() {
      refresh();
      setInterval(refresh, REFRESH_MS);
      setInterval(draw, 30 * 1000); // keep the clock ticking
    },
  };
}
