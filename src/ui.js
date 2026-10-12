// ============ INTERFAZ ============
(function () {
'use strict';
const P = window.PTCG, C = P.Campaign, DB = P.DB;
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v); } for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k))); return e; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { G: 'Planta', R: 'Fuego', W: 'Agua', L: 'Rayo', P: 'Psíquico', F: 'Lucha', C: 'Incoloro' };
const RARES = { C: 'Común', U: 'Poco común', R: 'Rara', RH: 'Rara Holo', S: 'Secreta', E: 'Energía' };
const RSYM = { C: '●', U: '◆', R: '★', RH: '★H', S: '★S', E: '' };
const SETNAME = Object.fromEntries(C.SETS.map(s => [s.id, s.name]));
const ENERGY_BASIC = ['base1-99', 'base1-98', 'base1-102', 'base1-100', 'base1-101', 'base1-97'];
const STAGE = ['Básico', 'Fase 1', 'Fase 2'];

// ---------- guardado ----------
const SAVE_KEY = 'ptcg_kanto_save_v1';
let S = null; let dbRef = null; let saveTimer = null;
function defaultSave() { return { v: 1, name: '', money: 0, coll: {}, packs: {}, decks: [], activeDeck: 0, badges: [], beaten: {}, coins: [0, 2, 4, 6], coin: 0, stats: { wins: 0, losses: 0 }, opts: { speed: 1 }, champion: false, created: Date.now(), updated: 0 }; }
function lsGet() { try { const t = localStorage.getItem(SAVE_KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function lsSet(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {} }
function save() { if (!S) return; S.updated = Date.now(); lsSet(S); clearTimeout(saveTimer); saveTimer = setTimeout(async () => { if (dbRef) { try { await dbRef.set({ json: JSON.stringify(S), updated: S.updated }); } catch (e) {} } }, 800); }
async function initCloud() {
  try {
    if (!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    dbRef = db.doc('data/users/' + id + '/save');
    const snap = await dbRef.get();
    if (snap.exists) { const d = snap.data(); const remote = JSON.parse(d.json); if (!S || (remote.updated || 0) > (S.updated || 0)) { S = Object.assign(defaultSave(), remote); lsSet(S); if (S.name) showHub(); toast('Partida recuperada de la nube'); } }
    else if (S && S.name) save();
  } catch (e) {}
}

// ---------- utilidades de cartas ----------
function cardEl(id, opts = {}) {
  const d = DB[id]; const e = el('div', { class: 'card' + (opts.cls ? ' ' + opts.cls : ''), 'data-card': id });
  if (!d || !d.img) { e.classList.add('back'); return e; }
  const [sheet, idx] = d.img; const col = idx % 5, row = Math.floor(idx / 5);
  e.style.backgroundImage = `url(assets/cards${String(sheet).padStart(2, '0')}.webp)`;
  e.style.backgroundPosition = `${col * 25}% ${row * 33.3333}%`;
  if (opts.holo !== false && (d.rar === 'RH' || d.rar === 'S')) e.classList.add('holo');
  return e;
}
const backEl = (cls) => el('div', { class: 'card back' + (cls ? ' ' + cls : '') });
const eIcon = t => el('span', { class: 'ei', style: `background-image:url(assets/e_${t}.webp)`, title: TYPES[t] });
const nm = id => DB[id].nameEs;
function toast(msg, ms = 2400) { const t = el('div', { class: 'toast', role: 'status' }, msg); document.body.append(t); setTimeout(() => t.remove(), ms); }
function addCards(ids) { for (const id of ids) S.coll[id] = (S.coll[id] || 0) + 1; }
function badgeEl(key, off) {
  const box = el('div', { class: 'badge-slot' + (off ? ' off' : ''), title: (C.GYMS.find(g => g.badge === key) || {}).badgeEs || '' });
  if (key === 'cascade' || key === 'thunder') {
    box.innerHTML = key === 'cascade'
      ? '<svg viewBox="0 0 40 40"><path d="M20 3 C27 13 33 19 33 26 a13 13 0 0 1-26 0 C7 19 13 13 20 3z" fill="#4fb3f5" stroke="#cfeaff" stroke-width="2"/><path d="M14 26 a6 6 0 0 0 6 6" stroke="#fff" stroke-width="2" fill="none"/></svg>'
      : '<svg viewBox="0 0 40 40"><polygon points="13,3 27,3 37,13 37,27 27,37 13,37 3,27 3,13" fill="#f1a629" stroke="#ffe7a3" stroke-width="2"/><polygon points="15,10 25,10 30,15 30,25 25,30 15,30 10,25 10,15" fill="#ffd257"/></svg>';
  } else box.append(el('img', { src: `assets/badge_${key}.webp`, alt: '' }));
  return box;
}
function coinFace(i, tails) { const c = 2 * (i % 16) + (tails ? 1 : 0), r = Math.floor(i / 16); return `background-position:${c * 100 / 31}% ${r * 100 / 9}%`; }
const COIN_COUNT = 152;

// ---------- táctil ----------
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
let suppressClick = 0;
function inspect(target) {
  const t = target.closest('[data-slot]') || target.closest('[data-card]'); if (!t) return;
  if (t.dataset.slot && BT.g && BT.slotMap[t.dataset.slot]) { const s = BT.slotMap[t.dataset.slot]; const g = BT.g; showZoom(t, g.top(s).d, { e: g.eff(s), live: slotLive(g, s) }); }
  else if (t.dataset.card) showZoom(t, t.dataset.card);
  else return;
  zoom.classList.add('sheet'); zoom.append(el('div', { class: 'tap' }, 'Toca en cualquier lugar para cerrar'));
  setTimeout(() => { const close = () => { zoom.hidden = true; zoom.classList.remove('sheet'); zoomTarget = null; document.removeEventListener('pointerdown', close, true); }; document.addEventListener('pointerdown', close, true); }, 50);
}
if (TOUCH) {
  let lp = null, sx = 0, sy = 0;
  document.addEventListener('pointerdown', ev => {
    const t = ev.target.closest('[data-slot],[data-card]'); if (!t || zoom.classList.contains('sheet')) return;
    sx = ev.clientX; sy = ev.clientY; clearTimeout(lp);
    lp = setTimeout(() => { suppressClick = Date.now(); closeMenu(); inspect(t); }, 430);
  }, true);
  const cancel = ev => { if (ev.type === 'pointermove' && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 10) return; clearTimeout(lp); };
  document.addEventListener('pointermove', cancel, true); document.addEventListener('pointerup', cancel, true); document.addEventListener('pointercancel', cancel, true);
  document.addEventListener('contextmenu', ev => { if (ev.target.closest('[data-slot],[data-card]')) ev.preventDefault(); });
  document.addEventListener('click', ev => { if (suppressClick && Date.now() - suppressClick < 800) { suppressClick = 0; ev.preventDefault(); ev.stopPropagation(); } }, true);
}
// ---------- zoom (hover) ----------
const zoom = $('#zoom'); let zoomTarget = null;
function costIcons(cost) { const s = el('span'); cost.forEach(t => s.append(eIcon(t))); return s; }
function cardText(d, slotInfo) {
  const t = el('div', { class: 'txt' });
  if (d.st === 'P') {
    const e = slotInfo ? slotInfo.e : null;
    t.append(el('h3', {}, (e ? e.nameEs : d.nameEs)), el('div', { class: 'sub' }, `${STAGE[d.stage]}${d.from ? ' · evoluciona de ' + P.DB[Object.keys(DB).find(k => DB[k].name === d.from)]?.nameEs : ''} · ${e ? e.hp : d.hp} PS · `, ...(e ? e.types : d.types).map(eIcon), ` · ${SETNAME[d.set]} #${d.num} ${RARES[d.rar] || ''}`));
    if (d.pw) t.append(el('div', { class: 'pw' }, el('b', {}, 'Poder Pokémon: ' + d.pw.nameEs), el('div', {}, d.pw.es)));
    const atks = e ? e.atk : d.atk;
    for (const a of atks) t.append(el('div', { class: 'atk' }, costIcons(a.cost), ' ', el('b', {}, a.nameEs), el('span', { class: 'dm' }, a.dmg || ''), a.es ? el('div', {}, a.es) : null));
    const w = e ? e.weak : d.weak, r = e ? e.res : d.res;
    t.append(el('div', { class: 'foot' }, el('span', {}, 'Debilidad: ', w ? eIcon(w) : '—', w ? ' ×2' : ''), el('span', {}, 'Resistencia: ', r ? eIcon(r) : '—', r ? ' −30' : ''), el('span', {}, 'Retirada: ', ...(Array(d.ret).fill('C').map(eIcon)), d.ret ? '' : '0')));
  } else {
    t.append(el('h3', {}, d.nameEs), el('div', { class: 'sub' }, d.st === 'E' ? (d.basic ? 'Energía básica' : 'Energía especial') : ((d.sub || []).includes('Stadium') ? 'Entrenador · Estadio' : (d.sub || []).length && d.sub[0] === "Rocket's Secret Machine" ? 'Entrenador · Máquina Secreta del Team Rocket' : 'Entrenador'), ` · ${SETNAME[d.set]} #${d.num}`), el('div', {}, d.es));
  }
  if (slotInfo && slotInfo.live) t.append(slotInfo.live);
  return t;
}
function showZoom(target, id, slotInfo) {
  const d = DB[id]; if (!d) return;
  zoom.innerHTML = ''; zoom.append(cardEl(id), cardText(d, slotInfo)); zoom.hidden = false; zoomTarget = target;
  const r = target.getBoundingClientRect(); const zw = zoom.offsetWidth, zh = zoom.offsetHeight;
  let x = r.right + 14; if (x + zw > innerWidth - 8) x = r.left - zw - 14; if (x < 8) x = Math.max(8, (innerWidth - zw) / 2);
  let y = r.top + r.height / 2 - zh / 2; y = Math.max(8, Math.min(innerHeight - zh - 8, y));
  zoom.style.left = x + 'px'; zoom.style.top = y + 'px';
}
document.addEventListener('mouseover', ev => {
  if (TOUCH || zoom.classList.contains('sheet')) return;
  const t = ev.target.closest('#menu') ? null : (ev.target.closest('[data-slot]') || ev.target.closest('[data-card]'));
  if (!t) { if (zoomTarget) { zoom.hidden = true; zoomTarget = null; } return; }
  if (t === zoomTarget) return;
  if (t.dataset.slot && BT.g) { const s = BT.slotMap[t.dataset.slot]; if (s) { const g = BT.g; showZoom(t, g.top(s).d, { e: g.eff(s), live: slotLive(g, s) }); } return; }
  if (t.dataset.card) showZoom(t, t.dataset.card);
});
document.addEventListener('scroll', () => { zoom.hidden = true; zoomTarget = null; }, true);
function slotLive(g, s) {
  const box = el('div', { class: 'live' });
  box.append(el('div', {}, el('b', {}, `PS: ${g.hpLeft(s)} / ${g.hp(s)}`), s.dmg ? `  (${s.dmg} de daño)` : ''));
  if (s.energy.length) box.append(el('div', {}, 'Energía: ', ...s.energy.map(c => c.buzzap ? `Electrode(${TYPES[c.buzzap]}×2) ` : nm(c.d).replace('Energía ', '') + ' ')));
  const st = []; if (s.st) st.push(P.STATUS_ES[s.st]); if (s.poison) st.push(`Envenenado (${s.poison})`);
  if (st.length) box.append(el('div', {}, 'Estado: ' + st.join(', ')));
  if (s.att.length) box.append(el('div', {}, 'Unido: ' + s.att.map(c => nm(c.d)).join(', ')));
  const fx = Object.keys(s.fx).map(k => ({ reduce: 'Reduce daño', harden: 'Evita ≤30', halve: 'Daño a la mitad', preventAll: 'Evita daño', immune: 'Inmune a ataques', cantAttack: 'No puede atacar', noRetreat: 'No puede retirarse', smokescreen: 'Ataque puede fallar', destiny: 'Lazo Destino', counter: 'Contraataque', amnesia: 'Ataque bloqueado', noEnergy: 'Sin energía este turno', boost: 'Potenciado', evasion: 'Evasión', powerOff: 'Poder anulado' }[k])).filter(Boolean);
  if (fx.length) box.append(el('div', {}, 'Efectos: ' + fx.join(', ')));
  if (s.cards.length > 1) box.append(el('div', { class: 'muted' }, 'Evoluciones: ' + s.cards.map(c => nm(c.d)).join(' → ')));
  return box;
}

// ================= PANTALLA DE INICIO =================
function showTitle() {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  const t = $('#title'); t.hidden = false; t.innerHTML = '';
  const wrap = el('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:18px;padding:24px 16px;width:100%;' });
  wrap.append(el('div', { class: 'logo' }, 'LIGA KANTO', el('br'), el('span', { style: 'font-size:.42em;color:var(--ink);text-shadow:none' }, 'JUEGO DE CARTAS COLECCIONABLES')));
  wrap.append(el('div', { class: 'muted', style: 'max-width:640px;text-align:center' }, 'Base Set, Jungle, Fossil, Base Set 2, Team Rocket, Gym Heroes y Gym Challenge. Abre sobres, arma tu mazo y vence a los 8 líderes de gimnasio de Kanto.'));
  let pick = 0;
  const nameIn = el('input', { id: 'pname', placeholder: 'Tu nombre de entrenador', maxlength: 18, value: 'Rojo' });
  const grid = el('div', { class: 'starters' });
  const draw = () => { grid.innerHTML = ''; C.STARTERS.forEach((s, i) => grid.append(el('button', { class: 'starter' + (i === pick ? ' on' : ''), onclick: () => { pick = i; draw(); } }, cardEl(s.cover), el('div', {}, el('b', { class: 'cond', style: 'font-size:18px' }, s.name), el('div', { class: 'muted', style: 'font-size:13px' }, s.desc), el('div', {}, ...s.types.map(eIcon)))))); };
  draw();
  wrap.append(el('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:12px;width:min(900px,100%)' }, el('h2', { class: 'cond', style: 'color:var(--gold)' }, 'Nueva partida'), el('label', { for: 'pname' }, 'Nombre: ', nameIn), el('div', {}, 'Elige tu mazo inicial (sólo cartas de Base Set):'), grid,
    el('div', { class: 'btns', style: 'display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap' },
      lsGet() && lsGet().name ? el('button', { onclick: () => { S = Object.assign(defaultSave(), lsGet()); showHub(); } }, 'Continuar partida guardada') : null,
      el('button', { onclick: importSave }, 'Importar partida'),
      el('button', { class: 'primary', onclick: () => newGame(nameIn.value.trim() || 'Rojo', pick) }, '¡Comenzar aventura!'))));
  t.append(wrap);
}
function newGame(name, starterIdx) {
  S = defaultSave(); S.name = name;
  const st = C.STARTERS[starterIdx];
  const deck = C.starterDeck(st, Math.random);
  addCards(deck.filter(id => !ENERGY_BASIC.includes(id)));
  S.decks = [{ name: st.name, cards: deck }]; S.activeDeck = 0;
  S.packs = { base1: 4 }; S.money = 300;
  save(); showHub('shop'); toast('¡Bienvenido! Tienes 4 sobres de Base Set para abrir.', 3500);
}
function importSave() {
  const inp = el('input', { type: 'file', accept: '.json,application/json' });
  inp.onchange = async () => { try { const txt = await inp.files[0].text(); const d = JSON.parse(txt); if (!d.coll) throw 0; S = Object.assign(defaultSave(), d); save(); showHub(); toast('Partida importada'); } catch (e) { toast('Ese archivo no es una partida válida'); } };
  inp.click();
}
async function exportSave() {
  const data = JSON.stringify(S);
  try { const dl = await window.claude?.use?.('downloads'); if (dl) { await dl.save({ filename: `liga-kanto-${S.name}.json`, data: new Blob([data], { type: 'application/json' }) }); return; } } catch (e) {}
  if (!window.claude) { // versión independiente (GitHub): descarga directa
    try { const a = el('a', { href: URL.createObjectURL(new Blob([data], { type: 'application/json' })), download: `liga-kanto-${S.name}.json` }); document.body.append(a); a.click(); a.remove(); toast('Partida exportada'); return; } catch (e) {}
  }
  showModal('Copia de seguridad', el('div', {}, el('p', {}, 'Copia este texto y guárdalo en un archivo .json:'), el('textarea', { style: 'width:100%;height:200px', readonly: true }, data)), [{ t: 'Cerrar' }]);
}

// ================= HUB =================
let curView = 'map';
const NAV = [['map', 'Mapa'], ['shop', 'Tienda'], ['coll', 'Colección'], ['decks', 'Mazos'], ['coins', 'Monedas'], ['opts', 'Opciones']];
function showHub(view) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('#hubscreen').hidden = false; if (view) curView = view; renderTop(); renderView();
}
function renderTop() {
  const nav = $('#nav'); nav.innerHTML = '';
  for (const [k, l] of NAV) nav.append(el('button', { class: curView === k ? 'on' : '', onclick: () => { curView = k; renderTop(); renderView(); } }, l + (k === 'shop' && packCount() ? ` (${packCount()})` : '')));
  const b = $('#badges'); b.innerHTML = ''; for (const g of C.GYMS) b.append(badgeEl(g.badge, !S.badges.includes(g.id)));
  $('#money').textContent = `₽ ${S.money.toLocaleString('es-CL')}`;
}
const packCount = () => Object.values(S.packs).reduce((a, b) => a + b, 0);
function renderView() { const v = $('#view'); v.innerHTML = ''; ({ map: viewMap, shop: viewShop, coll: viewColl, decks: viewDecks, coins: viewCoins, opts: viewOpts })[curView](v); }

// ---------- mapa ----------
function viewMap(v) {
  const hub = el('div', { class: 'hub' });
  const map = el('div', { id: 'map' });
  map.innerHTML = `<svg class="land" viewBox="0 0 100 62.5" preserveAspectRatio="none" aria-hidden="true">
    <defs><pattern id="gr" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#5cae55"/><circle cx="1" cy="1" r=".25" fill="#4e9d48"/></pattern></defs>
    <path d="M4 2 H92 V30 H96 V44 L84 48 L80 40 L70 44 L66 52 L54 58 L40 60 L36 52 L26 50 L16 44 L10 52 L4 50 Z" fill="url(#gr)" stroke="#e8d9a0" stroke-width=".6"/>
    <path d="M14 50 L20 52 L22 58 L14 58 Z" fill="url(#gr)" stroke="#e8d9a0" stroke-width=".5"/>
    <path d="M30 56 L38 56 L36 60 L30 60Z" fill="#d9e8f2" opacity=".7"/>
    <g stroke="#e9d38b" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-dasharray="0">
      <path d="M22 44 L22 35 L20 27 L22 19 L40 11 L58 11 L60 5"/><path d="M58 11 L56 26 L52 26 L40 27 L18 35"/><path d="M56 26 L62 39 L66 45"/><path d="M58 11 L80 25 L82 39 L62 39"/><path d="M40 27 L30 45 L48 51 L56 56"/><path d="M48 51 L34 57 L20 54 L14 50 L18 35"/><path d="M18 35 L8 19 L8 5"/>
    </g></svg>`;
  const nodes = [];
  const badgeN = S.badges.length;
  const gymDone = id => S.badges.includes(id);
  C.GYMS.forEach((g, i) => nodes.push({ x: g.x, y: g.y, label: g.city, cls: 'gym' + (gymDone(g.id) ? ' done' : '') + (i > badgeN ? ' lock' : ''), txt: String(i + 1), on: () => i <= badgeN ? gymPanel(g, i) : toast(`Necesitas ${i} medalla(s) para entrar.`) }));
  // un punto por lugar (agrupa entrenadores de ruta y del Team Rocket)
  const places = {};
  for (const r of C.ROUTES.concat(C.ROCKET)) { const pl = places[r.place] || (places[r.place] = { place: r.place, list: [] }); pl.list.push(r); if (r.x != null && pl.x == null) { pl.x = r.x; pl.y = r.y; } }
  for (const pl of Object.values(places)) {
    if (pl.x == null) continue;
    const minReq = Math.min(...pl.list.map(r => r.req));
    const routes = pl.list.filter(r => !C.ROCKET.includes(r));
    const rk = pl.list.filter(r => C.ROCKET.includes(r));
    const rkOpen = rk.some(r => rocketOpen(r) && !S.beaten[r.id]);
    const allDone = pl.list.every(r => S.beaten[r.id]);
    const maxLv = Math.max(...pl.list.map(r => r.level));
    nodes.push({ x: pl.x, y: pl.y, label: pl.place + (pl.list.length > 1 ? ` (${pl.list.length})` : ''), cls: (allDone ? 'done' : '') + (badgeN < minReq ? ' lock' : '') + (rkOpen ? ' rocket' : '') + (!routes.length ? ' rocketonly' : ''), txt: rkOpen || !routes.length ? 'R' : '★'.repeat(Math.min(3, Math.ceil(maxLv / 2))), on: () => badgeN >= minReq ? placePanel(pl.place) : toast(`Disponible con ${minReq} medalla(s).`) });
  }
  const L = C.LEAGUE; nodes.push({ x: L.x, y: L.y, label: L.place, cls: 'gym' + (S.champion ? ' done' : '') + (badgeN < 8 ? ' lock' : ''), txt: '👑', on: () => badgeN >= 8 ? leaguePanel() : toast('Consigue las 8 medallas para entrar en la Liga.') });
  nodes.push({ x: 31, y: 81, label: 'Pueblo Paleta', cls: 'done', txt: '⌂', on: () => { curView = 'shop'; renderTop(); renderView(); } });
  for (const n of nodes) map.append(el('button', { class: 'node ' + n.cls, style: `left:${n.x}%;top:${n.y}%`, onclick: n.on, 'aria-label': n.label }, el('span', { class: 'dot' }, n.txt), el('span', { class: 'lbl' }, n.label)));
  const side = el('div', { class: 'panel', id: 'mapside' });
  hub.append(el('div', {}, map), side);
  v.append(hub);
  // panel por defecto: siguiente objetivo
  const next = C.GYMS[badgeN];
  if (next) gymPanel(next, badgeN); else leaguePanel();
}
function oppRow(o, onFight, extra) {
  return el('div', { class: 'opp-row' }, cardEl(o.portrait, { holo: false }), el('div', { class: 'info' }, el('b', {}, o.name), ' ', el('span', { class: 'lv' }, 'Nv ' + o.level), extra ? el('div', { class: 'muted', style: 'font-size:12.5px' }, extra) : null, el('div', {}, ...(o.types || []).map(eIcon))), el('button', { class: 'primary', onclick: onFight }, 'Desafiar'));
}
function gymPanel(g, i) {
  const side = $('#mapside'); side.innerHTML = '';
  const perk = C.PERKS[g.perk];
  const t1 = S.beaten['g_' + g.id + '_0'], t2 = S.beaten['g_' + g.id + '_1'];
  side.append(el('div', { style: 'display:flex;gap:10px;align-items:center' }, badgeEl(g.badge, !S.badges.includes(g.id)), el('div', {}, el('h2', { class: 'cond', style: 'font-size:22px;color:var(--gold)' }, `Gimnasio de ${g.city}`), el('div', { class: 'muted' }, `Líder ${g.leader} · tipo `, eIcon(g.type), ` · ${g.badgeEs}`))));
  g.trainers.forEach((t, k) => side.append(oppRow(Object.assign({ types: t.types }, t), () => preBattle({ kind: 'gymTrainer', gym: g, idx: k, t }), S.beaten['g_' + g.id + '_' + k] ? '✔ Vencido' : 'Entrenador del gimnasio')));
  const canLeader = t1 && t2;
  const lrow = oppRow({ name: 'Líder ' + g.leader, portrait: g.portrait, level: g.level, types: [g.type] }, () => canLeader ? preBattle({ kind: 'leader', gym: g, idx: i }) : toast('Primero vence a los 2 entrenadores del gimnasio.'), canLeader ? (S.badges.includes(g.id) ? '✔ Medalla obtenida (revancha)' : '¡Listo para el combate!') : 'Vence a los 2 entrenadores primero');
  side.append(lrow);
  side.append(el('div', { class: 'pw', style: 'margin-top:10px;background:#2a1f3d;border-left:3px solid var(--gold);padding:8px;border-radius:6px' }, el('b', {}, `Ventaja del líder: ${perk.name}`), el('div', { style: 'font-size:13px' }, perk.es)));
  side.append(el('p', { class: 'muted', style: 'font-style:italic;font-size:13px' }, `«${g.quote}»`));
}
function rocketOpen(r) { const i = C.ROCKET.indexOf(r); return S.badges.length >= r.req && (i === 0 || !!S.beaten[C.ROCKET[i - 1].id]); }
function rocketProgress() { return C.ROCKET.filter(r => S.beaten[r.id]).length; }
function placePanel(place) {
  const side = $('#mapside'); side.innerHTML = '';
  side.append(el('h2', { class: 'cond', style: 'font-size:22px;color:var(--gold)' }, place));
  const badgeN = S.badges.length;
  const routes = C.ROUTES.filter(x => x.place === place);
  for (const x of routes) {
    if (badgeN < x.req) { side.append(el('div', { class: 'opp-row', style: 'opacity:.5' }, el('div', { class: 'info' }, el('b', {}, x.name), ` · 🔒 con ${x.req} medalla(s)`))); continue; }
    side.append(oppRow(x, () => preBattle({ kind: 'route', t: x }), (x.rival ? '⚔️ Tu rival · ' : '') + (S.beaten[x.id] ? `✔ Vencido ${S.beaten[x.id]} vez/veces` : 'Primera victoria: sobre de regalo') + (x.sets ? ' · Sets: ' + x.sets.map(s => SETNAME[s]).join(', ') : ' · Todos los sets')));
  }
  const rk = C.ROCKET.filter(x => x.place === place);
  if (rk.length) {
    side.append(el('div', { class: 'rocket-head' }, el('span', { class: 'rbadge' }, 'R'), el('b', {}, 'Team Rocket'), el('span', { class: 'muted', style: 'font-size:12.5px' }, `Misión ${rocketProgress()}/${C.ROCKET.length} · sólo Pokémon Oscuros`)));
    for (const x of rk) {
      const i = C.ROCKET.indexOf(x);
      if (!rocketOpen(x)) { const prev = C.ROCKET[i - 1]; side.append(el('div', { class: 'opp-row rk', style: 'opacity:.55' }, el('div', { class: 'info' }, el('b', {}, x.name), el('div', { class: 'muted', style: 'font-size:12.5px' }, badgeN < x.req ? `🔒 Requiere ${x.req} medalla(s)` : `🔒 Primero vence a ${prev.name} (${prev.place})`)))); continue; }
      const row = oppRow(Object.assign({}, x), () => preBattle({ kind: 'rocket', t: x }), (x.boss ? '👑 Jefe del Team Rocket · ' : '') + (S.beaten[x.id] ? `✔ Vencido ${S.beaten[x.id]} vez/veces` : 'Primera victoria: sobres de Team Rocket'));
      row.classList.add('rk'); side.append(row);
      if (x.quote && !S.beaten[x.id]) side.append(el('p', { class: 'muted', style: 'font-style:italic;font-size:12.5px;margin:4px 0 0' }, `«${x.quote}»`));
    }
    if (rk.some(x => x.perk)) side.append(el('div', { class: 'pw', style: 'margin-top:10px;background:#2b1418;border-left:3px solid var(--red);padding:8px;border-radius:6px' }, el('b', {}, 'Ventaja del Jefe: ' + C.PERKS.rocket.name), el('div', { style: 'font-size:13px' }, C.PERKS.rocket.es)));
  }
  if (routes.length) side.append(el('p', { class: 'muted', style: 'font-size:13px' }, 'Los entrenadores de ruta pueden desafiarse cuantas veces quieras para ganar Pokédólares.'));
}
function routePanel(r) { placePanel(r.place); }
function leaguePanel() {
  const side = $('#mapside'); side.innerHTML = ''; const L = C.LEAGUE;
  side.append(el('h2', { class: 'cond', style: 'font-size:22px;color:var(--gold)' }, 'Meseta Añil — Liga Pokémon'));
  side.append(oppRow(Object.assign({ types: ['C'] }, L), () => S.badges.length >= 8 ? preBattle({ kind: 'league', t: L }) : toast('Necesitas las 8 medallas.'), S.champion ? '👑 Ya eres Campeón' : 'Requiere 8 medallas'));
  side.append(el('p', { class: 'muted', style: 'font-style:italic;font-size:13px' }, `«${L.quote}»`));
}

// ---------- tienda ----------
function viewShop(v) {
  const wrap = el('div', { style: 'max-width:1340px;margin:0 auto;display:flex;flex-direction:column;gap:16px' });
  // sobres propios
  const own = el('div', { class: 'panel' }, el('h2', { class: 'cond', style: 'color:var(--gold);font-size:22px' }, 'Tus sobres sin abrir'));
  const row = el('div', { class: 'packs-own', style: 'margin-top:10px' });
  for (const s of C.SETS) { const n = S.packs[s.id] || 0; if (!n) continue; row.append(el('button', { class: 'pack', title: 'Abrir sobre de ' + s.name, style: `background-image:url(assets/pack_${s.id}_${Math.floor(Math.random() * 2)}.webp)`, onclick: () => openPacks(s.id, 1) }, el('span', { class: 'n' }, n))); }
  if (!row.children.length) row.append(el('div', { class: 'muted' }, 'No tienes sobres. Cómpralos abajo o gánalos en combate.'));
  own.append(row);
  if (packCount() > 1) own.append(el('div', { style: 'margin-top:10px;display:flex;gap:8px;flex-wrap:wrap' }, ...C.SETS.filter(s => (S.packs[s.id] || 0) > 1).map(s => el('button', { onclick: () => openPacks(s.id, S.packs[s.id]) }, `Abrir todos los de ${s.name} (${S.packs[s.id]})`))));
  wrap.append(own);
  const grid = el('div', { class: 'shop-grid' });
  for (const s of C.SETS) {
    const locked = S.badges.length < s.unlock;
    const boxPrice = s.price * 30;
    const owned = new Set(Object.keys(S.coll).filter(k => k.startsWith(s.id + '-'))).size;
    const total = P.CARDS.filter(d => d.set === s.id).length;
    grid.append(el('div', { class: 'set-card' + (locked ? ' locked' : '') },
      el('div', { class: 'box', style: `background-image:url(assets/box_${s.id}.webp)` }),
      el('div', { class: 'body' }, el('div', {}, s.id !== 'base1' ? el('img', { class: 'sym', src: `assets/sym_${s.id}.webp`, alt: '' }) : null, ' ', el('b', { class: 'cond', style: 'font-size:19px' }, s.name)),
        el('div', { class: 'muted', style: 'font-size:13px' }, `Colección: ${owned}/${total} · 11 cartas por sobre, 1 rara garantizada (holo 1 de cada 3)`),
        locked ? el('div', { class: 'bad' }, `🔒 Se desbloquea con ${s.unlock} medalla(s)`) : el('div', { class: 'row' },
          el('button', { class: 'primary', disabled: S.money < s.price ? true : null, onclick: () => buy(s, 1, s.price) }, `Sobre ₽${s.price}`),
          el('button', { disabled: S.money < s.price * 5 ? true : null, onclick: () => buy(s, 5, s.price * 5) }, `5 sobres ₽${s.price * 5}`),
          el('button', { disabled: S.money < boxPrice ? true : null, onclick: () => buy(s, 36, boxPrice) }, `Caja (36) ₽${boxPrice}`)))));
  }
  wrap.append(el('h2', { class: 'cond', style: 'color:var(--gold);font-size:22px' }, 'Tienda Pokémon'), grid);
  v.append(wrap);
}
function buy(s, n, price) { if (S.money < price) return; S.money -= price; S.packs[s.id] = (S.packs[s.id] || 0) + n; save(); renderTop(); renderView(); toast(`Compraste ${n} sobre(s) de ${s.name}`); }
async function openPacks(setId, n) {
  const ov = el('div', { id: 'opening' }); document.body.append(ov);
  const all = [];
  for (let k = 0; k < n; k++) {
    if (!(S.packs[setId] > 0)) break;
    S.packs[setId]--; const cards = C.openPack(setId, Math.random); addCards(cards.filter(id => !ENERGY_BASIC.includes(id))); all.push(...cards); save();
    if (n > 3) continue; // apertura rápida para muchos sobres
    await revealPack(ov, setId, cards, k + 1, n);
  }
  if (n > 3) await bulkReveal(ov, setId, all, n);
  ov.remove(); renderTop(); renderView();
}
function revealPack(ov, setId, cards, k, n) {
  return new Promise(res => {
    ov.innerHTML = '';
    const pk = el('button', { class: 'bigpack', style: `background-image:url(assets/pack_${setId}_${Math.floor(Math.random() * 2)}.webp)`, 'aria-label': 'Abrir sobre' });
    ov.append(el('div', { class: 'disp', style: 'color:var(--gold);font-size:22px' }, `${SETNAME[setId]} — sobre ${k} de ${n}`), pk, el('div', { class: 'muted' }, 'Haz clic en el sobre para abrirlo'));
    pk.onclick = async () => {
      pk.classList.add('tear'); await sleep(450);
      ov.innerHTML = '';
      const fan = el('div', { class: 'fan' }); let up = 0;
      const btnRow = el('div', { style: 'display:flex;gap:8px' });
      const done = el('button', { class: 'primary', hidden: true, onclick: () => res() }, k < n ? 'Siguiente sobre' : 'Listo');
      const all = el('button', { onclick: () => { fan.querySelectorAll('.flip:not(.up)').forEach(f => f.click()); } }, 'Voltear todas');
      cards.forEach((id, i) => {
        const d = DB[id]; const f = el('button', { class: 'flip' + (d.rar === 'R' ? ' rare-glow' : '') + (d.rar === 'RH' || d.rar === 'S' ? ' holo-glow' : ''), 'aria-label': 'Voltear carta' }, el('div', { class: 'in' }, el('div', { class: 'face back' }, backEl()), el('div', { class: 'face front' }, cardEl(id))));
        f.querySelector('.face.back .card').style.setProperty('--cw', '120px');
        f.onclick = () => { if (f.classList.contains('up')) return; f.classList.add('up'); up++; if (up === cards.length) { done.hidden = false; all.hidden = true; } };
        fan.append(f);
      });
      btnRow.append(all, done); btnRow.className = 'opbar';
      ov.append(el('div', { class: 'disp optitle', style: 'color:var(--gold);font-size:20px' }, TOUCH ? 'Toca cada carta para descubrirla' : 'Haz clic en cada carta para descubrirla'), fan, btnRow);
    };
  });
}
function bulkReveal(ov, setId, all, n) {
  return new Promise(res => {
    ov.innerHTML = '';
    const ord = { RH: 0, S: 0, R: 1, U: 2, C: 3, E: 4 };
    const counts = {}; all.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const ids = Object.keys(counts).sort((a, b) => ord[DB[a].rar] - ord[DB[b].rar] || DB[a].num - DB[b].num);
    const g = el('div', { class: 'grid', style: 'max-width:1100px;width:100%;max-height:62vh;overflow:auto;padding:8px' });
    for (const id of ids) { const c = cardEl(id); c.append(el('span', { class: 'cnt' }, '×' + counts[id])); g.append(c); }
    const holos = all.filter(id => DB[id].rar === 'RH' || DB[id].rar === 'S').length;
    ov.append(el('div', { class: 'disp', style: 'color:var(--gold);font-size:22px' }, `${n} sobres de ${SETNAME[setId]}`), el('div', {}, `${all.length} cartas · ${holos} holo · ${all.filter(id => DB[id].rar === 'R').length} raras`), g, el('div', { class: 'opbar' }, el('button', { class: 'primary', onclick: res }, 'Listo')));
  });
}

// ---------- colección ----------
const filt = { set: 'all', type: 'all', st: 'all', own: 'all', q: '' };
function filterBar(onChange, withOwn = true) {
  const f = el('div', { class: 'filters' });
  const sel = (key, opts, label) => { const s = el('select', { 'aria-label': label, onchange: () => { filt[key] = s.value; onChange(); } }, ...opts.map(([v, t]) => el('option', { value: v, selected: filt[key] === v ? true : null }, t))); return s; };
  f.append(sel('set', [['all', 'Todos los sets'], ...C.SETS.map(s => [s.id, s.name])], 'Set'), sel('st', [['all', 'Todo'], ['P', 'Pokémon'], ['T', 'Entrenadores'], ['E', 'Energía']], 'Clase'), sel('type', [['all', 'Todos los tipos'], ...Object.entries(TYPES)], 'Tipo'));
  if (withOwn) f.append(sel('own', [['all', 'Todas'], ['own', 'Las que tengo'], ['miss', 'Las que faltan']], 'Propiedad'));
  const q = el('input', { placeholder: 'Buscar nombre…', value: filt.q, 'aria-label': 'Buscar', oninput: () => { filt.q = q.value.toLowerCase(); onChange(); } });
  f.append(q); return f;
}
function filtered(ownedOnly) {
  return P.CARDS.filter(d => (filt.set === 'all' || d.set === filt.set) && (filt.st === 'all' || d.st === filt.st) && (filt.type === 'all' || (d.types || []).includes(filt.type) || d.etype === filt.type) && (!filt.q || d.nameEs.toLowerCase().includes(filt.q) || d.name.toLowerCase().includes(filt.q))
    && (ownedOnly ? (S.coll[d.id] > 0 || ENERGY_BASIC.includes(d.id)) : filt.own === 'all' || (filt.own === 'own' ? S.coll[d.id] > 0 : !S.coll[d.id])));
}
function viewColl(v) {
  const total = P.CARDS.length, own = P.CARDS.filter(d => S.coll[d.id]).length;
  const head = el('div', { style: 'display:flex;gap:16px;align-items:baseline;flex-wrap:wrap;margin-bottom:10px' }, el('h2', { class: 'cond', style: 'color:var(--gold);font-size:24px' }, 'Colección'), el('span', {}, `${own} / ${total} cartas distintas (${Math.round(own * 100 / total)}%)`), el('span', { class: 'muted' }, `${Object.values(S.coll).reduce((a, b) => a + b, 0)} cartas en total`));
  const grid = el('div', { class: 'grid' });
  const draw = () => { grid.innerHTML = ''; for (const d of filtered(false)) { const c = cardEl(d.id, { cls: S.coll[d.id] ? '' : 'unowned' }); if (S.coll[d.id]) c.append(el('span', { class: 'cnt' }, '×' + S.coll[d.id])); c.append(el('span', { class: 'rar' }, RSYM[d.rar])); if (TOUCH) c.onclick = () => inspect(c); grid.append(c); } };
  v.append(head, filterBar(draw), grid); draw();
}

// ---------- mazos ----------
let editIdx = 0; let editDeck = null;
function viewDecks(v) {
  if (!S.decks.length) S.decks.push({ name: 'Mazo nuevo', cards: [] });
  if (editIdx >= S.decks.length) editIdx = 0;
  if (!editDeck || editDeck.src !== editIdx) editDeck = { src: editIdx, name: S.decks[editIdx].name, cards: S.decks[editIdx].cards.slice() };
  const wrap = el('div', { class: 'deckwrap' });
  const left = el('div', { style: 'min-width:0' }); const right = el('div', { class: 'panel decklist' });
  const grid = el('div', { class: 'grid' });
  const inDeck = id => editDeck.cards.filter(x => x === id).length;
  const nameCount = n => editDeck.cards.filter(x => DB[x].name === n && !(DB[x].st === 'E' && DB[x].basic)).length;
  const canAdd = id => { const d = DB[id]; if (editDeck.cards.length >= 60) return false; if (d.st === 'E' && d.basic) return true; return inDeck(id) < (S.coll[id] || 0) && nameCount(d.name) < 4; };
  const drawGrid = () => { grid.innerHTML = ''; for (const d of filtered(true)) { const c = cardEl(d.id); const avail = ENERGY_BASIC.includes(d.id) ? '∞' : (S.coll[d.id] - inDeck(d.id)); c.append(el('span', { class: 'cnt' }, avail)); if (!canAdd(d.id)) c.style.opacity = .45; c.onclick = () => { if (canAdd(d.id)) { editDeck.cards.push(d.id); drawAll(); if (TOUCH) toast(`+1 ${d.nameEs} · ${editDeck.cards.length}/60`, 900); } }; grid.append(c); } };
  const drawList = () => {
    right.innerHTML = '';
    const nameIn = el('input', { value: editDeck.name, 'aria-label': 'Nombre del mazo', style: 'flex:1;min-width:0', oninput: () => editDeck.name = nameIn.value });
    const pick = el('select', { 'aria-label': 'Elegir mazo', onchange: () => { editIdx = +pick.value; editDeck = null; renderView(); } }, ...S.decks.map((d, i) => el('option', { value: i, selected: i === editIdx ? true : null }, (i === S.activeDeck ? '★ ' : '') + d.name)));
    right.append(el('div', { style: 'display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap' }, pick, el('button', { onclick: () => { S.decks.push({ name: 'Mazo ' + (S.decks.length + 1), cards: [] }); editIdx = S.decks.length - 1; editDeck = null; save(); renderView(); } }, '+ Nuevo')));
    right.append(el('div', { style: 'display:flex;gap:6px;margin-bottom:8px' }, nameIn));
    const errs = P.Decks.validate(editDeck.cards);
    right.append(el('div', { class: errs.length ? 'bad' : 'ok', style: 'font-weight:700;margin-bottom:6px' }, `${editDeck.cards.length}/60 cartas`, errs.length ? ' — ' + errs[0] : ' ✔ válido'));
    const counts = {}; editDeck.cards.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const groups = [['P', 'Pokémon'], ['T', 'Entrenadores'], ['E', 'Energía']];
    for (const [k, lab] of groups) {
      const ids = Object.keys(counts).filter(id => DB[id].st === k).sort((a, b) => (DB[a].types || [''])[0].localeCompare((DB[b].types || [''])[0]) || DB[a].nameEs.localeCompare(DB[b].nameEs));
      const n = ids.reduce((a, id) => a + counts[id], 0);
      right.append(el('div', { class: 'cond', style: 'font-size:16px;color:var(--gold);margin-top:6px' }, `${lab} (${n})`));
      for (const id of ids) right.append(el('div', { class: 'dl-row', 'data-card': id }, el('span', { class: 'q' }, counts[id]), el('span', { class: 'nm' }, DB[id].nameEs, el('span', { class: 'muted', style: 'font-size:11px' }, ` ${SETNAME[DB[id].set]}`)), el('button', { 'aria-label': 'Quitar', onclick: () => { editDeck.cards.splice(editDeck.cards.indexOf(id), 1); drawAll(); } }, '−'), el('button', { 'aria-label': 'Añadir', disabled: canAdd(id) ? null : true, onclick: () => { editDeck.cards.push(id); drawAll(); } }, '+')));
    }
    right.append(el('div', { class: 'savebar', style: 'display:flex;gap:6px;flex-wrap:wrap;margin-top:12px' },
      el('button', { onclick: autoEnergy, title: 'Rellena hasta 60 con Energía básica según los costes de tus Pokémon' }, 'Autocompletar energía'),
      el('button', { onclick: () => { editDeck.cards = []; drawAll(); } }, 'Vaciar'),
      el('button', { class: 'primary', onclick: () => { S.decks[editIdx] = { name: editDeck.name || 'Mazo', cards: editDeck.cards.slice() }; if (!errs.length) S.activeDeck = editIdx; save(); toast(errs.length ? 'Mazo guardado (aún no es válido para combatir)' : 'Mazo guardado y seleccionado ★'); editDeck = null; renderView(); } }, 'Guardar'),
      S.decks.length > 1 ? el('button', { class: 'danger', onclick: () => { S.decks.splice(editIdx, 1); if (S.activeDeck >= S.decks.length) S.activeDeck = 0; editIdx = 0; editDeck = null; save(); renderView(); } }, 'Borrar') : null));
  };
  const autoEnergy = () => {
    const need = {}; editDeck.cards.forEach(id => { const d = DB[id]; if (d.st === 'P') d.atk.forEach(a => a.cost.forEach(c => { if (c !== 'C') need[c] = (need[c] || 0) + 1; })); });
    const left = 60 - editDeck.cards.length; if (left <= 0) return;
    const tot = Object.values(need).reduce((a, b) => a + b, 0); const types = Object.keys(need); if (!types.length) types.push('F');
    let placed = 0; types.forEach((t, i) => { const n = i === types.length - 1 ? left - placed : Math.round(left * need[t] / tot); for (let k = 0; k < n; k++) editDeck.cards.push(P.Decks.ENERGY_ID[t]); placed += n; });
    drawAll();
  };
  const drawAll = () => { drawGrid(); drawList(); if (BT.deckTabLabel) BT.deckTabLabel(); };
  left.append(el('h2', { class: 'cond', style: 'color:var(--gold);font-size:24px;margin-bottom:8px' }, 'Constructor de mazos'), el('div', { class: 'muted', style: 'margin-bottom:8px;font-size:13px' }, '60 cartas, máximo 4 copias por nombre (la Energía básica es ilimitada y gratuita). Haz clic en una carta para añadirla.'), filterBar(drawGrid, false), grid);
  // pestañas (sólo se ven en celular)
  const tabs = el('div', { class: 'decktabs', role: 'tablist' });
  const setTab = t => { wrap.dataset.tab = t; tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); try { localStorage.setItem('ptcg_decktab', t); } catch (e) {} };
  const tabCards = el('button', { 'data-t': 'cards', role: 'tab', onclick: () => setTab('cards') }, 'Cartas');
  const tabList = el('button', { 'data-t': 'list', role: 'tab', onclick: () => setTab('list') }, 'Mi mazo');
  tabs.append(tabCards, tabList);
  BT.deckTabLabel = () => { tabList.textContent = `Mi mazo (${editDeck.cards.length}/60)`; };
  v.append(tabs); wrap.append(left, right); v.append(wrap);
  let t0 = 'cards'; try { t0 = localStorage.getItem('ptcg_decktab') || 'cards'; } catch (e) {} setTab(t0);
  drawAll();
}
// ---------- monedas ----------
function viewCoins(v) {
  v.append(el('h2', { class: 'cond', style: 'color:var(--gold);font-size:24px' }, `Monedas (${S.coins.length}/${COIN_COUNT})`), el('p', { class: 'muted' }, 'Elige la moneda que lanzarás en combate. Ganas monedas nuevas al vencer entrenadores (los líderes siempre dan una).'));
  const g = el('div', { class: 'coinpick' });
  for (let i = 0; i < COIN_COUNT; i++) { const has = S.coins.includes(i); g.append(el('button', { class: (S.coin === i ? 'on' : '') + (has ? '' : ' lock'), 'aria-label': 'Moneda ' + (i + 1), onclick: () => { if (!has) return toast('Aún no tienes esta moneda'); S.coin = i; save(); renderView(); } }, el('div', { class: 'cf', style: coinFace(i, false) }))); }
  v.append(g);
}
function viewOpts(v) {
  const sp = el('select', { id: 'speed', onchange: () => { S.opts.speed = +sp.value; save(); } }, ...[[0.4, 'Rápida'], [1, 'Normal'], [1.8, 'Lenta']].map(([x, t]) => el('option', { value: x, selected: S.opts.speed == x ? true : null }, t)));
  v.append(el('div', { class: 'panel', style: 'max-width:640px;display:flex;flex-direction:column;gap:12px' },
    el('h2', { class: 'cond', style: 'color:var(--gold)' }, 'Opciones'),
    el('label', { for: 'speed' }, 'Velocidad de la IA y las monedas: ', sp),
    el('div', {}, `Entrenador: ${S.name} · Victorias: ${S.stats.wins} · Derrotas: ${S.stats.losses}${S.champion ? ' · 👑 Campeón' : ''}`),
    el('div', { class: 'muted', style: 'font-size:13px' }, dbRef ? 'Tu progreso se guarda automáticamente en tu cuenta y en este navegador.' : 'Tu progreso se guarda en este navegador. Usa "Exportar" para tener una copia de seguridad.'),
    el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, el('button', { onclick: exportSave }, 'Exportar partida'), el('button', { onclick: importSave }, 'Importar partida'), el('button', { class: 'danger', onclick: () => showModal('¿Empezar de cero?', el('p', {}, 'Se borrará tu colección, mazos y medallas.'), [{ t: 'Cancelar' }, { t: 'Borrar todo', cls: 'danger', f: () => { S = null; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} if (dbRef) dbRef.set({ json: JSON.stringify(defaultSave()), updated: Date.now() }).catch(() => {}); showTitle(); } }]) }, 'Nueva partida'))));
}

// ================= MODALES =================
function showModal(title, body, buttons) {
  return new Promise(res => {
    const bg = el('div', { class: 'modal-bg' }); const m = el('div', { class: 'modal', role: 'dialog', 'aria-label': title });
    m.append(el('h2', {}, title)); if (body) m.append(body);
    const b = el('div', { class: 'btns' });
    for (const x of buttons) b.append(el('button', { class: x.cls || '', onclick: () => { bg.remove(); if (x.f) x.f(); res(x.v); } }, x.t));
    m.append(b); bg.append(m); document.body.append(bg);
  });
}

// ================= PRE-COMBATE =================
function preBattle(spec) {
  const deck = S.decks[S.activeDeck];
  const errs = deck ? P.Decks.validate(deck.cards) : ['No tienes mazo'];
  let opp;
  const rng = Math.random;
  if (spec.kind === 'route') opp = { name: spec.t.name, portrait: spec.t.portrait, level: spec.t.level, deck: C.trainerDeck(spec.t, rng), key: spec.t.id };
  else if (spec.kind === 'gymTrainer') opp = { name: spec.t.name, portrait: spec.t.portrait, level: spec.t.level, deck: C.trainerDeck(spec.t, rng), key: 'g_' + spec.gym.id + '_' + spec.idx };
  else if (spec.kind === 'leader') opp = { name: 'Líder ' + spec.gym.leader, portrait: spec.gym.portrait, level: spec.gym.level, deck: C.leaderDeck(spec.gym, rng), perk: spec.gym.perk, key: 'L_' + spec.gym.id };
  else if (spec.kind === 'rocket') opp = { name: spec.t.name, portrait: spec.t.portrait, level: spec.t.level, deck: C.rocketDeck(spec.t, rng), perk: spec.t.perk, key: spec.t.id, rocket: true };
  else opp = { name: spec.t.name, portrait: spec.t.portrait, level: 5, deck: C.rivalDeck(rng), key: 'league' };
  spec.opp = opp;
  const body = el('div', { style: 'display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start' });
  body.append(cardEl(opp.portrait, { holo: false, cls: '' }));
  const info = el('div', { style: 'flex:1;min-width:220px;display:flex;flex-direction:column;gap:8px' });
  info.append(el('div', {}, el('b', { style: 'font-size:18px' }, opp.name), ' ', el('span', { class: 'lv' }, 'Nivel ' + opp.level)));
  const types = {}; opp.deck.forEach(id => (DB[id].types || []).forEach(t => types[t] = (types[t] || 0) + 1));
  info.append(el('div', {}, 'Mazo: ', ...Object.keys(types).sort((a, b) => types[b] - types[a]).slice(0, 3).map(eIcon)));
  if (opp.perk) info.append(el('div', { class: 'pw', style: 'background:#2a1f3d;border-left:3px solid var(--gold);padding:8px;border-radius:6px' }, el('b', {}, 'Ventaja: ' + C.PERKS[opp.perk].name), el('div', { style: 'font-size:13px' }, C.PERKS[opp.perk].es)));
  const sel = el('select', { 'aria-label': 'Tu mazo', onchange: () => { S.activeDeck = +sel.value; save(); } }, ...S.decks.map((d, i) => el('option', { value: i, selected: i === S.activeDeck ? true : null }, d.name + (P.Decks.validate(d.cards).length ? ' (no válido)' : ''))));
  info.append(el('label', {}, 'Tu mazo: ', sel));
  if (errs.length) info.append(el('div', { class: 'bad' }, errs[0]));
  body.append(info);
  showModal('¡Combate!', body, [{ t: 'Cancelar' }, { t: '¡Luchar!', cls: 'primary', f: () => { const d = S.decks[S.activeDeck]; if (P.Decks.validate(d.cards).length) { toast('Tu mazo no es válido: revísalo en "Mazos".'); return; } startBattle(spec, d.cards); } }]);
}

// ================= BATALLA =================
const BT = { g: null, slotMap: {}, sel: null, ask: null, resolveTurn: null, busy: false, spec: null };
function speed() { return (S && S.opts.speed) || 1; }
function startBattle(spec, myDeck) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('#battle').hidden = false; $('#log').innerHTML = '';
  BT.spec = spec; BT.sel = null; BT.ask = null;
  const opp = spec.opp;
  const aiLvl = Math.min(3, Math.max(1, Math.ceil(opp.level / 2) + (spec.kind === 'leader' || spec.kind === 'league' || (spec.t && (spec.t.boss || spec.t.rival)) ? 1 : 0)));
  const g = new P.Game({ ai: P.AI, players: [{ name: S.name, deck: myDeck.slice(), coin: S.coin }, { name: opp.name, deck: opp.deck, ai: { level: aiLvl }, perk: opp.perk, coin: Math.floor(Math.random() * COIN_COUNT) }], io: IO });
  g.portrait = opp.portrait;
  BT.g = g; render();
  g.run().then(w => endBattle(w)).catch(e => { console.error(e); toast('Error en la partida: ' + e.message, 5000); });
}
const IO = {
  log(g, m) { const L = $('#log'); const d = el('div', { class: m.startsWith('—') ? 't' : m.startsWith('💥') ? 'ko' : m.startsWith('🏆') ? 'win' : '' }, m); L.append(d); L.scrollTop = L.scrollHeight; },
  update(g) { render(); },
  async aiDelay(ms) { render(); await sleep(ms * speed()); },
  async ask(g, p, req) { return humanAsk(g, p, req); },
  async flip(g, p, results, label) { await showCoins(p, results, label); },
  async show(g, cards, title) { await showCardsModal(title, cards); },
  humanTurn(g, p) { return new Promise(res => { BT.resolveTurn = res; render(); }); },
  fxPopup(g, s, text) { fxPopup(g, s, text); },
  async attackAnim(g, p, s, a) { const e = document.querySelector(`[data-slot="${s.u}"]`); if (e) { e.style.setProperty('--lunge', p.i === 0 ? '-22px' : '22px'); e.classList.add('atk'); await sleep(380 * speed()); e.classList.remove('atk'); } },
};
function checkTurnEnd() { const g = BT.g, p = g.p[0]; if (p.turnOver && BT.resolveTurn) { const r = BT.resolveTurn; BT.resolveTurn = null; r(); } }
async function act(fn) { if (BT.busy) return; BT.busy = true; closeMenu(); try { await fn(); } catch (e) { if (e instanceof P.GameOver) BT.g.p[0].turnOver = true; else { console.error(e); toast('Error: ' + e.message); } } BT.busy = false; render(); if (BT.g && BT.g.p[0].forceEnd) { BT.g.p[0].turnOver = true; BT.g.p[0].forceEnd = false; } checkTurnEnd(); }
function myTurn() { const g = BT.g; return g && g.cur === 0 && !g.p[0].turnOver && BT.resolveTurn && !BT.busy && !BT.ask && g.winner == null; }

// ---- render del tablero ----
function render() {
  const g = BT.g; if (!g) return;
  const board = $('#board'); board.innerHTML = ''; BT.slotMap = {};
  const me = g.p[0], op = g.p[1];
  board.append(half(g, op, true), mid(g), half(g, me, false), handEl(g, me));
  $('#turninfo').textContent = `Turno ${g.turnNo}`;
  if (BT.ask && BT.ask.banner) board.append(BT.ask.banner);
}
function slotEl(g, s, isActive, owner) {
  BT.slotMap[s.u] = s;
  const top = g.top(s); const d = DB[top.d];
  const e = el('button', { class: 'slot' + (isActive ? ' active-slot' : '') + (s.st ? ' st-' + s.st : ''), 'data-slot': s.u, 'aria-label': g.nm(s) });
  const card = cardEl(top.d); e.append(card);
  if (s.cards.length > 1) e.append(el('span', { class: 'stack' }, STAGE[d.stage] || ''));
  if (s.dmg > 0) { const idx = Math.min(40, s.dmg / 10) - 1; e.append(el('span', { class: 'dmg', style: `background-position:${(idx % 8) * 100 / 7}% ${Math.floor(idx / 8) * 25}%`, title: s.dmg + ' de daño' })); }
  const stt = el('span', { class: 'stt' });
  if (s.poison) stt.append(el('img', { src: 'assets/poison.webp', alt: 'Envenenado', title: s.poison === 20 ? 'Envenenado (20)' : 'Envenenado' }));
  if (s.st) stt.append(el('span', { class: 'st-tag-' + s.st }, P.STATUS_ES[s.st]));
  if (stt.children.length) e.append(stt);
  if (s.att.length) e.append(el('span', { class: 'tools' }, ...s.att.map(c => el('span', {}, nm(c.d)))));
  const fxs = Object.entries(s.fx).filter(([k]) => P.FX_LABEL[k]);
  if (fxs.length) e.append(el('span', { class: 'fxchips' }, ...fxs.map(([k, f]) => { const L = P.FX_LABEL[k]; return el('span', { class: 'fxchip fx-' + k, title: (typeof L.long === 'function' ? L.long(f.v) : L.long) }, L.ico + ' ' + (typeof L.short === 'function' ? L.short(f.v) : L.short)); })));
  const en = el('span', { class: 'ener' });
  for (const c of s.energy) { const cd = DB[c.d]; if (c.buzzap) { en.append(eIcon(c.buzzap), eIcon(c.buzzap)); } else if (cd.basic) en.append(eIcon(cd.etype)); else if (cd.name === 'Double Colorless Energy') en.append(eIcon('C'), eIcon('C')); else en.append(el('span', { class: 'ei', style: 'background:conic-gradient(red,orange,yellow,green,cyan,blue,violet,red);border-radius:50%', title: cd.nameEs })); }
  e.append(en);
  // estados de selección
  if (BT.ask && BT.ask.options && BT.ask.options.includes(s)) { e.classList.add('pick'); if (BT.ask.chosen && BT.ask.chosen.includes(s)) e.classList.add('chosen'); }
  else if (BT.sel && BT.sel.targets && BT.sel.targets.includes(s)) e.classList.add('tgt');
  e.addEventListener('click', ev => slotClick(ev, s, owner));
  return e;
}
function half(g, pl, isOpp) {
  const h = el('div', { class: 'half ' + (isOpp ? 'opp' : 'me') });
  const prizes = el('div', { class: 'prizes', title: `${pl.prizes.length} Premios` });
  for (const c of pl.prizes) prizes.append(g.prizesFaceUp ? cardEl(c.d) : backEl());
  const center = el('div', { class: 'center-col' });
  const bench = el('div', { class: 'bench' }); for (const s of pl.bench) bench.append(slotEl(g, s, false, pl));
  for (let k = pl.bench.length; k < g.benchMax(pl); k++) bench.append(el('div', { class: 'pile empty', style: 'opacity:.35' }));
  const activeRow = el('div', { style: 'display:flex;align-items:center;gap:18px' });
  activeRow.append(pl.active ? slotEl(g, pl.active, true, pl) : el('div', { class: 'slot empty-active' }));
  const who = el('div', { class: 'who' }, cardEl(isOpp ? g.portrait : 'base1-88', { holo: false }), el('div', {}, pl.name, el('div', { class: 'muted', style: 'font-size:12px' }, `Mano ${pl.hand.length} · Premios ${pl.prizes.length}`)));
  if (isOpp) {
    const clair = g.anyPower('Clairvoyance').some(s => s.owner === 0);
    const oh = el('div', { class: 'opp-hand' }); for (const c of pl.hand) oh.append(clair ? cardEl(c.d) : backEl());
    activeRow.prepend(who); activeRow.append(oh);
  } else activeRow.prepend(who);
  center.append(activeRow, bench);
  const piles = el('div', { class: 'piles' });
  piles.append(pl.deck.length ? el('button', { class: 'pile', 'aria-label': 'Mazo' }, backEl(), el('span', { class: 'lab' }, `Mazo ${pl.deck.length}`)) : el('div', { class: 'pile empty' }));
  const disc = pl.discard.length ? el('button', { class: 'pile', 'aria-label': 'Descarte', onclick: () => showCardsModal(`Pila de descartes de ${pl.name}`, pl.discard.slice()) }, cardEl(pl.discard[pl.discard.length - 1].d), el('span', { class: 'lab' }, `Descarte ${pl.discard.length}`)) : el('div', { class: 'pile empty' });
  piles.append(disc);
  h.append(prizes, center, piles);
  return h;
}
function mid(g) {
  const m = el('div', { id: 'mid' });
  const st = el('div', { id: 'stadium' });
  if (g.stadium) st.append(cardEl(g.stadium.d), el('span', {}, 'Estadio: ', el('b', {}, nm(g.stadium.d))));
  else st.append(el('span', { class: 'muted' }, 'Sin Estadio'));
  const mine = g.cur === 0;
  const turn = el('div', { class: 'turn ' + (mine ? 'me' : 'op') }, g.winner != null ? (g.winner === 0 ? '¡VICTORIA!' : 'DERROTA') : mine ? 'TU TURNO' : 'TURNO RIVAL');
  const acts = el('div', { class: 'acts' });
  const me = g.p[0];
  if (myTurn()) {
    if (me.active) acts.append(el('button', { onclick: ev => activeMenu(ev.currentTarget, me.active) }, 'Atacar…'));
    const t = g.stadiumAction(me); if (t) acts.append(el('button', { onclick: () => act(() => g.useStadium(me)) }, t.actionLabel || 'Usar Estadio'));
    acts.append(el('button', { class: 'primary', onclick: () => { closeMenu(); me.turnOver = true; checkTurnEnd(); } }, innerWidth < 700 ? 'Fin turno' : 'Terminar turno'));
    const info = []; if (!me.energyPlayed) info.push('energía disponible'); if (!me.retreated) info.push('puede retirarse');
    acts.prepend(el('span', { class: 'muted', style: 'align-self:center;font-size:12.5px' }, info.join(' · ')));
  } else if (g.winner == null && !mine) acts.append(el('span', { class: 'muted', style: 'font-size:12px' }, innerWidth < 700 ? 'Pensando…' : 'El rival está pensando…'));
  acts.append(el('button', { id: 'logbtn', 'aria-label': 'Ver registro', onclick: () => { $('#side').classList.add('open'); const L = $('#log'); L.scrollTop = L.scrollHeight; } }, '📜'));
  m.append(st, turn, acts);
  return m;
}
function playableIn(g, p, c) {
  if (g.canPlayBasic(p, c)) return true;
  if (g.isEvoCard(c) && g.evoTargets(p, c).length) return true;
  if (g.isEnergy(c) && g.slots(p).some(s => g.canAttach(p, c, s))) return true;
  if (g.isTrainer(c) && g.canPlayTrainer(p, c)) return true;
  return false;
}
function handEl(g, p) {
  const h = el('div', { id: 'hand' });
  const can = myTurn();
  for (const c of p.hand) {
    const b = el('button', { class: 'hc' + (can && playableIn(g, p, c) ? ' playable' : '') + (BT.sel && BT.sel.card === c ? ' sel' : ''), 'data-card': c.d, 'aria-label': nm(c.d) }, cardEl(c.d));
    b.addEventListener('click', ev => handClick(ev, c));
    b.addEventListener('pointerdown', ev => startDrag(ev, c, b));
    h.append(b);
  }
  if (p.setAside.length) h.append(el('span', { class: 'muted', style: 'align-self:center;margin-left:12px' }, `(${p.setAside.length} cartas apartadas)`));
  return h;
}
// ---- menús contextuales ----
let menuEl = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
document.addEventListener('pointerdown', ev => { if (menuEl && !menuEl.contains(ev.target) && !ev.target.closest('.slot,.hc,#mid button')) closeMenu(); });
function openMenu(anchor, items) {
  closeMenu();
  if (TOUCH && anchor && anchor.closest && anchor.closest('[data-slot],[data-card]')) items = items.concat([{ t: '🔍 Ver carta y texto', f: () => inspect(anchor) }]);
  if (!items.length) return; zoom.hidden = true; zoomTarget = null;
  menuEl = el('div', { id: 'menu', role: 'menu' });
  for (const it of items) { const b = el('button', { role: 'menuitem', disabled: it.disabled ? true : null, onclick: () => { closeMenu(); it.f(); } }, el('span', {}, it.t), it.why ? el('span', { class: 'why' }, it.why) : null); if (it.cost) b.prepend(costIcons(it.cost)); menuEl.append(b); }
  document.body.append(menuEl);
  const r = anchor.getBoundingClientRect(); const mw = menuEl.offsetWidth, mh = menuEl.offsetHeight;
  let x = r.left + r.width / 2 - mw / 2, y = r.top - mh - 8; if (y < 8) y = r.bottom + 8;
  menuEl.style.left = Math.max(8, Math.min(innerWidth - mw - 8, x)) + 'px'; menuEl.style.top = Math.max(8, Math.min(innerHeight - mh - 8, y)) + 'px';
}
function handClick(ev, c) {
  if (BT.ask) return; const g = BT.g, p = g.p[0];
  if (!myTurn()) { if (TOUCH) inspect(ev.currentTarget); return; }
  if (BT.sel && BT.sel.card === c) { BT.sel = null; closeMenu(); render(); return; }
  const items = [];
  if (g.canPlayBasic(p, c)) items.push({ t: g.isTrainer(c) ? 'Jugar como Pokémon Básico' : 'Poner en la Banca', f: () => act(() => g.playBasic(p, c)) });
  if (g.isEvoCard(c)) { const ts = g.evoTargets(p, c); if (ts.length === 1) items.push({ t: 'Evolucionar ' + g.nm(ts[0]), f: () => act(() => g.evolve(p, c, ts[0])) }); else if (ts.length) { BT.sel = { card: c, targets: ts, kind: 'evo' }; render(); toast('Elige qué Pokémon evolucionar', 1600); return; } else items.push({ t: 'No puedes evolucionar ahora', disabled: true }); }
  if (g.isEnergy(c)) { const ts = g.slots(p).filter(s => g.canAttach(p, c, s)); if (ts.length) { BT.sel = { card: c, targets: ts, kind: 'energy' }; render(); toast('Elige a qué Pokémon unir la Energía', 1600); return; } items.push({ t: p.energyPlayed ? 'Ya uniste energía este turno' : 'No puedes unir energía', disabled: true }); }
  if (g.isTrainer(c) && !g.isBasicCard(c)) items.push({ t: 'Jugar ' + nm(c.d), disabled: !g.canPlayTrainer(p, c), why: g.noTrainers(p) || (!g.canPlayTrainer(p, c) ? 'no se cumplen los requisitos' : ''), f: () => act(() => g.playTrainer(p, c)) });
  BT.sel = { card: c, targets: [] }; render();
  const anchor = document.querySelector('#hand .hc.sel') || ev.currentTarget;
  openMenu(anchor, items);
}
function slotClick(ev, s, owner) {
  ev.stopPropagation();
  const g = BT.g, p = g.p[0];
  if (BT.ask) { askSlotClick(s); return; }
  if (!myTurn() || owner !== p) { if (TOUCH) inspect(ev.currentTarget); return; }
  if (BT.sel && BT.sel.kind === 'retreat') {
    BT.sel = null;
    if (p.bench.includes(s)) return act(async () => { const ok = await g.retreat(p, s); if (!ok) toast('No se pudo retirar: revisa la energía para pagar el coste.'); });
    render(); return;
  }
  if (BT.sel && BT.sel.card && BT.sel.targets && BT.sel.targets.includes(s)) {
    const c = BT.sel.card; BT.sel = null;
    if (g.isEvoCard(c)) return act(() => g.evolve(p, c, s));
    if (g.isEnergy(c)) return act(() => g.attach(p, c, s));
  }
  BT.sel = null;
  if (owner !== p) return;
  if (s === p.active) return activeMenu(ev.currentTarget, s);
  const items = benchItems(g, p, s); render();
  const a = document.querySelector(`[data-slot="${s.u}"]`) || ev.currentTarget; openMenu(a, items);
}
function benchItems(g, p, s) {
  const items = []; const d = g.baseDef(s);
  if (d.pw && P.FX.pw[d.pw.name] && P.FX.pw[d.pw.name].use) items.push({ t: 'Poder: ' + d.pw.nameEs, disabled: !g.powerUsable(p, s), why: g.powerUsable(p, s) ? '' : 'no disponible', f: () => act(() => g.usePower(p, s)) });
  if (g.eff(s).trainerMon) items.push({ t: 'Descartar ' + g.nm(s), f: () => act(() => g.discardTrainerMon(p, s)) });
  if (s.att.some(c => g.isEvoCard(c))) items.push({ t: 'Descartar forma de Metamorfosis', f: () => act(() => g.discardShapeshift(p, s)) });
  return items;
}
function retreatWhy(g, p, s) {
  if (g.canRetreat(p)) return '';
  if (!p.bench.length) return 'no tienes Pokémon en la Banca';
  if (p.retreated) return 'ya te retiraste este turno';
  if (s.st === 'asleep' || s.st === 'paralyzed') return 'no puede por su estado';
  if (s.fx.noRetreat) return 'un efecto le impide retirarse';
  if (g.retreatCost(s) > 50) return 'no puede retirarse';
  return `necesita ${g.retreatCost(s)} energía y tiene ${g.energyTokens(s).length}`;
}
function activeMenu(anchor, s) {
  const g = BT.g, p = g.p[0]; if (!myTurn()) return;
  const items = [];
  g.attackList(p).forEach(x => items.push({ t: `${x.a.nameEs} ${x.a.dmg ? '— ' + x.a.dmg : ''}`, cost: x.a.cost, disabled: !x.ok, why: x.ok ? '' : x.why, f: () => act(() => g.attack(p, x.i)) }));
  const cost = g.retreatCost(s);
  items.push({ t: `Retirarse (coste ${cost > 50 ? '—' : cost})`, disabled: !g.canRetreat(p), why: retreatWhy(g, p, s), f: () => { BT.sel = { kind: 'retreat', targets: p.bench.slice() }; render(); toast('Toca el Pokémon de tu Banca que entrará', 1800); } });
  items.push(...benchItems(g, p, s));
  openMenu(document.querySelector(`[data-slot="${s.u}"]`) || anchor, items);
}
// ---- arrastrar y soltar ----
function startDrag(ev, c, btn) {
  if (TOUCH || ev.pointerType === 'touch' || !myTurn() || BT.ask || ev.button !== 0) return;
  const g = BT.g, p = g.p[0];
  const sx = ev.clientX, sy = ev.clientY; let ghost = null; let moved = false;
  const move = e => {
    if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 8) return;
    if (!moved) { moved = true; ghost = cardEl(c.d); ghost.style.cssText += ';position:fixed;z-index:95;pointer-events:none;opacity:.85;transform:rotate(-4deg)'; document.body.append(ghost); closeMenu(); zoom.hidden = true;
      const ts = g.isEvoCard(c) ? g.evoTargets(p, c) : g.isEnergy(c) ? g.slots(p).filter(s => g.canAttach(p, c, s)) : []; BT.sel = { card: c, targets: ts }; render(); }
    ghost.style.left = (e.clientX - 40) + 'px'; ghost.style.top = (e.clientY - 55) + 'px';
  };
  const up = e => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up);
    if (!moved) return;
    ghost.remove();
    const t = document.elementFromPoint(e.clientX, e.clientY);
    const slotE = t && t.closest('[data-slot]'); const sl = slotE ? BT.slotMap[slotE.dataset.slot] : null;
    BT.sel = null;
    if (sl && g.isEvoCard(c) && g.canEvolve(p, c, sl)) return act(() => g.evolve(p, c, sl));
    if (sl && g.isEnergy(c) && g.canAttach(p, c, sl)) return act(() => g.attach(p, c, sl));
    const inBoard = t && t.closest('.half.me');
    if (inBoard && g.canPlayBasic(p, c)) return act(() => g.playBasic(p, c));
    if (t && t.closest('#board') && g.isTrainer(c) && !g.isBasicCard(c) && g.canPlayTrainer(p, c)) return act(() => g.playTrainer(p, c));
    render();
    btn.dataset.dragged = '1';
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}
document.addEventListener('click', ev => { const b = ev.target.closest('.hc'); if (b && b.dataset.dragged) { delete b.dataset.dragged; ev.stopPropagation(); ev.preventDefault(); } }, true);

// ---- preguntas al jugador ----
function humanAsk(g, p, req) {
  return new Promise(res => {
    const done = v => { BT.ask = null; render(); res(v); };
    if (req.kind === 'slot' || req.kind === 'slots') {
      if (!req.options.length) return res(req.kind === 'slots' ? [] : null);
      const multi = req.kind === 'slots';
      const chosen = [];
      const banner = el('div', { id: 'banner', role: 'status' }, el('span', {}, req.title + (multi ? ` (${req.min}–${req.max})` : '')));
      const confirm = multi ? el('button', { class: 'primary', onclick: () => { if (chosen.length >= req.min) done(chosen.slice()); } }, 'Confirmar') : null;
      if (confirm) banner.append(confirm);
      if (req.optional) banner.append(el('button', { onclick: () => done(multi ? [] : null) }, 'Omitir'));
      BT.ask = { options: req.options, chosen, banner, pick: s => { if (!multi) return done(s); const i = chosen.indexOf(s); if (i >= 0) chosen.splice(i, 1); else if (chosen.length < req.max) chosen.push(s); render(); } };
      render(); return;
    }
    if (req.kind === 'cards' || req.kind === 'order') return cardsAsk(req, done);
    // option / yesno / type
    const bg = el('div', { class: 'modal-bg' }); const m = el('div', { class: 'modal', role: 'dialog' });
    m.append(el('h2', {}, req.title));
    const b = el('div', { class: 'btns', style: 'justify-content:center' });
    const fin = v => { bg.remove(); done(v); };
    if (req.kind === 'yesno') { b.append(el('button', { onclick: () => fin(false) }, 'No'), el('button', { class: 'primary', onclick: () => fin(true) }, 'Sí')); }
    else if (req.kind === 'type') { const ts = (req.only || ['G', 'R', 'W', 'L', 'P', 'F', 'C']).filter(t => !(req.exclude || []).includes(t)); for (const t of ts) b.append(el('button', { class: 'typebtn', onclick: () => fin(t) }, eIcon(t), TYPES[t])); }
    else req.options.forEach((o, i) => b.append(el('button', { onclick: () => fin(i) }, o)));
    m.append(b); bg.append(m); document.body.append(bg);
  });
}
function askSlotClick(s) { if (BT.ask && BT.ask.options && BT.ask.options.includes(s)) BT.ask.pick(s); }
function cardsAsk(req, done) {
  const bg = el('div', { class: 'modal-bg' }); const m = el('div', { class: 'modal', role: 'dialog' });
  const cards = req.cards;
  if (req.kind === 'order') {
    let ord = cards.slice();
    const list = el('div', { class: 'cards' });
    const draw = () => { list.innerHTML = ''; ord.forEach((c, i) => { const w = el('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:4px' }, el('b', {}, i === 0 ? 'Arriba' : '#' + (i + 1)), cardEl(c.d), el('div', { style: 'display:flex;gap:4px' }, el('button', { disabled: i === 0 ? true : null, onclick: () => { [ord[i - 1], ord[i]] = [ord[i], ord[i - 1]]; draw(); } }, '◀'), el('button', { disabled: i === ord.length - 1 ? true : null, onclick: () => { [ord[i + 1], ord[i]] = [ord[i], ord[i + 1]]; draw(); } }, '▶'))); list.append(w); }); };
    draw(); m.append(el('h2', {}, req.title), list, el('div', { class: 'btns' }, el('button', { class: 'primary', onclick: () => { bg.remove(); done(ord); } }, 'Confirmar')));
    bg.append(m); document.body.append(bg); return;
  }
  if (!cards.length && (req.min || 0) === 0) { if (req.fromDeck) { showCardsModal(req.title + ' — no hay cartas válidas', []).then(() => done([])); return; } return done([]); }
  const sel = new Set(); const val = c => req.valueOf ? req.valueOf(c) : 1;
  const sum = () => [...sel].reduce((a, c) => a + val(c), 0);
  const ok = () => req.sumTo ? sum() >= req.sumTo : (sel.size >= (req.min || 0) && sel.size <= req.max);
  const info = el('div', { class: 'muted' });
  const conf = el('button', { class: 'primary' }, 'Confirmar');
  const grid = el('div', { class: 'cards' });
  const show = req.reveal ? req.reveal : cards;
  for (const c of show) {
    const selectable = cards.includes(c);
    const ce = cardEl(c.d, { cls: selectable ? '' : 'dim' });
    if (selectable) ce.onclick = () => { if (sel.has(c)) sel.delete(c); else { if (req.max === 1 && !req.sumTo) sel.clear(); if (req.sumTo || sel.size < req.max) sel.add(c); } ce.classList.toggle('sel', sel.has(c)); grid.querySelectorAll('.card').forEach(x => {}); upd(); };
    grid.append(ce);
  }
  const upd = () => { grid.querySelectorAll('.card').forEach((x, i) => x.classList.toggle('sel', sel.has(show[i]))); info.textContent = req.sumTo ? `Seleccionado: ${sum()} / ${req.sumTo}` : `Seleccionadas: ${sel.size} (mín. ${req.min || 0}, máx. ${req.max})`; conf.disabled = !ok(); };
  conf.onclick = () => { if (!ok()) return; bg.remove(); done([...sel]); };
  m.append(el('h2', {}, req.title), grid, info, el('div', { class: 'btns' }, conf));
  if (req.purpose === 'payEnergy' || req.optionalCancel) m.querySelector('.btns').prepend(el('button', { onclick: () => { bg.remove(); done([]); } }, 'Cancelar'));
  upd(); bg.append(m); document.body.append(bg);
}
function showCardsModal(title, cards) {
  const g = el('div', { class: 'cards' }); for (const c of cards) g.append(cardEl(c.d));
  if (!cards.length) g.append(el('div', { class: 'muted' }, 'Vacío'));
  return showModal(title, g, [{ t: 'Cerrar', cls: 'primary' }]);
}
// ---- monedas ----
async function showCoins(p, results, label) {
  const lay = el('div', { id: 'coinlayer', role: 'dialog', 'aria-label': 'Lanzamiento de moneda' });
  const coinIdx = p.coin || 0;
  lay.append(el('div', { class: 'lbl' }, `${p.name} lanza ${results.length > 1 ? results.length + ' monedas' : 'una moneda'}`, label ? el('div', { class: 'sub' }, label) : null));
  const row = el('div', { class: 'row' }); lay.append(row); document.body.append(lay);
  const many = results.length > 4;
  const spinMs = (many ? 650 : 1100) * Math.max(0.6, speed());
  for (let i = 0; i < results.length; i++) {
    const h = results[i];
    const c = el('div', { class: 'coin' + (many ? ' small' : '') }, el('div', { class: 'in', style: `--end:${h ? 1440 : 1620}deg;animation-duration:${spinMs}ms` }, el('div', { class: 'f', style: coinFace(coinIdx, false) }), el('div', { class: 'f t', style: coinFace(coinIdx, true) })));
    const w = el('div', { class: 'cw' }, c, el('div', { class: 'res' }, ' '));
    row.append(w);
    requestAnimationFrame(() => c.classList.add('spin'));
    await sleep(spinMs + 60);
    const r = w.querySelector('.res'); r.textContent = h ? 'CARA' : 'CRUZ'; r.classList.add(h ? 'heads' : 'tails');
  }
  const heads = results.filter(x => x).length;
  lay.append(el('div', { class: 'total ' + (heads ? 'heads' : 'tails') }, results.length === 1 ? (heads ? '¡CARA!' : '¡CRUZ!') : `${heads} cara(s) · ${results.length - heads} cruz(ces)`));
  const hint = el('div', { class: 'hint' }, 'Haz clic para continuar');
  lay.append(hint);
  await new Promise(res => { let done = false; const fin = () => { if (done) return; done = true; res(); }; lay.addEventListener('click', fin); setTimeout(fin, Math.max(2200, 3200 * speed())); });
  lay.remove();
}
function fxPopup(g, s, text) {
  render();
  const e = document.querySelector(`[data-slot="${s.u}"]`); if (!e) return;
  const r = e.getBoundingClientRect();
  const pop = el('div', { class: 'fxpop' }, text);
  pop.style.left = (r.left + r.width / 2) + 'px'; pop.style.top = (r.top + r.height * 0.35) + 'px';
  document.body.append(pop); setTimeout(() => pop.remove(), 2600);
}

// ================= FIN DE COMBATE =================
function endBattle(w) {
  const spec = BT.spec, opp = spec.opp; const win = w === 0;
  const rewards = []; let money = 0; const packs = {};
  const firstTime = !S.beaten[opp.key];
  if (win) {
    S.stats.wins++; S.beaten[opp.key] = (S.beaten[opp.key] || 0) + 1;
    const unlocked = C.SETS.filter(s => S.badges.length >= s.unlock).map(s => s.id);
    const gymSet = spec.gym ? (C.GYMS.indexOf(spec.gym) < 4 ? 'gym1' : 'gym2') : null;
    if (spec.kind === 'rocket') {
      money = firstTime ? 80 * opp.level + (spec.t.boss ? 1200 : 0) : 35 * opp.level; if (firstTime) packs.base5 = spec.t.boss ? 4 : (opp.level >= 4 ? 2 : 1);
      if (firstTime && spec.t.boss) rewards.push({ txt: '¡Derrotaste al Team Rocket! Giovanni se retira... por ahora.' });
      else if (firstTime) { const nx = C.ROCKET[C.ROCKET.indexOf(spec.t) + 1]; if (nx) rewards.push({ txt: `El Team Rocket huye hacia ${nx.place}...` }); }
    }
    else if (spec.kind === 'route') { money = firstTime ? 60 + 50 * opp.level : 30 + 30 * opp.level; if (firstTime) { const s = unlocked[Math.floor(Math.random() * unlocked.length)]; packs[s] = 1; } }
    else if (spec.kind === 'gymTrainer') { money = firstTime ? 90 * opp.level : 40 * opp.level; if (firstTime) packs[gymSet] = 1; }
    else if (spec.kind === 'leader') {
      const g = spec.gym; money = S.badges.includes(g.id) ? 250 : 600; packs[gymSet] = S.badges.includes(g.id) ? 1 : 3;
      if (!S.badges.includes(g.id)) { S.badges.push(g.id); rewards.push({ badge: g.badge, txt: `¡Obtuviste la ${g.badgeEs}!` }); const ns = C.SETS.find(s => s.unlock === S.badges.length); if (ns) rewards.push({ txt: `Nuevo set en la tienda: ${ns.name}` }); }
    } else { money = S.champion ? 600 : 2000; packs.base5 = S.champion ? 2 : 5; if (!S.champion) rewards.push({ txt: '👑 ¡Eres el nuevo Campeón de la Liga Pokémon de Kanto!' }); S.champion = true; }
    if (spec.kind === 'leader' || spec.kind === 'league' || (spec.t && spec.t.boss && firstTime) || Math.random() < 0.35) { const locked = []; for (let i = 0; i < COIN_COUNT; i++) if (!S.coins.includes(i)) locked.push(i); if (locked.length) { const c = locked[Math.floor(Math.random() * locked.length)]; S.coins.push(c); rewards.push({ coin: c, txt: '¡Nueva moneda desbloqueada!' }); } }
  } else { S.stats.losses++; money = 20; }
  S.money += money; for (const [k, n] of Object.entries(packs)) S.packs[k] = (S.packs[k] || 0) + n;
  save();
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center;min-width:min(420px,80vw)' });
  for (const r of rewards) { if (r.badge) body.append(el('div', { class: 'result-badge' }, badgeEl(r.badge, false))); if (r.coin !== undefined) body.append(el('div', { class: 'coinpick' }, el('div', { class: 'cf', style: coinFace(r.coin, false) }))); body.append(el('div', { style: 'font-weight:700' }, r.txt)); }
  body.append(el('div', {}, `+ ₽${money}`));
  const pk = Object.entries(packs); if (pk.length) body.append(el('div', { style: 'display:flex;gap:8px;justify-content:center' }, ...pk.map(([s, n]) => el('div', { style: 'text-align:center' }, el('div', { class: 'pack', style: `background-image:url(assets/pack_${s}_0.webp);width:70px;cursor:default` }), `${n}× ${SETNAME[s]}`))));
  if (!win) body.append(el('div', { class: 'muted' }, 'Mejora tu mazo con sobres nuevos y vuelve a intentarlo.'));
  showModal(win ? '¡Victoria!' : 'Derrota', body, [{ t: 'Volver al mapa', cls: 'primary', f: () => { BT.g = null; showHub(pk.length ? 'shop' : 'map'); } }]);
}

document.addEventListener('click', ev => { if (ev.target.id === 'logclose') $('#side').classList.remove('open'); else if ($('#side').classList.contains('open') && !ev.target.closest('#side') && ev.target.id !== 'logbtn') $('#side').classList.remove('open'); });
window.addEventListener('resize', () => { if (BT.g && !$('#battle').hidden) render(); });
// ================= ARRANQUE =================
const start = () => {
  const ls = lsGet();
  if (ls && ls.name) { S = Object.assign(defaultSave(), ls); showHub(); } else showTitle();
  initCloud();
};
start();
window.__PTCG_UI = { BT, get S() { return S; } };
})();
