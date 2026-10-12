// ============ GENERADOR DE MAZOS ============
(function (root) {
const P = root.PTCG;
const byName = () => { if (P._byName) return P._byName; const m = {}; for (const d of P.CARDS) (m[d.name] = m[d.name] || []).push(d); return (P._byName = m); };
const ENERGY_ID = { G: 'base1-99', R: 'base1-98', W: 'base1-102', L: 'base1-100', P: 'base1-101', F: 'base1-97' };
// líneas evolutivas
function lines(pool) {
  const ls = [];
  const basics = pool.filter(d => d.st === 'P' && d.stage === 0);
  for (const b of basics) {
    const s1 = pool.filter(d => d.st === 'P' && d.stage === 1 && d.from === b.name);
    const line = { basic: b, s1, s2: [] };
    for (const m of s1) line.s2.push(...pool.filter(d => d.st === 'P' && d.stage === 2 && d.from === m.name));
    ls.push(line);
  }
  return ls;
}
function power(d) { // fuerza aproximada de una carta
  if (d.st !== 'P') return 0;
  let best = 0; for (const a of d.atk) { const dm = parseInt(a.dmg) || 0; best = Math.max(best, dm / Math.max(1, a.cost.length) + dm / 6 + (a.fx != null ? 4 : 0)); }
  return best + d.hp / 12 + (d.pw ? 6 : 0) + ({ RH: 6, R: 3, U: 1, C: 0 }[d.rar] || 0);
}
// cfg: {types:['W','L'], pool:[defs] o sets, level:1..5, rng, owner:'Misty' (prefiere), trainers:[ids...], size:60}
function genDeck(cfg) {
  const rng = cfg.rng || Math.random;
  const pool = (cfg.pool || P.CARDS).filter(d => !cfg.sets || cfg.sets.includes(d.set));
  const types = cfg.types;
  const lvl = cfg.level || 2;
  const owner = cfg.owner;
  let ls = lines(pool).filter(l => l.basic.types.some(t => types.includes(t)) || (cfg.colorless && l.basic.types.includes('C')));
  if (owner) {
    const own = ls.filter(l => l.basic.name.indexOf(owner) >= 0);
    if (own.length >= 3 || cfg.ownerOnly) ls = own.concat(cfg.ownerOnly ? [] : ls.filter(l => l.basic.name.indexOf(owner) < 0 && !/'s /.test(l.basic.name)).slice(0, 2));
  } else ls = ls.filter(l => !/^(Brock|Misty|Lt\. Surge|Erika|Koga|Sabrina|Blaine|Giovanni|Rocket)'s /.test(l.basic.name) || cfg.allowOwners);
  // puntuar líneas
  const score = l => { const top = [l.basic, ...l.s1, ...l.s2].map(power); const mx = Math.max(...top); const depth = l.s2.length ? 2 : l.s1.length ? 1 : 0; const lvlPref = lvl <= 1 ? -depth * 6 : lvl >= 4 ? depth * 4 : depth; return mx + lvlPref + (owner && l.basic.name.indexOf(owner) >= 0 ? 15 : 0) + rng() * 8; };
  ls.sort((a, b) => score(b) - score(a));
  { const seen = new Set(); ls = ls.filter(l => { if (seen.has(l.basic.name)) return false; seen.add(l.basic.name); return true; }); }
  const deck = [];
  const nameCount = {};
  const add = (d, n) => { for (let k = 0; k < n; k++) { if ((nameCount[d.name] || 0) >= 4) return; nameCount[d.name] = (nameCount[d.name] || 0) + 1; deck.push(d.id); } };
  const nLines = lvl <= 1 ? 4 : lvl <= 3 ? 4 : 3;
  let pokeCount = 0; const target = lvl <= 1 ? 22 : 20;
  for (const l of ls.slice(0, nLines + 2)) {
    if (pokeCount >= target) break;
    const s1 = l.s1.slice().sort((a, b) => power(b) - power(a))[0];
    const s2 = l.s2.length ? l.s2.slice().sort((a, b) => power(b) - power(a))[0] : null;
    const useS2 = s2 && lvl >= 2;
    const nb = useS2 ? 4 : s1 ? 3 : 3;
    add(l.basic, nb); pokeCount += nb;
    if (s1 && (lvl >= 1)) { const n = useS2 ? 3 : 3; add(s1, n); pokeCount += n; }
    if (useS2 && s2.from === s1.name) { const n = lvl >= 4 ? 3 : 2; add(s2, n); pokeCount += n; }
  }
  // trainers
  const T = id => deck.push(id);
  const tr = cfg.trainers || defaultTrainers(lvl, owner, rng);
  for (const id of tr) { const d = P.DB[id]; if (deck.length < 60 - 16 && (nameCount[d.name] || 0) < 4) { nameCount[d.name] = (nameCount[d.name] || 0) + 1; T(id); } }
  // energía
  const need = {}; for (const id of deck) { const d = P.DB[id]; if (d.st === 'P') for (const a of d.atk) for (const c of a.cost) if (c !== 'C') need[c] = (need[c] || 0) + 1; }
  let tot = Object.values(need).reduce((a, b) => a + b, 0) || 1;
  const left = 60 - deck.length;
  const etypes = Object.keys(need).filter(t => ENERGY_ID[t]);
  if (!etypes.length) etypes.push(types[0] in ENERGY_ID ? types[0] : 'F');
  let placed = 0;
  etypes.forEach((t, i) => { const n = i === etypes.length - 1 ? left - placed : Math.round(left * (need[t] || 1) / tot); for (let k = 0; k < n; k++) deck.push(ENERGY_ID[t]); placed += n; });
  while (deck.length < 60) deck.push(ENERGY_ID[etypes[0]]);
  return deck.slice(0, 60);
}
function defaultTrainers(lvl, owner, rng) {
  const t = [];
  const push = (id, n) => { for (let k = 0; k < n; k++) t.push(id); };
  if (lvl <= 1) { push('base1-94', 3); push('base1-91', 2); push('base1-95', 1); push('base1-82', 1); }
  else if (lvl === 2) { push('base1-91', 3); push('base1-94', 2); push('base1-95', 2); push('base1-92', 2); push('base1-84', 2); push('base2-64', 2); }
  else { push('base1-91', 4); push('base1-88', 2); push('base1-93', 2); push('base1-84', 3); push('base1-92', 3); push('base1-79', 1); push('base1-95', 2); push('base1-76', 1); push('base1-71', 1); }
  if (owner === 'Brock') push('gym1-15', 2);
  if (owner === 'Misty') push('gym1-114', 1);
  if (owner === 'Erika') push('gym1-16', 2);
  if (owner === 'Lt. Surge') push('gym1-17', 1);
  if (owner === 'Koga') push('gym2-19', 2);
  if (owner === 'Sabrina') push('gym2-20', 1);
  if (owner === 'Blaine') push('gym2-17', 2);
  if (owner === 'Giovanni') push('gym2-18', 2);
  return t;
}
function validate(deck, coll) {
  const errs = []; if (deck.length !== 60) errs.push(`El mazo tiene ${deck.length} cartas (deben ser 60).`);
  const cnt = {}; for (const id of deck) { const d = P.DB[id]; if (d.st === 'E' && d.basic) continue; cnt[d.name] = (cnt[d.name] || 0) + 1; }
  for (const [n, c] of Object.entries(cnt)) if (c > 4) errs.push(`Más de 4 copias de ${P.DB[deck.find(id => P.DB[id].name === n)].nameEs}.`);
  if (!deck.some(id => P.DB[id].st === 'P' && P.DB[id].stage === 0)) errs.push('Necesitas al menos un Pokémon Básico.');
  return errs;
}
P.Decks = { genDeck, lines, power, validate, ENERGY_ID };
})(typeof window !== 'undefined' ? window : globalThis);
