// ============ INTERFAZ ============
(function () {
'use strict';
const P = window.PTCG, C = P.Campaign, DB = P.DB;
const MEGA = !!C.mega, ERA = MEGA ? 'mega' : 'wotc'; // era elegida al iniciar (ver src/era.js)
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v); } for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k))); return e; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { G: 'Planta', R: 'Fuego', W: 'Agua', L: 'Rayo', P: 'Psíquico', F: 'Lucha', C: 'Incoloro', N: 'Dragón', D: 'Siniestro', M: 'Metálico' };
const RARES = { C: 'Común', U: 'Poco común', R: 'Rara', RH: 'Rara Holo', SH: 'Brillante', S: 'Secreta', E: 'Energía' , RR: 'Doble rara', IR: 'Ilustración rara', UR: 'Ultra rara', SIR: 'Ilustración especial rara', MHR: 'Mega hiper rara'};
const RSYM = { C: '●', U: '◆', R: '★', RH: '★H', SH: '✦', S: '★S', E: '', RR: '★★', IR: '★I', UR: '★★★', SIR: '★IE', MHR: '★MH' };
const BIGRARE = r => ['RH', 'S', 'SH', 'RR', 'IR', 'UR', 'SIR', 'MHR'].includes(r);
const SETNAME = Object.fromEntries(C.SETS.map(s => [s.id, s.name])); if (MEGA) SETNAME.mee = 'Energía básica';
if (MEGA) { try { document.querySelector('#topbar .brand').textContent = 'LIGA MEGA'; document.title = 'Liga Mega TCG'; } catch (e) {} }
const ENERGY_BASIC = MEGA ? C.ENERGY_BASIC : ['base1-99', 'base1-98', 'base1-102', 'base1-100', 'base1-101', 'base1-97'];
const ENERGY_ID = MEGA ? C.ENERGY_ID : P.Decks.ENERGY_ID;
const STAGE = ['Básico', 'Fase 1', 'Fase 2'];
const APP_VERSION = 'v13 · Era Mega: Megaevolución + Fuegos Fantasmales';
async function forceUpdate() {
  toast('Buscando la versión más nueva…', 2500);
  try { if ('serviceWorker' in navigator) { const rs = await navigator.serviceWorker.getRegistrations(); for (const r of rs) await r.unregister(); } } catch (e) {}
  try { if (window.caches) { const ks = await caches.keys(); for (const k of ks) await caches.delete(k); } } catch (e) {}
  setTimeout(() => location.reload(), 600);
}

// ---------- guardado ----------
const SAVE_KEY = MEGA ? 'ptcg_mega_save_v1' : 'ptcg_kanto_save_v1';
let S = null; let dbRef = null; let saveTimer = null;
function defaultSave() { return { v: 1, name: '', money: 0, coll: {}, packs: {}, decks: [], activeDeck: 0, badges: [], badgesJ: [], badgesO: [], region: 'kanto', championJ: false, championO: false, beaten: {}, coins: [0, 2, 4, 6], coin: 0, stats: { wins: 0, losses: 0 }, opts: { speed: 1 }, champion: false, created: Date.now(), updated: 0 }; }
function lsGet() { try { const t = localStorage.getItem(SAVE_KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function lsSet(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {} }
function save() { if (!S) return; S.updated = Date.now(); lsSet(S); clearTimeout(saveTimer); saveTimer = setTimeout(async () => { if (dbRef) { try { await dbRef.set({ json: JSON.stringify(S), updated: S.updated }); } catch (e) {} } }, 800); }
async function initCloud() {
  try {
    if (!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    dbRef = db.doc('data/users/' + id + (MEGA ? '/save_mega' : '/save'));
    const snap = await dbRef.get();
    if (snap.exists) { const d = snap.data(); const remote = JSON.parse(d.json); if (!S || (remote.updated || 0) > (S.updated || 0)) { S = Object.assign(defaultSave(), remote); lsSet(S); if (S.name) showHub(); toast('Partida recuperada de la nube'); } }
    else if (S && S.name) save();
  } catch (e) {}
}

// ---------- utilidades de cartas ----------
function cardEl(id, opts = {}) {
  const d = DB[id]; const e = el('div', { class: 'card' + (opts.cls ? ' ' + opts.cls : ''), 'data-card': id });
  if (!d) { e.classList.add('back'); return e; }
  if (!d.img) { drawCard(e, d); if (opts.holo !== false && (d.rar === 'RH' || d.rar === 'SH')) e.classList.add('holo'); return e; }
  const [sheet, idx] = d.img; const col = idx % 5, row = Math.floor(idx / 5);
  e.style.backgroundImage = `url(assets/cards${String(sheet).padStart(2, '0')}.webp)`;
  e.style.backgroundPosition = `${col * 25}% ${row * 33.3333}%`;
  if (opts.holo !== false && (d.rar === 'RH' || d.rar === 'S' || d.rar === 'UR' || d.rar === 'SIR' || d.rar === 'MHR')) e.classList.add('holo');
  return e;
}
// carta dibujada (cuando no hay imagen escaneada)
const SETCODE = Object.fromEntries(C.SETS.map(s => [s.id, s.code])); if (MEGA) SETCODE.mee = 'MEE';
function drawCard(e, d) {
  e.classList.add('drawn');
  const ty = d.st === 'P' ? d.types[0] : d.st === 'E' ? (d.etype || 'C') : 'T';
  const box = el('div', { class: 'dc t-' + ty + (d.st === 'T' ? ' tr' : '') + (d.shining ? ' shiny' : '') + (/^Dark /.test(d.name) ? ' dark' : '') + (/^Light /.test(d.name) ? ' light' : '') });
  if (d.st === 'P') {
    box.append(el('div', { class: 'dc-top' }, el('span', { class: 'dc-st' }, d.baby ? 'BEBÉ' : STAGE[d.stage].toUpperCase()), el('b', { class: 'dc-nm' }, d.nameEs), el('span', { class: 'dc-hp' }, d.hp + ' PS')));
    box.append(el('div', { class: 'dc-art' }, el('span', { class: 'dc-ico', style: `background-image:url(assets/e_${ty}.webp)` }), d.dex ? el('span', { class: 'dc-dex' }, '#' + d.dex) : null));
    const at = el('div', { class: 'dc-atk' });
    if (d.pw) at.append(el('div', { class: 'dc-pw' }, '★ ' + d.pw.nameEs));
    for (const a of d.atk) at.append(el('div', { class: 'dc-a' }, el('span', { class: 'dc-cost' }, ...a.cost.map(t => el('i', { style: `background-image:url(assets/e_${t}.webp)` }))), el('span', { class: 'dc-an' }, a.nameEs), el('b', {}, a.dmg || '')));
    box.append(at);
  } else if (d.st === 'E') {
    box.append(el('div', { class: 'dc-top' }, el('b', { class: 'dc-nm' }, d.nameEs)), el('div', { class: 'dc-art en' }, el('span', { class: 'dc-ico', style: `background-image:url(assets/e_${ty}.webp)` })), el('div', { class: 'dc-txt' }, d.basic ? '' : d.es));
  } else {
    const sub = (d.sub || []).includes('Stadium') ? 'ESTADIO' : (d.sub || []).includes('Pokémon Tool') ? 'HERRAMIENTA' : 'ENTRENADOR';
    box.append(el('div', { class: 'dc-top' }, el('span', { class: 'dc-st' }, sub), el('b', { class: 'dc-nm' }, d.nameEs)), el('div', { class: 'dc-txt' }, d.es));
  }
  box.append(el('div', { class: 'dc-ft' }, `${SETCODE[d.set] || ''} ${d.num} ${RSYM[d.rar] || ''}`));
  e.append(box);
}
const backEl = (cls) => el('div', { class: 'card back' + (cls ? ' ' + cls : '') });
const eIcon = t => el('span', { class: 'ei', style: `background-image:url(assets/e_${t}.webp)`, title: TYPES[t] });
const nm = id => DB[id].nameEs;
function toast(msg, ms = 2400) { const t = el('div', { class: 'toast', role: 'status' }, msg); document.body.append(t); setTimeout(() => t.remove(), ms); }
// devuelve los ids que eran nuevos (primera copia) y los marca como «nuevos» hasta que se vean en la Colección
function addCards(ids) { const fresh = new Set(); S.newCards = S.newCards || {}; for (const id of ids) { if (!S.coll[id]) { fresh.add(id); S.newCards[id] = 1; } S.coll[id] = (S.coll[id] || 0) + 1; } return fresh; }
const newCount = () => Object.keys(S.newCards || {}).filter(id => S.coll[id]).length;
const newTag = () => el('span', { class: 'newtag' }, '¡NUEVA!');
function badgeEl(key, off) {
  const box = el('div', { class: 'badge-slot' + (off ? ' off' : ''), title: (Object.values(C.REGIONS).flatMap(r => r.GYMS).find(g => g.badge === key) || {}).badgeEs || '' });
  if (JBADGE[key]) { box.innerHTML = `<svg viewBox="0 0 40 40">${JBADGE[key]}</svg>`; }
  else if (key === 'cascade' || key === 'thunder') {
    box.innerHTML = key === 'cascade'
      ? '<svg viewBox="0 0 40 40"><path d="M20 3 C27 13 33 19 33 26 a13 13 0 0 1-26 0 C7 19 13 13 20 3z" fill="#4fb3f5" stroke="#cfeaff" stroke-width="2"/><path d="M14 26 a6 6 0 0 0 6 6" stroke="#fff" stroke-width="2" fill="none"/></svg>'
      : '<svg viewBox="0 0 40 40"><polygon points="13,3 27,3 37,13 37,27 27,37 13,37 3,27 3,13" fill="#f1a629" stroke="#ffe7a3" stroke-width="2"/><polygon points="15,10 25,10 30,15 30,25 25,30 15,30 10,25 10,15" fill="#ffd257"/></svg>';
  } else box.append(el('img', { src: `assets/badge_${key}.webp`, alt: '' }));
  return box;
}
const JBADGE = {
  zephyr: '<path d="M4 26 C10 10 26 4 37 6 C30 10 26 14 24 20 C20 18 14 20 10 26 Z" fill="#c9d3dc" stroke="#fff" stroke-width="1.5"/><path d="M10 26 C16 22 22 22 26 26 C20 30 14 32 6 32 Z" fill="#9fb0bf" stroke="#fff" stroke-width="1.5"/>',
  hive: '<ellipse cx="20" cy="22" rx="14" ry="13" fill="#d7322e" stroke="#ffd0c8" stroke-width="2"/><path d="M20 9 V35" stroke="#2b1b1b" stroke-width="2"/><circle cx="13" cy="20" r="3" fill="#2b1b1b"/><circle cx="27" cy="20" r="3" fill="#2b1b1b"/><circle cx="14" cy="28" r="2.4" fill="#2b1b1b"/><circle cx="26" cy="28" r="2.4" fill="#2b1b1b"/>',
  plain: '<polygon points="20,3 37,20 20,37 3,20" fill="#f3c63c" stroke="#fff6c8" stroke-width="2"/><polygon points="20,11 29,20 20,29 11,20" fill="#e39b1e"/>',
  fog: '<circle cx="20" cy="20" r="15" fill="#7b5aa6" stroke="#e2d4ff" stroke-width="2"/><path d="M8 18 C14 12 26 12 32 18 C26 16 14 16 8 18Z M8 24 C14 30 26 30 32 24 C26 26 14 26 8 24Z" fill="#cdb8ef"/>',
  storm: '<path d="M8 8 H30 L34 16 L28 34 H12 L6 22 Z" fill="#8e5a35" stroke="#f1c79c" stroke-width="2"/><path d="M14 14 H26 V24 H14 Z" fill="#f1c79c"/>',
  mineral: '<polygon points="20,3 35,12 35,28 20,37 5,28 5,12" fill="#b9c3cc" stroke="#fff" stroke-width="2"/><polygon points="20,11 28,16 28,24 20,29 12,24 12,16" fill="#7c8a96"/>',
  glacier: '<polygon points="20,2 25,15 38,20 25,25 20,38 15,25 2,20 15,15" fill="#9fe3ff" stroke="#fff" stroke-width="2"/><circle cx="20" cy="20" r="4" fill="#4fb3f5"/>',
  coral: '<path d="M20 36 V22 M20 26 L12 16 M20 24 L28 12 M12 16 L8 8 M12 16 L16 7 M28 12 L33 6 M28 12 L24 5" stroke="#ff6f61" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="20" cy="20" r="17" fill="none" stroke="#ffd0c8" stroke-width="1.5"/>',
  searuby: '<polygon points="20,3 33,13 28,35 12,35 7,13" fill="#d81b45" stroke="#ffc2cf" stroke-width="2"/><polygon points="20,10 27,15 24,29 16,29 13,15" fill="#ff5c7a"/>',
  spikeshell: '<path d="M20 4 L24 12 L33 9 L29 18 L37 23 L28 26 L30 35 L20 30 L10 35 L12 26 L3 23 L11 18 L7 9 L16 12 Z" fill="#f2b84b" stroke="#fff1c4" stroke-width="1.5"/><circle cx="20" cy="20" r="5" fill="#c9832b"/>',
  jadestar: '<polygon points="20,2 24.5,14 37,14 27,22 31,35 20,27 9,35 13,22 3,14 15.5,14" fill="#2fbf71" stroke="#c9ffe0" stroke-width="2"/><circle cx="20" cy="20" r="4" fill="#bff5d6"/>',
  rising: '<path d="M20 3 C30 8 36 16 34 26 C30 22 26 22 24 26 L20 37 L16 26 C14 22 10 22 6 26 C4 16 10 8 20 3 Z" fill="#2f4fa8" stroke="#bcd0ff" stroke-width="2"/><circle cx="20" cy="15" r="3" fill="#ffd257"/>',
};
// ---------- regiones ----------
const regionOpen = id => { const r = C.REGIONS[id]; return !r || !r.needKey || (S[r.needKey] || []).length >= r.need; };
const johtoOpen = () => regionOpen('johto');
const REG = () => C.REGIONS[C.REGIONS[S.region] && regionOpen(S.region) ? S.region : 'kanto'];
const regionOf = x => C.REGIONS[x && C.REGIONS[x.region] ? x.region : 'kanto'];
const badgesOf = r => S[r.badgesKey] || (S[r.badgesKey] = []);
const hasBadge = g => badgesOf(regionOf(g)).includes(g.id);
const setLocked = s => { if (MEGA) return C.curTier(S) < s.tier; const r = C.REGIONS[s.region || 'kanto']; return !regionOpen(r.id) || badgesOf(r).length < s.unlock; };
const setLockMsg = s => { if (MEGA) return `🔒 Se desbloquea al llegar al nivel ${s.tier + 1} (${C.TIERS[s.tier].name})`; const r = C.REGIONS[s.region || 'kanto']; return !regionOpen(r.id) ? '🔒 ' + r.lockMsg : `🔒 Se desbloquea con ${s.unlock} medalla(s)${r.suffix}`; };
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
const rich = txt => { const out = el('span'); String(txt || '').split(/\{([GRWLPFDMCN])\}/).forEach((x, i) => out.append(i % 2 ? eIcon(x) : x)); return out; };
function cardText(d, slotInfo) {
  const t = el('div', { class: 'txt' });
  if (d.st === 'P') {
    const e = slotInfo ? slotInfo.e : null;
    t.append(el('h3', {}, (e ? e.nameEs : d.nameEs)), el('div', { class: 'sub' }, `${STAGE[d.stage]}${d.from ? ' · evoluciona de ' + P.DB[Object.keys(DB).find(k => DB[k].name === d.from)]?.nameEs : ''} · ${e ? e.hp : d.hp} PS · `, ...(e ? e.types : d.types).map(eIcon), ` · ${SETNAME[d.set]} #${d.num} ${RARES[d.rar] || ''}`));
    if (d.pw) t.append(el('div', { class: 'pw' }, el('b', {}, (d.pw.ability ? 'Habilidad: ' : 'Poder Pokémon: ') + d.pw.nameEs), el('div', {}, rich(d.pw.es))));
    const atks = e ? e.atk : d.atk;
    for (const a of atks) t.append(el('div', { class: 'atk' }, costIcons(a.cost), ' ', el('b', {}, a.nameEs), el('span', { class: 'dm' }, a.dmg || ''), a.es ? el('div', {}, rich(a.es)) : null));
    const w = e ? e.weak : d.weak, r = e ? e.res : d.res;
    t.append(el('div', { class: 'foot' }, el('span', {}, 'Debilidad: ', w ? eIcon(w) : '—', w ? ' ×2' : ''), el('span', {}, 'Resistencia: ', r ? eIcon(r) : '—', r ? ' −' + (d.resV || 30) : ''), el('span', {}, 'Retirada: ', ...(Array(d.ret).fill('C').map(eIcon)), d.ret ? '' : '0')));
    if (d.ex) t.append(el('div', { class: 'muted', style: 'font-size:12px;margin-top:4px' }, d.mega ? 'Regla Megaevolución ex: si queda Fuera de Combate, tu rival toma 3 cartas de Premio.' : 'Regla Pokémon ex: si queda Fuera de Combate, tu rival toma 2 cartas de Premio.'));
  } else {
    t.append(el('h3', {}, d.nameEs), el('div', { class: 'sub' }, d.st === 'E' ? (d.basic ? 'Energía básica' : 'Energía especial') : ((d.sub || []).includes('Stadium') ? 'Entrenador · Estadio' : (d.sub || []).includes('Supporter') ? 'Entrenador · Partidario' : (d.sub || []).includes('Pokémon Tool') ? 'Entrenador · Herramienta Pokémon' : (d.sub || []).includes('Item') ? 'Entrenador · Objeto' : (d.sub || []).length && d.sub[0] === "Rocket's Secret Machine" ? 'Entrenador · Máquina Secreta del Team Rocket' : 'Entrenador'), ` · ${SETNAME[d.set]} #${d.num}`), el('div', {}, rich(d.es)));
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
  const st = []; if (s.st) st.push(P.STATUS_ES[s.st]); if (s.poison) st.push(`Envenenado (${s.poison})`); if (s.burn) st.push('Quemado');
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
  wrap.append(el('div', { class: 'logo' }, MEGA ? 'LIGA MEGA' : 'LIGA KANTO', el('br'), el('span', { style: 'font-size:.42em;color:var(--ink);text-shadow:none' }, 'JUEGO DE CARTAS COLECCIONABLES')));
  wrap.append(el('div', { class: 'muted', style: 'font-size:12px' }, APP_VERSION));
  wrap.append(el('div', { class: 'muted', style: 'max-width:640px;text-align:center' }, MEGA ? 'Era Mega: Megaevolución y Fuegos Fantasmales, con reglas modernas (Pokémon ex, Habilidades, Partidarios). Vence a la lista de entrenadores y desbloquea niveles cada vez más difíciles.' : 'Base Set, Jungle, Fossil, Base Set 2, Team Rocket, Gym Heroes y Gym Challenge. Abre sobres, arma tu mazo y vence a los 8 líderes de gimnasio de Kanto.'), el('button', { onclick: showEraPick }, '⇄ Cambiar de era (' + (MEGA ? 'Mega' : 'WOTC') + ')'));
  let pick = 0;
  const nameIn = el('input', { id: 'pname', placeholder: 'Tu nombre de entrenador', maxlength: 18, value: 'Rojo' });
  const grid = el('div', { class: 'starters' });
  const draw = () => { grid.innerHTML = ''; C.STARTERS.forEach((s, i) => grid.append(el('button', { class: 'starter' + (i === pick ? ' on' : ''), onclick: () => { pick = i; draw(); } }, cardEl(s.cover), el('div', {}, el('b', { class: 'cond', style: 'font-size:18px' }, s.name), el('div', { class: 'muted', style: 'font-size:13px' }, s.desc), el('div', {}, ...s.types.map(eIcon)))))); };
  draw();
  wrap.append(el('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:12px;width:min(900px,100%)' }, el('h2', { class: 'cond', style: 'color:var(--gold)' }, 'Nueva partida'), el('label', { for: 'pname' }, 'Nombre: ', nameIn), el('div', {}, MEGA ? 'Elige tu mazo inicial (cartas de Megaevolución):' : 'Elige tu mazo inicial (sólo cartas de Base Set):'), grid,
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
  S.packs = MEGA ? { me01: 4 } : { base1: 4 }; S.money = 300;
  save(); showHub('shop'); toast(`¡Bienvenido! Tienes 4 sobres de ${MEGA ? 'Megaevolución' : 'Base Set'} para abrir.`, 3500);
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
const NAV = [['map', MEGA ? 'Entrenadores' : 'Mapa'], ['shop', 'Tienda'], ['coll', 'Colección'], ['decks', 'Mazos'], ['online', 'En línea'], ['coins', 'Monedas'], ['opts', 'Opciones']];
function showHub(view) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('#hubscreen').hidden = false; if (view) curView = view; renderTop(); renderView();
}
function renderTop() {
  const nav = $('#nav'); nav.innerHTML = '';
  for (const [k, l] of NAV) nav.append(el('button', { class: curView === k ? 'on' : '', onclick: () => { curView = k; renderTop(); renderView(); } }, l + (k === 'shop' && packCount() ? ` (${packCount()})` : '') + (k === 'coll' && newCount() ? ` ★${newCount()}` : '') + (k === 'online' && NET.link ? ' ●' : '')));
  const b = $('#badges'); b.innerHTML = ''; if (MEGA) { const k = C.curTier(S); b.append(el('span', { class: 'cond', style: 'color:var(--gold);font-size:15px' }, `Nivel ${k + 1}: ${C.TIERS[k].name}`, el('span', { class: 'muted', style: 'font-size:12px' }, ` · ${C.TRAINERS.filter(t => S.beaten[t.id]).length}/${C.TRAINERS.length} vencidos`))); } else for (const g of REG().GYMS) b.append(badgeEl(g.badge, !hasBadge(g)));
  $('#money').textContent = `₽ ${S.money.toLocaleString('es-CL')}`;
}
const packCount = () => Object.values(S.packs).reduce((a, b) => a + b, 0);
function renderView() { const v = $('#view'); v.innerHTML = ''; ({ map: MEGA ? viewTrainers : viewMap, shop: viewShop, coll: viewColl, decks: viewDecks, online: viewOnline, coins: viewCoins, opts: viewOpts })[curView](v); }

// ---------- mapa ----------
const LAND = {
  kanto: `<path d="M4 2 H92 V30 H96 V44 L84 48 L80 40 L70 44 L66 52 L54 58 L40 60 L36 52 L26 50 L16 44 L10 52 L4 50 Z" fill="url(#gr)" stroke="#e8d9a0" stroke-width=".6"/>
    <path d="M14 50 L20 52 L22 58 L14 58 Z" fill="url(#gr)" stroke="#e8d9a0" stroke-width=".5"/>
    <path d="M30 56 L38 56 L36 60 L30 60Z" fill="#d9e8f2" opacity=".7"/>
    <g stroke="#e9d38b" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M22 44 L22 35 L20 27 L22 19 L40 11 L58 11 L60 5"/><path d="M58 11 L56 26 L52 26 L40 27 L18 35"/><path d="M56 26 L62 39 L66 45"/><path d="M58 11 L80 25 L82 39 L62 39"/><path d="M40 27 L30 45 L48 51 L56 56"/><path d="M48 51 L34 57 L20 54 L14 50 L18 35"/><path d="M18 35 L8 19 L8 5"/>
    </g>`,
  johto: `<path d="M16 6 L40 3 L60 1 L80 2 L98 2 L99 40 L96 52 L80 56 L64 58 L50 60 L42 56 L34 50 L26 44 L18 34 L14 22 Z" fill="url(#gr)" stroke="#e8d9a0" stroke-width=".6"/>
    <path d="M2 31 L13 31 L14 41 L3 42 Z" fill="url(#gr)" stroke="#e8d9a0" stroke-width=".5"/>
    <path d="M1 1 L12 1 L13 8 L2 9 Z" fill="#c9c2b4" stroke="#efe6d0" stroke-width=".5"/>
    <path d="M56 1 L68 1 L67 6 L57 6Z" fill="#7cc0e8" opacity=".85"/>
    <path d="M78 6 L82 8 L80 10" fill="#e6f6ff" opacity=".7"/>
    <g stroke="#e9d38b" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M90 46 L82 44 L76 51 M82 44 L76 39 L70 27.5 L78 24"/><path d="M70 27.5 L60 35 L62 47.5 L56 54 L50 57.5 L46 51 L42 45 L40 36 L44 26 L42 17.5 L34 12.5"/>
      <path d="M42 17.5 L28 20 L20 24 L14 17.5"/><path d="M42 17.5 L64 15 L70 19 M64 15 L62 5 M64 15 L76 9 L86 12.5 L94 5"/><path d="M90 46 L94 37.5 L96 27.5"/>
    </g>
    <path d="M20 24 L14 31 L8 37.5 M8 37.5 L12 31" stroke="#9fd0f0" stroke-width="1.2" stroke-dasharray="1.6 1.2" fill="none"/>`,
  orange: `<g fill="url(#gr)" stroke="#f3e2b0" stroke-width=".5">
    <ellipse cx="10" cy="9" rx="6" ry="4"/><ellipse cx="18" cy="25" rx="4" ry="3"/><ellipse cx="26" cy="16.5" rx="5" ry="3.4"/><ellipse cx="36" cy="12.5" rx="3.2" ry="2.4"/>
    <ellipse cx="44" cy="31" rx="5.5" ry="4"/><ellipse cx="34" cy="47.5" rx="3.6" ry="2.6"/><ellipse cx="54" cy="51" rx="4" ry="3"/><ellipse cx="54" cy="14" rx="4.5" ry="3"/>
    <ellipse cx="60" cy="37.5" rx="4.4" ry="3.3"/><ellipse cx="66" cy="25" rx="5" ry="3.6"/><ellipse cx="72" cy="10" rx="5" ry="3.2"/><ellipse cx="88" cy="22.5" rx="5.5" ry="4"/>
    <ellipse cx="80" cy="42.5" rx="5" ry="3.6"/><ellipse cx="92" cy="54" rx="6" ry="4.4"/></g>
    <g stroke="#ffffff" stroke-width=".9" fill="none" stroke-dasharray="1.6 1.4" opacity=".75">
      <path d="M10 9 L18 25 L26 16.5 L36 12.5 L54 14 L72 10 L88 22.5 L80 42.5 L92 54"/><path d="M26 16.5 L44 31 L34 47.5 L54 51 L60 37.5 L66 25"/><path d="M44 31 L60 37.5 L80 42.5"/>
    </g>`,
};
// ---------- selector de era ----------
function eraSaveInfo(key) { try { const d = JSON.parse(localStorage.getItem(key) || 'null'); return d && d.name ? d : null; } catch (e) { return null; } }
function showEraPick() {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  const t = $('#title'); t.hidden = false; t.innerHTML = '';
  const wrap = el('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:18px;padding:24px 16px;width:100%;' });
  wrap.append(el('div', { class: 'logo' }, 'POKÉMON TCG', el('br'), el('span', { style: 'font-size:.42em;color:var(--ink);text-shadow:none' }, '¿QUÉ ERA JUGAMOS HOY?')), el('div', { class: 'muted', style: 'font-size:12px' }, APP_VERSION));
  const megaCover = (P.CARDS_MEGA || []).find(d => d.name === 'Mega Charizard X ex');
  const ERAS = [
    { id: 'wotc', name: 'Era WOTC', years: '1999 – 2003', desc: 'De Base Set a e-Card: Kanto, Johto e Islas Naranja. Poké-Powers, Bebés, Pokémon Oscuros y Brillantes.', key: 'ptcg_kanto_save_v1', cover: 'base1-4' },
    { id: 'mega', name: 'Era Mega', years: '2025 – 2026', desc: 'Megaevolución y Fuegos Fantasmales con reglas modernas: Pokémon ex y Megaevolución ex, Habilidades, Partidarios y Estadios.', key: 'ptcg_mega_save_v1', cover: megaCover ? megaCover.id : null },
  ];
  const grid = el('div', { class: 'eras' });
  for (const e of ERAS) {
    const sv = eraSaveInfo(e.key);
    grid.append(el('button', { class: 'era' + (e.id === ERA ? ' on' : ''), onclick: () => pickEra(e.id) }, e.cover && DB[e.cover] ? cardEl(e.cover) : el('div'), el('div', {}, el('b', { class: 'cond', style: 'font-size:24px;color:var(--gold)' }, e.name), el('div', { class: 'muted', style: 'font-size:13px' }, e.years), el('p', { style: 'font-size:14px;margin:8px 0' }, e.desc), el('div', { class: sv ? 'good' : 'muted', style: 'font-size:13px' }, sv ? `Partida de ${sv.name} · ${(sv.stats || {}).wins || 0} victorias · ${Object.keys(sv.coll || {}).length} cartas distintas` : 'Sin partida todavía'))));
  }
  wrap.append(grid, el('div', { class: 'muted', style: 'font-size:12.5px;max-width:640px;text-align:center' }, 'Cada era tiene su propia colección, dinero, mazos y progreso. Puedes cambiar de era cuando quieras desde Opciones.'));
  t.append(wrap);
}
function pickEra(id) {
  try { localStorage.setItem('ptcg_era', id); sessionStorage.setItem('ptcg_era_ok', '1'); } catch (e) {}
  if (id !== ERA) { const u = new URL(location.href); u.searchParams.delete('era'); location.replace(u.toString()); return; }
  S = null; start();
}
// ---------- lista de entrenadores (era Mega) ----------
function viewTrainers(v) {
  const wrap = el('div', { style: 'max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:14px' });
  wrap.append(el('div', { class: 'panel' }, el('h2', { class: 'cond', style: 'color:var(--gold);font-size:24px' }, 'Entrenadores'), el('p', { class: 'muted', style: 'font-size:13.5px;margin-top:4px' }, 'Vence a todos los entrenadores de un nivel para desbloquear el siguiente. Cada nivel trae mazos más fuertes (Pokémon ex y Megaevolución ex) y mejores premios. En la era Mega quien empieza no puede atacar ni jugar Partidarios en su primer turno.')));
  C.TIERS.forEach((tier, i) => {
    const open = C.tierOpen(S, i); const n = tier.list.filter(t => S.beaten[t.id]).length;
    const box = el('div', { class: 'panel tier' + (open ? '' : ' locked') }, el('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px' }, el('h3', { class: 'cond', style: 'font-size:20px;color:var(--gold)' }, `${open ? '' : '🔒 '}Nivel ${i + 1} · ${tier.name}`), el('span', { class: n === tier.list.length ? 'good' : 'muted' }, `${n}/${tier.list.length} vencidos`)));
    if (!open) box.append(el('div', { class: 'bad', style: 'margin:6px 0' }, `Vence a todos los entrenadores de «${C.TIERS[i - 1].name}» para desbloquear este nivel.`));
    const list = el('div', { class: 'tlist' });
    for (const t of tier.list) { const row = oppRow({ name: t.name, portrait: t.portrait, level: t.level, types: t.types }, () => open ? preBattle({ kind: 'mega', t }) : toast('Ese nivel todavía está bloqueado.'), S.beaten[t.id] ? `✔ Vencido ×${S.beaten[t.id]}${t.champion ? ' · 👑' : ''}` : `«${t.quote}»`); if (!open) row.querySelector('button.primary').disabled = true; list.append(row); }
    box.append(list); wrap.append(box);
  });
  v.append(wrap);
}
function endBattleMega(w) {
  const spec = BT.spec, t = spec.t; const win = w === 0;
  const rewards = []; let money = 0; const packs = {};
  const before = C.curTier(S); const first = !S.beaten[t.id];
  if (win) {
    S.stats.wins++; S.beaten[t.id] = (S.beaten[t.id] || 0) + 1;
    money = first ? 80 * t.level + (t.champion ? 3000 : 0) : 30 * t.level;
    const sets = C.SETS.filter(s => !setLocked(s)); const st = sets[Math.floor(Math.random() * sets.length)] || C.SETS[0];
    if (first) packs[st.id] = t.champion ? 5 : t.level >= 4 ? 2 : 1; else if (Math.random() < 0.3) packs[st.id] = 1;
    if (t.champion && first) rewards.push({ txt: '👑 ¡Eres el nuevo Campeón de la Liga Mega!' });
    const after = C.curTier(S);
    if (after > before) { rewards.push({ txt: `¡Nuevo nivel desbloqueado: ${C.TIERS[after].name}!` }); const ns = C.SETS.find(s => s.tier === after); if (ns) rewards.push({ txt: `Nuevo set en la tienda: ${ns.name}` }); }
    if (first || Math.random() < 0.35) { const locked = []; for (let i = 0; i < COIN_COUNT; i++) if (!S.coins.includes(i)) locked.push(i); if (locked.length) { const c = locked[Math.floor(Math.random() * locked.length)]; S.coins.push(c); rewards.push({ coin: c, txt: '¡Nueva moneda desbloqueada!' }); } }
  } else { S.stats.losses++; money = 20; }
  S.money += money; for (const [k, n] of Object.entries(packs)) S.packs[k] = (S.packs[k] || 0) + n;
  save();
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center;min-width:min(420px,80vw)' });
  for (const r of rewards) { if (r.coin !== undefined) body.append(el('div', { class: 'coinpick' }, el('div', { class: 'cf', style: coinFace(r.coin, false) }))); body.append(el('div', { style: 'font-weight:700' }, r.txt)); }
  body.append(el('div', {}, `+ ₽${money}`));
  const pk = Object.entries(packs); if (pk.length) body.append(el('div', { style: 'display:flex;gap:8px;justify-content:center' }, ...pk.map(([s, n]) => el('div', { style: 'text-align:center' }, el('div', { class: 'pack', style: `background-image:url(assets/pack_${s}_0.webp);width:70px;cursor:default` }), `${n}× ${SETNAME[s]}`))));
  if (!win) body.append(el('div', { class: 'muted' }, 'Mejora tu mazo con sobres nuevos y vuelve a intentarlo.'));
  showModal(win ? '¡Victoria!' : 'Derrota', body, [{ t: 'Volver', cls: 'primary', f: () => { BT.g = null; showHub(pk.length ? 'shop' : 'map'); } }]);
}
function viewMap(v) {
  const reg = REG(); const sfx = reg.suffix;
  const hub = el('div', { class: 'hub' });
  const map = el('div', { id: 'map', class: reg.id === 'kanto' ? '' : reg.id });
  map.innerHTML = `<svg class="land" viewBox="0 0 100 62.5" preserveAspectRatio="none" aria-hidden="true">
    <defs><pattern id="gr" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="${reg.land}"/><circle cx="1" cy="1" r=".25" fill="#4e9d48"/></pattern></defs>${LAND[reg.id]}</svg>`;
  const nodes = [];
  const myB = badgesOf(reg); const badgeN = myB.length;
  reg.GYMS.forEach((g, i) => nodes.push({ x: g.x, y: g.y, label: g.city, cls: 'gym' + (myB.includes(g.id) ? ' done' : '') + (i > badgeN ? ' lock' : ''), txt: String(i + 1), on: () => i <= badgeN ? gymPanel(g, i) : toast(`Necesitas ${i} medalla(s)${sfx} para entrar.`) }));
  // un punto por lugar (agrupa entrenadores de ruta y del Team Rocket)
  const places = {};
  for (const r of reg.ROUTES.concat(reg.ROCKET)) { const pl = places[r.place] || (places[r.place] = { place: r.place, list: [] }); pl.list.push(r); if (r.x != null && pl.x == null) { pl.x = r.x; pl.y = r.y; } }
  for (const pl of Object.values(places)) {
    if (pl.x == null) continue;
    const minReq = Math.min(...pl.list.map(r => r.req));
    const routes = pl.list.filter(r => !reg.ROCKET.includes(r));
    const rk = pl.list.filter(r => reg.ROCKET.includes(r));
    const rkOpen = rk.some(r => rocketOpen(r) && !S.beaten[r.id]);
    const allDone = pl.list.every(r => S.beaten[r.id]);
    const maxLv = Math.max(...pl.list.map(r => r.level));
    nodes.push({ x: pl.x, y: pl.y, label: pl.place + (pl.list.length > 1 ? ` (${pl.list.length})` : ''), cls: (allDone ? 'done' : '') + (badgeN < minReq ? ' lock' : '') + (rkOpen ? ' rocket' : '') + (!routes.length ? ' rocketonly' : ''), txt: rkOpen || !routes.length ? 'R' : '★'.repeat(Math.min(3, Math.ceil(maxLv / 2))), on: () => badgeN >= minReq ? placePanel(pl.place) : toast(`Disponible con ${minReq} medalla(s)${sfx}.`) });
  }
  const L = reg.LEAGUE; const champ = S[reg.champKey]; const NB = reg.GYMS.length;
  nodes.push({ x: L.x, y: L.y, label: L.place, cls: 'gym' + (champ ? ' done' : '') + (badgeN < NB ? ' lock' : ''), txt: '👑', on: () => badgeN >= NB ? leaguePanel() : toast(`Consigue las ${NB} medallas${sfx} para entrar en la Liga.`) });
  nodes.push({ x: reg.home.x, y: reg.home.y, label: reg.home.label, cls: 'done', txt: '⌂', on: () => { curView = 'shop'; renderTop(); renderView(); } });
  for (const n of nodes) map.append(el('button', { class: 'node ' + n.cls, style: `left:${n.x}%;top:${n.y}%`, onclick: n.on, 'aria-label': n.label }, el('span', { class: 'dot' }, n.txt), el('span', { class: 'lbl' }, n.label)));
  const side = el('div', { class: 'panel', id: 'mapside' });
  const left = el('div', {});
  // selector de región
  const tabs = el('div', { class: 'regtabs' });
  for (const r of Object.values(C.REGIONS)) {
    const lock = !regionOpen(r.id);
    tabs.append(el('button', { class: (reg.id === r.id ? 'on' : '') + (lock ? ' lock' : ''), onclick: () => { if (lock) return toast(r.lockMsg); S.region = r.id; save(); renderTop(); renderView(); } }, (lock ? '🔒 ' : '') + r.name, el('span', { class: 'cnt' }, ` ${badgesOf(r).length}/${r.GYMS.length}`)));
  }
  left.append(tabs, map);
  hub.append(left, side);
  v.append(hub);
  // panel por defecto: siguiente objetivo
  const next = reg.GYMS[badgeN];
  if (next) gymPanel(next, badgeN); else leaguePanel();
}
function oppRow(o, onFight, extra) {
  return el('div', { class: 'opp-row' }, cardEl(o.portrait, { holo: false }), el('div', { class: 'info' }, el('b', {}, o.name), ' ', el('span', { class: 'lv' }, 'Nv ' + o.level), extra ? el('div', { class: 'muted', style: 'font-size:12.5px' }, extra) : null, el('div', {}, ...(o.types || []).map(eIcon))), el('button', { class: 'primary', onclick: onFight }, 'Desafiar'));
}
function gymPanel(g, i) {
  const side = $('#mapside'); side.innerHTML = '';
  const perk = C.PERKS[g.perk];
  const t1 = S.beaten['g_' + g.id + '_0'], t2 = S.beaten['g_' + g.id + '_1'];
  side.append(el('div', { style: 'display:flex;gap:10px;align-items:center' }, badgeEl(g.badge, !hasBadge(g)), el('div', {}, el('h2', { class: 'cond', style: 'font-size:22px;color:var(--gold)' }, `Gimnasio de ${g.city}`), el('div', { class: 'muted' }, `Líder ${g.leader} · tipo `, eIcon(g.type), ` · ${g.badgeEs}`))));
  g.trainers.forEach((t, k) => side.append(oppRow(Object.assign({ types: t.types }, t), () => preBattle({ kind: 'gymTrainer', gym: g, idx: k, t }), S.beaten['g_' + g.id + '_' + k] ? '✔ Vencido' : 'Entrenador del gimnasio')));
  const canLeader = t1 && t2;
  const lrow = oppRow({ name: 'Líder ' + g.leader, portrait: g.portrait, level: g.level, types: [g.type] }, () => canLeader ? preBattle({ kind: 'leader', gym: g, idx: i }) : toast('Primero vence a los 2 entrenadores del gimnasio.'), canLeader ? (hasBadge(g) ? '✔ Medalla obtenida (revancha)' : '¡Listo para el combate!') : 'Vence a los 2 entrenadores primero');
  side.append(lrow);
  side.append(el('div', { class: 'pw', style: 'margin-top:10px;background:#2a1f3d;border-left:3px solid var(--gold);padding:8px;border-radius:6px' }, el('b', {}, `Ventaja del líder: ${perk.name}`), el('div', { style: 'font-size:13px' }, perk.es)));
  side.append(el('p', { class: 'muted', style: 'font-style:italic;font-size:13px' }, `«${g.quote}»`));
}
function rocketOpen(r) { const reg = regionOf(r); const L = reg.ROCKET; const i = L.indexOf(r); return badgesOf(reg).length >= r.req && (i === 0 || !!S.beaten[L[i - 1].id]); }
function rocketProgress(reg) { return reg.ROCKET.filter(r => S.beaten[r.id]).length; }
function placePanel(place) {
  const side = $('#mapside'); side.innerHTML = '';
  side.append(el('h2', { class: 'cond', style: 'font-size:22px;color:var(--gold)' }, place));
  const reg = REG(); const badgeN = badgesOf(reg).length;
  const routes = reg.ROUTES.filter(x => x.place === place);
  for (const x of routes) {
    if (badgeN < x.req) { side.append(el('div', { class: 'opp-row', style: 'opacity:.5' }, el('div', { class: 'info' }, el('b', {}, x.name), ` · 🔒 con ${x.req} medalla(s)`))); continue; }
    side.append(oppRow(x, () => preBattle({ kind: 'route', t: x }), (x.rival ? '⚔️ Tu rival · ' : '') + (x.boss ? '👑 Leyenda · ' : '') + (S.beaten[x.id] ? `✔ Vencido ${S.beaten[x.id]} vez/veces` : 'Primera victoria: sobre de regalo') + (x.region !== 'kanto' ? (x.sets && x.sets.length > 4 ? ' · Todos los sets' : ' · ' + regionOf(x).setsLabel) : x.sets ? ' · Sets: ' + x.sets.map(s => SETNAME[s]).join(', ') : ' · Sets de Kanto')));
    if (x.boss && x.quote && !S.beaten[x.id]) side.append(el('p', { class: 'muted', style: 'font-style:italic;font-size:12.5px;margin:4px 0 0' }, `«${x.quote}»`));
    if (x.perk) side.append(el('div', { class: 'pw', style: 'margin-top:6px;background:#2a1f3d;border-left:3px solid var(--gold);padding:8px;border-radius:6px' }, el('b', {}, 'Ventaja: ' + C.PERKS[x.perk].name), el('div', { style: 'font-size:13px' }, C.PERKS[x.perk].es)));
  }
  const rk = reg.ROCKET.filter(x => x.place === place);
  if (rk.length) {
    side.append(el('div', { class: 'rocket-head' }, el('span', { class: 'rbadge' }, 'R'), el('b', {}, 'Team Rocket'), el('span', { class: 'muted', style: 'font-size:12.5px' }, `Misión ${rocketProgress(reg)}/${reg.ROCKET.length} · sólo Pokémon Oscuros`)));
    for (const x of rk) {
      const i = reg.ROCKET.indexOf(x);
      if (!rocketOpen(x)) { const prev = reg.ROCKET[i - 1]; side.append(el('div', { class: 'opp-row rk', style: 'opacity:.55' }, el('div', { class: 'info' }, el('b', {}, x.name), el('div', { class: 'muted', style: 'font-size:12.5px' }, badgeN < x.req ? `🔒 Requiere ${x.req} medalla(s)${reg.suffix}` : `🔒 Primero vence a ${prev.name} (${prev.place})`)))); continue; }
      const row = oppRow(Object.assign({}, x), () => preBattle({ kind: 'rocket', t: x }), (x.boss ? '👑 Jefe del Team Rocket · ' : '') + (S.beaten[x.id] ? `✔ Vencido ${S.beaten[x.id]} vez/veces` : `Primera victoria: sobres de ${reg.rocketName}`));
      row.classList.add('rk'); side.append(row);
      if (x.quote && !S.beaten[x.id]) side.append(el('p', { class: 'muted', style: 'font-style:italic;font-size:12.5px;margin:4px 0 0' }, `«${x.quote}»`));
    }
    if (rk.some(x => x.perk)) side.append(el('div', { class: 'pw', style: 'margin-top:10px;background:#2b1418;border-left:3px solid var(--red);padding:8px;border-radius:6px' }, el('b', {}, 'Ventaja del Jefe: ' + C.PERKS.rocket.name), el('div', { style: 'font-size:13px' }, C.PERKS.rocket.es)));
  }
  if (routes.length) side.append(el('p', { class: 'muted', style: 'font-size:13px' }, 'Los entrenadores de ruta pueden desafiarse cuantas veces quieras para ganar Pokédólares.'));
}
function routePanel(r) { placePanel(r.place); }
function eliteOpen(e) { const i = C.JELITE.indexOf(e); return badgesOf(C.REGIONS.johto).length >= 8 && (i === 0 || !!S.beaten[C.JELITE[i - 1].id]); }
function leaguePanel() {
  const reg = REG(); if (reg.ELITE) return elitePanel();
  const side = $('#mapside'); side.innerHTML = ''; const L = reg.LEAGUE; const NB = reg.GYMS.length;
  side.append(el('h2', { class: 'cond', style: 'font-size:22px;color:var(--gold)' }, reg.leagueTitle || 'Meseta Añil — Liga Pokémon'));
  side.append(oppRow(Object.assign({ types: ['C'] }, L), () => badgesOf(reg).length >= NB ? preBattle({ kind: 'league', t: L }) : toast(`Necesitas las ${NB} medallas${reg.suffix}.`), S[reg.champKey] ? '👑 Ya eres Campeón' : `Requiere ${NB} medallas`));
  if (L.perk) side.append(el('div', { class: 'pw', style: 'margin-top:6px;background:#2a1f3d;border-left:3px solid var(--gold);padding:8px;border-radius:6px' }, el('b', {}, 'Ventaja: ' + C.PERKS[L.perk].name), el('div', { style: 'font-size:13px' }, C.PERKS[L.perk].es)));
  side.append(el('p', { class: 'muted', style: 'font-style:italic;font-size:13px' }, `«${L.quote}»`));
}
function elitePanel() {
  const side = $('#mapside'); side.innerHTML = '';
  const bJ = badgesOf(C.REGIONS.johto).length;
  side.append(el('h2', { class: 'cond', style: 'font-size:22px;color:var(--gold)' }, 'Meseta Añil — Alto Mando de Johto'));
  side.append(el('div', { class: 'muted', style: 'font-size:13px;margin-bottom:6px' }, bJ < 8 ? `Necesitas las 8 medallas de Johto (tienes ${bJ}).` : 'Vence a los cuatro miembros del Alto Mando en orden y luego al Campeón.'));
  for (const e of C.JELITE) {
    if (!eliteOpen(e)) { side.append(el('div', { class: 'opp-row', style: 'opacity:.5' }, el('div', { class: 'info' }, el('b', {}, e.name), ' · 🔒'))); continue; }
    side.append(oppRow(e, () => preBattle({ kind: 'elite', t: e }), (e.boss ? '👑 ' : '') + (S.beaten[e.id] ? `✔ Vencido ${S.beaten[e.id]} vez/veces` : C.PERKS[e.perk].name)));
    if (!S.beaten[e.id] && e.quote) side.append(el('p', { class: 'muted', style: 'font-style:italic;font-size:12.5px;margin:4px 0 0' }, `«${e.quote}»`));
  }
  if (S.championJ) side.append(el('p', { style: 'color:var(--gold);font-weight:700' }, '👑 Eres Campeón de Johto. Rojo te espera en el Monte Plateado...'));
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
    const locked = setLocked(s);
    const boxPrice = s.price * 30;
    const owned = new Set(Object.keys(S.coll).filter(k => k.startsWith(s.id + '-'))).size;
    const total = P.CARDS.filter(d => d.set === s.id).length;
    grid.append(el('div', { class: 'set-card' + (locked ? ' locked' : '') },
      el('div', { class: 'box', style: `background-image:url(assets/box_${s.id}.webp)` }),
      el('div', { class: 'body' }, el('div', {}, s.region ? el('span', { class: 'symtxt' }, s.code) : s.id !== 'base1' ? el('img', { class: 'sym', src: `assets/sym_${s.id}.webp`, alt: '' }) : null, ' ', el('b', { class: 'cond', style: 'font-size:19px' }, s.name)),
        el('div', { class: 'muted', style: 'font-size:13px' }, `Colección: ${owned}/${total} · ${C.PACKS[s.id] ? C.PACKS[s.id].slots.reduce((a, x) => a + x.n, 1) : 11} cartas por sobre, ${MEGA ? '1 rara o superior garantizada (ex, ultra raras e ilustraciones)' : '1 rara garantizada (holo 1 de cada 3)'}`),
        locked ? el('div', { class: 'bad' }, setLockMsg(s)) : el('div', { class: 'row' },
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
  const all = []; const allFresh = new Set();
  for (let k = 0; k < n; k++) {
    if (!(S.packs[setId] > 0)) break;
    S.packs[setId]--; const cards = C.openPack(setId, Math.random); const fresh = addCards(cards.filter(id => !ENERGY_BASIC.includes(id))); fresh.forEach(id => allFresh.add(id)); all.push(...cards); save();
    if (n > 3) continue; // apertura rápida para muchos sobres
    await revealPack(ov, setId, cards, k + 1, n, fresh);
  }
  if (n > 3) await bulkReveal(ov, setId, all, n, allFresh);
  ov.remove(); renderTop(); renderView();
}
function revealPack(ov, setId, cards, k, n, fresh) {
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
        const d = DB[id]; const f = el('button', { class: 'flip' + (d.rar === 'R' ? ' rare-glow' : '') + (BIGRARE(d.rar) ? ' holo-glow' : ''), 'aria-label': 'Voltear carta' }, el('div', { class: 'in' }, el('div', { class: 'face back' }, backEl()), el('div', { class: 'face front' }, cardEl(id))));
        f.querySelector('.face.back .card').style.setProperty('--cw', '120px');
        if (fresh && fresh.has(id) && cards.indexOf(id) === i) f.querySelector('.face.front .card').append(newTag());
        f.onclick = () => { if (f.classList.contains('up')) return; f.classList.add('up'); up++; if (up === cards.length) { done.hidden = false; all.hidden = true; } };
        fan.append(f);
      });
      btnRow.append(all, done); btnRow.className = 'opbar';
      ov.append(el('div', { class: 'disp optitle', style: 'color:var(--gold);font-size:20px' }, TOUCH ? 'Toca cada carta para descubrirla' : 'Haz clic en cada carta para descubrirla'), fan, btnRow);
    };
  });
}
function bulkReveal(ov, setId, all, n, fresh) {
  return new Promise(res => {
    ov.innerHTML = '';
    const ord = { MHR: -3, SIR: -2, UR: -1, IR: 0, RR: 0, RH: 0, S: 0, SH: 0, R: 1, U: 2, C: 3, E: 4 };
    const counts = {}; all.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const ids = Object.keys(counts).sort((a, b) => ord[DB[a].rar] - ord[DB[b].rar] || DB[a].num - DB[b].num);
    const g = el('div', { class: 'grid', style: 'max-width:1100px;width:100%;max-height:62vh;overflow:auto;padding:8px' });
    for (const id of ids) { const c = cardEl(id); c.append(el('span', { class: 'cnt' }, '×' + counts[id])); if (fresh && fresh.has(id)) c.append(newTag()); g.append(c); }
    const holos = all.filter(id => BIGRARE(DB[id].rar)).length;
    ov.append(el('div', { class: 'disp', style: 'color:var(--gold);font-size:22px' }, `${n} sobres de ${SETNAME[setId]}`), el('div', {}, `${all.length} cartas · ${holos} ${MEGA ? 'ex / especiales' : 'holo'} · ${all.filter(id => DB[id].rar === 'R').length} raras`), g, el('div', { class: 'opbar' }, el('button', { class: 'primary', onclick: res }, 'Listo')));
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
  const nn = newCount();
  if (nn) head.append(el('span', { class: 'newtag inline' }, `${nn} nueva${nn > 1 ? 's' : ''}`), el('button', { onclick: () => { S.newCards = {}; save(); renderTop(); renderView(); } }, 'Marcar todas como vistas'));
  const seen = id => { if (S.newCards && S.newCards[id]) { delete S.newCards[id]; save(); clearTimeout(viewColl.t); viewColl.t = setTimeout(renderTop, 400); } };
  const grid = el('div', { class: 'grid' });
  const draw = () => { grid.innerHTML = ''; for (const d of filtered(false)) { const c = cardEl(d.id, { cls: S.coll[d.id] ? '' : 'unowned' }); if (S.coll[d.id]) c.append(el('span', { class: 'cnt' }, '×' + S.coll[d.id])); c.append(el('span', { class: 'rar' }, RSYM[d.rar])); if (S.coll[d.id] && S.newCards && S.newCards[d.id]) { c.append(newTag()); const clr = () => { const t = c.querySelector('.newtag'); if (t) t.remove(); seen(d.id); }; c.addEventListener('pointerenter', clr, { once: true }); c.addEventListener('click', clr, { once: true }); } if (TOUCH) c.onclick = () => inspect(c); grid.append(c); } };
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
    let placed = 0; types.forEach((t, i) => { const n = i === types.length - 1 ? left - placed : Math.round(left * need[t] / tot); for (let k = 0; k < n; k++) if (ENERGY_ID[t]) editDeck.cards.push(ENERGY_ID[t]); placed += n; });
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
    el('div', { class: 'muted', style: 'font-size:13px' }, 'Versión del juego: ', el('b', { style: 'color:var(--gold)' }, APP_VERSION)),
    !window.claude ? el('div', {}, el('button', { onclick: forceUpdate }, '🔄 Buscar actualización')) : null,
    el('div', { class: 'muted', style: 'font-size:13px' }, dbRef ? 'Tu progreso se guarda automáticamente en tu cuenta y en este navegador.' : 'Tu progreso se guarda en este navegador. Usa "Exportar" para tener una copia de seguridad.'),
    el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, el('button', { onclick: showEraPick }, '⇄ Cambiar de era'), el('button', { onclick: exportSave }, 'Exportar partida'), el('button', { onclick: importSave }, 'Importar partida'), el('button', { class: 'danger', onclick: () => showModal('¿Empezar de cero?', el('p', {}, MEGA ? 'Se borrará tu partida de la era Mega (la de la era WOTC no se toca).' : 'Se borrará tu colección, mazos y medallas.'), [{ t: 'Cancelar' }, { t: 'Borrar todo', cls: 'danger', f: () => { S = null; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} if (dbRef) dbRef.set({ json: JSON.stringify(defaultSave()), updated: Date.now() }).catch(() => {}); showTitle(); } }]) }, 'Nueva partida'))));
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
  if (spec.kind === 'mega') opp = { name: spec.t.name, portrait: spec.t.portrait, level: spec.t.level, deck: C.trainerDeck(spec.t, rng), key: spec.t.id };
  else if (spec.kind === 'route') opp = { name: spec.t.name, portrait: spec.t.portrait, level: spec.t.level, deck: spec.t.rival && spec.t.region === 'johto' ? C.silverDeck(spec.t, rng) : C.trainerDeck(spec.t, rng), key: spec.t.id, perk: spec.t.perk };
  else if (spec.kind === 'elite') opp = { name: spec.t.name, portrait: spec.t.portrait, level: 5, deck: C.eliteDeck(spec.t, rng), perk: spec.t.perk, key: spec.t.id };
  else if (spec.kind === 'gymTrainer') opp = { name: spec.t.name, portrait: spec.t.portrait, level: spec.t.level, deck: C.trainerDeck(spec.t, rng), key: 'g_' + spec.gym.id + '_' + spec.idx };
  else if (spec.kind === 'leader') opp = { name: 'Líder ' + spec.gym.leader, portrait: spec.gym.portrait, level: spec.gym.level, deck: C.leaderDeck(spec.gym, rng), perk: spec.gym.perk, key: 'L_' + spec.gym.id };
  else if (spec.kind === 'rocket') opp = { name: spec.t.name, portrait: spec.t.portrait, level: spec.t.level, deck: C.rocketDeck(spec.t, rng), perk: spec.t.perk, key: spec.t.id, rocket: true };
  else if (spec.t.region === 'orange') opp = { name: spec.t.name, portrait: spec.t.portrait, level: 5, deck: C.orangeDeck(spec.t, rng), perk: spec.t.perk, key: spec.t.id };
  else opp = { name: spec.t.name, portrait: spec.t.portrait, level: 5, deck: C.rivalDeck(rng), key: 'league' };
  spec.opp = opp;
  const body = el('div', { style: 'display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start' });
  body.append(cardEl(opp.portrait, { holo: false, cls: '' }));
  const info = el('div', { style: 'flex:1;min-width:220px;display:flex;flex-direction:column;gap:8px' });
  info.append(el('div', {}, el('b', { style: 'font-size:18px' }, opp.name), ' ', el('span', { class: 'lv' }, 'Nivel ' + opp.level)));
  const types = {}; opp.deck.forEach(id => (DB[id].types || []).forEach(t => types[t] = (types[t] || 0) + 1));
  info.append(el('div', {}, 'Mazo: ', ...Object.keys(types).sort((a, b) => types[b] - types[a]).slice(0, 3).map(eIcon)));
  if (opp.perk && C.PERKS[opp.perk]) info.append(el('div', { class: 'pw', style: 'background:#2a1f3d;border-left:3px solid var(--gold);padding:8px;border-radius:6px' }, el('b', {}, 'Ventaja: ' + C.PERKS[opp.perk].name), el('div', { style: 'font-size:13px' }, C.PERKS[opp.perk].es)));
  const sel = el('select', { 'aria-label': 'Tu mazo', onchange: () => { S.activeDeck = +sel.value; save(); } }, ...S.decks.map((d, i) => el('option', { value: i, selected: i === S.activeDeck ? true : null }, d.name + (P.Decks.validate(d.cards).length ? ' (no válido)' : ''))));
  info.append(el('label', {}, 'Tu mazo: ', sel));
  if (errs.length) info.append(el('div', { class: 'bad' }, errs[0]));
  body.append(info);
  showModal('¡Combate!', body, [{ t: 'Cancelar' }, { t: '¡Luchar!', cls: 'primary', f: () => { const d = S.decks[S.activeDeck]; if (P.Decks.validate(d.cards).length) { toast('Tu mazo no es válido: revísalo en "Mazos".'); return; } startBattle(spec, d.cards); } }]);
}

// ================= BATALLA =================
const BT = { g: null, slotMap: {}, sel: null, ask: null, resolveTurn: null, busy: false, spec: null, me: 0, online: false };
const ME = () => BT.me || 0;
function speed() { return (S && S.opts.speed) || 1; }
function startBattle(spec, myDeck) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('#battle').hidden = false; $('#log').innerHTML = '';
  BT.spec = spec; BT.sel = null; BT.ask = null; BT.me = 0; BT.online = false;
  const opp = spec.opp;
  const aiLvl = MEGA ? Math.min(3, Math.max(1, Math.ceil(opp.level / 2) + (opp.level >= 4 ? 1 : 0))) : Math.min(3, Math.max(1, Math.ceil(opp.level / 2) + (spec.kind === 'leader' || spec.kind === 'league' || (spec.t && (spec.t.boss || spec.t.rival)) ? 1 : 0)));
  const g = new P.Game({ modern: MEGA, ai: P.AI, players: [{ name: S.name, deck: myDeck.slice(), coin: S.coin }, { name: opp.name, deck: opp.deck, ai: { level: aiLvl }, perk: opp.perk, coin: Math.floor(Math.random() * COIN_COUNT) }], io: IO });
  g.portrait = opp.portrait;
  BT.g = g; render();
  g.run().then(w => MEGA ? endBattleMega(w) : endBattle(w)).catch(e => { console.error(e); toast('Error en la partida: ' + e.message, 5000); });
}
const IO = {
  log(g, m) { const L = $('#log'); const d = el('div', { class: m.startsWith('—') ? 't' : m.startsWith('💥') ? 'ko' : m.startsWith('🏆') ? 'win' : '' }, m); L.append(d); L.scrollTop = L.scrollHeight; },
  update(g) { render(); },
  async aiDelay(ms) { render(); await sleep(ms * speed()); },
  async ask(g, p, req) {
    if (BT.online && p.remote) return remoteAsk(g, req);
    const v = await humanAsk(g, p, req);
    if (BT.online) netSend('g', { k: 'ans', v: enc(v) });
    return v;
  },
  async flip(g, p, results, label) { await showCoins(p, results, label); },
  async show(g, cards, title) { if (BT.online && g.cur !== ME()) return; await showCardsModal(title, cards); },
  humanTurn(g, p) { if (BT.online && p.remote) return remoteTurn(g, p); return new Promise(res => { BT.resolveTurn = res; render(); }).then(() => { if (BT.online && g.winner == null) netSend('g', { k: 'act', a: ['end'] }); }); }, // en línea: SIEMPRE se envía 'end' al terminar el turno (ataque, botón o efecto)
  fxPopup(g, s, text) { fxPopup(g, s, text); },
  async attackAnim(g, p, s, a) { const e = document.querySelector(`[data-slot="${s.u}"]`); if (e) { e.style.setProperty('--lunge', p.i === ME() ? '-22px' : '22px'); e.classList.add('atk'); await sleep(380 * speed()); e.classList.remove('atk'); } },
};
function checkTurnEnd() { const g = BT.g; if (!g) return; const p = g.p[ME()]; if (p.turnOver && BT.resolveTurn) { const r = BT.resolveTurn; BT.resolveTurn = null; r(); } }
async function act(fn) { if (BT.busy) return; BT.busy = true; closeMenu(); try { await fn(); } catch (e) { if (e instanceof P.GameOver) { if (BT.g) BT.g.p[ME()].turnOver = true; } else { console.error(e); toast('Error: ' + e.message); } } BT.busy = false; render(); const me = BT.g && BT.g.p[ME()]; if (me && me.forceEnd) { me.turnOver = true; me.forceEnd = false; } checkTurnEnd(); }
// acción del jugador local: en línea se envía al rival ANTES de ejecutarla (el rival la reproduce igual)
const A = (name, ...args) => () => { if (BT.online) netSend('g', { k: 'act', a: [name, ...args.map(enc)] }); return BT.g[name](...args); };
function endMyTurn() { const g = BT.g; if (!g) return; const me = g.p[ME()]; closeMenu(); me.turnOver = true; checkTurnEnd(); }
function myTurn() { const g = BT.g; return g && g.cur === ME() && !g.p[ME()].turnOver && BT.resolveTurn && !BT.busy && !BT.ask && g.winner == null; }

// ---- render del tablero ----
function render() {
  const g = BT.g; if (!g) return;
  const board = $('#board'); board.innerHTML = ''; BT.slotMap = {};
  const me = g.p[ME()], op = g.p[1 - ME()];
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
  if (s.burn) stt.append(el('span', { class: 'st-tag-burned', title: 'Quemado: entre turnos lanza una moneda; si sale cruz recibe 20 de daño' }, '🔥 Quemado'));
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
    const clair = g.anyPower('Clairvoyance').some(s => s.owner === ME());
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
  const mine = g.cur === ME();
  const turn = el('div', { class: 'turn ' + (mine ? 'me' : 'op') }, g.winner != null ? (g.winner === ME() ? '¡VICTORIA!' : 'DERROTA') : mine ? 'TU TURNO' : 'TURNO RIVAL');
  const acts = el('div', { class: 'acts' });
  const me = g.p[ME()];
  if (myTurn()) {
    if (me.active) acts.append(el('button', { onclick: ev => activeMenu(ev.currentTarget, me.active) }, 'Atacar…'));
    const t = g.stadiumAction(me); if (t) acts.append(el('button', { onclick: () => act(A('useStadium', me)) }, t.actionLabel || 'Usar Estadio'));
    acts.append(el('button', { class: 'primary', onclick: endMyTurn }, innerWidth < 700 ? 'Fin turno' : 'Terminar turno'));
    const info = []; if (!me.energyPlayed) info.push('energía disponible'); if (!me.retreated) info.push('puede retirarse');
    acts.prepend(el('span', { class: 'muted', style: 'align-self:center;font-size:12.5px' }, info.join(' · ')));
  } else if (g.winner == null && !mine) acts.append(el('span', { class: 'muted', style: 'font-size:12px' }, innerWidth < 700 ? 'Pensando…' : 'El rival está pensando…'));
  if (BT.online && g.winner == null) acts.append(el('button', { onclick: () => confirmResign() }, '🏳️'));
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
  if (BT.ask) return; const g = BT.g, p = g.p[ME()];
  if (!myTurn()) { if (TOUCH) inspect(ev.currentTarget); return; }
  if (BT.sel && BT.sel.card === c) { BT.sel = null; closeMenu(); render(); return; }
  const items = [];
  if (g.canPlayBasic(p, c)) items.push({ t: g.isTrainer(c) ? 'Jugar como Pokémon Básico' : 'Poner en la Banca', f: () => act(A('playBasic', p, c)) });
  if (g.isEvoCard(c)) { const ts = g.evoTargets(p, c); if (ts.length === 1) items.push({ t: 'Evolucionar ' + g.nm(ts[0]), f: () => act(A('evolve', p, c, ts[0])) }); else if (ts.length) { BT.sel = { card: c, targets: ts, kind: 'evo' }; render(); toast('Elige qué Pokémon evolucionar', 1600); return; } else items.push({ t: 'No puedes evolucionar ahora', disabled: true }); }
  if (g.isEnergy(c)) { const ts = g.slots(p).filter(s => g.canAttach(p, c, s)); if (ts.length) { BT.sel = { card: c, targets: ts, kind: 'energy' }; render(); toast('Elige a qué Pokémon unir la Energía', 1600); return; } items.push({ t: p.energyPlayed ? 'Ya uniste energía este turno' : 'No puedes unir energía', disabled: true }); }
  if (g.isTrainer(c) && !g.isBasicCard(c)) items.push({ t: 'Jugar ' + nm(c.d), disabled: !g.canPlayTrainer(p, c), why: g.noTrainers(p) || (!g.canPlayTrainer(p, c) ? 'no se cumplen los requisitos' : ''), f: () => act(A('playTrainer', p, c)) });
  BT.sel = { card: c, targets: [] }; render();
  const anchor = document.querySelector('#hand .hc.sel') || ev.currentTarget;
  openMenu(anchor, items);
}
function slotClick(ev, s, owner) {
  ev.stopPropagation();
  const g = BT.g, p = g.p[ME()];
  if (BT.ask) { askSlotClick(s); return; }
  if (!myTurn() || owner !== p) { if (TOUCH) inspect(ev.currentTarget); return; }
  if (BT.sel && BT.sel.kind === 'retreat') {
    BT.sel = null;
    if (p.bench.includes(s)) return act(async () => { const ok = await A('retreat', p, s)(); if (!ok) toast('No se pudo retirar: revisa la energía para pagar el coste.'); });
    render(); return;
  }
  if (BT.sel && BT.sel.card && BT.sel.targets && BT.sel.targets.includes(s)) {
    const c = BT.sel.card; BT.sel = null;
    if (g.isEvoCard(c)) return act(A('evolve', p, c, s));
    if (g.isEnergy(c)) return act(A('attach', p, c, s));
  }
  BT.sel = null;
  if (owner !== p) return;
  if (s === p.active) return activeMenu(ev.currentTarget, s);
  const items = benchItems(g, p, s); render();
  const a = document.querySelector(`[data-slot="${s.u}"]`) || ev.currentTarget; openMenu(a, items);
}
function benchItems(g, p, s) {
  const items = []; const d = g.baseDef(s);
  if (d.pw && P.FX.pw[d.pw.name] && P.FX.pw[d.pw.name].use) items.push({ t: (d.pw.ability ? 'Habilidad: ' : 'Poder: ') + d.pw.nameEs, disabled: !g.powerUsable(p, s), why: g.powerUsable(p, s) ? '' : 'no disponible', f: () => act(A('usePower', p, s)) });
  if (g.eff(s).trainerMon) items.push({ t: 'Descartar ' + g.nm(s), f: () => act(A('discardTrainerMon', p, s)) });
  if (s.att.some(c => g.isEvoCard(c))) items.push({ t: 'Descartar forma de Metamorfosis', f: () => act(A('discardShapeshift', p, s)) });
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
  const g = BT.g, p = g.p[ME()]; if (!myTurn()) return;
  const items = [];
  g.attackList(p).forEach(x => items.push({ t: `${x.a.nameEs} ${x.a.dmg ? '— ' + x.a.dmg : ''}`, cost: x.a.cost, disabled: !x.ok, why: x.ok ? '' : x.why, f: () => act(A('attack', p, x.i)) }));
  const cost = g.retreatCost(s);
  items.push({ t: `Retirarse (coste ${cost > 50 ? '—' : cost})`, disabled: !g.canRetreat(p), why: retreatWhy(g, p, s), f: () => { BT.sel = { kind: 'retreat', targets: p.bench.slice() }; render(); toast('Toca el Pokémon de tu Banca que entrará', 1800); } });
  items.push(...benchItems(g, p, s));
  openMenu(document.querySelector(`[data-slot="${s.u}"]`) || anchor, items);
}
// ---- arrastrar y soltar ----
function startDrag(ev, c, btn) {
  if (TOUCH || ev.pointerType === 'touch' || !myTurn() || BT.ask || ev.button !== 0) return;
  const g = BT.g, p = g.p[ME()];
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
    if (sl && g.isEvoCard(c) && g.canEvolve(p, c, sl)) return act(A('evolve', p, c, sl));
    if (sl && g.isEnergy(c) && g.canAttach(p, c, sl)) return act(A('attach', p, c, sl));
    const inBoard = t && t.closest('.half.me');
    if (inBoard && g.canPlayBasic(p, c)) return act(A('playBasic', p, c));
    if (t && t.closest('#board') && g.isTrainer(c) && !g.isBasicCard(c) && g.canPlayTrainer(p, c)) return act(A('playTrainer', p, c));
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

// ================= EN LÍNEA: combate entre amigos e intercambio =================
// La partida corre en los DOS equipos a la vez (misma semilla y mismos mazos): sólo viajan
// las decisiones de cada jugador (acciones y respuestas). Así no hay servidor de juego.
function enc(v) {
  if (v == null) return null;
  if (Array.isArray(v)) return v.map(enc);
  if (typeof v === 'object') { if (v.hand && v.deck) return { p: v.i }; if (v.cards && v.energy) return { s: v.u }; if (v.d && v.u != null) return { c: v.u }; return null; }
  return v;
}
function dec(v) {
  if (v == null) return null;
  if (Array.isArray(v)) return v.map(dec);
  if (typeof v === 'object') { const g = BT.g; if ('p' in v) return g.p[v.p] || null; if ('s' in v) return g.allSlots().find(s => s.u === v.s) || null; if ('c' in v) return findCard(g, v.c); return null; }
  return v;
}
function findCard(g, u) {
  const pools = []; for (const p of g.p) pools.push(p.deck, p.hand, p.discard, p.prizes, p.setAside || []);
  for (const s of g.allSlots()) pools.push(s.cards, s.energy, s.att); if (g.stadium) pools.push([g.stadium]);
  for (const a of pools) for (const c of a) if (c.u === u) return c;
  return null;
}
const NET = { link: null, rel: null, code: '', role: '', peer: '', status: '', kind: '', trade: null, duel: null, lastRx: 0, gen: 0 };
function netSend(t, d) { if (NET.rel) NET.rel.send(t, d); }
// capa fiable sobre un canal que puede perder mensajes: numera, reordena y pide reenvío
function mkReliable(raw, onMsg) {
  const out = []; let seqOut = 0, seqIn = 0, lastNack = 0; const buf = {};
  const nack = () => { const now = Date.now(); if (now - lastNack < 600) return; lastNack = now; raw({ t: '_nack', d: seqIn + 1 }); };
  const hb = setInterval(() => raw({ t: '_hb', d: seqOut }), 1500);
  return {
    send(t, d) { const m = { q: ++seqOut, t, d }; out.push(m); raw(m); },
    recv(m) {
      if (!m || typeof m !== 'object') return; NET.lastRx = Date.now();
      if (m.t === '_nack') { for (const x of out.filter(x => x.q >= m.d).slice(0, 25)) raw(x); return; }
      if (m.t === '_hb') { if (m.d > seqIn) nack(); return; }
      if (!(m.q > seqIn)) return; buf[m.q] = m;
      while (buf[seqIn + 1]) { const x = buf[++seqIn]; delete buf[seqIn]; try { onMsg(x.t, x.d); } catch (e) { console.error(e); } }
      if (Object.keys(buf).length) nack();
    },
    stop() { clearInterval(hb); },
  };
}
// --- transportes: sala de Claude (artefacto), PeerJS/WebRTC (app del celular) o BroadcastChannel (pruebas) ---
async function openRoomT(room, code, onRaw) {
  const r = await room.join('lk-' + code.toLowerCase());
  let partner = null;
  r.on('m', msg => { if (msg.sameTab) return; if (!partner) partner = msg.peer; if (msg.peer !== partner) return; onRaw(msg.data); });
  r.onPeers(ch => { if (partner && ch.left.some(p => p.peer === partner)) netLost('El rival salió de la sala.'); });
  return { kind: 'Sala de Claude', send: d => r.emit('m', d).catch(() => {}), close: () => r.leave().catch(() => {}) };
}
function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('no se pudo cargar ' + src)); document.head.append(s); }); }
async function openPeerT(code, role, onRaw) {
  if (!window.Peer) await loadScript('https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js');
  const id = 'ligakanto-tcg-' + code.toLowerCase();
  return new Promise((res, rej) => {
    const peer = role === 'host' ? new window.Peer(id) : new window.Peer();
    let conn = null; let done = false;
    const api = { kind: 'Conexión directa (WebRTC)', send: d => { if (conn && conn.open) conn.send(d); }, close: () => { try { peer.destroy(); } catch (e) {} } };
    const wire = c => { conn = c; c.on('data', d => onRaw(d)); c.on('close', () => netLost('El rival se desconectó.')); };
    peer.on('error', e => { const msg = e.type === 'unavailable-id' ? 'Ese código ya está en uso, crea otro.' : e.type === 'peer-unavailable' ? 'No existe una sala con ese código (¿el anfitrión la tiene abierta?).' : (e.message || e.type); if (!done) { done = true; rej(new Error(msg)); } else toast(msg); });
    if (role === 'host') { peer.on('open', () => { done = true; res(api); }); peer.on('connection', c => { if (conn) return c.close(); c.on('open', () => wire(c)); }); }
    else peer.on('open', () => { const c = peer.connect(id, { reliable: true }); c.on('open', () => { wire(c); done = true; res(api); }); });
    setTimeout(() => { if (!done) { done = true; rej(new Error('Tiempo de espera agotado.')); } }, 20000);
  });
}
function openBCT(code, onRaw) {
  const me = Math.random().toString(36).slice(2); const bc = new BroadcastChannel('lk-' + code);
  bc.onmessage = e => { if (e.data && e.data.from !== me) onRaw(e.data.m); };
  return { kind: 'Pestañas locales', send: d => bc.postMessage({ from: me, m: d }), close: () => bc.close() };
}
async function netOpen(code, role) {
  netClose(true);
  NET.code = code; NET.role = role; NET.peer = ''; NET.status = role === 'host' ? 'Creando sala…' : 'Conectando…'; refreshOnline();
  const onRaw = m => { if (NET.rel) NET.rel.recv(m); };
  let tr = null;
  try {
    const forced = new URLSearchParams(location.search).get('net');
    if (forced === 'bc') tr = openBCT(code, onRaw);
    else { const room = !forced && window.claude && window.claude.use ? await window.claude.use('room') : null; tr = room ? await openRoomT(room, code, onRaw) : await openPeerT(code, role, onRaw); }
  } catch (e) { NET.status = 'No se pudo conectar: ' + (e.message || e); NET.code = ''; refreshOnline(); return; }
  NET.link = tr; NET.kind = tr.kind; NET.lastRx = Date.now();
  NET.rel = mkReliable(m => tr.send(m), netOnMsg);
  NET.status = role === 'host' ? 'Sala creada. Comparte el código con tu amigo y espera a que se una.' : 'Conectando con el anfitrión…';
  netSend('hello', { name: S.name, v: APP_VERSION, era: ERA });
  refreshOnline();
}
function netClose(silent) {
  if (NET.link && !silent) netSend('bye', {});
  if (NET.rel) NET.rel.stop(); if (NET.link) setTimeout(((l) => () => l.close())(NET.link), 300);
  Object.assign(NET, { link: null, rel: null, peer: '', trade: null, duel: null, code: '', status: '' });
}
function netLost(msg) { if (!NET.link) return; toast(msg, 4000); NET.status = msg; NET.peer = ''; NET.trade = null; refreshOnline(); }
function refreshOnline() { if (!S) return; if (!$('#hubscreen').hidden) { renderTop(); if (curView === 'online') renderView(); } }
setInterval(() => { if (NET.link && NET.peer && Date.now() - NET.lastRx > 12000) { if (BT.online) showClaimWin(); else if (NET.peer) netLost('Se perdió la conexión con el rival.'); } }, 4000);
// --- cola de mensajes de la partida ---
const GQ = []; let GW = null;
function gReset() { NET.gen++; GQ.length = 0; if (GW) { const w = GW; GW = null; w.rej(new P.GameOver(-1)); } }
function nextG() { if (GQ.length) return Promise.resolve(GQ.shift()); return new Promise((res, rej) => { GW = { res, rej }; }); }
function gPush(m) { if (GW) { const w = GW; GW = null; w.res(m); } else GQ.push(m); }
async function remoteAsk(g, req) {
  const m = await nextG();
  if (!m || m.k !== 'ans') { desync(); throw new P.GameOver(-1); }
  const v = dec(m.v);
  // validación mínima: la respuesta debe ser una de las opciones ofrecidas
  if (req.kind === 'slot' && v && !req.options.includes(v)) { desync(); throw new P.GameOver(-1); }
  if ((req.kind === 'cards' || req.kind === 'order') && Array.isArray(v) && v.some(c => !c || !req.cards.includes(c))) { desync(); throw new P.GameOver(-1); }
  return v;
}
const REMOTE_ACTS = ['playBasic', 'evolve', 'attach', 'playTrainer', 'retreat', 'attack', 'usePower', 'useStadium', 'discardTrainerMon', 'discardShapeshift'];
async function remoteTurn(g, p) {
  render();
  while (g.winner == null) { // el turno remoto termina sólo con su mensaje 'end' (aunque el motor ya marque turnOver tras atacar)
    const m = await nextG();
    if (!m || m.k !== 'act') { desync(); throw new P.GameOver(-1); }
    const [name, ...args] = m.a;
    if (name === 'end') { p.turnOver = true; break; }
    if (!REMOTE_ACTS.includes(name)) { desync(); throw new P.GameOver(-1); }
    BT.busy = true;
    try { await g[name](...args.map(dec)); } catch (e) { if (e instanceof P.GameOver) { p.turnOver = true; } else console.error(e); }
    BT.busy = false; render();
  }
  p.forceEnd = false;
}
function desync() { if (!BT.online) return; toast('La partida se desincronizó: se cancela sin resultado.', 5000); finishOnline(null, 'desincronización'); }
// --- combate ---
function validRemoteDeck(d) { return Array.isArray(d) && d.length === 60 && d.every(id => typeof id === 'string' && DB[id] && (DB[id].era === 'mega') === MEGA) && !P.Decks.validate(d).length; }
function challenge() {
  const d = S.decks[S.activeDeck]; if (!d || P.Decks.validate(d.cards).length) return toast('Tu mazo activo no es válido: revísalo en "Mazos".');
  gReset(); const seed = Math.floor(Math.random() * 2 ** 31);
  NET.duel = { seed, deck: d.cards.slice(), coin: S.coin || 0 };
  netSend('duelReq', { seed, deck: NET.duel.deck, coin: NET.duel.coin, name: S.name });
  toast(`Desafío enviado a ${NET.peer}…`); refreshOnline();
}
function onDuelReq(d) {
  if (BT.online || !validRemoteDeck(d.deck)) { netSend('duelNo', { why: BT.online ? 'ocupado' : 'mazo no válido' }); return; }
  const sel = el('select', { 'aria-label': 'Tu mazo' }, ...S.decks.map((x, i) => el('option', { value: i, selected: i === S.activeDeck ? true : null }, x.name + (P.Decks.validate(x.cards).length ? ' (no válido)' : ''))));
  showModal('¡Desafío!', el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, el('div', {}, el('b', {}, NET.peer || 'Tu amigo'), ' te desafía a un combate amistoso.'), el('label', {}, 'Tu mazo: ', sel)), [
    { t: 'Rechazar', f: () => netSend('duelNo', { why: 'rechazado' }) },
    { t: '¡Aceptar!', cls: 'primary', f: () => { const mine = S.decks[+sel.value]; if (!mine || P.Decks.validate(mine.cards).length) { toast('Ese mazo no es válido.'); netSend('duelNo', { why: 'mazo no válido' }); return; }
      S.activeDeck = +sel.value; save(); gReset(); const coin = S.coin || 0;
      netSend('duelOk', { deck: mine.cards.slice(), coin });
      startOnline({ seed: d.seed >>> 0, decks: [d.deck, mine.cards.slice()], names: [String(d.name || 'Rival').slice(0, 24), S.name], coins: [+d.coin || 0, coin], me: 1 }); } }]);
}
function startOnline(o) {
  document.querySelectorAll('.modal-bg').forEach(m => m.remove());
  for (const s of document.querySelectorAll('.screen')) s.hidden = true;
  $('#battle').hidden = false; $('#log').innerHTML = ''; const cw = $('#claimwin'); if (cw) cw.remove();
  BT.spec = { kind: 'online', opp: { name: o.names[1 - o.me], portrait: 'base1-88' } }; BT.sel = null; BT.ask = null; BT.me = o.me; BT.online = true; BT.resolveTurn = null; BT.busy = false;
  const gen = NET.gen;
  const g = new P.Game({ modern: MEGA, rng: P.mkRng(o.seed), uidBase: 1, ai: P.AI, players: [0, 1].map(i => ({ name: o.names[i], deck: o.decks[i].slice(), coin: Math.min(COIN_COUNT - 1, Math.max(0, o.coins[i] | 0)) })), io: IO });
  g.p[1 - o.me].remote = true; g.portrait = 'base1-88';
  BT.g = g; render();
  g.run().then(w => { if (BT.g === g && NET.gen === gen) finishOnline(w); }).catch(e => { if (!(e instanceof P.GameOver)) { console.error(e); toast('Error en la partida: ' + e.message, 5000); } });
}
function confirmResign() { showModal('¿Rendirte?', el('div', {}, 'Tu rival ganará el combate.'), [{ t: 'Seguir jugando' }, { t: 'Rendirme', cls: 'primary', f: () => { netSend('resign', {}); finishOnline(1 - ME(), 'rendición'); } }]); }
function showClaimWin() { if (!BT.online || $('#claimwin')) return; const b = el('button', { id: 'claimwin', class: 'primary', style: 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:90', onclick: () => finishOnline(ME(), 'el rival se desconectó') }, '⚠ El rival no responde · Reclamar victoria'); document.body.append(b); }
function finishOnline(w, why) {
  if (!BT.online) return; BT.online = false; gReset(); const cw = $('#claimwin'); if (cw) cw.remove();
  document.querySelectorAll('.modal-bg').forEach(m => m.remove()); const lay = $('#coinlayer'); if (lay) lay.remove();
  const win = w === ME(); const money = w == null ? 0 : win ? 300 : 80;
  S.online = S.online || { w: 0, l: 0 }; if (w != null) { if (win) S.online.w++; else S.online.l++; } S.money += money; save();
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center;min-width:min(420px,80vw)' },
    el('div', { style: 'font-weight:700' }, w == null ? 'Partida cancelada' : win ? `¡Venciste a ${BT.spec.opp.name}!` : `${BT.spec.opp.name} ganó el combate.`), why ? el('div', { class: 'muted' }, `(${why})`) : null, el('div', {}, `+ ₽${money}`), el('div', { class: 'muted' }, `Récord en línea: ${S.online.w} victorias · ${S.online.l} derrotas`));
  showModal(w == null ? 'Combate en línea' : win ? '¡Victoria!' : 'Derrota', body, [{ t: 'Volver', cls: 'primary', f: () => { BT.g = null; BT.me = 0; showHub('online'); } }]);
}
// --- intercambio: misma cantidad de cartas de cada rareza en las dos ofertas ---
const RAR_ES = { C: 'Común', U: 'Infrecuente', R: 'Rara', RH: 'Rara Holo', SH: 'Brillante', S: 'Secreta / Cristal', E: 'Energía especial' };
function spare(id) { const used = Math.max(0, ...S.decks.map(d => d.cards.filter(x => x === id).length)); return (S.coll[id] || 0) - used; }
const rarCount = ids => { const m = {}; for (const id of ids) { const r = DB[id].rar; m[r] = (m[r] || 0) + 1; } return m; };
const sameRar = (a, b) => { const x = rarCount(a), y = rarCount(b); const ks = new Set([...Object.keys(x), ...Object.keys(y)]); return [...ks].every(k => x[k] === y[k]); };
const offerKey = ids => ids.slice().sort().join(',');
function tradeOk() { const T = NET.trade; return T && T.mine.length > 0 && T.theirs.length > 0 && sameRar(T.mine, T.theirs) && T.mine.every(id => T.mine.filter(x => x === id).length <= spare(id)); }
function openTrade(remote) { if (!NET.trade) NET.trade = { mine: [], theirs: [], myAcc: null, theirAcc: null }; if (!remote) netSend('tradeOpen', {}); refreshOnline(); }
function sendOffer() { const T = NET.trade; T.myAcc = null; T.theirAcc = null; netSend('offer', { cards: T.mine }); if (T.ui) T.ui(); }
function acceptTrade() { const T = NET.trade; if (!tradeOk()) return; T.myAcc = offerKey(T.mine) + '|' + offerKey(T.theirs); netSend('accept', { h: T.myAcc }); tryCommit(); if (T.ui) T.ui(); }
function tryCommit() {
  const T = NET.trade; if (!T || !T.myAcc || !T.theirAcc) return;
  if (T.myAcc !== offerKey(T.mine) + '|' + offerKey(T.theirs) || T.theirAcc !== offerKey(T.theirs) + '|' + offerKey(T.mine) || !tradeOk()) return;
  for (const id of T.mine) { S.coll[id]--; if (S.coll[id] <= 0) delete S.coll[id]; }
  const got = T.theirs.slice(); const fresh = addCards(got); save();
  T.mine = []; T.theirs = []; T.myAcc = null; T.theirAcc = null;
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px;align-items:center' }, el('div', {}, `Recibiste ${got.length} carta(s) de ${NET.peer}:`), el('div', { class: 'cards', style: 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center' }, ...got.map(id => { const c = cardEl(id); if (fresh.has(id)) c.append(newTag()); return c; })));
  showModal('¡Intercambio completado!', body, [{ t: 'Genial', cls: 'primary' }]); refreshOnline();
}
function tradePanel() {
  const T = NET.trade;
  const box = el('div', { class: 'panel' });
  box.append(el('h2', { class: 'cond', style: 'color:var(--gold);font-size:22px' }, `Intercambio con ${NET.peer}`), el('p', { class: 'muted', style: 'margin:4px 0 10px;font-size:13px' }, 'Regla: las dos ofertas deben tener la misma cantidad de cartas de cada rareza (por ejemplo, 2 comunes y 1 holo por 2 comunes y 1 holo). Sólo puedes ofrecer copias que no estén en tus mazos.'));
  const cols = el('div', { class: 'tradecols' });
  const mineBox = el('div', { class: 'tradebox' }), theirBox = el('div', { class: 'tradebox' });
  const summary = el('div', { class: 'tradesum' }); const btns = el('div', { class: 'row', style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px' });
  const offerRow = (ids, mine) => { const r = el('div', { class: 'offer' }); if (!ids.length) r.append(el('div', { class: 'muted' }, mine ? 'Elige cartas abajo para ofrecer.' : 'Tu amigo aún no ofrece nada.'));
    ids.forEach((id, i) => { const c = cardEl(id); c.append(el('span', { class: 'rar' }, RSYM[DB[id].rar] || '')); if (mine) { c.title = 'Quitar'; c.style.cursor = 'pointer'; c.onclick = () => { T.mine.splice(i, 1); sendOffer(); }; } r.append(c); }); return r; };
  const rarLine = ids => Object.entries(rarCount(ids)).map(([r, n]) => `${n} ${RAR_ES[r] || r}`).join(' · ') || '—';
  T.ui = () => {
    mineBox.innerHTML = ''; theirBox.innerHTML = '';
    mineBox.append(el('b', {}, `Tú ofreces (${T.mine.length})`), offerRow(T.mine, true), el('div', { class: 'muted', style: 'font-size:12.5px' }, rarLine(T.mine)));
    theirBox.append(el('b', {}, `${NET.peer} ofrece (${T.theirs.length})`), offerRow(T.theirs, false), el('div', { class: 'muted', style: 'font-size:12.5px' }, rarLine(T.theirs)));
    const ok = tradeOk(); summary.className = 'tradesum ' + (ok ? 'good' : 'bad');
    summary.textContent = !T.mine.length || !T.theirs.length ? 'Las dos partes deben ofrecer algo.' : ok ? (T.theirAcc && T.theirAcc === offerKey(T.theirs) + '|' + offerKey(T.mine) ? `✔ Rarezas equivalentes · ${NET.peer} ya aceptó` : '✔ Rarezas equivalentes') : '✘ Las rarezas no coinciden';
    btns.innerHTML = '';
    btns.append(el('button', { class: 'primary', disabled: !ok || T.myAcc ? true : null, onclick: acceptTrade }, T.myAcc ? 'Aceptado · esperando…' : 'Aceptar intercambio'), el('button', { onclick: () => { T.mine = []; sendOffer(); } }, 'Vaciar mi oferta'), el('button', { onclick: () => { netSend('tradeClose', {}); NET.trade = null; refreshOnline(); } }, 'Cerrar intercambio'));
    drawPick();
  };
  cols.append(mineBox, theirBox);
  const grid = el('div', { class: 'grid', style: 'max-height:46vh;overflow:auto' });
  const drawPick = () => { grid.innerHTML = ''; for (const d of filtered(true)) { if (d.st === 'E' && d.basic) continue; const left = spare(d.id) - T.mine.filter(x => x === d.id).length; if (left <= 0) continue; const c = cardEl(d.id); c.append(el('span', { class: 'cnt' }, '×' + left), el('span', { class: 'rar' }, RSYM[d.rar] || '')); c.style.cursor = 'pointer'; c.title = 'Añadir a tu oferta'; c.onclick = () => { if (T.mine.length >= 30) return toast('Máximo 30 cartas por intercambio.'); T.mine.push(d.id); sendOffer(); }; grid.append(c); } if (!grid.children.length) grid.append(el('div', { class: 'muted' }, 'No tienes copias libres con estos filtros.')); };
  box.append(cols, summary, btns, el('h3', { style: 'margin:14px 0 6px' }, 'Tus cartas disponibles para ofrecer'), filterBar(drawPick, false), grid);
  T.ui(); return box;
}
function onOffer(d) {
  if (!NET.trade) openTrade(true);
  const ids = Array.isArray(d.cards) ? d.cards.filter(id => typeof id === 'string' && DB[id] && (DB[id].era === 'mega') === MEGA && !(DB[id].st === 'E' && DB[id].basic)).slice(0, 30) : [];
  const T = NET.trade; T.theirs = ids; T.myAcc = null; T.theirAcc = null; if (T.ui && curView === 'online') T.ui(); else refreshOnline();
}
function netOnMsg(t, d) {
  d = d || {};
  if ((t === 'hello' || t === 'hello2') && d.era && d.era !== ERA) toast(`Tu amigo está jugando la era ${d.era === 'mega' ? 'Mega' : 'WOTC'}: deben estar en la misma era para combatir o intercambiar.`, 6000);
  if (t === 'hello') { const first = !NET.peer; NET.peer = String(d.name || 'Rival').slice(0, 24) || 'Rival'; NET.status = 'Conectado'; if (first) { toast(`Conectado con ${NET.peer}`); netSend('hello2', { name: S.name, era: ERA }); } if (d.v && d.v !== APP_VERSION) toast('Aviso: tu amigo usa otra versión del juego (' + d.v + '). Actualicen ambos para evitar errores.', 5000); refreshOnline(); return; }
  if (t === 'hello2') { if (!NET.peer) { NET.peer = String(d.name || 'Rival').slice(0, 24); NET.status = 'Conectado'; toast(`Conectado con ${NET.peer}`); refreshOnline(); } return; }
  if (t === 'g') { if (BT.online) gPush(d); return; }
  if (t === 'duelReq') return onDuelReq(d);
  if (t === 'duelOk') { const du = NET.duel; if (!du || BT.online || !validRemoteDeck(d.deck)) return; NET.duel = null; startOnline({ seed: du.seed, decks: [du.deck, d.deck], names: [S.name, NET.peer], coins: [du.coin, +d.coin || 0], me: 0 }); return; }
  if (t === 'duelNo') { NET.duel = null; toast(`${NET.peer} no aceptó el combate (${String(d.why || '').slice(0, 30)}).`); refreshOnline(); return; }
  if (t === 'resign') { if (BT.online) finishOnline(ME(), 'el rival se rindió'); return; }
  if (t === 'tradeOpen') { openTrade(true); toast(`${NET.peer} abrió un intercambio (pestaña En línea).`); return; }
  if (t === 'offer') return onOffer(d);
  if (t === 'accept') { if (NET.trade) { NET.trade.theirAcc = String(d.h || ''); tryCommit(); if (NET.trade && NET.trade.ui) NET.trade.ui(); } return; }
  if (t === 'tradeClose') { if (NET.trade) { NET.trade = null; toast(`${NET.peer} cerró el intercambio.`); refreshOnline(); } return; }
  if (t === 'bye') { if (BT.online) finishOnline(ME(), 'el rival abandonó'); netLost(`${NET.peer || 'El rival'} se desconectó.`); return; }
}
function viewOnline(v) {
  const wrap = el('div', { style: 'max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:14px' });
  const conn = el('div', { class: 'panel' }, el('h2', { class: 'cond', style: 'color:var(--gold);font-size:24px' }, 'Jugar en línea'),
    el('p', { class: 'muted', style: 'font-size:13.5px;margin:6px 0 10px' }, 'Combate amistoso contra un amigo con tu propio mazo, o intercambia cartas con él. Uno crea la sala y le pasa el código; el otro lo escribe en «Unirse». Ambos deben usar la misma versión: los dos en la app del celular, o los dos en el enlace de Claude.'));
  if (!NET.link && !NET.code) {
    const inp = el('input', { placeholder: 'Código (ej. K7Q2M)', maxlength: 8, 'aria-label': 'Código de sala', style: 'text-transform:uppercase;width:150px' });
    conn.append(el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;align-items:center' },
      el('button', { class: 'primary', onclick: () => { const A2 = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 5; i++) c += A2[Math.floor(Math.random() * A2.length)]; netOpen(c, 'host'); } }, 'Crear sala'),
      el('span', { class: 'muted' }, 'o'), inp, el('button', { onclick: () => { const c = inp.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length < 4) return toast('Escribe el código que te pasó tu amigo.'); netOpen(c, 'guest'); } }, 'Unirse')));
    if (NET.status) conn.append(el('div', { class: 'bad', style: 'margin-top:8px' }, NET.status));
  } else {
    conn.append(el('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;align-items:center' },
      el('span', {}, 'Código de sala: ', el('b', { class: 'roomcode' }, NET.code)),
      NET.code ? el('button', { onclick: () => { try { navigator.clipboard.writeText(NET.code); toast('Código copiado'); } catch (e) {} } }, 'Copiar') : null,
      el('span', { class: NET.peer ? 'good' : 'muted' }, NET.peer ? `● Conectado con ${NET.peer}` : '○ ' + NET.status),
      NET.kind ? el('span', { class: 'muted', style: 'font-size:12px' }, NET.kind) : null,
      el('button', { onclick: () => { netClose(); refreshOnline(); } }, 'Salir de la sala')));
  }
  wrap.append(conn);
  if (NET.link && NET.peer) {
    const deckSel = el('select', { 'aria-label': 'Mazo', onchange: () => { S.activeDeck = +deckSel.value; save(); } }, ...S.decks.map((d, i) => el('option', { value: i, selected: i === S.activeDeck ? true : null }, d.name + (P.Decks.validate(d.cards).length ? ' (no válido)' : ''))));
    wrap.append(el('div', { class: 'panel' }, el('h2', { class: 'cond', style: 'color:var(--gold);font-size:22px' }, '⚔️ Combate amistoso'),
      el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:8px' }, el('label', {}, 'Tu mazo: ', deckSel),
        el('button', { class: 'primary', disabled: NET.duel ? true : null, onclick: challenge }, NET.duel ? 'Esperando respuesta…' : `Desafiar a ${NET.peer}`)),
      el('p', { class: 'muted', style: 'font-size:12.5px;margin:8px 0 0' }, `Ganar da ₽300 y perder ₽80. Récord: ${(S.online || { w: 0 }).w} victorias · ${(S.online || { l: 0 }).l} derrotas.`)));
    if (NET.trade) wrap.append(tradePanel());
    else wrap.append(el('div', { class: 'panel' }, el('h2', { class: 'cond', style: 'color:var(--gold);font-size:22px' }, '🔄 Intercambio de cartas'), el('p', { class: 'muted', style: 'font-size:13px' }, 'Sólo se cambian cartas de la misma rareza: ambas ofertas deben tener las mismas cantidades por rareza.'), el('button', { class: 'primary', onclick: () => openTrade(false) }, 'Abrir intercambio')));
  }
  v.append(wrap);
}

// ================= FIN DE COMBATE =================
function endBattle(w) {
  const spec = BT.spec, opp = spec.opp; const win = w === 0;
  const rewards = []; let money = 0; const packs = {};
  const firstTime = !S.beaten[opp.key];
  if (win) {
    S.stats.wins++; S.beaten[opp.key] = (S.beaten[opp.key] || 0) + 1;
    const reg = spec.kind === 'elite' ? C.REGIONS.johto : regionOf(spec.gym || spec.t);
    const unlocked = C.SETS.filter(s => !setLocked(s) && (s.region || 'kanto') === reg.id).map(s => s.id);
    const gi = spec.gym ? reg.GYMS.indexOf(spec.gym) : -1;
    const gymSet = spec.gym ? reg.gymSets[gi] : null;
    if (spec.kind === 'rocket') {
      const rs = reg.rocketSet;
      money = firstTime ? 80 * opp.level + (spec.t.boss ? 1200 : 0) : 35 * opp.level; if (firstTime) packs[rs] = spec.t.boss ? 4 : (opp.level >= 4 ? 2 : 1);
      if (firstTime && spec.t.boss) rewards.push({ txt: reg.rocketEnd });
      else if (firstTime) { const nx = reg.ROCKET[reg.ROCKET.indexOf(spec.t) + 1]; if (nx) rewards.push({ txt: `El Team Rocket huye hacia ${nx.place}...` }); }
    }
    else if (spec.kind === 'elite') {
      const e = spec.t; money = firstTime ? (e.boss ? 3000 : 700) : 300; const s = unlocked[Math.floor(Math.random() * unlocked.length)] || 'neo1'; packs[s] = firstTime ? (e.boss ? 0 : 2) : 1;
      if (e.boss) { packs.neo4 = (packs.neo4 || 0) + (S.championJ ? 2 : 5); if (!S.championJ) rewards.push({ txt: '👑 ¡Eres el nuevo Campeón de Johto! Dicen que alguien te espera en el Monte Plateado...' }); S.championJ = true; }
      else if (firstTime) { const nx = C.JELITE[C.JELITE.indexOf(e) + 1]; if (nx) rewards.push({ txt: `Siguiente: ${nx.name}` }); }
    }
    else if (spec.kind === 'route') { money = firstTime ? 60 + 50 * opp.level + (spec.t.boss ? 1500 : 0) : 30 + 30 * opp.level; if (firstTime) { const s = unlocked[Math.floor(Math.random() * unlocked.length)] || reg.fallbackSet; packs[s] = spec.t.boss ? 4 : 1; } if (firstTime && spec.t.boss) rewards.push({ txt: spec.t.id === 'jsilver' ? 'Rojo asiente en silencio y desaparece en la nieve...' : spec.t.id === 'o_law' ? 'Lawrence III huye en su nave... ¡las aves legendarias están a salvo!' : '¡Victoria legendaria!' }); }
    else if (spec.kind === 'gymTrainer') { money = firstTime ? 90 * opp.level : 40 * opp.level; if (firstTime) packs[gymSet] = 1; }
    else if (spec.kind === 'leader') {
      const g = spec.gym; const B = badgesOf(reg); money = B.includes(g.id) ? 250 : reg.leaderMoney; packs[gymSet] = B.includes(g.id) ? 1 : 3;
      if (!B.includes(g.id)) { B.push(g.id); rewards.push({ badge: g.badge, txt: `¡Obtuviste la ${g.badgeEs}!` }); if (B.length === reg.GYMS.length && reg.nextMsg) rewards.push({ txt: reg.nextMsg }); const ns = C.SETS.find(s => (s.region || 'kanto') === reg.id && s.unlock === B.length); if (ns) rewards.push({ txt: `Nuevo set en la tienda: ${ns.name}` }); }
    } else if (reg.id === 'orange') { const ck = reg.champKey; money = S[ck] ? 800 : 3500; packs[reg.leaguePack] = S[ck] ? 2 : 5; if (!S[ck]) rewards.push({ txt: reg.champMsg }); S[ck] = true; }
    else { money = S.champion ? 600 : 2000; packs.base5 = S.champion ? 2 : 5; if (!S.champion) rewards.push({ txt: '👑 ¡Eres el nuevo Campeón de la Liga Pokémon de Kanto!' }); S.champion = true; }
    if (spec.kind === 'leader' || spec.kind === 'league' || (spec.kind === 'elite' && firstTime) || (spec.t && spec.t.boss && firstTime) || Math.random() < 0.35) { const locked = []; for (let i = 0; i < COIN_COUNT; i++) if (!S.coins.includes(i)) locked.push(i); if (locked.length) { const c = locked[Math.floor(Math.random() * locked.length)]; S.coins.push(c); rewards.push({ coin: c, txt: '¡Nueva moneda desbloqueada!' }); } }
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
  let picked = false; try { picked = sessionStorage.getItem('ptcg_era_ok') === '1'; } catch (e) { picked = true; }
  if (!picked && !new URLSearchParams(location.search).get('era') && !new URLSearchParams(location.search).get('net')) return showEraPick();
  const ls = lsGet();
  if (ls && ls.name) { S = Object.assign(defaultSave(), ls); showHub(); } else showTitle();
  initCloud();
};
start();
window.__PTCG_UI = { BT, get S() { return S; } };
})();
