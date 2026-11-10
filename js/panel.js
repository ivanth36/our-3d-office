// Floor panel ("infogram"): when a floor is picked, a panel on the right lists the people who
// belong to that floor — one column each — with their face, name, role, what they're doing now,
// and the latest message each of their scheduled tasks sent. Tap a message to read it in full.
//
// Messages come from reports/latest.json (task name -> { sentAt, text }).

const SGT = 'Asia/Singapore';
const sgtDay = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: SGT });
function when(iso) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-GB', { timeZone: SGT, hour: '2-digit', minute: '2-digit' });
  const today = sgtDay(Date.now()), yest = sgtDay(Date.now() - 864e5), day = sgtDay(d);
  if (day === today) return `Today, ${time}`;
  if (day === yest) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString('en-GB', { timeZone: SGT, day: 'numeric', month: 'short' })}, ${time}`;
}

// ---- tiny, safe markdown: escape everything, then add bold / headings / bullets / links
function esc(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .replace(/(^|\s)_([^_\n]+)_/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);
}
function md(text) {
  const out = [];
  let list = false;
  for (const line of text.split('\n')) {
    const l = line.trimEnd();
    const bullet = l.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(bullet[1])}</li>`); continue; }
    if (list) { out.push('</ul>'); list = false; }
    const h = l.match(/^#{1,4}\s+(.*)$/);
    if (h) out.push(`<h4>${inline(h[1])}</h4>`);
    else if (l.trim() === '') out.push('<div class="gap"></div>');
    else out.push(`<p>${inline(l)}</p>`);
  }
  if (list) out.push('</ul>');
  return out.join('');
}
const plain = (t) => t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim();

// ---- cartoon head drawn from the employee's look
function avatar(e) {
  const c = document.createElement('canvas');
  c.width = c.height = 120;
  const x = c.getContext('2d');
  const skin = e.skin ?? '#f6d6bd', hair = e.hair ?? '#5a3a22';
  x.fillStyle = e.shirt ?? '#ffffff';
  x.beginPath(); x.ellipse(60, 128, 44, 30, 0, 0, Math.PI * 2); x.fill();
  if (e.hairStyle === 'long') { x.fillStyle = hair; x.beginPath(); x.ellipse(60, 66, 44, 46, 0, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = skin; x.beginPath(); x.arc(60, 60, 36, 0, Math.PI * 2); x.fill();
  x.fillStyle = e.cap ?? hair;                                   // hair (or cap) on top
  x.beginPath(); x.ellipse(60, 40, 40, 24, 0, Math.PI, 0); x.fill();
  x.beginPath(); x.ellipse(46, 40, 16, 10, 0.3, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.ellipse(74, 39, 16, 10, -0.3, 0, Math.PI * 2); x.fill();
  if (e.cap) { x.fillRect(32, 40, 56, 6); }
  if (e.hairStyle === 'bun') { x.fillStyle = hair; x.beginPath(); x.arc(60, 16, 13, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = '#1c1410';
  for (const sx of [48, 72]) { x.beginPath(); x.arc(sx, 62, 5, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = '#fff';
  for (const sx of [49.5, 73.5]) { x.beginPath(); x.arc(sx, 60.5, 1.6, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = 'rgba(242,167,160,0.8)';
  for (const sx of [40, 80]) { x.beginPath(); x.ellipse(sx, 72, 6, 3.5, 0, 0, Math.PI * 2); x.fill(); }
  x.strokeStyle = '#8a4a3a'; x.lineWidth = 2.5; x.lineCap = 'round';
  x.beginPath(); x.arc(60, 74, 6, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
  if (e.glasses) {
    x.strokeStyle = '#1c1410'; x.lineWidth = 2;
    for (const sx of [48, 72]) { x.beginPath(); x.arc(sx, 62, 9, 0, Math.PI * 2); x.stroke(); }
    x.beginPath(); x.moveTo(57, 62); x.lineTo(63, 62); x.stroke();
  }
  return c;
}

export function createPanel({ employees, floors }) {
  const panel = document.getElementById('panel');
  const reader = document.getElementById('reader');
  let reports = {}, current = 0, statusEls = [];

  async function load() {
    try {
      const r = await fetch(`reports/latest.json?t=${Date.now()}`, { cache: 'no-store' });
      if (r.ok) reports = (await r.json()).tasks ?? {};
    } catch (e) { /* keep what we have */ }
    if (current) render(current);
  }

  function openReader(e, task, rep) {
    reader.querySelector('.r-head').innerHTML = '';
    reader.querySelector('.r-head').append(avatar(e));
    const t = document.createElement('div');
    t.innerHTML = `<b>${esc(e.name)}</b> · ${esc(task.name)}<br><small>${esc(when(rep.sentAt))} SGT</small>`;
    reader.querySelector('.r-head').append(t);
    reader.querySelector('.r-body').innerHTML = md(rep.text);
    reader.classList.add('show');
    reader.querySelector('.r-body').scrollTop = 0;
  }
  reader.querySelector('.r-close').addEventListener('click', () => reader.classList.remove('show'));
  reader.addEventListener('click', (ev) => { if (ev.target === reader) reader.classList.remove('show'); });

  function column(e) {
    const col = document.createElement('section');
    col.className = 'emp-col';
    const head = document.createElement('div');
    head.className = 'emp-head';
    head.append(avatar(e));
    col.append(head);
    col.insertAdjacentHTML('beforeend', `<div class="emp-name">${esc(e.name)}</div><div class="emp-role">${esc(e.role)}</div>`);
    const now = document.createElement('div');
    now.className = 'emp-now';
    col.append(now);
    statusEls.push([now, e]);
    if (!e.tasks?.length) {
      col.insertAdjacentHTML('beforeend', `<div class="emp-none">${e.owner ? 'No scheduled tasks · enjoying the house 🏠' : e.cleaner ? 'No scheduled tasks · keeping the house clean 🧹' : 'No scheduled tasks yet'}</div>`);
    }
    for (const task of e.tasks ?? []) {
      if (task.private) {                             // personal health info: never shown on the public site
        col.insertAdjacentHTML('beforeend', `<div class="emp-task empty"><div class="t-name">📋 ${esc(task.name)}</div><div class="t-when">${esc(task.when)}</div><div class="t-prev">🔒 Sent to you privately · not shown on this site</div></div>`);
        continue;
      }
      const rep = reports[task.name];
      const readable = rep && typeof rep.text === 'string' && rep.text.length > 0;
      const card = document.createElement(readable ? 'button' : 'div');
      card.className = 'emp-task' + (readable ? '' : ' empty');
      const fresh = rep && sgtDay(rep.sentAt) === sgtDay(Date.now());
      const sent = rep ? `<div class="t-when ${fresh ? 'fresh' : ''}">${fresh ? '✅ ' : ''}Sent ${esc(when(rep.sentAt))}</div>` : '';
      card.innerHTML = `<div class="t-name">📋 ${esc(task.name)}</div>` + (readable
        ? `${sent}<div class="t-prev">${esc(plain(rep.text).slice(0, 150))}…</div><div class="t-more">Tap to read ›</div>`
        : rep
          ? `${sent}<div class="t-prev">🔒 Content kept private (personal health details)</div>`
          : `<div class="t-when">Nothing sent yet · ${esc(task.when)}</div>`);
      if (readable) card.addEventListener('click', () => openReader(e, task, rep));
      col.append(card);
    }
    return col;
  }

  function render(n) {
    const f = floors[n - 1];
    const team = employees.filter((e) => (e.home ?? e.floor) === n);
    statusEls = [];
    panel.innerHTML = `<div class="p-top"><div><b>${n}F · ${esc(f.name)}</b><br><small>${team.length ? `${team.length} on this floor · latest work` : ''}</small></div><button class="p-toggle" type="button" aria-label="Hide panel">▾</button></div>`;
    const row = document.createElement('div');
    row.className = 'p-row';
    if (!team.length) row.innerHTML = `<div class="emp-empty">${n === 4 ? 'Outsource AI Team — no team members yet. This office is ready for future client work.' : 'Nobody works on this floor yet.'}</div>`;
    for (const e of team) row.append(column(e));
    panel.append(row);
    panel.querySelector('.p-toggle').addEventListener('click', () => panel.classList.toggle('mini'));
    tick();
  }
  function tick() { for (const [el, e] of statusEls) el.textContent = e.status ? `Now: ${e.status}` : ''; }
  setInterval(() => { if (current) tick(); }, 1500);

  load();
  setInterval(load, 10 * 60 * 1000);
  return {
    show(n) {
      current = n;
      if (!n) { panel.classList.remove('show'); return; }
      render(n);
      panel.classList.add('show');
    },
  };
}
