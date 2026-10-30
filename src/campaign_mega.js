// ============ CAMPAÑA ERA MEGA: lista de entrenadores por niveles ============
(function (root) {
const P = root.PTCG;
const ALL = () => P.CARDS_MEGA;
const DBm = id => P.DB[id];
const ENERGY_ID = { G: 'mee-1', R: 'mee-2', W: 'mee-3', L: 'mee-4', P: 'mee-5', F: 'mee-6', D: 'mee-7', M: 'mee-8' };
const ENERGY_BASIC = Object.values(ENERGY_ID);
const info = id => (P.MEGA_SETINFO || []).find(s => s.id === id) || {};
const SETS = [
  { id: 'me01', name: 'Megaevolución', code: 'MEG', price: 150, tier: 0, era: 'mega', region: 'mega' },
  { id: 'me02', name: 'Fuegos Fantasmales', code: 'PFL', price: 160, tier: 1, era: 'mega', region: 'mega' },
];
// sobre moderno: 4 comunes, 3 infrecuentes, 2 "reversas" (cualquier rareza baja o ilustración) y 1 rara+
const PACKS = {}; for (const s of SETS) PACKS[s.id] = { slots: [{ n: 4 }, { n: 3 }, { n: 2 }] };
const pick = (a, rng) => a[Math.floor(rng() * a.length)];
function openPack(setId, rng) {
  const pool = ALL().filter(d => d.set === setId && d.st !== 'E' || (d.set === setId && d.st === 'E' && !d.basic));
  const by = r => pool.filter(d => d.rar === r);
  const out = [];
  const C = by('C'), U = by('U');
  for (let k = 0; k < 4; k++) out.push(pick(C, rng).id);
  for (let k = 0; k < 3; k++) out.push(pick(U, rng).id);
  for (let k = 0; k < 2; k++) { const x = rng(); const IR = by('IR'); const SIR = by('SIR'); out.push((x < 0.16 && IR.length ? pick(IR, rng) : x < 0.19 && SIR.length ? pick(SIR, rng) : pick(x < 0.6 ? C : x < 0.9 ? U : by('R'), rng)).id); }
  const r = rng(); const MHR = by('MHR'), UR = by('UR'), RR = by('RR'), R = by('R');
  out.push((r < 0.012 && MHR.length ? pick(MHR, rng) : r < 0.08 && UR.length ? pick(UR, rng) : r < 0.33 && RR.length ? pick(RR, rng) : pick(R.length ? R : U, rng)).id);
  return out;
}
// ----- mazos de la IA -----
const official = d => d.num <= (info(d.set).official || 999) || ['me01-166', 'me01-167', 'me01-173', 'me02-102', 'me02-106', 'me02-124'].includes(d.id);
function poolOf(sets) { return ALL().filter(d => sets.includes(d.set) && official(d)); }
function uniqByName(list) { const m = {}; for (const d of list) if (!m[d.name]) m[d.name] = d; return Object.values(m); }
function linesOf(pool) {
  const P1 = uniqByName(pool.filter(d => d.st === 'P'));
  const out = [];
  for (const b of P1.filter(d => d.stage === 0)) {
    const s1 = P1.filter(d => d.stage === 1 && d.from === b.name);
    const s2 = []; for (const m of s1) s2.push(...P1.filter(d => d.stage === 2 && d.from === m.name));
    out.push({ basic: b, s1, s2 });
  }
  return out;
}
function power(d) { let best = 0; for (const a of d.atk) { const dm = parseInt(a.dmg) || 0; best = Math.max(best, dm / Math.max(1, a.cost.length) + dm / 5 + (a.fx ? 6 : 0)); } return best + d.hp / 10 + (d.pw ? 10 : 0) + (d.mega ? 25 : d.ex ? 15 : 0); }
const tid = n => { const d = ALL().find(x => x.name === n && x.st === 'T' && official(x)); return d ? d.id : null; };
// cfg: {types, sets, level 1..5, rng, prefer:[names], megas:true/false}
function genDeck(cfg) {
  const rng = cfg.rng || Math.random, L = cfg.level || 2, types = cfg.types || ['C'];
  const pool = poolOf(cfg.sets || ['me01']);
  const allowEx = L >= 3 || (cfg.prefer || []).some(n => /ex$/.test(n));
  let ls = linesOf(pool).filter(l => [l.basic, ...l.s1, ...l.s2].some(d => d.types.some(t => types.includes(t))) || (cfg.prefer || []).some(n => [l.basic, ...l.s1, ...l.s2].some(d => d.name === n)));
  const top = l => { const c = [l.basic, ...l.s1, ...l.s2].filter(d => allowEx || !d.ex); return c.length ? c.sort((a, b) => power(b) - power(a))[0] : l.basic; };
  const score = l => power(top(l)) + ((cfg.prefer || []).some(n => [l.basic, ...l.s1, ...l.s2].some(d => d.name === n)) ? 80 : 0) + (types.includes(top(l).types[0]) ? 10 : 0) + rng() * 12 - (L <= 2 && l.s2.length ? 15 : 0);
  ls.sort((a, b) => score(b) - score(a));
  const deck = [], nc = {};
  const add = (d, n) => { for (let k = 0; k < n; k++) { if (!d || (nc[d.name] || 0) >= 4 || deck.length >= 60) return; nc[d.name] = (nc[d.name] || 0) + 1; deck.push(d.id); } };
  let poke = 0, nl = 0; const target = L <= 2 ? 18 : 16; let hasS2 = false, hasMega = false;
  for (const l of ls) {
    if (poke >= target || nl >= (L <= 2 ? 4 : 3)) break;
    const s1 = l.s1.filter(d => allowEx || !d.ex).sort((a, b) => power(b) - power(a))[0];
    const s2 = l.s2.filter(d => (allowEx || !d.ex) && s1 && d.from === s1.name).sort((a, b) => power(b) - power(a))[0];
    const exB = allowEx && l.basic.ex;
    if (s2 && L >= 2) { add(l.basic, 4); add(s1, L >= 4 ? 2 : 3); add(s2, 3); poke += L >= 4 ? 9 : 10; hasS2 = true; }
    else if (s1) { add(l.basic, 4); add(s1, 3); poke += 7; }
    else { add(l.basic, exB ? 2 : 3); poke += exB ? 2 : 3; }
    if ([l.basic, s1, s2].some(d => d && d.mega && deck.includes(d.id))) hasMega = true;
    nl++;
  }
  // entrenadores
  const T = [];
  const push = (n, k) => { const id = tid(n); if (id) for (let i = 0; i < k; i++) T.push(id); };
  if (L <= 1) { push("Lillie's Determination", 2); push('Pokémon Center Lady', 2); push('Switch', 2); push('Energy Switch', 1); push('Jumbo Ice Cream', 1); }
  else if (L === 2) { push("Lillie's Determination", 3); push('Ultra Ball', 2); push('Pokémon Center Lady', 1); push('Switch', 2); push("Boss's Orders", 1); push('Buddy-Buddy Poffin', 2); push('Night Stretcher', 1); }
  else { push("Lillie's Determination", 4); push('Dawn', 2); push("Boss's Orders", 2); push('Ultra Ball', 4); push('Buddy-Buddy Poffin', 2); push('Switch', 2); push('Night Stretcher', 2); push("Lt. Surge's Bargain", L >= 5 ? 1 : 0); push('Energy Switch', 1); }
  if (hasS2) push('Rare Candy', L >= 4 ? 4 : L >= 2 ? 3 : 2);
  if (hasMega && L >= 2) push('Mega Signal', 2);
  if (hasMega && L >= 4) push("Wally's Compassion", 1);
  const t0 = types[0];
  if (t0 === 'R' && L >= 2) push('Firebreather', 1);
  if (t0 === 'F' && L >= 2) { push('Fighting Gong', 2); push('Premium Power Pro', L >= 4 ? 2 : 0); }
  if (t0 === 'P' && L >= 2) { push('Wondrous Patch', 2); push('Mystery Garden', 1); }
  if (t0 === 'G' && L >= 2) push('Forest of Vitality', 2);
  if (t0 === 'W' && L >= 2) push('Surfing Beach', 1);
  if (t0 === 'D' && L >= 3) { push('Punk Helmet', 2); push('Risky Ruins', 1); }
  if (t0 === 'M' && L >= 2) push('Iron Defender', 2);
  if (L >= 3) push('Air Balloon', 1);
  const eLeft = L <= 1 ? 18 : 14;
  for (const id of T) { const d = DBm(id); if (deck.length < 60 - eLeft && (nc[d.name] || 0) < 4) { nc[d.name] = (nc[d.name] || 0) + 1; deck.push(id); } }
  // energía
  const need = {}; for (const id of deck) { const d = DBm(id); if (d.st === 'P') for (const a of d.atk) for (const c of a.cost) if (ENERGY_ID[c]) need[c] = (need[c] || 0) + 1; }
  const et = Object.keys(need).length ? Object.keys(need) : [ENERGY_ID[t0] ? t0 : 'P'];
  const left = 60 - deck.length; const tot = et.reduce((a, t) => a + (need[t] || 1), 0); let placed = 0;
  et.forEach((t, i) => { const n = i === et.length - 1 ? left - placed : Math.round(left * (need[t] || 1) / tot); for (let k = 0; k < n; k++) deck.push(ENERGY_ID[t]); placed += n; });
  while (deck.length < 60) deck.push(ENERGY_ID[et[0]]);
  return deck.slice(0, 60);
}
// ----- iniciales -----
const STARTERS = [
  { name: 'Mega Venusaur', desc: 'Planta: curación y Energía que se mueve.', types: ['G'], prefer: ['Mega Venusaur ex', 'Ivysaur', 'Bulbasaur', 'Meganium'], cover: 'me01-3', sets: ['me01'] },
  { name: 'Mega Gardevoir', desc: 'Psíquico: acelera Energía a toda la Banca.', types: ['P'], prefer: ['Mega Gardevoir ex', 'Kirlia', 'Ralts', 'Alakazam'], cover: null, sets: ['me01'] },
  { name: 'Mega Lucario', desc: 'Lucha: golpes enormes y recarga desde el descarte.', types: ['F'], prefer: ['Mega Lucario ex', 'Riolu', 'Hariyama'], cover: null, sets: ['me01'] },
  { name: 'Mega Absol', desc: 'Oscuro: castiga la mano y el daño del rival.', types: ['D'], prefer: ['Mega Absol ex', 'Spiritomb', 'Krookodile'], cover: null, sets: ['me01'] },
];
function starterDeck(st, rng) { return genDeck({ types: st.types, sets: st.sets, level: 2, rng, prefer: st.prefer }); }
// ----- entrenadores: tramos que se desbloquean -----
const TIERS = [
  { name: 'Novatos', lv: 1, list: [
    { id: 'm_joven', name: 'Joven Teo', types: ['C'], portrait: 'me01-111', quote: '¡Mis Pokémon normales son los mejores!' },
    { id: 'm_bicho', name: 'Cazabichos Leo', types: ['G'], portrait: 'me01-17', quote: '¡Los insectos atacan desde el bosque!' },
    { id: 'm_cole', name: 'Colegiala Sofía', types: ['W'], portrait: 'me01-33', quote: 'Estudié todas las debilidades.' },
    { id: 'm_excur', name: 'Excursionista Bruno', types: ['F'], portrait: 'me01-75', quote: '¡Subí montañas con estos Pokémon!' },
  ] },
  { name: 'Aspirantes', lv: 2, list: [
    { id: 'm_pesca', name: 'Pescador Andrés', types: ['W'], portrait: 'me01-45', quote: 'Hoy pican los grandes.' },
    { id: 'm_karate', name: 'Karateka Hugo', types: ['F'], portrait: 'me01-84', quote: '¡Hu-ha! ¡Puño y patada!' },
    { id: 'm_bella', name: 'Bella Clara', types: ['P'], portrait: 'me01-62', quote: 'La elegancia también golpea.' },
    { id: 'm_meca', name: 'Mecánico Iván', types: ['L'], portrait: 'me01-52', quote: 'Todo funciona a pura chispa.' },
    { id: 'm_punk', name: 'Punk Dana', types: ['D'], portrait: 'me01-91', quote: 'Ni reglas ni piedad.' },
  ] },
  { name: 'Líderes I', lv: 3, list: [
    { id: 'm_viola', name: 'Líder Viola', types: ['G'], portrait: 'me01-15', prefer: ['Shiftry', 'Ninjask', 'Shedinja'], quote: '¡Voy a capturar tu derrota en una foto!' },
    { id: 'm_grant', name: 'Líder Lino', types: ['F'], portrait: 'me01-80', prefer: ['Solrock', 'Lunatone', 'Garganacl'], quote: 'Escalar es superar cada obstáculo.' },
    { id: 'm_korrina', name: 'Líder Corelia', types: ['F'], portrait: 'me01-77', prefer: ['Mega Lucario ex', 'Riolu'], quote: '¡Megaevolución, adelante!' },
    { id: 'm_ramos', name: 'Líder Amaro', types: ['G'], portrait: 'me01-10', prefer: ['Meganium', 'Bayleef', 'Chikorita', 'Shuckle'], quote: 'Las plantas crecen con paciencia, muchacho.' },
    { id: 'm_clemont', name: 'Líder Lem', types: ['L'], portrait: 'me01-51', prefer: ['Magnezone', 'Magneton', 'Mega Manectric ex'], quote: '¡El futuro es ahora gracias a la ciencia!' },
  ] },
  { name: 'Líderes II', lv: 4, list: [
    { id: 'm_valerie', name: 'Líder Valeria', types: ['P'], portrait: 'me01-62', prefer: ['Mega Gardevoir ex', 'Kirlia', 'Alcremie'], quote: 'Mis Pokémon hada bailan para ti.' },
    { id: 'm_olympia', name: 'Líder Ástrid', types: ['P'], portrait: 'me01-56', prefer: ['Alakazam', 'Kadabra', 'Jynx'], quote: 'Ya vi tu derrota en las estrellas.' },
    { id: 'm_wulfric', name: 'Líder Édel', types: ['W'], portrait: 'me01-35', prefer: ['Mega Abomasnow ex', 'Frosmoth', 'Eiscue'], quote: '¡Ja! El hielo enfría la cabeza.' },
    { id: 'm_flare', name: 'Lysson (Team Flare)', types: ['R'], portrait: 'me02-13', sets: ['me01', 'me02'], prefer: ['Mega Charizard X ex', 'Oricorio ex', 'Ceruledge'], quote: 'El mundo será hermoso... para unos pocos.' },
    { id: 'm_az', name: 'AZ', types: ['M'], portrait: 'me01-102', prefer: ['Mega Mawile ex', 'Bronzong', 'Dialga'], quote: 'Tres mil años esperando un combate así.' },
  ] },
  { name: 'Alto Mando', lv: 5, list: [
    { id: 'm_malva', name: 'Malva', types: ['R'], portrait: 'me02-20', sets: ['me01', 'me02'], prefer: ['Mega Charizard X ex', 'Darmanitan', 'Reshiram'], quote: 'Tu derrota será la noticia del día.' },
    { id: 'm_siebold', name: 'Narciso', types: ['W'], portrait: 'me01-38', sets: ['me01', 'me02'], prefer: ['Kyogre', 'Clawitzer', 'Inteleon'], quote: 'Cocino combates como platos de autor.' },
    { id: 'm_wikstrom', name: 'Tileo', types: ['M'], portrait: 'me01-103', sets: ['me01', 'me02'], prefer: ['Mega Mawile ex', 'Empoleon ex', 'Archaludon'], quote: '¡Mi acero es inquebrantable!' },
    { id: 'm_drasna', name: 'Drácena', types: ['D'], portrait: 'me02-58', sets: ['me01', 'me02'], prefer: ['Mega Gengar ex', 'Mega Sharpedo ex', 'Seviper'], quote: 'Oh, cariño, qué ternura de mazo.' },
    { id: 'm_diantha', name: 'Campeona Dianta', types: ['P', 'D'], portrait: 'me01-60', sets: ['me01', 'me02'], prefer: ['Mega Gardevoir ex', 'Mega Absol ex', 'Mega Diancie ex'], champion: true, quote: 'Sobre este escenario, ¡brilla como un diamante!' },
  ] },
];
const findId = n => { const d = n && ALL().find(c => c.name === n && official(c)); return d ? d.id : null; };
const bestOf = (types, sets) => { const l = ALL().filter(d => d.st === 'P' && official(d) && sets.includes(d.set) && types.includes(d.types[0])).sort((a, b) => power(b) - power(a)); return l.length ? l[Math.min(l.length - 1, 2)].id : 'me01-1'; };
TIERS.forEach((t, i) => t.list.forEach(x => { x.tier = i; x.level = t.lv; x.sets = x.sets || (i >= 2 ? ['me01', 'me02'] : ['me01']); x.portrait = findId((x.prefer || [])[0]) || bestOf(x.types, x.sets); }));
STARTERS.forEach(s => { s.cover = findId(s.prefer[0]); });
const TRAINERS = TIERS.flatMap(t => t.list);
function trainerDeck(t, rng) { return genDeck({ types: t.types, sets: t.sets, level: t.level, rng, prefer: t.prefer }); }
const tierOpen = (S, i) => i === 0 || TIERS[i - 1].list.every(x => S.beaten[x.id]);
const curTier = S => { let k = 0; while (k + 1 < TIERS.length && tierOpen(S, k + 1)) k++; return k; };
P.CampaignMega = { mega: true, SETS, PACKS, openPack, genDeck, STARTERS, starterDeck, TIERS, TRAINERS, trainerDeck, tierOpen, curTier, ENERGY_ID, ENERGY_BASIC, PERKS: {}, REGIONS: {}, power };
})(typeof window !== 'undefined' ? window : globalThis);
