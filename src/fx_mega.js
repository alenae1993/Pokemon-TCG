// ===================== EFECTOS ERA MEGA (Megaevolución + Fuegos Fantasmales) =====================
(function (root) {
'use strict';
const PT = root.PTCG; const { FX, DB, shuffle } = PT;
const A = (k, o) => { FX.atk['M|' + k] = o; };
const W = (n, o) => { FX.pw['M:' + n] = Object.assign({ ability: true }, o); };
const T = (n, o) => { FX.tr['M:' + n] = o; };
const TYN = { G: 'Planta', R: 'Fuego', W: 'Agua', L: 'Rayo', P: 'Psíquica', F: 'Lucha', D: 'Oscura', M: 'Metálica', C: 'Incolora' };

// ---------- utilidades ----------
const def = (g, c) => g.def(c);
const isBasicE = (g, c, t) => { const d = g.def(c); return d.st === 'E' && d.basic && (!t || d.etype === t); };
const isMon = (g, c) => g.def(c).st === 'P';
const isBasicMon = (g, c) => { const d = g.def(c); return d.st === 'P' && d.stage === 0; };
const types = (g, s) => g.eff(s).types;
const hasType = (g, s, t) => types(g, s).includes(t);
const isEx = (g, s) => !!(s && g.baseDef(s).ex);
const isMegaEx = (g, s) => !!(s && g.baseDef(s).mega);
const megaInPlay = (g, p, t) => g.slots(p).some(s => isMegaEx(g, s) && (!t || hasType(g, s, t)));
const ab = (g, s, n) => !!(s && g.baseDef(s).pw && g.baseDef(s).pw.name === 'M:' + n && g.powerOn(s));
const anyAb = (g, p, n) => g.slots(p).filter(s => ab(g, s, n));
const evoStage = (g, s) => g.baseDef(s).stage > 0;
const benchRoom = (g, p) => g.benchMax(p) - p.bench.length;
const tokensOf = (g, s, t) => g.energyTokens(s).filter(x => x === t || x === 'A').length;
const energyInPlay = (g, p, t) => g.slots(p).reduce((a, s) => a + tokensOf(g, s, t), 0);

async function search(g, p, filter, max, title, opts = {}) {
  const cands = p.deck.filter(c => filter(c));
  let sel = [];
  if (cands.length && max > 0) sel = await g.ask(p, { kind: 'cards', title, cards: cands, min: opts.min != null ? Math.min(opts.min, cands.length) : 0, max: Math.min(max, cands.length), purpose: opts.purpose || 'search', fromDeck: true, want: opts.want });
  sel = (sel || []).filter(c => p.deck.includes(c));
  for (const c of sel) g.removeFrom(p.deck, c);
  if (opts.keep !== true) g.shuffleDeck(p);
  return sel;
}
async function toHand(g, p, filter, max, title, purpose) {
  const sel = await search(g, p, filter, max, title, { purpose: purpose || 'searchHand' });
  p.hand.push(...sel);
  if (sel.length) g.log(`${p.name} pone ${sel.map(c => g.cn(c)).join(', ')} en su mano.`); else g.log(`${p.name} no encontró cartas.`);
  return sel;
}
async function benchCard(g, p, c) { const s = g.mkSlot(p, c); p.bench.push(s); g.log(`${p.name} pone a ${g.cn(c)} en su Banca.`); await HOOKS.onBench(g, p, s); return s; }
async function toBench(g, p, filter, max, title) {
  const room = benchRoom(g, p); if (room <= 0) { g.shuffleDeck(p); return []; }
  const sel = await search(g, p, filter, Math.min(max, room), title, { purpose: 'searchBasic' });
  for (const c of sel) await benchCard(g, p, c);
  return sel;
}
function attachCard(g, p, c, s) { s.energy.push(c); c.inPlay = true; g.log(`${g.cn(c)} se une a ${g.nm(s)}.`); }
async function attachSpread(g, p, cards, targets, title) { // une varias cartas a Pokémon a elección
  for (const c of cards) {
    const opts = targets(); if (!opts.length) { p.discard.includes(c) || p.hand.push(c); continue; }
    const t = opts.length === 1 ? opts[0] : await g.ask(p, { kind: 'slot', title: `${title}: ¿a quién unes ${g.cn(c)}?`, options: opts, purpose: 'energyTarget', card: c });
    attachCard(g, p, c, t || opts[0]);
  }
}
async function gust(g, p, o, title) { // el jugador p elige a quién traer
  if (!o.bench.length) return false;
  const t = await g.ask(p, { kind: 'slot', title: title || 'Elige el Pokémon en Banca del rival que pasará a ser Activo', options: o.bench.slice(), purpose: 'gustTarget' });
  await g.switchActive(o, t || o.bench[0], 'force'); return true;
}
async function oppSwitches(g, o, title) { // el rival elige su nuevo Activo
  if (!o.bench.length || !o.active) return false;
  const t = await g.ask(o, { kind: 'slot', title: title || 'Elige tu nuevo Pokémon Activo', options: o.bench.slice(), purpose: 'newActive' });
  await g.switchActive(o, t || o.bench[0], 'force'); return true;
}
async function selfSwitch(g, p, optional, title) {
  if (!p.bench.length) return false;
  const t = await g.ask(p, { kind: 'slot', title: title || 'Elige el Pokémon en Banca que pasará a ser Activo', options: p.bench.slice(), optional, purpose: optional ? 'optionalSwitch' : 'swapTo' });
  if (!t) return false; await g.switchActive(p, t, 'force'); return true;
}
async function needActive(g, pl) { // tras quitar al Activo de juego
  if (pl.active) return;
  if (!pl.bench.length) g.win(1 - pl.i, `${pl.name} no tiene Pokémon en juego.`);
  const n = await g.ask(pl, { kind: 'slot', title: 'Elige tu nuevo Pokémon Activo', options: pl.bench.slice(), purpose: 'newActive' });
  await g.switchActive(pl, n || pl.bench[0], 'force');
}
function placeCounters(g, t, n, by) { // contadores por efecto (no daño)
  if (!t || n <= 0) return 0;
  if (by && t.owner !== by.i && !g.isActive(t) && g.stadiumIs('Battle Cage')) { g.log('Jaula de Combate evita los contadores en la Banca.'); return 0; }
  t.dmg += 10 * n; g.log(`Se ${n === 1 ? 'pone 1 contador' : 'ponen ' + n + ' contadores'} de daño en ${g.nm(t)}.`); return n;
}
function discardTop(g, pl, n) { const out = []; for (let k = 0; k < n && pl.deck.length; k++) { const c = pl.deck.pop(); pl.discard.push(c); out.push(c); } if (out.length) g.log(`Se descarta${out.length > 1 ? 'n' : ''} ${out.map(c => g.cn(c)).join(', ')} del mazo de ${pl.name}.`); return out; }
async function discardSelfEnergy(x, n, type) { return x.discardOwn(n, type); }
function energyCardsBasic(g, s, t) { return s.energy.filter(c => isBasicE(g, c, t)); }
async function moveEnergy(g, p, fromOpts, filterCard, toOptsFn, title) {
  const from = await g.ask(p, { kind: 'slot', title: `${title}: elige el Pokémon de origen`, options: fromOpts, purpose: 'energyFrom' }); if (!from) return false;
  const cards = from.energy.filter(filterCard); if (!cards.length) return false;
  const [c] = cards.length === 1 ? [cards[0]] : await g.ask(p, { kind: 'cards', title: `${title}: elige la Energía`, cards, min: 1, max: 1, purpose: 'moveEnergy', slot: from });
  const tos = toOptsFn(from); if (!tos.length) return false;
  const to = await g.ask(p, { kind: 'slot', title: `${title}: ¿a qué Pokémon la mueves?`, options: tos, purpose: 'energyTarget', card: c });
  g.removeFrom(from.energy, c); (to || tos[0]).energy.push(c); g.log(`${g.cn(c)} pasa de ${g.nm(from)} a ${g.nm(to || tos[0])}.`); return true;
}
const prizesTaken = p => 6 - p.prizes.length;
const est = (f) => ({ est: f });

// ================= ATAQUES =================
A("During your opponent's next turn, the Defending Pokémon can't retreat.", { f: async x => x.markPost(x.def, 'noRetreat') });
A("Heal 30 damage from this Pokémon.", { f: async x => x.post(() => x.heal(x.att, 30)) });
A("Heal 20 damage from this Pokémon.", { f: async x => x.post(() => x.heal(x.att, 20)) });
A("Heal 10 damage from this Pokémon.", { f: async x => x.post(() => x.heal(x.att, 10)) });
A("Search your deck for a Basic {G} Energy card and attach it to this Pokémon. Then, shuffle your deck.", { f: async x => { const [c] = await search(x.g, x.me, c => isBasicE(x.g, c, 'G'), 1, 'Busca 1 Energía Planta básica'); if (c) attachCard(x.g, x.me, c, x.att); } });
A("During your opponent's next turn, this Pokémon takes 30 less damage from attacks (after applying Weakness and Resistance).", { f: async x => x.post(() => x.mark(x.att, 'reduce', 30)) });
A("During your opponent's next turn, this Pokémon takes 60 less damage from attacks (after applying Weakness and Resistance).", { f: async x => x.post(() => x.mark(x.att, 'reduce', 60)) });
A("This attack does 30 more damage for each {G} Energy attached to this Pokémon.", { f: async x => { x.dmg += 30 * tokensOf(x.g, x.att, 'G'); }, ...est((g, s) => 60 + 30 * tokensOf(g, s, 'G')) });
A("Your opponent's Active Pokémon is now Poisoned.", { f: async x => x.status(x.def, 'poisoned') });
A("Your opponent's Active Pokémon is now Confused.", { f: async x => x.status(x.def, 'confused') });
A("Your opponent's Active Pokémon is now Burned.", { f: async x => x.status(x.def, 'burned') });
A("Your opponent's Active Pokémon is now Asleep and Poisoned.", { f: async x => { x.status(x.def, 'asleep'); x.status(x.def, 'poisoned'); } });
A("Your opponent's Active Pokémon is now Poisoned. During your opponent's next turn, that Pokémon can't retreat.", { f: async x => { x.status(x.def, 'poisoned'); x.markPost(x.def, 'noRetreat'); } });
A("If this Pokémon has at least 2 extra Energy attached (in addition to this attack's cost), this attack does 140 more damage.", { f: async x => { if (x.g.energyTokens(x.att).length - x.atk.cost.length >= 2) x.dmg += 140; }, ...est((g, s, d, a) => 120 + (g.energyTokens(s).length - a.cost.length >= 2 ? 140 : 0)) });
A("Switch out your opponent's Active Pokémon to the Bench. (Your opponent chooses the new Active Pokémon.)", { f: async x => x.post(async () => { if (x.op.active === x.def && !x.g.effectsBlocked(x.def, x.me)) await oppSwitches(x.g, x.op); }) });
A("Search your deck for up to 3 in any combination of {G} Pokémon and Stadium cards, reveal them, and put them into your hand. Then, shuffle your deck.", { f: async x => { await toHand(x.g, x.me, c => { const d = def(x.g, c); return (d.st === 'P' && d.types.includes('G')) || (d.sub && d.sub.includes('Stadium')); }, 3, 'Busca hasta 3 Pokémon Planta o Estadios'); } });
A("Flip a coin. If heads, choose 1 of your opponent's Pokémon. Shuffle that Pokémon and all attached cards into their deck.", { f: async x => { if (!await x.flip1()) return; const t = await x.chooseOpp('all', 'Elige el Pokémon rival que vuelve a su mazo', 'bounceOpp'); if (!t || x.g.effectsBlocked(t, x.me)) return; x.post(async () => { if (!x.g.allSlots().includes(t)) return; const wasA = x.op.active === t; x.g.shuffleSlotIntoDeck(t); x.g.log(`${x.g.nm(t)} y sus cartas vuelven al mazo de ${x.op.name}.`); if (wasA) await needActive(x.g, x.op); }); } });
A("Switch this Pokémon with 1 of your Benched Pokémon.", { f: async x => x.post(async () => { if (x.me.active === x.att) await selfSwitch(x.g, x.me, false); }) });
A("You may switch this Pokémon with 1 of your Benched Pokémon.", { f: async x => x.post(async () => { if (x.me.active === x.att) await selfSwitch(x.g, x.me, true, '¿Cambiar a este Pokémon? (opcional)'); }) });
A("If you have a Stadium in play, this attack does 50 more damage.", { f: async x => { if (x.g.stadium && x.g.stadium.owner === x.me.i) x.dmg += 50; }, ...est((g, s) => 30 + (g.stadium && g.stadium.owner === s.owner ? 50 : 0)) });
A("Discard the top card of your deck, and if that card is a Supporter card, use the effect of that card as the effect of this attack.", { f: async x => { const g = x.g, p = x.me; const [c] = discardTop(g, p, 1); if (!c) return; const d = def(g, c); if (d.sub && d.sub.includes('Supporter')) { const t = g.trainerFx(c); if (t && t.play && (!t.can || t.can(g, p, c))) { g.log(`Usa el efecto de ${g.cn(c)}.`); await t.play(g, p, c); } } } });
A("Search your deck for up to 2 Basic Pokémon and put them onto your Bench. Then, shuffle your deck.", { f: async x => { await toBench(x.g, x.me, c => isBasicMon(x.g, c), 2, 'Busca hasta 2 Pokémon Básicos para tu Banca'); } });
A("Search your deck for a Basic Pokémon and put it onto your Bench. Then, shuffle your deck.", { f: async x => { await toBench(x.g, x.me, c => isBasicMon(x.g, c), 1, 'Busca 1 Pokémon Básico para tu Banca'); } });
A("Search your deck for up to 3 Basic {P} Pokémon and put them onto your Bench. Then, shuffle your deck.", { f: async x => { await toBench(x.g, x.me, c => isBasicMon(x.g, c) && def(x.g, c).types.includes('P'), 3, 'Busca hasta 3 Pokémon Básicos Psíquicos'); } });
A("If your opponent's Active Pokémon is Burned, this attack does 160 more damage.", { f: async x => { if (x.def && x.def.burn) x.dmg += 160; }, ...est((g, s, d) => 80 + (d && d.burn ? 160 : 0)) });
A("Discard 2 Energy from this Pokémon.", { f: async x => x.post(() => discardSelfEnergy(x, 2)) });
A("Discard an Energy from this Pokémon.", { f: async x => x.post(() => discardSelfEnergy(x, 1)) });
A("Discard all Energy from this Pokémon.", { f: async x => x.post(() => { const n = x.att.energy.length; for (const c of x.att.energy.slice()) { x.g.removeFrom(x.att.energy, c); x.g.toDiscard(c); } if (n) x.g.log(`${x.name} descarta todas sus Energías.`); }) });
A("Put 2 {R} Energy attached to this Pokémon into your hand.", { f: async x => x.post(async () => { const cards = x.g.energyCardsOf(x.att, 'R'); const sel = cards.length <= 2 ? cards : await x.g.ask(x.me, { kind: 'cards', title: 'Elige 2 Energías Fuego para tu mano', cards, min: 2, max: 2, purpose: 'discardOwnEnergy', slot: x.att }); for (const c of sel) { x.g.removeFrom(x.att.energy, c); delete c.inPlay; x.me.hand.push(c); } if (sel.length) x.g.log(`${sel.length} Energía(s) Fuego vuelven a la mano.`); }) });
A("Flip a coin. If tails, this attack does nothing.", { f: async x => { if (!await x.flip1()) x.cancel(); }, ...est((g, s, d, a) => (parseInt(a.dmg) || 0) / 2) });
const anyOpp = n => ({ f: async x => { const t = await x.chooseOpp('all', `Elige a qué Pokémon rival haces ${n} de daño`); if (!t) return; if (t === x.op.active) x.dmg = n; else { x.dmg = 0; x.target = null; x.dmgTo(t, n); } }, ...est(() => n) });
A("This attack does 40 damage to 1 of your opponent's Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)", anyOpp(40));
A("Search your deck for up to 3 Basic Energy cards and attach them to your Benched Pokémon in any way you like. Then, shuffle your deck.", { f: async x => { if (!x.me.bench.length) return; const sel = await search(x.g, x.me, c => isBasicE(x.g, c), 3, 'Busca hasta 3 Energías básicas', { purpose: 'getEnergy' }); await attachSpread(x.g, x.me, sel, () => x.me.bench.slice(), 'Turbollamarada'); } });
A("Flip 2 coins. For each heads, discard an Energy from your opponent's Active Pokémon.", { f: async x => { const h = await x.flip(2); if (h && x.def) x.post(() => x.discardOppEnergy(x.def, h)); } });
A("If your opponent has a Stadium in play, discard it. If you do, your opponent can't play any Stadium cards from their hand during their next turn.", { f: async x => x.post(() => { const g = x.g; if (g.stadium && g.stadium.owner === x.op.i) { g.log(`Se descarta ${g.cn(g.stadium)}.`); g.toDiscard(g.stadium); g.stadium = null; x.op.flags.noStadium = { until: g.turnNo + 1 }; } }) });
A("This Pokémon also does 10 damage to itself.", { f: async x => x.selfDmg(10) });
A("This Pokémon also does 20 damage to itself.", { f: async x => x.selfDmg(20) });
A("This Pokémon also does 60 damage to itself.", { f: async x => x.selfDmg(60) });
A("This Pokémon also does 70 damage to itself.", { f: async x => x.selfDmg(70) });
A("This attack does 20 damage for each Basic {W} Energy card in your discard pile. Then, shuffle those cards into your deck.", { f: async x => { const cs = x.me.discard.filter(c => isBasicE(x.g, c, 'W')); x.dmg = 20 * cs.length; x.post(() => { for (const c of cs) { x.g.removeFrom(x.me.discard, c); x.me.deck.push(c); } x.g.shuffleDeck(x.me); if (cs.length) x.g.log(`${cs.length} Energía(s) Agua vuelven al mazo.`); }); }, ...est((g, s) => 20 * g.ownerOf(s).discard.filter(c => isBasicE(g, c, 'W')).length) });
A("Discard the top 6 cards of your deck, and this attack does 100 damage for each Basic {W} Energy card that you discarded in this way.", { f: async x => { const cs = discardTop(x.g, x.me, 6); x.dmg = 100 * cs.filter(c => isBasicE(x.g, c, 'W')).length; }, ...est(() => 150) });
const coinsTimes = (n, per) => ({ f: async x => { x.dmg = per * await x.flip(n); }, ...est(() => per * n / 2) });
A("Flip 2 coins. This attack does 30 damage for each heads.", coinsTimes(2, 30));
A("Flip 2 coins. This attack does 10 damage for each heads.", coinsTimes(2, 10));
A("Flip 3 coins. This attack does 10 damage for each heads.", coinsTimes(3, 10));
A("Flip 3 coins. This attack does 20 damage for each heads.", coinsTimes(3, 20));
A("Flip 5 coins. This attack does 30 damage for each heads.", coinsTimes(5, 30));
A("Flip 2 coins. This attack does 70 damage for each heads.", coinsTimes(2, 70));
A("Choose a Pokémon in play (yours or your opponent's) that has the least HP remaining, except for this Pokémon, and it is Knocked Out.", { f: async x => { const g = x.g; const all = g.allSlots().filter(s => s !== x.att); if (!all.length) return; const min = Math.min(...all.map(s => g.hpLeft(s))); const opts = all.filter(s => g.hpLeft(s) === min); const t = opts.length === 1 ? opts[0] : await g.ask(x.me, { kind: 'slot', title: 'Elige el Pokémon con menos PS restantes', options: opts, purpose: 'damageOpp' }); x.post(() => { const tt = t || opts[0]; if (!g.allSlots().includes(tt) || (tt.owner !== x.me.i && g.effectsBlocked(tt, x.me)) || tt.fx.immune) return; tt.dmg = Math.max(tt.dmg, g.hp(tt)); g.log(`${g.nm(tt)} queda Fuera de Combate por Derribar.`); }); }, ...est((g, s, d) => d ? g.hpLeft(d) : 0) });
A("Flip a coin. If heads, during your opponent's next turn, prevent all damage from and effects of attacks done to this Pokémon.", { f: async x => { if (await x.flip1()) x.post(() => x.mark(x.att, 'immune')); } });
A("Flip a coin. If heads, during your opponent's next turn, prevent all damage done to this Pokémon by attacks.", { f: async x => { if (await x.flip1()) x.post(() => x.mark(x.att, 'preventAll')); } });
A("This attack does 20 damage to each of your opponent's Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.) Your opponent's Active Pokémon is now Asleep.", { f: async x => { x.dmg = 20; x.benchDmg(x.op, 20); x.status(x.def, 'asleep'); }, ...est(() => 20) });
A("Flip a coin. If heads, your opponent's Active Pokémon is now Paralyzed.", { f: async x => { if (await x.flip1()) x.status(x.def, 'paralyzed'); } });
A("If this Pokémon evolved from Magneton during this turn, this attack does 120 more damage.", { f: async x => { const s = x.att; if (s.evolved === x.g.turnNo && s.cards.length > 1 && def(x.g, s.cards[s.cards.length - 2]).name === 'Magneton') x.dmg += 120; }, ...est((g, s) => 50 + (s.evolved === g.turnNo ? 120 : 0)) });
const noRepeat = { f: async x => x.post(() => { if (x.g.slots(x.me).includes(x.att)) x.mark(x.att, 'noAtk', x.atk.name, 2); }) };
for (const n of ['Flashing Bolt', 'Bright Horns', 'Accelerating Stab', 'Mega Brave']) A(`During your next turn, this Pokémon can't use ${n}.`, noRepeat);
A("If you have at least 4 {L} Energy in play, this attack does 90 more damage.", { f: async x => { if (energyInPlay(x.g, x.me, 'L') >= 4) x.dmg += 90; }, ...est((g, s) => 30 + (energyInPlay(g, g.ownerOf(s), 'L') >= 4 ? 90 : 0)) });
A("If you have at least 4 {W} Energy in play, this attack does 90 more damage.", { f: async x => { if (energyInPlay(x.g, x.me, 'W') >= 4) x.dmg += 90; }, ...est((g, s) => 30 + (energyInPlay(g, g.ownerOf(s), 'W') >= 4 ? 90 : 0)) });
A("During your opponent's next turn, prevent all damage done to this Pokémon by attacks from Basic Pokémon.", { f: async x => x.post(() => x.mark(x.att, 'basicShield')) });
A("You may discard all Energy from this Pokémon and have this attack do 130 more damage.", { f: async x => { const g = x.g; const need = x.def ? g.hpLeft(x.def) : 999; const ok = await g.ask(x.me, { kind: 'yesno', title: '¿Descartar todas las Energías para hacer 130 de daño más?', purpose: 'allIn', want: x.dmg < need && x.dmg + 130 >= need - 0 }); if (ok) { x.dmg += 130; for (const c of x.att.energy.slice()) { g.removeFrom(x.att.energy, c); g.toDiscard(c); } g.log(`${x.name} descarta todas sus Energías.`); } }, ...est(() => 200) });
A("During your opponent's next turn, whenever they attach an Energy card from their hand to the Defending Pokémon, place 8 damage counters on that Pokémon.", { f: async x => x.markPost(x.def, 'incisors') });
A("Place 2 damage counters on your opponent's Active Pokémon for each card in your hand.", { f: async x => { const n = 2 * x.me.hand.length; x.post(() => { if (x.def && x.g.slots(x.op).includes(x.def) && !x.def.fx.immune && !x.g.effectsBlocked(x.def, x.me)) placeCounters(x.g, x.def, n, x.me); }); }, ...est((g, s) => 20 * g.ownerOf(s).hand.length) });
A("This attack does 30 more damage for each Energy attached to your opponent's Active Pokémon.", { f: async x => { if (x.def) x.dmg += 30 * x.g.energyTokens(x.def).length; }, ...est((g, s, d) => 30 + (d ? 30 * g.energyTokens(d).length : 0)) });
A("Draw a card.", { f: async x => { x.g.draw(x.me, 1); x.g.log(`${x.me.name} roba 1 carta.`); } });
A("Draw 2 cards.", { f: async x => { x.g.draw(x.me, 2); x.g.log(`${x.me.name} roba 2 cartas.`); } });
A("Draw 3 cards.", { f: async x => { x.g.draw(x.me, 3); x.g.log(`${x.me.name} roba 3 cartas.`); } });
A("Search your deck for up to 3 Pokémon, reveal them, and put them into your hand. Then, shuffle your deck.", { f: async x => { await toHand(x.g, x.me, c => isMon(x.g, c), 3, 'Busca hasta 3 Pokémon'); } });
A("Search your deck for a Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.", { f: async x => { await toHand(x.g, x.me, c => isMon(x.g, c), 1, 'Busca 1 Pokémon'); } });
A("For each of your Benched Pokémon, search your deck for a Basic {P} Energy card and attach it to that Pokémon. Then, shuffle your deck.", { f: async x => { const g = x.g, p = x.me; for (const b of p.bench) { const c = p.deck.find(c => isBasicE(g, c, 'P')); if (!c) break; g.removeFrom(p.deck, c); attachCard(g, p, c, b); } g.shuffleDeck(p); } });
A("This attack does 50 damage for each {P} Energy attached to all of your Pokémon.", { f: async x => { x.dmg = 50 * energyInPlay(x.g, x.me, 'P'); }, ...est((g, s) => 50 * energyInPlay(g, g.ownerOf(s), 'P')) });
A("This attack does 20 damage for each damage counter on your opponent's Active Pokémon.", { f: async x => { x.dmg = x.def ? 2 * x.def.dmg : 0; }, ...est((g, s, d) => d ? 2 * d.dmg : 0) });
A("Flip a coin until you get tails. For each heads, choose a random card from your opponent's hand. Your opponent reveals those cards and shuffles them into their deck.", { f: async x => { const h = await x.flipUntilTails(); x.post(() => { const o = x.op; let n = 0; for (let k = 0; k < h && o.hand.length; k++) { const i = Math.floor(x.g.rnd() * o.hand.length); o.deck.push(o.hand.splice(i, 1)[0]); n++; } if (n) { x.g.shuffleDeck(o); x.g.log(`${n} carta(s) de la mano de ${o.name} vuelven a su mazo.`); } }); } });
A("During your opponent's next turn, if the Defending Pokémon tries to use an attack, your opponent flips a coin. If tails, that attack doesn't happen.", { f: async x => x.markPost(x.def, 'smokescreen') });
A("Flip a coin until you get tails. This attack does 30 more damage for each heads.", { f: async x => { x.dmg += 30 * await x.flipUntilTails(); }, ...est(() => 40) });
A("Flip a coin until you get tails. This attack does 50 more damage for each heads.", { f: async x => { x.dmg += 50 * await x.flipUntilTails(); }, ...est(() => 250) });
A("Flip a coin until you get tails. This attack does 20 damage for each heads.", { f: async x => { x.dmg = 20 * await x.flipUntilTails(); }, ...est(() => 20) });
A("If you don't have Lunatone on your Bench, this attack does nothing. This attack's damage isn't affected by Weakness or Resistance.", { f: async x => { x.wr = false; if (!x.me.bench.some(s => x.g.eff(s).name === 'Lunatone')) x.cancel(); }, ...est((g, s) => g.ownerOf(s).bench.some(b => g.eff(b).name === 'Lunatone') ? 70 : 0) });
A("Attach up to 3 Basic {F} Energy cards from your discard pile to your Benched Pokémon in any way you like.", { f: async x => { const g = x.g, p = x.me; if (!p.bench.length) return; const cs = p.discard.filter(c => isBasicE(g, c, 'F')); if (!cs.length) return; const sel = cs.length <= 3 ? cs : await g.ask(p, { kind: 'cards', title: 'Elige hasta 3 Energías Lucha de tu pila de descartes', cards: cs, min: 0, max: 3, purpose: 'getEnergy' }); for (const c of sel) g.removeFrom(p.discard, c); x.post(() => attachSpread(g, p, sel, () => p.bench.slice(), 'Golpe Aural')); } });
A("If your opponent's Pokémon is Knocked Out by damage from this attack, during your opponent's next turn, prevent all damage from and effects of attacks done to this Pokémon.", { f: async x => x.post(() => { if (x.def && x.def.dmg >= x.g.hp(x.def) && x.dealtMain > 0) x.mark(x.att, 'immune'); }) });
A("This attack also does 20 damage to 1 of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)", { f: async x => { const t = await x.chooseOpp('bench', 'Elige un Pokémon en Banca del rival (20 de daño)'); if (t) x.dmgTo(t, 20); } });
const benchSnipe = n => ({ f: async x => { const t = await x.chooseOpp('bench', `Elige un Pokémon en Banca del rival (${n} de daño)`); if (t) x.dmgTo(t, n); }, ...est(() => 0) });
A("This attack does 50 damage to 1 of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)", benchSnipe(50));
A("This attack does 70 damage to 1 of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)", benchSnipe(70));
A("During your next turn, this Pokémon can't use attacks.", { f: async x => x.post(() => { if (x.g.slots(x.me).includes(x.att)) x.mark(x.att, 'cantAttack', true, 2); }) });
A("This attack's damage isn't affected by Resistance.", { f: async x => { x.res = false; } });
A("If this Pokémon has any damage counters on it, this attack can be used for {D}.", { f: async () => {}, cost: (g, s, a) => s.dmg > 0 ? ['D'] : a.cost });
A("If your opponent's Active Pokémon has exactly 6 damage counters on it, that Pokémon is Knocked Out.", { f: async x => x.post(() => { const t = x.def; if (t && x.g.slots(x.op).includes(t) && t.dmg === 60 && !t.fx.immune && !x.g.effectsBlocked(t, x.me)) { t.dmg = x.g.hp(t); x.g.log(`${x.g.nm(t)} queda Fuera de Combate por Punto Final.`); } }), ...est((g, s, d) => d && d.dmg === 60 ? 999 : 0) });
A("Your opponent reveals their hand, and you discard a card you find there.", { f: async x => x.post(async () => { const o = x.op; if (!o.hand.length) return; const [c] = await x.g.ask(x.me, { kind: 'cards', title: `Mano de ${o.name}: elige 1 carta para descartar`, cards: o.hand.slice(), min: 1, max: 1, purpose: 'discardOppHand' }); if (c) { x.g.removeFrom(o.hand, c); o.discard.push(c); x.g.log(`Se descarta ${x.g.cn(c)} de la mano de ${o.name}.`); } }) });
A("Discard the top card of your opponent's deck.", { f: async x => x.post(() => discardTop(x.g, x.op, 1)) });
A("Discard the top 2 cards of your opponent's deck.", { f: async x => x.post(() => discardTop(x.g, x.op, 2)) });
A("You may draw cards until you have 6 cards in your hand.", { f: async x => { const n = 6 - x.me.hand.length; if (n > 0 && await x.g.ask(x.me, { kind: 'yesno', title: `¿Robar hasta tener 6 cartas (${n})?`, purpose: 'draw' })) { x.g.draw(x.me, n); x.g.log(`${x.me.name} roba ${n} carta(s).`); } } });
A("Flip a coin. If heads, choose a Special Condition. Your opponent's Active Pokémon is now affected by that Special Condition.", { f: async x => { if (!await x.flip1()) return; const L = ['asleep', 'burned', 'confused', 'paralyzed', 'poisoned']; const i = await x.g.ask(x.me, { kind: 'option', title: 'Elige un Estado Especial', options: ['Dormido', 'Quemado', 'Confundido', 'Paralizado', 'Envenenado'], purpose: 'chooseStatus' }); x.status(x.def, L[i] || 'paralyzed'); } });
A("If you have exactly 6 Prize cards remaining, this attack does 200 more damage.", { f: async x => { if (x.me.prizes.length === 6) x.dmg += 200; }, ...est((g, s) => 40 + (g.ownerOf(s).prizes.length === 6 ? 200 : 0)) });
A("This attack does 80 damage for each Prize card you have taken.", { f: async x => { x.dmg = 80 * prizesTaken(x.me); }, ...est((g, s) => 80 * prizesTaken(g.ownerOf(s))) });
A("If your opponent's Active Pokémon already has any damage counters on it, this attack's base damage is 30.", { f: async x => { if (x.def && x.def.dmg > 0) x.dmg = x.base = 30; }, ...est((g, s, d) => d && d.dmg > 0 ? 30 : 260) });
A("You may shuffle all Energy attached to this Pokémon into your deck and have this attack do 80 more damage.", { f: async x => { const g = x.g; const need = x.def ? g.hpLeft(x.def) : 999; if (await g.ask(x.me, { kind: 'yesno', title: '¿Barajar todas sus Energías en el mazo para hacer 80 de daño más?', purpose: 'allIn', want: x.dmg < need && x.dmg + 80 >= need })) { x.dmg += 80; for (const c of x.att.energy.slice()) { g.removeFrom(x.att.energy, c); delete c.inPlay; x.me.deck.push(c); } g.shuffleDeck(x.me); g.log(`${x.name} baraja sus Energías en el mazo.`); } }, ...est(() => 80) });
A("This attack does 60 less damage for each Energy attached to your opponent's Active Pokémon.", { f: async x => { if (x.def) x.dmg = Math.max(0, x.dmg - 60 * x.g.energyTokens(x.def).length); }, ...est((g, s, d) => Math.max(0, 240 - 60 * (d ? g.energyTokens(d).length : 0))) });
A("Flip a coin until you get tails. Search your deck for a number of cards up to the number of heads and put them into your hand. Then, shuffle your deck.", { f: async x => { const h = await x.flipUntilTails(); if (h) await toHand(x.g, x.me, () => true, h, `Busca hasta ${h} carta(s)`, 'searchAny'); else x.g.shuffleDeck(x.me); } });
A("Before doing damage, discard all Pokémon Tools from your opponent's Active Pokémon.", { f: async x => { const t = x.def; if (!t || x.g.effectsBlocked(t, x.me)) return; for (const c of t.att.slice()) if ((def(x.g, c).sub || []).includes('Pokémon Tool')) { x.g.discardAtt(t, c); x.g.log(`Se descarta ${x.g.cn(c)}.`); } } });
A("If you go first, you can use this attack during your first turn. Search your deck for a card and put it into your hand. Then, shuffle your deck.", { firstTurn: true, f: async x => { await toHand(x.g, x.me, () => true, 1, 'Busca 1 carta', 'searchAny'); } });
A("Flip 2 coins. If both of them are heads, heal all damage from 1 of your Pokémon.", { f: async x => { if (await x.flip(2) < 2) return; const t = await x.chooseOwn('all', 'Elige el Pokémon a curar por completo', 'healOwn'); if (t) x.post(() => x.heal(t, t.dmg)); } });
A("During your opponent's next turn, attacks used by the Defending Pokémon do 20 less damage (before applying Weakness and Resistance).", { f: async x => x.markPost(x.def, 'weakened', 20) });
A("During your opponent's next turn, attacks used by the Defending Pokémon do 30 less damage (before applying Weakness and Resistance).", { f: async x => x.markPost(x.def, 'weakened', 30) });
A("Flip 2 coins. If both of them are heads, this attack does 100 more damage.", { f: async x => { if (await x.flip(2) === 2) x.dmg += 100; }, ...est(() => 125) });
A("This attack also does 20 damage to each Benched Pokémon (both yours and your opponent's). (Don't apply Weakness and Resistance for Benched Pokémon.)", { f: async x => { x.benchDmg(x.op, 20); x.benchDmg(x.me, 20); } });
A("If this Pokémon was healed during this turn, this attack does 120 more damage.", { f: async x => { if (x.att.healedT === x.g.turnNo) x.dmg += 120; }, ...est((g, s) => 60 + (s.healedT === g.turnNo ? 120 : 0)) });
A("If this Pokémon was damaged by an attack during your opponent's last turn, this attack does that much more damage.", { f: async x => { const l = x.att.persist.lastAttack; if (l && l.turn === x.g.turnNo - 1) x.dmg += l.d; }, ...est((g, s) => { const l = s.persist.lastAttack; return 100 + (l && l.turn === g.turnNo - 1 ? l.d : 0); }) });
A("This attack does 20 damage to 1 of your opponent's Pokémon for each {G} Energy attached to this Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)", { f: async x => { const n = 20 * tokensOf(x.g, x.att, 'G'); const t = await x.chooseOpp('all', `Elige a qué Pokémon rival haces ${n} de daño`); if (!t) return; if (t === x.op.active) x.dmg = n; else { x.dmg = 0; x.target = null; x.dmgTo(t, n); } }, ...est((g, s) => 20 * tokensOf(g, s, 'G')) });
A("Shuffle this Pokémon and all attached cards into your deck.", { f: async x => x.post(async () => { if (!x.g.slots(x.me).includes(x.att)) return; const wasA = x.me.active === x.att; x.g.shuffleSlotIntoDeck(x.att); x.g.log(`${x.name} vuelve al mazo.`); if (wasA) await needActive(x.g, x.me); }) });
A("Discard any amount of {R} Energy from among your Pokémon, and this attack does 90 damage for each card you discarded in this way.", { f: async x => { const g = x.g, p = x.me; const all = []; for (const s of g.slots(p)) for (const c of g.energyCardsOf(s, 'R')) all.push([c, s]); if (!all.length) { x.dmg = 0; return; } const want = x.def ? Math.ceil(g.hpLeft(x.def) / ((g.eff(x.def).weak === 'R') ? 180 : 90)) : all.length; const sel = await g.ask(p, { kind: 'cards', title: 'Infierno X: elige las Energías Fuego que descartas (90 de daño cada una)', cards: all.map(a => a[0]), min: 0, max: all.length, purpose: 'infernoX', want }); for (const c of sel) { const s = all.find(a => a[0] === c)[1]; g.removeFrom(s.energy, c); g.toDiscard(c); } x.dmg = 90 * sel.length; g.log(`${x.name} descarta ${sel.length} Energía(s) Fuego.`); }, ...est((g, s) => 90 * g.slots(g.ownerOf(s)).reduce((a, t) => a + g.energyCardsOf(t, 'R').length, 0)) });
A("If your opponent's Active Pokémon is a Pokémon ex, this attack does 90 more damage.", { f: async x => { if (isEx(x.g, x.def)) x.dmg += 90; }, ...est((g, s, d) => 20 + (isEx(g, d) ? 90 : 0)) });
A("This attack does 20 more damage for each {R} Energy attached to this Pokémon.", { f: async x => { x.dmg += 20 * tokensOf(x.g, x.att, 'R'); }, ...est((g, s) => 10 + 20 * tokensOf(g, s, 'R')) });
A("This attack does 40 more damage for each {R} Energy attached to this Pokémon.", { f: async x => { x.dmg += 40 * tokensOf(x.g, x.att, 'R'); }, ...est((g, s) => 40 + 40 * tokensOf(g, s, 'R')) });
A("Search your deck for up to 2 Basic Energy cards, reveal them, and put them into your hand. Then, shuffle your deck.", { f: async x => { await toHand(x.g, x.me, c => isBasicE(x.g, c), 2, 'Busca hasta 2 Energías básicas', 'getEnergy'); } });
A("Discard 4 Basic {R} Energy cards from your hand. If you can't discard 4 cards in this way, this attack does nothing.", { f: async x => { const g = x.g; const cs = x.me.hand.filter(c => isBasicE(g, c, 'R')); if (cs.length < 4) { x.cancel('No tiene 4 Energías Fuego en la mano: el ataque no hace nada.'); return; } const sel = cs.length === 4 ? cs : await g.ask(x.me, { kind: 'cards', title: 'Descarta 4 Energías Fuego de tu mano', cards: cs, min: 4, max: 4, purpose: 'discardHand' }); for (const c of sel) { g.removeFrom(x.me.hand, c); g.toDiscard(c); } g.log('Se descartan 4 Energías Fuego de la mano.'); }, ...est((g, s) => g.ownerOf(s).hand.filter(c => isBasicE(g, c, 'R')).length >= 4 ? 220 : 0) });
A("Flip a coin. If heads, this attack does 30 more damage.", { f: async x => { if (await x.flip1()) x.dmg += 30; }, ...est(() => 45) });
A("Flip a coin. If heads, this attack does 20 more damage.", { f: async x => { if (await x.flip1()) x.dmg += 20; }, ...est((g, s, d, a) => (parseInt(a.dmg) || 0) + 10) });
A("Flip a coin. If heads, this attack does 70 more damage.", { f: async x => { if (await x.flip1()) x.dmg += 70; }, ...est(() => 105) });
A("If a Stadium is in play, this attack does 120 more damage. Then, discard that Stadium.", { f: async x => { const g = x.g; if (g.stadium) { x.dmg += 120; x.post(() => { if (g.stadium) { g.log(`Se descarta ${g.cn(g.stadium)}.`); g.toDiscard(g.stadium); g.stadium = null; } }); } }, ...est(g => 120 + (g.stadium ? 120 : 0)) });
A("Discard a Stadium in play.", { f: async x => x.post(() => { const g = x.g; if (g.stadium) { g.log(`Se descarta ${g.cn(g.stadium)}.`); g.toDiscard(g.stadium); g.stadium = null; } }) });
A("Search your deck for a Supporter card, reveal it, and put it into your hand. Then, shuffle your deck.", { f: async x => { await toHand(x.g, x.me, c => (def(x.g, c).sub || []).includes('Supporter'), 1, 'Busca 1 carta de Partidario'); } });
A("You may have this Pokémon also do 60 damage to itself and make your opponent's Active Pokémon Paralyzed.", { f: async x => { if (x.g.hpLeft(x.att) > 60 && await x.g.ask(x.me, { kind: 'yesno', title: '¿Hacerse 60 de daño para Paralizar al Pokémon Activo rival?', purpose: 'voltaic', want: x.g.hpLeft(x.att) > 60 })) { x.selfDmg(60); x.status(x.def, 'paralyzed'); } } });
A("If your opponent's Active Pokémon already has any damage counters on it, this attack does 90 more damage.", { f: async x => { if (x.def && x.def.dmg > 0) x.dmg += 90; }, ...est((g, s, d) => 90 + (d && d.dmg > 0 ? 90 : 0)) });
A("Search your deck for up to 2 Basic {P} Energy cards and attach them to this Pokémon. Then, shuffle your deck.", { f: async x => { const sel = await search(x.g, x.me, c => isBasicE(x.g, c, 'P'), 2, 'Busca hasta 2 Energías Psíquicas básicas', { purpose: 'getEnergy' }); for (const c of sel) attachCard(x.g, x.me, c, x.att); } });
A("Heal 120 damage from 1 of your Benched {P} Pokémon.", { f: async x => { const opts = x.me.bench.filter(s => hasType(x.g, s, 'P') && s.dmg > 0); if (!opts.length) return; const t = await x.g.ask(x.me, { kind: 'slot', title: 'Elige un Pokémon Psíquico en Banca para curar 120', options: opts, purpose: 'healOwn' }); if (t) x.post(() => x.heal(t, 120)); } });
A("This attack does 20 damage for each of your Pokémon in play.", { f: async x => { x.dmg = 20 * x.g.slots(x.me).length; }, ...est((g, s) => 20 * g.slots(g.ownerOf(s)).length) });
A("If your opponent has 3 or fewer Prize cards remaining, this attack does 90 more damage.", { f: async x => { if (x.op.prizes.length <= 3) x.dmg += 90; }, ...est((g, s) => 50 + (g.opp(g.ownerOf(s)).prizes.length <= 3 ? 90 : 0)) });
A("Place 1 damage counter on 1 of your opponent's Pokémon.", { f: async x => { const t = await x.chooseOpp('all', 'Elige dónde poner 1 contador de daño', 'curseTo'); if (t) x.post(() => { if (x.g.allSlots().includes(t) && !t.fx.immune && !x.g.effectsBlocked(t, x.me)) placeCounters(x.g, t, 1, x.me); }); } });
A("This attack does 40 damage for each of your Pokémon that has \"Tauros\" in its name that has any damage counters on it.", { f: async x => { x.dmg = 40 * x.g.slots(x.me).filter(s => x.g.eff(s).name.includes('Tauros') && s.dmg > 0).length; }, ...est((g, s) => 40 * g.slots(g.ownerOf(s)).filter(t => g.eff(t).name.includes('Tauros') && t.dmg > 0).length) });
A("Move an Energy from this Pokémon to 1 of your Benched Pokémon.", { f: async x => x.post(async () => { const g = x.g, p = x.me; if (!p.bench.length || !x.att.energy.length || !g.slots(p).includes(x.att)) return; const [c] = x.att.energy.length === 1 ? [x.att.energy[0]] : await g.ask(p, { kind: 'cards', title: 'Elige la Energía que mueves', cards: x.att.energy.slice(), min: 1, max: 1, purpose: 'moveEnergy', slot: x.att }); const t = await g.ask(p, { kind: 'slot', title: '¿A qué Pokémon en Banca la mueves?', options: p.bench.slice(), purpose: 'energyTarget', card: c }); g.removeFrom(x.att.energy, c); (t || p.bench[0]).energy.push(c); g.log(`${g.cn(c)} pasa a ${g.nm(t || p.bench[0])}.`); }) });
A("Discard 2 Energy from this Pokémon, and this attack does 120 damage to 1 of your opponent's Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)", { f: async x => { await discardSelfEnergy(x, 2); const t = await x.chooseOpp('all', 'Elige a qué Pokémon rival haces 120 de daño'); if (!t) return; if (t === x.op.active) x.dmg = 120; else { x.dmg = 0; x.target = null; x.dmgTo(t, 120); } }, ...est(() => 120) });
A("If you have any Stage 2 {D} Pokémon on your Bench, this attack does 70 more damage.", { f: async x => { if (x.me.bench.some(s => x.g.baseDef(s).stage === 2 && hasType(x.g, s, 'D'))) x.dmg += 70; }, ...est((g, s) => 20 + (g.ownerOf(s).bench.some(b => g.baseDef(b).stage === 2 && hasType(g, b, 'D')) ? 70 : 0)) });
A("If this Pokémon has any damage counters on it, this attack does 150 more damage.", { f: async x => { if (x.att.dmg > 0) x.dmg += 150; }, ...est((g, s) => 120 + (s.dmg > 0 ? 150 : 0)) });
A("If any of your Pokémon were Knocked Out by damage from an attack during your opponent's last turn, this attack does 160 more damage.", { f: async x => { if (x.me.flags.koByAtk === x.g.turnNo - 1) x.dmg += 160; }, ...est((g, s) => 60 + (g.ownerOf(s).flags.koByAtk === g.turnNo - 1 ? 160 : 0)) });
A("Flip a coin. If tails, during your next turn, this Pokémon can't use attacks.", { f: async x => { if (!await x.flip1()) x.post(() => { if (x.g.slots(x.me).includes(x.att)) x.mark(x.att, 'cantAttack', true, 2); }); } });
A("This attack does 40 damage for each Pokémon Tool attached to all Pokémon.", { f: async x => { x.dmg = 40 * x.g.allSlots().reduce((a, s) => a + s.att.filter(c => (def(x.g, c).sub || []).includes('Pokémon Tool')).length, 0); }, ...est(g => 40 * g.allSlots().reduce((a, s) => a + s.att.length, 0)) });
A("Discard an Energy from your opponent's Active Pokémon.", { f: async x => x.post(() => x.discardOppEnergy(x.def, 1)) });
A("This attack does 40 damage for each of your Pokémon in play that has the Round attack.", { f: async x => { x.dmg = 40 * x.g.slots(x.me).filter(s => x.g.eff(s).atk.some(a => a.name === 'Round')).length; }, ...est((g, s) => 40 * g.slots(g.ownerOf(s)).filter(t => g.eff(t).atk.some(a => a.name === 'Round')).length) });
A("Choose a random card from your opponent's hand, and your opponent reveals that card and shuffles it into their deck.", { f: async x => x.post(() => { const o = x.op; if (!o.hand.length) return; const i = Math.floor(x.g.rnd() * o.hand.length); const c = o.hand.splice(i, 1)[0]; o.deck.push(c); x.g.shuffleDeck(o); x.g.log(`${x.g.cn(c)} de la mano de ${o.name} vuelve a su mazo.`); }) });
A("Discard 2 Energy from this Pokémon, and this attack does 60 damage to each of 2 of your opponent's Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)", { f: async x => { const g = x.g; await discardSelfEnergy(x, 2); const all = g.slots(x.op); let ts = all; if (all.length > 2) ts = await g.ask(x.me, { kind: 'slots', title: 'Elige 2 Pokémon del rival (60 de daño a cada uno)', options: all, min: 2, max: 2, purpose: 'damageOpp' }); x.dmg = 0; x.target = null; for (const t of ts) { if (t === x.op.active) { x.target = t; x.dmg = 60; } else x.dmgTo(t, 60); } }, ...est(() => 60) });
A("Flip 3 coins. Attach an amount of Basic Energy up to the number of heads from your discard pile to your Benched Pokémon in any way you like.", { f: async x => { const g = x.g, p = x.me; const h = await x.flip(3); if (!h || !p.bench.length) return; const cs = p.discard.filter(c => isBasicE(g, c)); if (!cs.length) return; const sel = cs.length <= h ? cs : await g.ask(p, { kind: 'cards', title: `Elige hasta ${h} Energías básicas de tu pila de descartes`, cards: cs, min: 0, max: h, purpose: 'getEnergy' }); for (const c of sel) g.removeFrom(p.discard, c); await attachSpread(g, p, sel, () => p.bench.slice(), 'Bosquejo Energizante'); } });
A("If this Pokémon moved from your Bench to the Active Spot this turn, this attack does 170 more damage.", { f: async x => { if (x.att.movedInT === x.g.turnNo) x.dmg += 170; }, ...est((g, s) => 60 + (s.movedInT === g.turnNo ? 170 : 0)) });
A("This attack's damage isn't affected by any effects on your opponent's Active Pokémon.", { f: async x => { x.pierce = true; } });
A("Discard up to 2 Energy cards from this Pokémon, and this attack does 120 damage for each card you discarded in this way.", { f: async x => { const g = x.g; const cs = x.att.energy.slice(); if (!cs.length) { x.dmg = 0; return; } const want = x.def ? Math.min(2, Math.ceil(g.hpLeft(x.def) / 120)) : 2; const sel = await g.ask(x.me, { kind: 'cards', title: 'Elige hasta 2 Energías para descartar (120 de daño cada una)', cards: cs, min: 0, max: Math.min(2, cs.length), purpose: 'infernoX', want, slot: x.att }); for (const c of sel) { g.removeFrom(x.att.energy, c); g.toDiscard(c); } x.dmg = 120 * sel.length; }, ...est((g, s) => 120 * Math.min(2, s.energy.length)) });
A("Search your deck for up to 3 in any combination of {G} Pokémon and Stadium cards, reveal them, and put them into your hand. Then, shuffle your deck. ", FX.atk['M|Search your deck for up to 3 in any combination of {G} Pokémon and Stadium cards, reveal them, and put them into your hand. Then, shuffle your deck.']);

// ================= HABILIDADES =================
W('Solar Transfer', { use: async (g, p, s) => moveEnergy(g, p, g.slots(p).filter(t => energyCardsBasic(g, t, 'G').length), c => isBasicE(g, c, 'G'), from => g.slots(p).filter(t => t !== from), 'Traspaso Solar'),
  can: (g, p) => g.slots(p).length > 1 && g.slots(p).some(t => energyCardsBasic(g, t, 'G').length),
  ai: (g, p) => { const a = p.active; if (!a || !hasType(g, a, 'G')) return false; const best = PT.AI.bestAttack(g, p, a, g.opp(p).active); return best && best.miss > 0 && p.bench.some(b => energyCardsBasic(g, b, 'G').length && !isMegaEx(g, b)); } });
// el movimiento IA: preferir de la Banca al Activo
W('Wild Growth', {});
W('Fermented Juice', { once: true, can: (g, p, s) => tokensOf(g, s, 'G') > 0 && g.slots(p).some(t => t.dmg > 0), use: async (g, p) => { const opts = g.slots(p).filter(t => t.dmg > 0); const t = await g.ask(p, { kind: 'slot', title: 'Jugo Fermentado: elige un Pokémon para curar 30', options: opts, purpose: 'healOwn' }); g.heal(t || opts[0], 30); g.log(`${g.nm(t || opts[0])} se cura 30.`); }, ai: (g, p) => g.slots(p).some(t => t.dmg >= 30) });
W('Cast-Off Shell', { onEvolve: async (g, p, s) => { if (benchRoom(g, p) <= 0) return; await toBench(g, p, c => def(g, c).name === 'Shedinja', 1, 'Muda: busca a Shedinja'); } });
W('Intimidating Fang', {});
W('Explosiveness', {});
W('Fall Back to Reload', {});
W('Psychic Draw', { onEvolve: async (g, p, s) => { const n = +((g.baseDef(s).pw.text.match(/Draw (\d+) cards/) || [])[1] || 2); g.draw(p, n); g.log(`${p.name} roba ${n} cartas.`); } });
W('Fragile Husk', {});
W('Energized Steps', { onEvolve: async (g, p, s) => { const top = p.deck.slice(-4).reverse(); const en = top.filter(c => isBasicE(g, c)); if (en.length) { const sel = await g.ask(p, { kind: 'cards', title: 'Pasos Energizados: elige Energías básicas para unir', cards: en, min: 0, max: en.length, purpose: 'getEnergy' }); for (const c of sel) g.removeFrom(p.deck, c); await attachSpread(g, p, sel, () => g.slots(p), 'Pasos Energizados'); } g.shuffleDeck(p); } });
W('Heave-Ho Catcher', { onEvolve: async (g, p) => { await gust(g, p, g.opp(p), 'Atrapa Empuje: elige el Pokémon en Banca rival que pasa a ser Activo'); } });
W('Lunar Cycle', { once: true, can: (g, p) => !p.used.lunar && g.slots(p).some(t => g.eff(t).name === 'Solrock') && p.hand.some(c => isBasicE(g, c, 'F')) && p.deck.length > 0,
  use: async (g, p) => { const cs = p.hand.filter(c => isBasicE(g, c, 'F')); const [c] = cs.length === 1 ? cs : await g.ask(p, { kind: 'cards', title: 'Descarta 1 Energía Lucha básica', cards: cs, min: 1, max: 1, purpose: 'discardHand' }); g.removeFrom(p.hand, c); g.toDiscard(c); g.draw(p, 3); p.used.lunar = true; g.log(`${p.name} roba 3 cartas.`); }, ai: (g, p) => p.hand.filter(c => isBasicE(g, c, 'F')).length >= 2 || p.hand.length <= 3 });
W('Powerful a-Salt', {});
W('Spiteful Swirl', {});
W('Haphazard Hammer', { onEvolve: async (g, p) => { const o = g.opp(p); if (!o.active || !o.active.energy.length) return; if (await g.flipHeads(p, 1, 'Martillo Azaroso')) { const [c] = await g.ask(p, { kind: 'cards', title: 'Elige la Energía a descartar', cards: o.active.energy.slice(), min: 1, max: 1, purpose: 'discardOppEnergy', slot: o.active }); g.removeFrom(o.active.energy, c); g.toDiscard(c); g.log(`Se descarta ${g.cn(c)} de ${g.nm(o.active)}.`); } } });
W('Lustrous Assist', {});
W('Run Errand', { once: true, can: (g, p, s) => p.active === s && !p.used.errand && p.deck.length > 0, use: async (g, p) => { p.used.errand = true; g.draw(p, 2); g.log(`${p.name} roba 2 cartas.`); }, ai: () => true });
W('Evidence Gathering', { once: true, can: (g, p) => p.hand.length > 0 && p.deck.length > 0, use: async (g, p) => { const [c] = await g.ask(p, { kind: 'cards', title: 'Elige 1 carta de tu mano para cambiarla por la primera del mazo', cards: p.hand.slice(), min: 1, max: 1, purpose: 'discardHand' }); const top = p.deck.pop(); g.removeFrom(p.hand, c); p.deck.push(c); p.hand.push(top); g.log(`${p.name} cambia una carta de su mano por la primera de su mazo.`); }, ai: () => false });
W('Excited Heal', { once: true, can: (g, p) => megaInPlay(g, p, 'G') && g.slots(p).some(t => t.dmg > 0), use: async (g, p) => { const opts = g.slots(p).filter(t => t.dmg > 0); const t = await g.ask(p, { kind: 'slot', title: 'Curación Excitada: elige un Pokémon para curar 60', options: opts, purpose: 'healOwn' }); g.heal(t || opts[0], 60); g.log(`${g.nm(t || opts[0])} se cura 60.`); }, ai: (g, p) => g.slots(p).some(t => t.dmg >= 40) });
W('Agile', {});
W('Excited Turbo', { can: (g, p) => megaInPlay(g, p, 'R') && p.hand.some(c => isBasicE(g, c, 'R')) && p.bench.some(b => hasType(g, b, 'R')),
  use: async (g, p) => { const cs = p.hand.filter(c => isBasicE(g, c, 'R')); const opts = p.bench.filter(b => hasType(g, b, 'R')); const t = await g.ask(p, { kind: 'slot', title: 'Turbo Excitado: ¿a qué Pokémon Fuego en Banca unes la Energía?', options: opts, purpose: 'energyTarget' }); g.removeFrom(p.hand, cs[0]); attachCard(g, p, cs[0], t || opts[0]); },
  ai: (g, p) => p.bench.some(b => hasType(g, b, 'R') && PT.AI.bestAttack(g, p, b, null) && PT.AI.bestAttack(g, p, b, null).miss > 0) });
W('Thick Fat', {});
W('Multi Adapter', {});
W('Swirling Prose', {});
W('Diamond Coat', {});
W('Prison Panic', { onEvolve: async (g, p) => { const o = g.opp(p); if (o.active) g.setStatus(o.active, 'confused'); } });
W('Sandy Flapping', { onEvolve: async (g, p) => { discardTop(g, g.opp(p), 2); } });
W('Shadowy Concealment', {});
W('Excited Power', {});
W('Sinister Surge', { once: true, can: (g, p) => p.bench.some(b => hasType(g, b, 'D')) && p.deck.some(c => isBasicE(g, c, 'D')),
  use: async (g, p) => { const [c] = await search(g, p, c => isBasicE(g, c, 'D'), 1, 'Oleada Siniestra: busca 1 Energía Oscura básica', { min: 1, purpose: 'getEnergy' }); if (!c) return; const opts = p.bench.filter(b => hasType(g, b, 'D')); const t = await g.ask(p, { kind: 'slot', title: '¿A qué Pokémon Oscuro en Banca la unes?', options: opts, purpose: 'energyTarget' }); const tt = t || opts[0]; attachCard(g, p, c, tt); placeCounters(g, tt, 2, null); },
  ai: (g, p) => p.bench.some(b => hasType(g, b, 'D') && g.hpLeft(b) > 40) });
W("Emperor's Stance", {});
W('Excited Dash', { once: true, can: (g, p, s) => p.bench.includes(s) && megaInPlay(g, p) && p.active, use: async (g, p, s) => { await g.switchActive(p, s, 'force'); }, ai: (g, p, s) => { const a = p.active; const o = g.opp(p); const b = PT.AI.bestAttack(g, p, a, o.active); const bs = PT.AI.bestAttack(g, p, s, o.active); return (!b || b.miss > 0) && bs && bs.miss === 0; } });

// ================= ENTRENADORES =================
const SUP = 18;
T("Acerola's Mischief", { can: (g, p) => g.opp(p).prizes.length <= 2, play: async (g, p) => { const t = await g.ask(p, { kind: 'slot', title: 'Elige 1 de tus Pokémon', options: g.slots(p), purpose: 'defender' }); const s = t || p.active; s.fx.acerola = { v: true, until: g.turnNo + 1 }; g.log(`${g.nm(s)} estará protegido de los Pokémon ex del rival durante su próximo turno.`); }, ai: (g, p) => p.active && isEx(g, g.opp(p).active) ? 12 : 0 });
T("Boss's Orders", { can: (g, p) => g.opp(p).bench.length > 0, play: async (g, p) => { await gust(g, p, g.opp(p)); }, ai: (g, p) => bossValue(g, p) });
T('Energy Switch', { can: (g, p) => g.slots(p).length > 1 && g.slots(p).some(s => energyCardsBasic(g, s).length), play: async (g, p) => { await moveEnergy(g, p, g.slots(p).filter(s => energyCardsBasic(g, s).length), c => isBasicE(g, c), from => g.slots(p).filter(t => t !== from), 'Cambio de Energía'); }, ai: (g, p) => { const a = p.active; if (!a) return 0; const b = PT.AI.bestAttack(g, p, a, g.opp(p).active); return b && b.miss === 1 && p.bench.some(s => s.energy.length && !PT.AI.bestAttack(g, p, s, null)) ? 6 : 0; } });
T('Fighting Gong', { play: async (g, p) => { await toHand(g, p, c => isBasicE(g, c, 'F') || (isBasicMon(g, c) && def(g, c).types.includes('F')), 1, 'Busca 1 Energía Lucha básica o 1 Pokémon Básico Lucha'); }, ai: (g, p) => p.deck.some(c => isBasicE(g, c, 'F') || (isBasicMon(g, c) && def(g, c).types.includes('F'))) ? 8 : 0 });
T('Forest of Vitality', { stadium: true, ai: (g, p) => g.slots(p).some(s => hasType(g, s, 'G')) && !g.stadiumIs('Forest of Vitality') ? 7 : 0 });
T('Iron Defender', { play: async (g, p) => { p.flags.ironDef = { until: g.turnNo + 1 }; g.log('Tus Pokémon Metálicos recibirán 30 de daño menos durante el próximo turno del rival.'); }, ai: (g, p) => p.active && hasType(g, p.active, 'M') ? 5 : 0 });
T("Lillie's Determination", { play: async (g, p) => { p.deck.push(...p.hand.splice(0)); g.shuffleDeck(p); const n = p.prizes.length === 6 ? 8 : 6; g.draw(p, n); g.log(`${p.name} baraja su mano en el mazo y roba ${n} cartas.`); }, ai: (g, p) => p.hand.length <= 4 ? SUP : p.hand.length <= 6 ? 8 : 2 });
T("Lt. Surge's Bargain", { play: async (g, p) => { const o = g.opp(p); const yes = await g.ask(o, { kind: 'yesno', title: `${p.name} propone que cada jugador tome 1 carta de Premio. ¿Aceptas?`, purpose: 'bargain', mine: o.prizes.length, theirs: p.prizes.length }); if (yes) { for (const pl of [p, o]) if (pl.prizes.length) pl.hand.push(pl.prizes.pop()); g.log('Cada jugador toma 1 carta de Premio.'); const w0 = g.p[0].prizes.length === 0, w1 = g.p[1].prizes.length === 0; if (w0 || w1) g.win(w0 && w1 ? p.i : (w0 ? 0 : 1), 'tomó todas sus cartas de Premio.'); } else { g.draw(p, 4); g.log(`${o.name} rechaza: ${p.name} roba 4 cartas.`); } }, ai: (g, p) => p.hand.length <= 4 ? 14 : 5 });
T('Mega Signal', { play: async (g, p) => { await toHand(g, p, c => !!def(g, c).mega, 1, 'Busca 1 Pokémon Megaevolución ex'); }, ai: (g, p) => p.deck.some(c => def(g, c).mega) && !p.hand.some(c => def(g, c).mega) ? 11 : 0 });
T('Mystery Garden', { stadium: true, once: true, action: async (g, p) => { const cs = p.hand.filter(c => g.isEnergy(c)); const [c] = cs.length === 1 ? cs : await g.ask(p, { kind: 'cards', title: 'Jardín Misterioso: descarta 1 carta de Energía', cards: cs, min: 1, max: 1, purpose: 'discardHand' }); g.removeFrom(p.hand, c); g.toDiscard(c); const n = Math.max(0, g.slots(p).filter(s => hasType(g, s, 'P')).length - p.hand.length); g.draw(p, n); g.log(`Jardín Misterioso: ${p.name} roba ${n} carta(s).`); },
  actionLabel: 'Jardín Misterioso', actionCan: (g, p) => p.hand.some(c => g.isEnergy(c)) && g.slots(p).filter(s => hasType(g, s, 'P')).length > p.hand.length - 1, ai: (g, p) => g.slots(p).filter(s => hasType(g, s, 'P')).length >= 3 && !g.stadiumIs('Mystery Garden') ? 7 : 0, aiAction: (g, p) => g.slots(p).filter(s => hasType(g, s, 'P')).length - p.hand.length >= 2 });
T('Pokémon Center Lady', { can: (g, p) => g.slots(p).some(s => s.dmg > 0 || s.st || s.poison || s.burn), play: async (g, p) => { const opts = g.slots(p).filter(s => s.dmg > 0 || s.st || s.poison || s.burn); const t = await g.ask(p, { kind: 'slot', title: 'Elige un Pokémon: cura 60 y sus Estados Especiales', options: opts, purpose: 'healOwn' }); const s = t || opts[0]; g.heal(s, 60); g.cure(s); g.log(`${g.nm(s)} se cura 60 y se recupera de sus Estados Especiales.`); }, ai: (g, p) => g.slots(p).some(s => s.dmg >= 60 && s.cards.length > 1) ? 12 : 0 });
T('Premium Power Pro', { play: async (g, p) => { p.flags.ppp = g.turnNo; g.log('Los ataques de tus Pokémon Lucha hacen 30 de daño más este turno.'); }, ai: () => 0 });
T('Rare Candy', { can: (g, p) => !g.firstTurn[p.i] && rcTargets(g, p).length > 0, play: async (g, p) => { const opts = rcTargets(g, p); const s = await g.ask(p, { kind: 'slot', title: 'Caramelo Raro: elige el Pokémon Básico', options: opts.map(o => o[0]).filter((v, i, a) => a.indexOf(v) === i), purpose: 'evolveTarget' }); const ss = s || opts[0][0]; const cs = opts.filter(o => o[0] === ss).map(o => o[1]); const [c] = cs.length === 1 ? cs : await g.ask(p, { kind: 'cards', title: 'Elige el Pokémon de Fase 2', cards: cs, min: 1, max: 1, purpose: 'evolveCard' }); await g.evolve(p, c, ss, true); }, ai: (g, p) => rcTargets(g, p).length ? 16 : 0 });
function rcTargets(g, p) { const out = []; for (const s of g.slots(p)) { const bd = g.baseDef(s); if (bd.stage !== 0 || s.played === g.turnNo || s.fx.noEvolve) continue; for (const c of p.hand) { const d = def(g, c); if (d.st !== 'P' || d.stage !== 2) continue; const mid = PT.CARDS_MEGA.find(m => m.st === 'P' && m.stage === 1 && m.name === d.from && m.from === bd.name); if (mid) out.push([s, c]); } } return out; }
T('Repel', { can: (g, p) => g.opp(p).bench.length > 0, play: async (g, p) => { await oppSwitches(g, g.opp(p)); }, ai: () => 0 });
T('Risky Ruins', { stadium: true, ai: (g, p) => g.slots(p).every(s => hasType(g, s, 'D')) && !g.stadiumIs('Risky Ruins') ? 6 : 0 });
T('Strange Timepiece', { can: (g, p) => g.slots(p).some(s => s.cards.length > 1 && hasType(g, s, 'P')), play: async (g, p) => { const opts = g.slots(p).filter(s => s.cards.length > 1 && hasType(g, s, 'P')); const s = await g.ask(p, { kind: 'slot', title: 'Elige el Pokémon Psíquico a involucionar', options: opts, purpose: 'own' }); const t = s || opts[0]; const n = t.cards.length - 1; const k = n === 1 ? 1 : 1 + (await g.ask(p, { kind: 'option', title: '¿Cuántas cartas de Evolución devuelves a la mano?', options: Array.from({ length: n }, (_, i) => String(i + 1)), purpose: 'devolveStage' })); for (let i = 0; i < k; i++) p.hand.push(t.cards.pop()); t.fx.noEvolve = { v: true, until: g.turnNo }; g.log(`${g.nm(t)} involuciona.`); }, ai: () => 0 });
T('Surfing Beach', { stadium: true, once: true, action: async (g, p) => { const opts = p.bench.filter(s => hasType(g, s, 'W')); const t = await g.ask(p, { kind: 'slot', title: 'Playa de Surf: elige el Pokémon Agua en Banca', options: opts, purpose: 'swapTo' }); await g.switchActive(p, t || opts[0], 'force'); }, actionLabel: 'Playa de Surf', actionCan: (g, p) => p.active && hasType(g, p.active, 'W') && p.bench.some(s => hasType(g, s, 'W')), ai: (g, p) => g.slots(p).filter(s => hasType(g, s, 'W')).length >= 2 && !g.stadiumIs('Surfing Beach') ? 6 : 0, aiAction: (g, p) => switchUseful(g, p, s => hasType(g, s, 'W')) });
T('Switch', { can: (g, p) => p.bench.length > 0, play: async (g, p) => { await selfSwitch(g, p, false); }, ai: () => 0 });
T('Ultra Ball', { can: (g, p, c) => p.hand.filter(h => h !== c).length >= 2, play: async (g, p, c) => { const cs = p.hand.filter(h => h !== c); const sel = await g.ask(p, { kind: 'cards', title: 'Ultra Ball: descarta 2 cartas de tu mano', cards: cs, min: 2, max: 2, purpose: 'discardHand' }); for (const h of sel) { g.removeFrom(p.hand, h); g.toDiscard(h); } await toHand(g, p, h => isMon(g, h), 1, 'Busca 1 Pokémon'); }, ai: (g, p) => p.hand.length >= 4 && wantMon(g, p) ? 9 : 0 });
T("Wally's Compassion", { can: (g, p) => g.slots(p).some(s => isMegaEx(g, s) && s.dmg > 0), play: async (g, p) => { const opts = g.slots(p).filter(s => isMegaEx(g, s) && s.dmg > 0); const t = await g.ask(p, { kind: 'slot', title: 'Elige el Pokémon Megaevolución ex a curar', options: opts, purpose: 'healOwn' }); const s = t || opts[0]; const h = g.heal(s, s.dmg); if (h) { const en = s.energy.splice(0); for (const c of en) { delete c.inPlay; p.hand.push(c); } g.log(`${g.nm(s)} se cura por completo y sus Energías vuelven a la mano.`); } }, ai: (g, p) => g.slots(p).some(s => isMegaEx(g, s) && s.dmg >= 150 && g.hpLeft(s) <= 120) ? 15 : 0 });
T('Battle Cage', { stadium: true, ai: () => 0 });
T('Blowtorch', { can: (g, p, c) => p.hand.some(h => h !== c && isBasicE(g, h, 'R')) && (g.stadium || g.slots(g.opp(p)).some(s => s.att.length || s.energy.some(e => !def(g, e).basic))), play: async (g, p, c) => { const cs = p.hand.filter(h => h !== c && isBasicE(g, h, 'R')); g.removeFrom(p.hand, cs[0]); g.toDiscard(cs[0]); const o = g.opp(p); const opts = []; const labels = []; for (const s of g.slots(o)) for (const a of s.att.concat(s.energy.filter(e => !def(g, e).basic))) { opts.push([s, a]); labels.push(`${g.cn(a)} de ${g.nm(s)}`); } if (g.stadium) { opts.push([null, g.stadium]); labels.push(`Estadio ${g.cn(g.stadium)}`); } if (!opts.length) return; const i = opts.length === 1 ? 0 : await g.ask(p, { kind: 'option', title: 'Soplete: ¿qué descartas?', options: labels, purpose: 'blowtorch' }); const [s, a] = opts[i] || opts[0]; if (!s) { g.toDiscard(g.stadium); g.stadium = null; } else { g.removeFrom(s.att, a); g.removeFrom(s.energy, a); g.toDiscard(a); } g.log(`Soplete descarta ${g.cn(a)}.`); }, ai: (g, p) => g.stadium && g.stadium.owner !== p.i ? 5 : 0 });
T('Dawn', { play: async (g, p) => { for (const st of [0, 1, 2]) await toHand(g, p, c => { const d = def(g, c); return d.st === 'P' && d.stage === st; }, 1, `Busca 1 Pokémon ${['Básico', 'de Fase 1', 'de Fase 2'][st]}`); }, ai: (g, p) => wantMon(g, p) ? 15 : 6 });
T('Dizzying Valley', { stadium: true, ai: () => 0 });
T('Firebreather', { play: async (g, p) => { await toHand(g, p, c => isBasicE(g, c, 'R'), 7, 'Busca hasta 7 Energías Fuego básicas', 'getEnergy'); }, ai: (g, p) => p.deck.filter(c => isBasicE(g, c, 'R')).length >= 3 && p.hand.filter(c => isBasicE(g, c, 'R')).length < 2 ? 10 : 0 });
T("Grimsley's Move", { can: (g, p) => !g.firstTurn[p.i] && benchRoom(g, p) > 0, play: async (g, p) => { const top = p.deck.splice(-Math.min(7, p.deck.length)); const cands = top.filter(c => isMon(g, c) && def(g, c).types.includes('D')); let pick = null; if (cands.length) [pick] = await g.ask(p, { kind: 'cards', title: 'Movimiento de Mirto: elige 1 Pokémon Oscuro para tu Banca', cards: cands, min: 0, max: 1, purpose: 'searchBasic' }); if (pick) { g.removeFrom(top, pick); await benchCard(g, p, pick); } shuffle(top, g.rnd); p.deck.unshift(...top); }, ai: (g, p) => benchRoom(g, p) > 1 ? 9 : 0 });
T('Jumbo Ice Cream', { can: (g, p) => p.active && p.active.energy.length >= 3 && p.active.dmg > 0, play: async (g, p) => { g.heal(p.active, 80); g.log(`${g.nm(p.active)} se cura 80.`); }, ai: (g, p) => p.active && p.active.dmg >= 60 ? 12 : 0 });
T('Punk Helmet', { tool: true, ai: (g, p) => g.slots(p).some(s => hasType(g, s, 'D') && g.toolRoom(s)) ? 8 : 0 });
T('Sacred Charm', { tool: true, ai: (g, p) => p.active && g.toolRoom(p.active) ? 7 : 0 });
T('Air Balloon', { tool: true, ai: (g, p) => p.active && g.toolRoom(p.active) && g.retreatCost(p.active) >= 2 ? 7 : 0 });
T('Wondrous Patch', { can: (g, p) => p.discard.some(c => isBasicE(g, c, 'P')) && p.bench.some(s => hasType(g, s, 'P')), play: async (g, p) => { const c = p.discard.find(c => isBasicE(g, c, 'P')); const opts = p.bench.filter(s => hasType(g, s, 'P')); const t = await g.ask(p, { kind: 'slot', title: 'Parche Prodigioso: elige un Pokémon Psíquico en Banca', options: opts, purpose: 'energyTarget' }); g.removeFrom(p.discard, c); attachCard(g, p, c, t || opts[0]); }, ai: () => 10 });
T('Buddy-Buddy Poffin', { can: (g, p) => benchRoom(g, p) > 0, play: async (g, p) => { await toBench(g, p, c => isBasicMon(g, c) && def(g, c).hp <= 70, 2, 'Busca hasta 2 Pokémon Básicos con 70 PS o menos'); }, ai: (g, p) => benchRoom(g, p) >= 2 && p.deck.some(c => isBasicMon(g, c) && def(g, c).hp <= 70) ? 12 : 0 });
T('Night Stretcher', { can: (g, p) => p.discard.some(c => isMon(g, c) || isBasicE(g, c)), play: async (g, p) => { const cs = p.discard.filter(c => isMon(g, c) || isBasicE(g, c)); const [c] = cs.length === 1 ? cs : await g.ask(p, { kind: 'cards', title: 'Camilla Nocturna: elige 1 Pokémon o 1 Energía básica', cards: cs, min: 1, max: 1, purpose: 'recover' }); g.removeFrom(p.discard, c); p.hand.push(c); g.log(`${g.cn(c)} vuelve a la mano.`); }, ai: (g, p) => p.discard.some(c => def(g, c).ex || def(g, c).stage > 0) ? 8 : 0 });

function wantMon(g, p) { return p.hand.filter(c => isMon(g, c)).length < 2 || g.slots(p).some(s => p.deck.some(c => def(g, c).from === g.baseDef(s).name) && !p.hand.some(c => def(g, c).from === g.baseDef(s).name)); }
function switchUseful(g, p, filter) { const a = p.active; if (!a) return false; const o = g.opp(p); const b = PT.AI.bestAttack(g, p, a, o.active); if (b && b.miss === 0 && a.st !== 'paralyzed' && a.st !== 'asleep') return false; return p.bench.some(s => filter(s) && (() => { const bb = PT.AI.bestAttack(g, p, s, o.active); return bb && bb.miss === 0; })()); }
function bossValue(g, p) {
  const o = g.opp(p); const a = p.active; if (!a || !o.bench.length) return 0;
  const AI = PT.AI; const b0 = AI.bestAttack(g, p, a, o.active); if (!b0 || b0.miss > 0) return 0;
  if (o.active && AI.estDmg(g, a, o.active, b0.a) >= g.hpLeft(o.active)) return 0;
  const t = o.bench.find(s => { const b = AI.bestAttack(g, p, a, s); return b && b.miss === 0 && AI.estDmg(g, a, s, b.a) >= g.hpLeft(s); });
  return t ? 13 + g.baseDef(t).prizes * 2 : 0;
}

// ================= GANCHOS DEL MOTOR (reglas modernas) =================
const HOOKS = PT.MEGA_HOOKS = {
  tokens(g, s) {
    const t = []; const owner = g.ownerOf(s);
    const grow = g.slots(owner).some(x => ab(g, x, 'Wild Growth'));
    for (const c of s.energy) {
      const d = g.def(c);
      if (d.basic) { if (grow && d.etype === 'G') t.push('G', 'G'); else t.push(d.etype); }
      else if (d.name === 'Ignition Energy') { if (g.baseDef(s).stage > 0) t.push('C', 'C', 'C'); else t.push('C'); }
      else t.push('C');
    }
    return t;
  },
  retreat(g, s, c) {
    if (ab(g, s, 'Agile') && !s.energy.length) return 0;
    c -= 2 * s.att.filter(x => g.def(x).name === 'Air Balloon').length;
    if (s.fx.retreatPlus) c += 1;
    return c;
  },
  toolMax(g, s) { const p = g.ownerOf(s); return g.eff(s).name.includes('Rotom') && g.slots(p).some(x => ab(g, x, 'Multi Adapter')) ? 2 : 1; },
  async onSwitch(g, p, old, neu, why) {
    if (!neu) return;
    // Remolino de Prosa (Mismagius ex del rival en el Puesto Activo)
    const o = g.opp(p);
    if (old && g.cur === p.i && o.active && ab(g, o.active, 'Swirling Prose')) { g.log('Remolino de Prosa confunde al nuevo Pokémon Activo.'); g.setStatus(neu, 'confused'); }
    if (g.cur !== p.i) return;
    // Recarga en Retirada (Clawitzer pasa a la Banca)
    if (old && ab(g, old, 'Fall Back to Reload') && !p.used['reload' + old.u]) {
      const cs = p.hand.filter(c => isBasicE(g, c, 'W'));
      if (cs.length && await g.ask(p, { kind: 'yesno', title: '¿Usar Recarga en Retirada de Clawitzer?', purpose: 'yes' })) { p.used['reload' + old.u] = true; const sel = cs.length <= 2 ? cs : await g.ask(p, { kind: 'cards', title: 'Elige hasta 2 Energías Agua básicas', cards: cs, min: 0, max: 2, purpose: 'getEnergy' }); for (const c of sel) { g.removeFrom(p.hand, c); attachCard(g, p, c, old); } }
    }
    // Ayuda Lustrosa (Latios) cuando Mega Latias ex pasa al Puesto Activo
    if (g.baseDef(neu).name === 'Mega Latias ex' && !p.used.lustrous) {
      const lat = g.slots(p).find(x => ab(g, x, 'Lustrous Assist'));
      if (lat && p.bench.some(b => b.energy.length) && await g.ask(p, { kind: 'yesno', title: '¿Usar Ayuda Lustrosa de Latios (mover Energías de la Banca a Mega Latias ex)?', purpose: 'yes' })) {
        p.used.lustrous = true; let n = 0;
        for (const b of p.bench) for (const c of b.energy.slice()) { g.removeFrom(b.energy, c); neu.energy.push(c); n++; }
        g.log(`Ayuda Lustrosa mueve ${n} Energía(s) a Mega Latias ex.`);
      }
    }
  },
  async onKO(g, s, x, pl) {
    if (x && pl.i !== g.cur && pl.active === s && ab(g, s, 'Sandy Flapping') && await g.ask(pl, { kind: 'yesno', title: '¿Usar Aleteo Arenoso (descartar 2 cartas del mazo rival)?', purpose: 'yes' })) discardTop(g, g.opp(pl), 2);
  },
  async onBench(g, p, s) {
    if (g.stadiumIs('Risky Ruins') && g.cur === p.i && g.baseDef(s).stage === 0 && !hasType(g, s, 'D')) { s.dmg += 20; g.log(`Ruinas Peligrosas ponen 2 contadores en ${g.nm(s)}.`); }
  },
  async onEvolve(g, p, s, c) {
    const fromHand = !c.fromDeckEvo; delete c.fromDeckEvo;
    const pw = g.baseDef(s).pw; if (!pw || !fromHand) return;
    const P = FX.pw[pw.name]; if (!P || !P.onEvolve || !g.powerOn(s)) return;
    if (await g.ask(p, { kind: 'yesno', title: `¿Usar la habilidad ${pw.nameEs}?`, purpose: 'yes' })) { g.log(`${p.name} usa la habilidad ${pw.nameEs}.`); await P.onEvolve(g, p, s); }
  },
  async onAttach(g, p, c, s) {
    if (g.def(c).name === 'Ignition Energy') c.ignT = g.turnNo;
    if (s.fx.incisors && g.cur === p.i) { s.dmg += 80; g.log(`Incisivos Electrificados ponen 8 contadores en ${g.nm(s)}.`); }
  },
  async endTurn(g, p) {
    for (const s of g.slots(p)) for (const c of s.energy.slice()) if (g.def(c).name === 'Ignition Energy') { g.removeFrom(s.energy, c); g.toDiscard(c); g.log('Se descarta la Energía Ignición.'); }
  },
  async afterAttack(g, x) {
    const p = x.me, o = x.op; const s = x.att;
    for (const [t, d] of x.damaged) {
      if (t.owner === p.i || d <= 0 || !t.wasActiveHit) continue;
    }
    const t = x.target; if (!t || t.owner === p.i || !x.damaged.some(([dd, n]) => dd === t && n > 0)) return;
    if (!g.slots(p).includes(s)) return;
    const wasDefActive = x.def === t;
    if (wasDefActive && hasType(g, t, 'D')) {
      if (g.slots(o).some(z => ab(g, z, 'Spiteful Swirl'))) { s.dmg += 10; g.log(`Remolino Rencoroso pone 1 contador en ${g.nm(s)}.`); }
      if (t.att.some(c => g.def(c).name === 'Punk Helmet')) { s.dmg += 40; g.log(`El Casco Punk pone 4 contadores en ${g.nm(s)}.`); }
    }
  },
  preWR(g, x, target, d) { // bonos/penalizaciones del atacante antes de Debilidad y Resistencia (al Activo rival)
    if (!x || !x.att) return 0;
    const s = x.att, p = x.me; let b = 0;
    if (d <= 0 && !(x.dmg > 0)) return 0;
    if (hasType(g, s, 'F')) { b += 30 * Math.min(1, anyAb(g, p, 'Powerful a-Salt').length); if (p.flags.ppp === g.turnNo) b += 30; }
    if (ab(g, s, 'Excited Power') && megaInPlay(g, p, 'D')) b += 120;
    const o = x.op; if (o.active && ab(g, o.active, 'Intimidating Fang') && target === o.active) b -= 30;
    return b;
  },
  postWR(g, x, t, d) { // reducciones del Pokémon que recibe el daño (después de D y R)
    if (!x || !x.att || d <= 0) return d;
    const s = x.att; const tp = g.ownerOf(t);
    if (t.fx.basicShield && g.baseDef(s).stage === 0) return 0;
    if (t.fx.acerola && isEx(g, s)) return 0;
    if (ab(g, t, 'Diamond Coat')) d -= 30;
    if (ab(g, t, 'Thick Fat') && (hasType(g, s, 'R') || hasType(g, s, 'W'))) d -= 30;
    if (tp.flags.ironDef && hasType(g, t, 'M')) d -= 30;
    if (t.att.some(c => g.def(c).name === 'Sacred Charm') && g.baseDef(s).pw) d -= 30;
    return Math.max(0, d);
  },
  prizes(g, s, x, n, pl) {
    if (!x || pl.i === g.cur || !x.att) return n;
    const att = x.att;
    if (isEx(g, att) && ab(g, s, 'Fragile Husk')) { g.log('Caparazón Frágil: el rival no toma cartas de Premio.'); return 0; }
    if (isEx(g, att) && hasType(g, s, 'D') && g.slots(pl).some(z => z !== s && ab(g, z, 'Shadowy Concealment')) ) { g.log('Ocultación Sombría: el rival toma 1 carta de Premio menos.'); return Math.max(0, n - 1); }
    if (isEx(g, att) && hasType(g, s, 'D') && ab(g, s, 'Shadowy Concealment')) { g.log('Ocultación Sombría: el rival toma 1 carta de Premio menos.'); return Math.max(0, n - 1); }
    return n;
  },
  effectsBlocked(g, t, by) {
    if (!t || !by || t.owner === by.i) return false;
    if (ab(g, t, "Emperor's Stance")) return true;
    if (t.fx.acerola && by.active && isEx(g, by.active)) return true;
    return false;
  },
};
PT.MEGA = { search, toHand, toBench, gust, placeCounters, isMegaEx, isEx, megaInPlay };
})(typeof window !== 'undefined' ? window : globalThis);
