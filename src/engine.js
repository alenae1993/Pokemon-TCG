// ===================== MOTOR DE REGLAS POKÉMON TCG (ERA BASE) =====================
// Funciona en navegador y en Node (para pruebas IA vs IA).
(function (root) {
'use strict';
const T = { G: 'Planta', R: 'Fuego', W: 'Agua', L: 'Rayo', P: 'Psíquico', F: 'Lucha', C: 'Incoloro', D: 'Siniestro', M: 'Metálico' };
const STATUS_ES = { asleep: 'Dormido', confused: 'Confundido', paralyzed: 'Paralizado', poisoned: 'Envenenado' };
let UID = 1;
const DB = {};          // id -> definición
const FX = { atk: {}, pw: {}, tr: {} }; // efectos registrados

function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function mkRng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return (s % 1e9) / 1e9; }; }
const r10 = n => Math.max(0, Math.round(n / 10) * 10);
const floor10 = n => Math.max(0, Math.floor(n / 10) * 10);
const ceil10 = n => Math.max(0, Math.ceil(n / 10) * 10);

// textos de efectos visibles (icono en el Pokémon + registro)
const FX_LABEL = {
  preventAll: { ico: '🛡', short: 'SIN DAÑO', long: 'no recibirá daño de ataques durante el próximo turno del rival' },
  immune: { ico: '🛡', short: 'INMUNE', long: 'será inmune a todos los efectos de ataques durante el próximo turno del rival' },
  harden: { ico: '🛡', short: 'EVITA ≤30', long: 'evitará cualquier daño de 30 o menos durante el próximo turno del rival' },
  reduce: { ico: '🛡', short: v => '−' + v, long: v => `recibirá ${v} de daño menos durante el próximo turno del rival` },
  halve: { ico: '🛡', short: 'DAÑO ½', long: 'recibirá la mitad del daño durante el próximo turno del rival' },
  reduceFrom: { ico: '🛡', short: v => '−' + v.n, long: v => `recibirá ${v.n} de daño menos del Pokémon Defensor` },
  cantAttack: { ico: '⛔', short: 'NO ATACA', long: 'no podrá atacar en su próximo turno' },
  cantAttackSlot: { ico: '⛔', short: 'BLOQUEADO', long: 'no podrá atacar a ese Pokémon en su próximo turno' },
  noRetreat: { ico: '⛓', short: 'NO RETIRA', long: 'no podrá retirarse' },
  smokescreen: { ico: '💨', short: 'PUEDE FALLAR', long: 'deberá lanzar una moneda al atacar: si sale cruz, el ataque falla' },
  evasion: { ico: '💨', short: 'EVASIÓN', long: 'obliga al rival a lanzar moneda al atacarlo: con cruz no recibe daño' },
  destiny: { ico: '☠', short: 'LAZO DESTINO', long: 'arrastrará consigo a quien lo deje Fuera de Combate' },
  counter: { ico: '↩', short: 'CONTRAATAQUE', long: 'devolverá el daño si es atacado' },
  amnesia: { ico: '🚫', short: 'ATAQUE BLOQ.', long: 'no podrá usar uno de sus ataques en su próximo turno' },
  noAtk: { ico: '🚫', short: 'ATAQUE BLOQ.', long: 'no podrá repetir ese ataque en su próximo turno' },
  noEnergy: { ico: '🚫', short: 'SIN ENERGÍA', long: 'no podrá recibir Energía en el próximo turno' },
  powerOff: { ico: '🚫', short: 'SIN PODER', long: 'tiene su Poder Pokémon anulado' },
  boost: { ico: '⬆', short: 'POTENCIADO', long: 'tendrá un ataque potenciado en tu próximo turno' },
  endure: { ico: '💪', short: 'AGUANTE', long: 'no quedará Fuera de Combate por un ataque en el próximo turno (queda con 10 PS)' },
  armorUp: { ico: '💪', short: 'BLINDAJE', long: 'lanzará una moneda si fuera a quedar Fuera de Combate: con cara queda con 10 PS' },
  screech: { ico: '🔊', short: '+20 DAÑO', long: 'recibirá 20 de daño más de los ataques hasta el final del próximo turno' },
  noStatus: { ico: '✨', short: 'SIN ESTADOS', long: 'no puede quedar Dormido, Confundido, Paralizado ni Envenenado' },
  noEffects: { ico: '✨', short: 'SIN EFECTOS', long: 'no se verá afectado por efectos de ataques (salvo el daño) en el próximo turno' },
  noEvolve: { ico: '🚫', short: 'NO EVOLUCIONA', long: 'no podrá evolucionar en el próximo turno' },
  pursuit: { ico: '⛓', short: 'PERSECUCIÓN', long: 'recibirá 10 de daño si intenta retirarse' },
  slime: { ico: '💧', short: 'BABA', long: 'obliga al rival a lanzar moneda: con cruz no recibe daño del ataque' },
  dodge: { ico: '💨', short: 'ESQUIVA', long: 'lanzará una moneda al ser atacado: con cara evita el daño' },
  reflect: { ico: '🪞', short: 'REFLEJO', long: 'lanzará una moneda al ser atacado: con cara evita el daño y devuelve 20' },
  weakened: { ico: '⬇', short: v => '−' + v + ' ATQ', long: v => `hará ${v} de daño menos con sus ataques (antes de Debilidad y Resistencia)` },
  harden20: { ico: '🛡', short: 'EVITA ≤20', long: 'evitará cualquier daño de 20 o menos durante el próximo turno del rival' },
  guard30: { ico: '🛡', short: 'EVITA ≥30', long: 'evitará cualquier daño de 30 o más durante el próximo turno del rival' },
  secrete: { ico: '☠', short: 'VENENO REACTIVO', long: 'envenenará al atacante y dañará su Banca si es atacado' },
  noSwitch: { ico: '⛓', short: 'ATRAPADO', long: 'no puede retirarse ni ser cambiado por efectos' },
  triggered: { ico: '☠', short: 'TRAMPA', long: 'quedará Envenenado si se le une una Energía' },
  lockOn: { ico: '🎯', short: 'BLANCO FIJADO', long: 'tratará las cruces de Rayo Eléctrico como caras en su próximo turno' },
  retreatPlus: { ico: '⛓', short: '+1 RETIRADA', long: 'pagará 1 Energía más para retirarse' },
  benchShield: { ico: '🛡', short: 'PROTEGE BANCA', long: 'protegerá a su Banca del daño de ataques' },
  dropZero: { ico: '🎯', short: 'MIRADA', long: 'quedará Fuera de Combate si sigue Dormido (Canto Mortal)' },
};
class GameOver extends Error { constructor(w) { super('over'); this.winner = w; } }

// --------------------------------------------------------------------------
class Game {
  constructor(opts) {
    this.rnd = opts.rng || Math.random;
    this.io = opts.io;            // {ask(g,p,req), flip(g,p,results,label), log(g,msg), update(g), anim}
    this.ai = opts.ai;            // módulo IA
    this.p = [0, 1].map(i => this.mkPlayer(i, opts.players[i]));
    this.turnNo = 0; this.cur = 0; this.stadium = null; this.winner = null;
    this.logs = []; this.firstTurn = [true, true];
    this.powersOff = 0;           // Goop Gas Attack / ataques: hasta fin de turno N
    this.prizesFaceUp = false;
  }
  mkPlayer(i, o) {
    const pl = { i, name: o.name, ai: o.ai || null, perk: o.perk || null, coin: o.coin || 0,
      deck: o.deck.map(id => this.inst(id)), hand: [], discard: [], prizes: [], active: null, bench: [],
      energyPlayed: false, retreated: false, used: {}, flags: {}, setAside: [] };
    pl.deck.forEach(c => c.owner = i);
    return pl;
  }
  inst(id) { if (!DB[id]) throw new Error('Carta desconocida ' + id); return { u: UID++, d: id }; }
  def(c) { return DB[c.d]; }
  opp(p) { return this.p[1 - p.i]; }
  log(m) { this.logs.push(m); if (this.io.log) this.io.log(this, m); }
  upd() { if (this.io.update) this.io.update(this); }
  async ask(p, req) { req.player = p; if (p.ai) return this.ai.decide(this, p, req); return this.io.ask(this, p, req); }
  check() { if (this.winner != null) throw new GameOver(this.winner); }

  // ---------- monedas ----------
  async flip(p, n = 1, label = '') {
    const r = []; for (let k = 0; k < n; k++) r.push(this.rnd() < 0.5);
    if (this.io.flip) await this.io.flip(this, p, r, label);
    this.logFlip(p, r, label);
    return r;
  }
  logFlip(p, r, label) {
    if (!r.length) return;
    const h = r.filter(x => x).length;
    this.log(`🪙 ${label ? label + ': ' : ''}${r.length === 1 ? (r[0] ? 'CARA' : 'CRUZ') : `${h} cara(s), ${r.length - h} cruz(ces)`}`);
  }
  noteFx(t, k, v) {
    const L = FX_LABEL[k]; if (!t || !L) return;
    const txt = typeof L.long === 'function' ? L.long(v) : L.long;
    this.log(`${L.ico} ${this.nm(t)} ${txt}.`);
    if (this.io.fxPopup) this.io.fxPopup(this, t, `${L.ico} ${typeof L.short === 'function' ? L.short(v) : L.short}`);
  }
  async flipHeads(p, n, label) { return (await this.flip(p, n, label)).filter(x => x).length; }
  async flipUntilTails(p, label) {
    const r = []; while (true) { const h = this.rnd() < 0.5; r.push(h); if (!h || r.length > 30) break; }
    if (this.io.flip) await this.io.flip(this, p, r, label);
    this.logFlip(p, r, label);
    return r.filter(x => x).length;
  }

  // ---------- consultas de cartas ----------
  isPokemonCard(c) { const d = this.def(c); return d.st === 'P' || d.name === 'Clefairy Doll' || d.name === 'Mysterious Fossil'; }
  isBasicCard(c) { const d = this.def(c); return (d.st === 'P' && d.stage === 0) || d.name === 'Clefairy Doll' || d.name === 'Mysterious Fossil'; }
  isEvoCard(c) { const d = this.def(c); return d.st === 'P' && d.stage > 0; }
  isEnergy(c) { return this.def(c).st === 'E'; }
  isBasicEnergy(c) { const d = this.def(c); return d.st === 'E' && d.basic; }
  isTrainer(c) { return this.def(c).st === 'T'; }
  slots(p) { return (p.active ? [p.active] : []).concat(p.bench); }
  allSlots() { return this.slots(this.p[0]).concat(this.slots(this.p[1])); }
  ownerOf(slot) { return this.p[slot.owner]; }
  top(slot) { return slot.cards[slot.cards.length - 1]; }
  baseDef(slot) { return this.def(this.top(slot)); }
  hasName(slot, s) { return this.eff(slot).name.indexOf(s) >= 0; }
  isActive(slot) { return this.ownerOf(slot).active === slot; }
  benchMax(p) { return this.stadiumIs('Narrow Gym') ? 4 : 5; }
  stadiumIs(n) { return this.stadium && this.def(this.stadium).name === n; }

  // definición efectiva (Ditto, Metamorfosis, etc.)
  eff(slot) {
    const d = this.baseDef(slot);
    if (d.st !== 'P') { // Muñeco Clefairy / Fósil
      return { name: d.name, nameEs: d.nameEs, hp: d.name === 'Clefairy Doll' ? 10 : 10, types: ['C'], weak: null, res: null, atk: [], ret: 0, pw: null, stage: 0, trainerMon: true, d };
    }
    let e = { name: d.name, nameEs: d.nameEs, hp: d.hp, types: d.types.slice(), weak: d.weak, res: d.res, atk: d.atk.map((a, i) => Object.assign({ src: d.id, idx: i }, a)), ret: d.ret, pw: d.pw, stage: d.stage, d };
    // Transformación (Ditto)
    if (d.pw && d.pw.name === 'Transform' && this.isActive(slot) && !this.statusBlocksPower(slot) && this.powerOn(slot)) {
      const opp = this.opp(this.ownerOf(slot)); const t = opp.active;
      if (t && this.baseDef(t).st === 'P' && this.baseDef(t).name !== 'Ditto') {
        const td = this.eff(t);
        e = Object.assign({}, td, { name: 'Ditto', nameEs: 'Ditto', pw: d.pw, ditto: true, atk: td.atk.map(a => Object.assign({}, a)), d });
      }
    }
    // Metamorfosis (Ninetales de Brock)
    const ss = slot.att.find(c => this.isEvoCard(c));
    if (ss && d.pw && d.pw.name === 'Shapeshift') {
      const sd = this.def(ss);
      e = Object.assign({}, e, { hp: sd.hp, types: sd.types.slice(), weak: sd.weak, res: sd.res, atk: sd.atk.map((a, i) => Object.assign({ src: sd.id, idx: i }, a)), ret: sd.ret, shape: sd.name });
    }
    if (d.pw && d.pw.name === 'Gaseous Form') e.hp += 10 * slot.energy.filter(c => this.def(c).name === 'Psychic Energy').length;
    if (slot.fx.maxhp80) e.hp = Math.max(e.hp, 80);
    if (slot.fx.typeShift) e.types = [slot.fx.typeShift.v];
    if (slot.fx.weakTo) e.weak = slot.fx.weakTo.v;
    if (slot.fx.resTo) e.res = slot.fx.resTo.v;
    if (slot.persist.weakTo) e.weak = slot.persist.weakTo;
    if (slot.persist.resTo) e.res = slot.persist.resTo;
    // Enlace Psíquico (Alakazam de Sabrina)
    if (d.pw && d.pw.name === 'Psylink' && !this.statusBlocksPower(slot) && this.powerOn(slot)) {
      const p = this.ownerOf(slot);
      for (const s of this.slots(p)) if (s !== slot && this.baseDef(s).st === 'P' && this.baseDef(s).types.includes('P'))
        this.baseDef(s).atk.forEach((a, i) => e.atk.push(Object.assign({ src: this.baseDef(s).id, idx: i, psylink: true }, a)));
    }
    if (this.stadiumIs("Rocket's Hideout") && e.name.indexOf('Dark ') === 0) e.hp += 20;
    { const pk = this.ownerOf(slot).perk; if (pk === 'clair' || pk === 'lance') e.hp += 20; }
    if (slot.fx.submerge) e.types = ['W'];
    // Mimetismo (Sudowoodo)
    if (d.pw && d.pw.name === 'Mimic' && this.isActive(slot) && !this.statusBlocksPower(slot) && this.powerOn(slot)) {
      const t = this.opp(this.ownerOf(slot)).active;
      if (t && this.baseDef(t).st === 'P') this.baseDef(t).atk.forEach((a, i) => e.atk.push(Object.assign({ src: this.baseDef(t).id, idx: i, mimic: true }, a)));
    }
    // Memoria Prehistórica (Aerodactyl) / Memoria Genética
    if (slot.cards.length > 1 && this.anyPower('Prehistoric Memory').length) {
      slot.cards.slice(0, -1).forEach(c => { const cd = this.def(c); if (cd.st === 'P') cd.atk.forEach((a, i) => e.atk.push(Object.assign({ src: cd.id, idx: i, recall: true }, a))); });
    }
    // Recordar (Recall)
    if (this.ownerOf(slot).flags.recall && this.isActive(slot)) {
      slot.cards.slice(0, -1).forEach(c => { const cd = this.def(c); if (cd.st === 'P') cd.atk.forEach((a, i) => e.atk.push(Object.assign({ src: cd.id, idx: i, recall: true }, a))); });
    }
    return e;
  }
  hp(slot) { return this.eff(slot).hp; }
  miraculousWind() { return this.p.some(pl => pl.active && this.powerActive(pl.active, 'Miraculous Wind')); }
  isBaby(slot) { return !!this.baseDef(slot).baby; }
  isDarkMon(slot) { const e = this.eff(slot); return e.types.includes('D') || e.name.indexOf('Dark ') === 0; }
  tool(slot) { return slot.att.find(c => { const d = this.def(c); return d.sub && d.sub.includes('Pokémon Tool'); }); }
  discardAtt(slot, c) { this.removeFrom(slot.att, c); this.toDiscard(c); }
  effectsBlocked(t, byPlayer) { if (!t || t.owner === byPlayer.i) return false; return !!(t.fx.noEffects || this.powerActive(t, 'Crystal Body')); }
  uniquePower(p, name) { const l = this.slots(p).filter(s => this.baseDef(s).pw && this.baseDef(s).pw.name === name); return l.length === 1 && this.powerActive(l[0], name) ? l[0] : null; }
  async evolveFromDeck(p, s, pred, title) {
    const bd = this.baseDef(s);
    const opts = p.deck.filter(c => { const d = this.def(c); return d.st === 'P' && d.stage > 0 && d.from === bd.name && (!pred || pred(d)); });
    if (!opts.length) { this.shuffleDeck(p); return false; }
    const [c] = await this.ask(p, { kind: 'cards', title: title || 'Elige la evolución', cards: opts, min: 0, max: 1, purpose: 'evolveFromDeck', fromDeck: true });
    this.shuffleDeck(p);
    if (!c) return false;
    this.removeFrom(p.deck, c); p.hand.push(c);
    return this.evolve(p, c, s, true);
  }
  hpLeft(slot) { return this.hp(slot) - slot.dmg; }
  counters(slot) { return slot.dmg / 10; }

  // ---------- Poderes Pokémon ----------
  statusBlocksPower(slot) { return slot.st === 'asleep' || slot.st === 'confused' || slot.st === 'paralyzed'; }
  powerOn(slot) {
    const d = this.baseDef(slot);
    if (!d.pw) return false;
    if (this.powersOff >= this.turnNo) return false;
    if (slot.fx.powerOff) return false;
    if (d.baby) { const o = this.opp(this.ownerOf(slot)); if (o.active && o.active !== slot && this.baseDef(o.active).pw && this.baseDef(o.active).pw.name === 'Scare' && !this.statusBlocksPower(o.active) && this.powersOff < this.turnNo) return false; }
    if (d.pw.name !== 'Toxic Gas') {
      for (const s of this.allSlots()) {
        const sd = this.baseDef(s);
        if (sd.pw && sd.pw.name === 'Toxic Gas' && !this.statusBlocksPower(s) && !s.fx.powerOff && this.powersOff < this.turnNo) return false;
      }
    }
    return true;
  }
  // poder activo y no bloqueado por estado (salvo los que dicen "funciona aunque")
  powerActive(slot, name) {
    const d = this.baseDef(slot); if (!d.pw || d.pw.name !== name) return false;
    if (!this.powerOn(slot)) return false;
    const P = FX.pw[name]; if (P && P.ignoreStatus) return true;
    return !this.statusBlocksPower(slot);
  }
  findPower(p, name, where) { // where: 'any'|'active'|'bench'
    const list = where === 'active' ? (p.active ? [p.active] : []) : where === 'bench' ? p.bench : this.slots(p);
    return list.filter(s => this.powerActive(s, name));
  }
  anyPower(name) { return this.allSlots().filter(s => this.powerActive(s, name)); }

  // ---------- energía ----------
  energyTokens(slot) {
    const t = [];
    const burn = slot.flags_burn === this.turnNo && this.powerActive(slot, 'Energy Burn');
    const photo = this.powerActive(slot, 'Photosynthesis');
    const ditto = this.eff(slot).ditto;
    const wind = this.miraculousWind();
    const grow = this.baseDef(slot).st === 'P' && this.eff(slot).types.includes('G') && this.findPower(this.ownerOf(slot), 'Wild Growth').length > 0;
    for (const c of slot.energy) {
      const d = this.def(c);
      let prov;
      if (c.buzzap) prov = [c.buzzap, c.buzzap];
      else if (d.name === 'Double Colorless Energy') prov = ['C', 'C'];
      else if (d.name === 'Rainbow Energy') prov = ['A'];
      else if (d.name === 'Miracle Energy') prov = ['A', 'A'];
      else if (c.conv && c.convT === this.turnNo) prov = [c.conv];
      else if (d.etype) prov = [d.etype];
      else prov = ['C'];
      if (!d.basic && d.name !== 'Double Colorless Energy' && wind) prov = ['C'];
      if (d.name === 'Grass Energy' && grow) prov = ['G', 'G'];
      if (burn) prov = prov.map(() => 'R');
      if (photo) prov = prov.map(() => 'G');
      if (ditto) prov = prov.map(() => 'A');
      t.push(...prov);
    }
    return t;
  }
  energyCount(slot, type) { // número de energía provista de un tipo (o total)
    const t = this.energyTokens(slot);
    if (!type) return t.length;
    return t.filter(x => x === type || x === 'A').length;
  }
  energyCardsOf(slot, type) { // cartas de energía de un tipo
    return slot.energy.filter(c => { const d = this.def(c); if (!type) return true; if (c.buzzap) return c.buzzap === type; if (d.name === 'Rainbow Energy' || d.name === 'Miracle Energy') return true; if (c.conv && c.convT === this.turnNo) return c.conv === type; return d.etype === type; });
  }
  canPay(cost, tokens) {
    const pool = tokens.slice(); const need = cost.filter(x => x !== 'C'); let col = cost.length - need.length;
    for (const n of need) { let i = pool.indexOf(n); if (i < 0) i = pool.indexOf('A'); if (i < 0) return false; pool.splice(i, 1); }
    return pool.length >= col;
  }
  extraEnergy(slot, atk, type) {
    const t = this.energyTokens(slot);
    const cnt = t.filter(x => x === type || x === 'A').length;
    const req = atk.cost.filter(x => x === type).length;
    return Math.max(0, Math.min(cnt - req, t.length - atk.cost.length));
  }
  retreatCost(slot) {
    const p = this.ownerOf(slot);
    let c = this.eff(slot).ret;
    if (this.eff(slot).trainerMon) return 99;
    if (this.stadiumIs("The Rocket's Training Gym")) c += 1;
    if (this.stadiumIs('Cerulean City Gym') && this.hasName(slot, 'Misty')) c -= 1;
    const o = this.opp(p);
    if (o.active && this.powerActive(o.active, 'Sticky Goo')) c += 2;
    c -= this.findPower(p, 'Retreat Aid', 'bench').length;
    if (this.stadiumIs('Broken Ground Gym') && this.eff(slot).stage === 0) c += 1;
    if (this.opp(p).perk === 'morty') c += 1;
    if (slot.fx.retreatPlus) c += 1;
    if (this.eff(slot).name.indexOf('Unown') === 0 && p.bench.some(s => this.baseDef(s).pw && this.baseDef(s).pw.name === '[Zoom]' && this.powerOn(s))) c = 0;
    return Math.max(0, c);
  }

  // ---------- movimientos de cartas ----------
  mkSlot(p, card) { return { u: UID++, owner: p.i, cards: [card], energy: [], att: [], dmg: 0, st: null, poison: 0, parT: 0, played: this.turnNo, evolved: -1, fx: {}, persist: {} }; }
  slotCards(slot) { return slot.cards.concat(slot.energy, slot.att); }
  removeSlot(slot) {
    const p = this.ownerOf(slot);
    if (p.active === slot) p.active = null; else p.bench = p.bench.filter(s => s !== slot);
  }
  discardSlot(slot) { const p = this.ownerOf(slot); this.removeSlot(slot); for (const c of this.slotCards(slot)) { delete c.buzzap; this.toDiscard(c); } }
  toDiscard(c) {
    const p = this.p[c.owner];
    if (c.inPlay) { delete c.inPlay; delete c.conv; if (this.def(c).name === 'Recycle Energy' && !this.miraculousWind()) { p.hand.push(c); this.log('La Energía Reciclaje vuelve a la mano.'); return; } }
    p.discard.push(c);
  }
  shuffleSlotIntoDeck(slot) { const p = this.ownerOf(slot); this.removeSlot(slot); for (const c of this.slotCards(slot)) { if (c.buzzap) { delete c.buzzap; } this.p[c.owner].deck.push(c); } shuffle(p.deck, this.rnd); }
  returnSlotToHand(slot, energyToo = true) { const p = this.ownerOf(slot); this.removeSlot(slot); for (const c of slot.cards) p.hand.push(c); for (const c of slot.energy) { if (energyToo && !c.buzzap) p.hand.push(c); else { delete c.buzzap; this.toDiscard(c); } } for (const c of slot.att) this.toDiscard(c); }
  draw(p, n = 1) { let k = 0; while (k < n && p.deck.length) { p.hand.push(p.deck.pop()); k++; } return k; }
  shuffleDeck(p) { shuffle(p.deck, this.rnd); }
  removeFrom(arr, c) { const i = arr.indexOf(c); if (i >= 0) arr.splice(i, 1); return c; }
  clearOnBench(slot) { slot.fx = {}; slot.st = null; slot.poison = 0; for (const c of slot.att.slice()) { const n = this.def(c).name; if (n === "Koga's Ninja Trick" || n === 'Charity') { this.removeFrom(slot.att, c); if (n === 'Charity') this.p[c.owner].hand.push(c); else this.toDiscard(c); } } }
  async switchActive(p, benchSlot, why) {
    if (!benchSlot || !p.bench.includes(benchSlot)) return;
    const old = p.active;
    if (old && old.fx.noSwitch && why !== 'retreat' && why !== 'force') { this.log(`${this.nm(old)} está atrapado: el cambio no tiene efecto.`); return; }
    // Charco de Magma (Magcargo)
    if (old && this.powerActive(old, 'Magma Pool')) { const f = old.energy.find(c => this.def(c).name === 'Fire Energy'); if (f) { this.removeFrom(old.energy, f); benchSlot.energy.push(f); this.log('Charco de Magma pasa una Energía Fuego al nuevo Activo.'); } }
    p.bench = p.bench.filter(s => s !== benchSlot);
    p.active = benchSlot;
    if (old) { this.clearOnBench(old); p.bench.push(old); }
    if (old) this.log(`${p.name}: ${this.nm(old)} se retira a la banca; ${this.nm(benchSlot)} pasa a ser Activo.`);
    else this.log(`${p.name}: ${this.nm(benchSlot)} pasa a ser Activo.`);
    // Púas (Forretress): durante el turno del rival del dueño de Forretress
    const o = this.opp(p);
    if (this.cur === p.i && this.findPower(o, 'Spikes').length) { benchSlot.dmg += 10; this.log(`Púas hace 10 de daño a ${this.nm(benchSlot)}.`); }
  }
  nm(slot) { return slot ? this.eff(slot).nameEs : '—'; }
  cn(c) { return this.def(c).nameEs; }

  // ---------- estados ----------
  canBeStatused(slot) {
    if (this.eff(slot).trainerMon) return false;
    if (this.powerActive(slot, 'Thick Skinned')) return false;
    if (slot.fx.noStatus) return false;
    return true;
  }
  setStatus(slot, s, by) {
    if (!slot || !this.canBeStatused(slot)) return false;
    if (s === 'poisoned' || s === 'toxic') { const amt = s === 'toxic' ? 20 : 10; slot.poison = Math.max(slot.poison === 20 ? 20 : 0, amt); if (by && by.koga) slot.poison = 20; }
    else { slot.st = s; if (s === 'paralyzed') slot.parT = this.turnNo; }
    const dn = this.baseDef(slot);
    if (dn.pw && dn.pw.name === 'Shapeshift' && (s === 'asleep' || s === 'confused' || s === 'paralyzed')) for (const c of slot.att.filter(c => this.isEvoCard(c))) { this.removeFrom(slot.att, c); this.toDiscard(c); }
    this.log(`${this.nm(slot)} ahora está ${s === 'toxic' ? 'Envenenado (20)' : STATUS_ES[s]}.`);
    return true;
  }
  cure(slot) { slot.st = null; slot.poison = 0; }

  // ---------- daño ----------
  // daño directo de contadores (sin debilidad/resistencia, p.ej. veneno, autodaño)
  putDamage(slot, n) { if (!slot || n <= 0) return 0; slot.dmg += n; return n; }
  heal(slot, n) { const h = Math.min(slot.dmg, n); slot.dmg -= h; return h; }

  // daño de ataque a cualquier objetivo
  attackDamage(x, target, amount, opts = {}) {
    if (!target || amount <= 0 && !opts.forceZero) return 0;
    if (x.immune.has(target.u)) return 0;
    const atkSlot = x.att; const ae = x.e; const te = this.eff(target);
    const toActive = this.isActive(target) && target.owner !== atkSlot.owner;
    let d = amount;
    // Energía Metálica en un atacante no Metálico / Encanto (antes de D/R)
    if (!opts.raw && !this.miraculousWind()) { const mN = atkSlot.energy.filter(c => this.def(c).name === 'Metal Energy').length; if (mN && !ae.types.includes('M')) d -= 10 * mN; }
    if (atkSlot.fx.weakened && toActive) d -= atkSlot.fx.weakened.v;
    d = Math.max(0, d);
    if (opts.wr !== false && toActive) {
      if (x.perkBonus) d += x.perkBonus;
      const ignoreWeak = this.stadiumIs('Cinnabar City Gym') && ae.types.includes('W') && te.name.indexOf('Blaine') >= 0;
      if (te.weak && ae.types.includes(te.weak) && !ignoreWeak && opts.weak !== false) d *= 2;
      const noRes = opts.res === false || (this.stadiumIs('Pewter City Gym') && ae.name.indexOf('Brock') >= 0);
      if (te.res && ae.types.includes(te.res) && !noRes) d -= this.stadiumIs('Resistance Gym') ? 10 : 30;
    }
    d = Math.max(0, d);
    if (opts.raw) { target.dmg += d; return d; }
    // bonos del atacante (después de D/R) sólo al Defensor
    if (toActive && d > 0 && x.isMainTarget(target)) {
      d += 10 * atkSlot.att.filter(c => this.def(c).name === 'PlusPower').length;
      if (x.me.flags.misty && ae.name.indexOf('Misty') >= 0) d += 20;
      if (x.vermilion) d += 10;
      if (!this.miraculousWind()) d += 10 * atkSlot.energy.filter(c => this.def(c).name === 'Darkness Energy').length;
      if (x.bonusAfter) d += x.bonusAfter;
    }
    if (d > 0 && target.fx.screech && target.owner !== atkSlot.owner) d += 20;
    // reducciones del defensor
    const tp = this.ownerOf(target);
    if (opts.pierce || (x.pierce && x.isMainTarget(target))) { d = r10(d); target.dmg += d; if (d > 0) x.damaged.push([target, d]); return d; }
    if (!this.isActive(target) && tp.flags.transparentWalls >= this.turnNo && target.owner !== atkSlot.owner) return 0;
    if (target.fx.preventAll || target.fx.immune) d = 0;
    if (target.fx.preventDmgFrom && target.fx.preventDmgFrom.v === atkSlot.u) d = 0;
    if (target.fx.harden && d <= 30) d = 0;
    if (target.fx.harden20 && d <= 20) d = 0;
    if (target.fx.guard30 && d >= 30) d = 0;
    if (!this.isActive(target) && target.owner !== atkSlot.owner && tp.flags.benchShield && tp.active && tp.active.u === tp.flags.benchShield.slot && tp.flags.benchShield.until >= this.turnNo) d = 0;
    if (!this.miraculousWind()) d -= 10 * target.energy.filter(c => this.def(c).name === 'Metal Energy').length;
    if (this.stadiumIs('Sprout Tower') && ae.types.includes('C')) d -= 30;
    if (target.owner !== atkSlot.owner) for (const [pw, ty] of [['[Darkness]', 'D'], ['[Metal]', 'M'], ['[Normal]', 'C']]) if (ae.types.includes(ty)) { const u = this.slots(tp).filter(s => this.baseDef(s).pw && this.baseDef(s).pw.name === pw); if (u.length === 1 && this.powerOn(u[0])) d -= 30; }
    if (target.fx.reduce) d -= target.fx.reduce.v;
    if (target.fx.reduceFrom && target.fx.reduceFrom.v.from === atkSlot.u) d -= target.fx.reduceFrom.v.n;
    if (target.fx.halve) d = floor10(d / 2);
    d -= 20 * target.att.filter(c => this.def(c).name === 'Defender').length;
    d = Math.max(0, d);
    if (this.powerActive(target, 'Invisible Wall') && d >= 30) { this.log('Muro Invisible evita el daño.'); d = 0; }
    if (this.powerActive(target, 'Kabuto Armor')) d = floor10(d / 2);
    if (this.powerActive(target, 'Strange Barrier') && ae.stage === 0 && d >= 20) d = 10;
    if (this.powerActive(target, 'Shell Armor')) d = Math.max(0, d - 10);
    if (this.powerActive(target, 'Hard Shell') && d > 0 && d <= 40) d = 10;
    const iv = this.findPower(tp, 'Relaxing Scent', 'active'); if (iv.length) d = ceil10(d / 2);
    const iv2 = this.findPower(this.ownerOf(atkSlot), 'Relaxing Scent', 'active'); if (iv2.length && iv2[0] !== iv[0]) d = ceil10(d / 2);
    if ((tp.perk === 'brock' || tp.perk === 'jasmine') && d > 0) d = Math.max(0, d - 10);
    if (x.charity && target === x.def) d = Math.max(0, d - x.charity);
    // Bench Guard (Rhydon de Brock)
    if (!this.isActive(target) && d > 0) {
      const g = this.findPower(tp, 'Bench Guard', 'bench').filter(s => s !== target && this.hpLeft(s) > 10);
      if (g.length) { d -= 10; g[0].dmg += 10; this.log('Guardia de Banca: Rhydon de Brock recibe 10 de daño.'); }
    }
    d = r10(d);
    // Fortaleza (Machamp de Giovanni)
    if (d > 0 && target.dmg + d >= te.hp && this.powerActive(target, 'Fortitude')) {
      x.pendingFortitude = x.pendingFortitude || []; x.pendingFortitude.push(target);
    }
    target.dmg += d;
    if (d > 0) x.damaged.push([target, d]);
    return d;
  }

  // ---------- inicio ----------
  async setup() {
    for (const p of this.p) shuffle(p.deck, this.rnd);
    // mulligan
    const mull = [0, 0];
    for (const p of this.p) {
      let tries = 0;
      while (true) {
        this.draw(p, 7);
        if (p.hand.some(c => this.isBasicCard(c) && this.def(c).st === 'P')) break;
        this.log(`${p.name} no tiene Pokémon Básicos: muestra su mano y baraja (mulligan).`);
        p.deck.push(...p.hand); p.hand = []; shuffle(p.deck, this.rnd); mull[p.i]++;
        if (++tries > 30) { // mazo sin básicos: forzar
          const b = p.deck.findIndex(c => this.isBasicCard(c)); if (b < 0) throw new Error('Mazo sin básicos');
          p.hand.push(p.deck.splice(b, 1)[0]); this.draw(p, 6); break;
        }
      }
    }
    for (const p of this.p) if (mull[1 - p.i] > 0) {
      const ok = await this.ask(p, { kind: 'yesno', title: `Tu rival hizo ${mull[1 - p.i]} mulligan(s). ¿Robar ${mull[1 - p.i]} carta(s) extra?`, purpose: 'drawExtra' });
      if (ok) this.draw(p, mull[1 - p.i]);
    }
    // colocar activos y banca
    for (const p of this.p) {
      const basics = p.hand.filter(c => this.isBasicCard(c) && this.def(c).st === 'P');
      const [a] = await this.ask(p, { kind: 'cards', title: 'Elige tu Pokémon Activo', cards: basics, min: 1, max: 1, purpose: 'setupActive' });
      this.removeFrom(p.hand, a); p.active = this.mkSlot(p, a); p.active.played = 0;
      const rest = p.hand.filter(c => this.isBasicCard(c) && this.def(c).st === 'P');
      if (rest.length) {
        const bs = await this.ask(p, { kind: 'cards', title: 'Elige Pokémon Básicos para tu Banca (opcional)', cards: rest, min: 0, max: Math.min(5, rest.length), purpose: 'setupBench' });
        for (const c of bs) { this.removeFrom(p.hand, c); const s = this.mkSlot(p, c); s.played = 0; p.bench.push(s); }
      }
      const np = ['giovanni', 'rocket', 'lance', 'red'].includes(p.perk) ? 5 : 6;
      for (let k = 0; k < np; k++) p.prizes.push(p.deck.pop());
    }
    // ventaja Blaine: energía de fuego gratis
    for (const p of this.p) if (p.perk === 'blaine') {
      for (const s of this.slots(p)) { const i = p.deck.findIndex(c => this.def(c).name === 'Fire Energy'); if (i >= 0) { s.energy.push(p.deck.splice(i, 1)[0]); } }
      shuffle(p.deck, this.rnd); this.log(`Ventaja de Blaine: sus Pokémon comienzan con 1 Energía Fuego.`);
    }
    const r = await this.flip(this.p[0], 1, '¿Quién empieza? (Cara: tú)');
    this.cur = r[0] ? 0 : 1;
    this.log(`${this.p[this.cur].name} comienza la partida.`);
    this.upd();
  }

  // ---------- bucle principal ----------
  async run() {
    try {
      await this.setup();
      while (this.winner == null) await this.turn();
    } catch (e) { if (!(e instanceof GameOver)) throw e; }
    return this.winner;
  }
  win(i, why) { if (this.winner == null) { this.winner = i; this.winReason = why; this.log(`🏆 ${this.p[i].name} gana: ${why}`); this.upd(); } throw new GameOver(i); }

  async turn() {
    const p = this.p[this.cur]; const o = this.opp(p);
    this.turnNo++;
    p.energyPlayed = false; p.retreated = false; p.used = {}; p.forceEnd = false; p.mistyExtra = false; p.attacked = false; p.flags.misty = false; p.flags.koga = false; p.flags.recall = false; p.flags.blaine = false; p.flags.giovanni = null; p.extraEnergy = 0;
    this.log(`— Turno ${this.turnNo}: ${p.name} —`);
    this.berries();
    if (!p.deck.length) this.win(o.i, `${p.name} no puede robar carta.`);
    this.draw(p, 1);
    if ((p.perk === 'sabrina' || p.perk === 'karen') && p.deck.length) { this.draw(p, 1); }
    // devolver mano apartada (Máquina de Cosquillas) – se devuelve al final de su turno
    this.upd();
    p.turnOver = false;
    if (p.ai) await this.ai.takeTurn(this, p);
    else await this.io.humanTurn(this, p);
    this.check();
    await this.endTurn(p);
  }
  berries() {
    for (const s of this.allSlots()) {
      if (this.isActive(s) && this.powerActive(s, 'Legendary Body')) for (const c of s.att.slice()) if (this.isTrainer(c)) { this.discardAtt(s, c); this.log('Cuerpo Legendario descarta un Entrenador unido.'); }
      const t = this.tool(s); if (!t) continue; const n = this.def(t).name;
      if (n === 'Berry' && s.dmg >= 20) { s.dmg -= 20; this.discardAtt(s, t); this.log(`La Baya cura 20 a ${this.nm(s)}.`); }
      if (n === 'Gold Berry' && s.dmg >= 40) { s.dmg -= 40; this.discardAtt(s, t); this.log(`La Baya Dorada cura 40 a ${this.nm(s)}.`); }
      if (n === 'Miracle Berry' && (s.st || s.poison)) { this.cure(s); this.discardAtt(s, t); this.log(`La Baya Milagro cura los estados de ${this.nm(s)}.`); }
    }
  }
  async endTurn(p) {
    const o = this.opp(p);
    // Energía Milagro y Lupa se descartan al final del turno de su dueño
    for (const s of this.slots(p)) {
      for (const c of s.energy.slice()) if (this.def(c).name === 'Miracle Energy') { this.removeFrom(s.energy, c); this.toDiscard(c); this.log('Se descarta la Energía Milagro.'); }
      for (const c of s.att.slice()) if (this.def(c).name === 'Magnifier') this.discardAtt(s, c);
      if (s.fx.submerge) delete s.fx.submerge;
    }
    // Energía Siniestra: 1 contador a los Pokémon que no son Siniestros
    if (!this.miraculousWind()) for (const s of this.allSlots()) { const n = s.energy.filter(c => this.def(c).name === 'Darkness Energy').length; if (n && !this.isDarkMon(s)) { s.dmg += 10 * n; this.log(`La Energía Siniestra daña a ${this.nm(s)} (${10 * n}).`); } }
    // Contadores de Chamuscar
    for (const s of this.allSlots()) if (s.persist.char) { const r = await this.flip(this.ownerOf(s), 1, `Chamuscar en ${this.nm(s)}`); if (!r[0]) { s.dmg += 20; this.log(`Chamuscar hace 20 de daño a ${this.nm(s)}.`); } }
    // descartar PlusPower, ESP, devolver Charity
    for (const s of this.slots(p)) for (const c of s.att.slice()) {
      const n = this.def(c).name;
      if (n === 'PlusPower' || n === "Sabrina's ESP") { this.removeFrom(s.att, c); this.toDiscard(c); }
      if (n === 'Charity') { this.removeFrom(s.att, c); p.hand.push(c); }
    }
    // Defender: se descarta al final del siguiente turno del rival
    for (const pl of this.p) for (const s of this.slots(pl)) for (const c of s.att.slice()) if (this.def(c).name === 'Defender' && c.until <= this.turnNo) { this.removeFrom(s.att, c); this.toDiscard(c); }
    if (p.setAside.length && p.setAsideUntil <= this.turnNo) { p.hand.push(...p.setAside); p.setAside = []; }
    if (o.setAside.length && o.setAsideUntil <= this.turnNo) { o.hand.push(...o.setAside); o.setAside = []; }
    if (p.perk === 'whitney' && p.active && p.active.dmg) { this.heal(p.active, 20); this.log('Leche Mu-mu de Blanca cura a su Pokémon Activo.'); }
    if (p.perk === 'erika') { let h = 0; for (const s of this.slots(p)) h += this.heal(s, 10); if (h) this.log('Aroma Floral de Erika cura a sus Pokémon.'); }
    // revisión Pokémon (entre turnos)
    for (const pl of [p, o]) {
      const s = pl.active; if (!s) continue;
      if (s.poison) { s.dmg += s.poison; this.log(`${this.nm(s)} recibe ${s.poison} de daño por veneno.`); }
    }
    for (const pl of [p, o]) {
      const s = pl.active; if (!s) continue;
      if (s.st === 'asleep') { const deep = this.anyPower('Deep Sleep').length > 0; const rr = await this.flip(pl, deep ? 2 : 1, `¿${this.nm(s)} despierta?${deep ? ' (Sueño Profundo)' : ''}`); const r = [rr.every(v => v)]; if (r[0]) { s.st = null; this.log(`${this.nm(s)} se despierta.`); } else this.log(`${this.nm(s)} sigue dormido.`); }
    }
    if (p.active && p.active.st === 'paralyzed' && p.active.parT < this.turnNo) { p.active.st = null; this.log(`${this.nm(p.active)} ya no está paralizado.`); }
    // Escapar (Primeape de Brock)
    for (const s of this.allSlots()) if (this.powerActive(s, 'Scram') && this.hpLeft(s) === 10) { this.log('Primeape de Brock huye al mazo.'); this.shuffleSlotIntoDeck(s); }
    // expirar efectos
    for (const s of this.allSlots()) for (const k of Object.keys(s.fx)) if (s.fx[k] && s.fx[k].until <= this.turnNo) delete s.fx[k];
    for (const pl of this.p) for (const k of Object.keys(pl.flags)) if (typeof pl.flags[k] === 'object' && pl.flags[k] && pl.flags[k].until <= this.turnNo) delete pl.flags[k];
    this.berries();
    await this.resolveKOs(null);
    this.firstTurn[p.i] = false;
    this.cur = o.i;
    this.upd();
  }

  // ---------- K.O. ----------
  async resolveKOs(attackCtx) {
    const kos = [];
    for (const pl of [this.p[1 - this.cur], this.p[this.cur]]) for (const s of this.slots(pl)) if (s.dmg >= this.hp(s)) kos.push(s);
    if (!kos.length) return;
    for (const s of kos) {
      const pl = this.ownerOf(s); const o = this.opp(pl); const e = this.eff(s);
      if (!this.slots(pl).includes(s)) continue;
      this.log(`💥 ${this.nm(s)} de ${pl.name} queda Fuera de Combate.`);
      const rebirth = this.baseDef(s).pw && this.baseDef(s).pw.name === 'Rebirth' && this.powerOn(s) && !this.statusBlocksPower(s);
      this.discardSlot(s);
      if (rebirth && await this.ask(pl, { kind: 'yesno', title: '¿Usar Renacer y devolver a Moltres del Team Rocket a tu mano?', purpose: 'yes' })) {
        const c = pl.discard.find(c => this.def(c).name === "Rocket's Moltres"); if (c) { this.removeFrom(pl.discard, c); pl.hand.push(c); }
      }
      if (!e.trainerMon) {
        const n = 1;
        for (let k = 0; k < n && o.prizes.length; k++) { o.hand.push(o.prizes.pop()); }
        this.log(`${o.name} toma una carta de Premio (${o.prizes.length} restantes).`);
      }
    }
    this.upd();
    const curP = this.p[this.cur];
    const w0 = this.p[0].prizes.length === 0, w1 = this.p[1].prizes.length === 0;
    if (w0 || w1) this.win(w0 && w1 ? curP.i : (w0 ? 0 : 1), 'tomó todas sus cartas de Premio.');
    for (const pl of [this.p[1 - this.cur], this.p[this.cur]]) if (!pl.active && !pl.bench.length) this.win(1 - pl.i, `${pl.name} no tiene Pokémon en juego.`);
    for (const pl of [this.p[1 - this.cur], this.p[this.cur]]) if (!pl.active) {
      const s = await this.ask(pl, { kind: 'slot', title: 'Elige tu nuevo Pokémon Activo', options: pl.bench.slice(), purpose: 'newActive' });
      await this.switchActive(pl, s || pl.bench[0]);
    }
    this.upd();
  }

  // ================= ACCIONES DEL TURNO =================
  canAct(p) { return this.cur === p.i && !p.turnOver && this.winner == null; }
  noTrainers(p) {
    if (this.anyPower('Hay Fever').length) return 'Fiebre del Heno impide jugar Entrenadores.';
    if (p.flags.noTrainer && p.flags.noTrainer.until >= this.turnNo) return 'No puedes jugar Entrenadores este turno.';
    return null;
  }
  // --- Pokémon básico a la banca ---
  canPlayBasic(p, c) { return this.canAct(p) && this.isBasicCard(c) && p.bench.length < this.benchMax(p) && p.hand.includes(c) && (this.def(c).st === 'P' || !this.noTrainers(p)); }
  async playBasic(p, c) {
    if (!this.canPlayBasic(p, c)) return false;
    this.removeFrom(p.hand, c);
    const s = this.mkSlot(p, c);
    if (!p.active) p.active = s; else p.bench.push(s);
    this.log(`${p.name} pone a ${this.cn(c)} en juego.`);
    if (s !== p.active && this.def(c).st === 'P') for (const pl of this.p) if (pl.active && this.powerActive(pl.active, 'Hot Plate')) { s.dmg += 10; this.log(`Plancha Ardiente hace 10 de daño a ${this.cn(c)}.`); break; }
    if (this.stadiumIs("Rocket's Minefield Gym")) { const r = await this.flip(p, 1, 'Gimnasio Minado: ¿cruz = 10 de daño?'); if (!r[0]) { s.dmg += 10; this.log('El Gimnasio Minado del Team Rocket daña al Pokémon (10).'); } }
    await this.onPlayPower(p, s);
    await this.resolveKOs(null); this.upd(); return true;
  }
  async onPlayPower(p, s) {
    const d = this.baseDef(s); if (!d.pw) return;
    const P = FX.pw[d.pw.name]; if (P && P.onPlay && this.powerOn(s)) await P.onPlay(this, p, s);
  }
  // --- evolución ---
  evoTargets(p, c, ignoreTiming) {
    const d = this.def(c);
    if (d.st === 'P' && d.stage === 0) { // Evolución de Bebé
      if (this.anyPower('Prehistoric Power').length) return [];
      const o = this.opp(p); const scared = o.active && this.powerActive(o.active, 'Scare');
      return this.slots(p).filter(s => { const bd = this.baseDef(s); return bd.baby && (bd.babyTo || []).includes(d.name) && !scared && !this.statusBlocksPower(s) && !s.fx.noEvolve; });
    }
    if (!this.isEvoCard(c)) return [];
    if (this.anyPower('Prehistoric Power').length) return [];
    return this.slots(p).filter(s => {
      const bd = this.baseDef(s);
      if (bd.st !== 'P' && bd.name !== 'Mysterious Fossil') return false;
      if (bd.pw && bd.pw.name === 'Transform' && this.isActive(s)) return false;
      if (bd.name !== d.from) return false;
      if (s.fx.noEvolve && !ignoreTiming) return false;
      if (ignoreTiming) return true;
      const gio = (p.flags.giovanni && p.flags.giovanni === s.u) || (p.perk === 'giovanni' && bd.name.indexOf('Giovanni') >= 0 && !this.firstTurn[p.i]) || (p.perk === 'rocket' && d.name.startsWith('Dark ') && !this.firstTurn[p.i]) || (p.perk === 'bugsy' && d.types.includes('G') && !this.firstTurn[p.i]);
      if (gio) return true;
      if (this.firstTurn[p.i] || s.played === this.turnNo || s.evolved === this.turnNo) return false;
      return true;
    });
  }
  canEvolve(p, c, s) { return this.canAct(p) && p.hand.includes(c) && this.evoTargets(p, c).includes(s); }
  async evolve(p, c, s, free) {
    if (!free && !this.canEvolve(p, c, s)) return false;
    if (p.hand.includes(c)) this.removeFrom(p.hand, c);
    const from = this.nm(s);
    const wasBaby = this.baseDef(s).baby;
    s.cards.push(c); s.evolved = this.turnNo; s.st = null; s.poison = 0; s.fx = {};
    if (wasBaby) { s.dmg = 0; this.log('Evolución de Bebé: se retiran todos los contadores de daño.'); }
    if (p.flags.giovanni === s.u) {} // continúa aplicando
    this.log(`${p.name} evoluciona a ${from} en ${this.cn(c)}.`);
    if (this.stadiumIs('Viridian City Gym') && this.hasName(s, 'Giovanni')) this.heal(s, 20);
    await this.onPlayPower(p, s);
    await this.resolveKOs(null); this.upd(); return true;
  }
  // --- energía ---
  canAttach(p, c, s) {
    if (!this.canAct(p) || !p.hand.includes(c) || !this.isEnergy(c) || !this.slots(p).includes(s)) return false;
    if (s.fx.noEnergy) return false;
    if (this.eff(s).trainerMon) return false;
    if (this.def(c).name === 'Miracle Energy' && !/^(Shining|Light) /.test(this.eff(s).name)) return false;
    if (!p.energyPlayed) return true;
    // Danza Lluvia
    const d = this.def(c);
    if (d.name === 'Water Energy' && this.eff(s).types.includes('W') && this.findPower(p, 'Rain Dance').length) return true;
    if (p.flags.blaine && d.name === 'Fire Energy' && p.blaineLeft > 0 && this.hasName(s, 'Blaine') && (!p.blaineTarget || p.blaineTarget === s.u)) return true;
    if (p.perk === 'misty' && d.name === 'Water Energy' && !p.mistyExtra) return true;
    return false;
  }
  async attach(p, c, s) {
    if (!this.canAttach(p, c, s)) return false;
    const d = this.def(c);
    let viaPower = false;
    if (p.energyPlayed) {
      if (p.flags.blaine && d.name === 'Fire Energy' && p.blaineLeft > 0 && this.hasName(s, 'Blaine')) { p.blaineLeft--; p.blaineTarget = s.u; }
      else if (d.name === 'Water Energy' && this.eff(s).types.includes('W') && this.findPower(p, 'Rain Dance').length) { viaPower = true; }
      else if (p.perk === 'misty') p.mistyExtra = true;
    } else {
      if (p.flags.blaine && d.name === 'Fire Energy' && this.hasName(s, 'Blaine')) { p.blaineLeft = 1; p.blaineTarget = s.u; }
      p.energyPlayed = true;
    }
    this.removeFrom(p.hand, c); s.energy.push(c);
    this.log(`${p.name} une ${this.cn(c)} a ${this.nm(s)}${viaPower ? ' (Danza Lluvia)' : ''}.`);
    if (d.name === 'Rainbow Energy') { s.dmg += 10; this.log('La Energía Arcoíris hace 10 de daño.'); }
    if (d.name === 'Full Heal Energy') { this.cure(s); }
    if (d.name === 'Potion Energy') this.heal(s, 10);
    if (d.name === 'Fire Energy' && this.powerActive(s, 'Healing Fire')) this.heal(s, 10);
    c.inPlay = true;
    await this.onAttachEnergy(p, c, s);
    await this.resolveKOs(null); this.upd(); return true;
  }
  async onAttachEnergy(p, c, s) {
    const d = this.def(c); const o = this.opp(p);
    // Conductividad (Ampharos Oscuro del rival)
    const amp = this.uniquePower(o, 'Conductivity'); if (amp) { s.dmg += 10; this.log(`Conductividad hace 10 de daño a ${this.nm(s)}.`); }
    if (s.fx.triggered) { this.setStatus(s, 'poisoned'); }
    // Estallido Relámpago (Raikou)
    if (d.name === 'Lightning Energy' && this.powerActive(s, 'Lightning Burst') && o.bench.length && o.active) { const n = await this.ask(o, { kind: 'slot', title: 'Estallido Relámpago: elige tu nuevo Pokémon Activo', options: o.bench.slice(), purpose: 'newActive' }); await this.switchActive(o, n || o.bench[0]); }
    // Evolución por Energía (Eevee)
    if (this.powerActive(s, 'Energy Evolution') && d.etype) {
      const r = await this.flip(p, 1, 'Evolución por Energía');
      if (r[0]) await this.evolveFromDeck(p, s, ed => ed.types.includes(d.etype), 'Evolución por Energía: elige la evolución');
    }
  }
  // --- retirada ---
  canRetreat(p, bench) {
    if (!this.canAct(p) || p.retreated || !p.active || !p.bench.length) return false;
    const s = p.active;
    if (s.st === 'asleep' || s.st === 'paralyzed') return false;
    if (s.fx.noRetreat || s.fx.noSwitch) return false;
    const cost = this.retreatCost(s);
    if (s.att.some(c => this.def(c).name === 'Balloon Berry')) return true;
    if (cost > 50) return false;
    return this.energyTokens(s).length >= cost;
  }
  async retreat(p, bench) {
    if (!this.canRetreat(p) || !p.bench.includes(bench)) return false;
    const s = p.active; let cost = this.retreatCost(s);
    const balloon = s.att.find(c => this.def(c).name === 'Balloon Berry');
    if (balloon) { this.discardAtt(s, balloon); this.log('Se descarta la Baya Globo en lugar de Energía.'); cost = 0; }
    const o0 = this.opp(p);
    if (s.fx.pursuit) { s.dmg += 10; this.log(`Persecución hace 10 de daño a ${this.nm(s)}.`); }
    if (o0.active && this.powerActive(o0.active, '[Chase]')) { const r = await this.flip(o0, 1, '[Cazar]'); if (r[0]) { s.dmg += 10; this.log(`[Cazar] pone un contador en ${this.nm(s)}.`); } }
    if (s.dmg >= this.hp(s)) { await this.resolveKOs(null); this.upd(); return true; }
    if (cost > 0) {
      const chosen = await this.chooseEnergyToPay(p, s, cost, 'Elige energía para pagar la retirada');
      if (!chosen) return false;
      for (const c of chosen) { this.removeFrom(s.energy, c); delete c.buzzap; this.toDiscard(c); }
    }
    p.retreated = true;
    if (s.st === 'confused') {
      const r = await this.flip(p, 1, `${this.nm(s)} está confundido: ¿puede retirarse?`);
      if (!r[0]) { this.log('Cruz: no puede retirarse.'); this.upd(); return true; }
    }
    await this.switchActive(p, bench, 'retreat');
    // Sumidero (Dugtrio Oscuro)
    const o = this.opp(p);
    if (this.findPower(o, 'Sinkhole').length) { const r = await this.flip(p, 1, 'Sumidero'); if (!r[0]) { s.dmg += 20; this.log(`Sumidero hace 20 de daño a ${this.nm(s)}.`); } }
    await this.resolveKOs(null); this.upd(); return true;
  }
  async chooseEnergyToPay(p, s, cost, title) {
    // devuelve lista de cartas de energía que suman >= cost
    const cards = s.energy.slice();
    const val = c => (c.buzzap || this.def(c).name === 'Double Colorless Energy') ? 2 : 1;
    const total = cards.reduce((a, c) => a + val(c), 0);
    if (total < cost) return null;
    if (cards.every(c => val(c) === 1) && cards.length === cost) return cards;
    const sel = await this.ask(p, { kind: 'cards', title: `${title} (${cost})`, cards, min: 1, max: cards.length, sumTo: cost, valueOf: val, purpose: 'payEnergy', slot: s });
    if (sel.reduce((a, c) => a + val(c), 0) < cost) return null;
    return sel;
  }
  // --- entrenadores ---
  trainerFx(c) { return FX.tr[this.def(c).name]; }
  canPlayTrainer(p, c) {
    if (!this.canAct(p) || !p.hand.includes(c) || !this.isTrainer(c)) return false;
    const d = this.def(c);
    if (d.name === 'Clefairy Doll' || d.name === 'Mysterious Fossil') return !this.noTrainers(p) && p.bench.length < this.benchMax(p);
    if (this.noTrainers(p)) return false;
    const t = this.trainerFx(c); if (!t) return false;
    if (d.sub && d.sub.includes('Stadium') && this.stadium && this.def(this.stadium).name === d.name) return false;
    if (d.sub && d.sub.includes('Pokémon Tool') && !this.slots(p).some(s => !this.tool(s) && !this.eff(s).trainerMon)) return false;
    if (t.can && !t.can(this, p, c)) return false;
    return true;
  }
  async playTrainer(p, c, opts = {}) {
    if (!opts.force && !this.canPlayTrainer(p, c)) return false;
    const d = this.def(c);
    if (d.name === 'Clefairy Doll' || d.name === 'Mysterious Fossil') return this.playBasic(p, c);
    const t = this.trainerFx(c);
    if (!opts.fromDiscard) this.removeFrom(p.hand, c);
    this.log(`${p.name} juega ${this.cn(c)}.`);
    // Juegos Mentales (Slowking del rival)
    { const o = this.opp(p); const sk = this.findPower(o, 'Mind Games');
      if (sk.length && await this.ask(o, { kind: 'yesno', title: `Juegos Mentales: ¿lanzar moneda para anular ${this.cn(c)}?`, purpose: 'mindGames' })) {
        const r = await this.flip(o, 1, 'Juegos Mentales');
        if (r[0]) { this.log(`Juegos Mentales: ${this.cn(c)} no hace nada y vuelve encima del mazo.`); p.deck.push(c); this.upd(); return true; }
      } }
    // Herramientas Pokémon
    if (d.sub && d.sub.includes('Pokémon Tool')) {
      const opts = this.slots(p).filter(s => !this.tool(s) && !this.eff(s).trainerMon);
      const t = opts.length === 1 ? opts[0] : await this.ask(p, { kind: 'slot', title: `¿A qué Pokémon unes ${this.cn(c)}?`, options: opts, purpose: 'attachTool' });
      (t || opts[0]).att.push(c); this.log(`${this.cn(c)} se une a ${this.nm(t || opts[0])}.`); this.upd(); return true;
    }
    if (this.stadiumIs('Chaos Gym') && !(d.sub && d.sub.includes('Stadium')) && !opts.chaos) {
      const r = await this.flip(p, 1, 'Gimnasio Caos');
      if (!r[0]) {
        this.log('Gimnasio Caos: cruz, no puede jugarse.');
        const o = this.opp(p);
        if (t.can === undefined || t.can(this, o, c)) {
          const use = await this.ask(o, { kind: 'yesno', title: `Gimnasio Caos: ¿quieres usar ${this.cn(c)} del rival?`, purpose: 'chaosUse', card: c });
          if (use) { this.log(`${o.name} usa ${this.cn(c)}.`); if (!t.attachTo && !t.stadium) await t.play(this, o, c); }
        }
        this.toDiscard(c); this.upd(); return true;
      }
    }
    if (d.sub && d.sub.includes('Stadium')) {
      if (this.stadium) { this.toDiscard(this.stadium); }
      this.stadium = c;
      if (t.onPlay) await t.onPlay(this, p, c);
    } else {
      const keep = await t.play(this, p, c);
      if (keep !== 'attached' && !opts.fromDiscard) this.toDiscard(c);
    }
    await this.resolveKOs(null); this.upd(); return true;
  }
  // --- poderes activables ---
  powerUsable(p, s) {
    if (!this.canAct(p)) return false;
    const d = this.baseDef(s); if (!d.pw) return false;
    const P = FX.pw[d.pw.name]; if (!P || !P.use) return false;
    if (!this.powerActive(s, d.pw.name)) return false;
    if (P.once && p.used['pw' + s.u]) return false;
    if (P.can && !P.can(this, p, s)) return false;
    return true;
  }
  async usePower(p, s) {
    if (!this.powerUsable(p, s)) return false;
    const d = this.baseDef(s); const P = FX.pw[d.pw.name];
    this.log(`${p.name} usa el Poder Pokémon ${d.pw.nameEs} de ${this.nm(s)}.`);
    const r = await P.use(this, p, s);
    if (r !== false && P.once) p.used['pw' + s.u] = true;
    await this.resolveKOs(null); this.upd(); return true;
  }
  // otros usos en el turno (Estadios con acción, descartar muñeco)
  stadiumAction(p) {
    if (!this.stadium || !this.canAct(p)) return null;
    const t = this.trainerFx(this.stadium); if (!t || !t.action) return null;
    if (t.once && p.used.stadium) return null;
    if (t.actionCan && !t.actionCan(this, p)) return null;
    return t;
  }
  async useStadium(p) {
    const t = this.stadiumAction(p); if (!t) return false;
    const r = await t.action(this, p); if (r !== false) p.used.stadium = true;
    await this.resolveKOs(null); this.upd(); return true;
  }
  async discardTrainerMon(p, s) {
    if (!this.canAct(p) || !this.eff(s).trainerMon) return false;
    this.log(`${p.name} descarta ${this.nm(s)}.`);
    const wasActive = p.active === s; this.discardSlot(s);
    if (wasActive) { if (!p.bench.length) this.win(1 - p.i, 'sin Pokémon en juego.'); const n = await this.ask(p, { kind: 'slot', title: 'Elige tu nuevo Pokémon Activo', options: p.bench.slice(), purpose: 'newActive' }); await this.switchActive(p, n || p.bench[0]); }
    this.upd(); return true;
  }
  async discardShapeshift(p, s) {
    const c = s.att.find(c => this.isEvoCard(c)); if (!c || !this.canAct(p)) return false;
    this.removeFrom(s.att, c); this.toDiscard(c); this.upd(); return true;
  }

  // --- ataque ---
  attackList(p) {
    const s = p.active; if (!s) return [];
    const e = this.eff(s);
    return e.atk.map((a, i) => ({ a, i, ok: this.attackUsable(p, i).ok, why: this.attackUsable(p, i).why }));
  }
  attackUsable(p, i) {
    const s = p.active; if (!s || !this.canAct(p)) return { ok: false, why: 'No es tu turno' };
    const e = this.eff(s); const a = e.atk[i]; if (!a) return { ok: false };
    if (s.st === 'asleep') return { ok: false, why: 'Está Dormido' };
    if (s.st === 'paralyzed') return { ok: false, why: 'Está Paralizado' };
    if (s.fx.cantAttack) return { ok: false, why: 'No puede atacar este turno' };
    if (this.isBaby(s)) { const oo = this.opp(p); if (oo.active && this.powerActive(oo.active, 'Scare')) return { ok: false, why: 'Asustado: los Bebés no pueden atacar' }; }
    if (s.fx.amnesia && s.fx.amnesia.v === a.name) return { ok: false, why: 'Ataque bloqueado (Amnesia)' };
    if (s.fx.noAtk && s.fx.noAtk.v === a.name) return { ok: false, why: 'No puede usar este ataque este turno' };
    if (s.persist.usedOnce && s.persist.usedOnce.includes(a.name)) return { ok: false, why: 'Sólo una vez por partida' };
    const o = this.opp(p);
    if (s.fx.cantAttackSlot && o.active && s.fx.cantAttackSlot.v === o.active.u) return { ok: false, why: 'No puede atacar a ese Pokémon' };
    if (!this.canPay(a.cost, this.energyTokens(s))) return { ok: false, why: 'Energía insuficiente' };
    const F = FX.atk[a.fx];
    if (F && F.cond && !F.cond(this, p, s, a)) return { ok: false, why: 'No se cumplen las condiciones' };
    return { ok: true };
  }
  async attack(p, i) {
    const u = this.attackUsable(p, i); if (!u.ok) return false;
    const s = p.active; const o = this.opp(p); const e = this.eff(s); const a = e.atk[i];
    p.turnOver = true; p.attacked = true;
    // Regla de Bebé: el atacante lanza una moneda antes de hacer nada
    if (o.active && this.isBaby(o.active)) {
      const r = await this.flip(p, 1, `${this.nm(o.active)} es un Bebé: ¿puedes atacar?`);
      if (!r[0]) { this.log(`Cruz: el turno de ${p.name} termina sin atacar.`); this.upd(); return true; }
    }
    this.log(`⚔️ ${this.nm(s)} usa ${a.nameEs}.`);
    if (this.io.attackAnim) await this.io.attackAnim(this, p, s, a);
    // confusión
    if (s.st === 'confused') {
      const r = await this.flip(p, 1, `${this.nm(s)} está Confundido`);
      if (!r[0]) {
        let dd = 20; if (this.powerActive(s, 'Frenzy')) dd += 30;
        s.dmg += dd; this.log(`Cruz: ${this.nm(s)} se hace ${dd} de daño a sí mismo.`);
        await this.afterAttack(null); return true;
      }
    }
    // Rebelión
    if (this.powerActive(s, 'Rebellion')) {
      const h = await this.flipHeads(p, 2, 'Rebelión');
      if (h === 0) { this.log('Rebelión: Gyarados de Misty vuelve al mazo.'); this.shuffleSlotIntoDeck(s); if (!p.bench.length) this.win(o.i, 'sin Pokémon en juego.'); const n = await this.ask(p, { kind: 'slot', title: 'Elige tu nuevo Pokémon Activo', options: p.bench.slice(), purpose: 'newActive' }); await this.switchActive(p, n || p.bench[0]); await this.afterAttack(null); return true; }
    }
    // efectos del defensor sobre el atacante (Pantalla de humo, etc.)
    if (s.fx.smokescreen || s.persist.smoke) {
      const r = await this.flip(p, 1, 'Efecto en el atacante: ¿funciona el ataque?');
      if (!r[0]) { this.log('Cruz: el ataque no hace nada.'); await this.afterAttack(null); return true; }
    }
    // Truco Ninja de Koga
    if (o.active) {
      const nt = o.active.att.find(c => this.def(c).name === "Koga's Ninja Trick");
      if (nt && o.bench.length) {
        const sw = await this.ask(o, { kind: 'slot', title: 'Truco Ninja de Koga: ¿cambiar a tu Pokémon Activo? (opcional)', options: o.bench.slice(), optional: true, purpose: 'ninjaSwitch' });
        if (sw) { const old = o.active; this.removeFrom(old.att, nt); this.toDiscard(nt); await this.switchActive(o, sw); }
      }
    }
    const x = this.mkCtx(p, s, a, e);
    this.lastAtk = { u: s.u, a, turn: this.turnNo };
    if (a.name === 'Night Eyes') x.post(() => { if (x.def) x.def.persist.nightEyes = this.turnNo; });
    // Vermilion
    if (this.stadiumIs('Vermilion City Gym') && this.hasName(s, 'Lt. Surge')) {
      const r = await this.flip(p, 1, 'Gimnasio de Ciudad Carmín');
      if (r[0]) x.vermilion = true; else x.post(() => { s.dmg += 10; this.log(`${this.nm(s)} se hace 10 de daño (Gimnasio Carmín).`); });
    }
    // Sabrina's ESP
    x.esp = s.att.some(c => this.def(c).name === "Sabrina's ESP");
    // Ventajas de líder
    if (p.perk === 'surge' && e.types.includes('L')) x.perkBonus = 10;
    if (p.perk === 'blaine' && e.types.includes('R')) x.perkBonus = 10;
    if (p.perk === 'rocket' && e.name.startsWith('Dark ')) x.perkBonus = 10;
    if ((p.perk === 'falkner' && e.types.includes('C')) || (p.perk === 'chuck' && e.types.includes('F')) || (p.perk === 'pryce' && e.types.includes('W')) || (p.perk === 'karen' && (e.types.includes('D') || e.name.startsWith('Dark '))) || p.perk === 'red') x.perkBonus = 10;
    if (p.flags.koga && this.hasName(s, 'Koga')) x.post(() => { if (x.dealtMain > 0 && x.def && this.slots(o).includes(x.def)) this.setStatus(x.def, 'poisoned'); });
    // potenciadores (Danza Espada, Foco Energía...)
    const bo = s.fx.boost;
    if (bo && bo.v.name === a.name) { x.boosted = bo.v; if (bo.v.mult) { x.dmg *= bo.v.mult; x.base *= bo.v.mult; } if (bo.v.set) { x.dmg = bo.v.set; x.base = bo.v.set; } if (bo.v.self) x.selfMult = bo.v.self; }
    // Poderes que modifican ataques
    if (a.name === 'Megahorn' && this.powerActive(s, 'Final Blow') && this.hpLeft(s) <= 20) { x.dmg = x.base = 120; this.log('Golpe Final: Megacuerno hace 120 de daño base.'); }
    if (a.name === 'Floodlight' && this.powerActive(s, 'Hydroelectric Power')) { const ex = this.extraEnergy(s, a, 'W'); if (ex) { x.dmg += 10 * ex; x.base += 10 * ex; } }
    if (a.name === 'Hidden Power' && e.name.indexOf('Unown') === 0) {
      const ang = this.slots(p).find(t => this.powerActive(t, '[Anger]')); if (ang && ang.dmg) { x.dmg += ang.dmg; this.log(`[Ira] añade ${ang.dmg} de daño.`); }
      const xx = this.slots(p).find(t => this.powerActive(t, '[XXXXX]')); if (xx) { const h = await this.flipUntilTails(p, '[XXXXX]'); x.dmg += 10 * h; }
      if (this.baseDef(s).pw && this.baseDef(s).pw.name === '[Perform]' && this.powerOn(s) && s.st !== 'asleep' && s.st !== 'paralyzed' && s.persist.lastAttack && s.persist.lastAttack.turn === this.turnNo - 1) x.dmg += s.persist.lastAttack.d;
    }
    if (this.powerActive(s, 'Frog Song')) { const n = this.allSlots().filter(t => /^(Poliwag|Poliwhirl|Poliwrath|Politoed)$/.test(this.eff(t).name)).length; if (n > 3) x.bonusAfter = 40; }
    if (s.fx.lockOn && a.name === 'Electric Bolt') x.lockOn = true;
    if (s.att.some(c => this.def(c).name === 'Magnifier')) x.res = false;
    // ejecutar efecto
    const F = FX.atk[a.fx];
    try {
      if (F && F.f) await F.f(x);
    } catch (err) { if (err instanceof GameOver) throw err; console.error(err); this.log('(error de efecto: ' + err.message + ')'); }
    if (!x.cancelled) {
      if (x.target && !x.noDmg && (x.dmg > 0) && x.target.fx.evasion && x.target.owner !== s.owner) {
        const r = await this.flip(p, 1, 'Evasión del Defensor');
        if (!r[0]) { this.log('Cruz: el ataque no hace daño al Defensor.'); x.noDmg = true; } else delete x.target.fx.evasion;
      }
      // protecciones con moneda del Defensor (Baba, Esquivar, Escudo Reflejo)
      if (x.target && !x.noDmg && x.dmg > 0 && x.target.owner !== s.owner) {
        const t = x.target;
        if (t.fx.slime) { const r = await this.flip(p, 1, 'Baba: ¿el ataque hace daño?'); if (!r[0]) { this.log('Cruz: Baba evita el daño.'); x.noDmg = true; } }
        if (!x.noDmg && t.fx.dodge) { const r = await this.flip(o, 1, 'Esquivar'); if (r[0]) { this.log('Cara: esquiva el daño.'); x.noDmg = true; } }
        if (!x.noDmg && t.fx.reflect) { const r = await this.flip(o, 1, 'Escudo Reflejo'); if (r[0]) { this.log('Cara: Escudo Reflejo evita el daño y devuelve 20.'); x.noDmg = true; s.dmg += 20; } }
      }
      if (x.target && !x.noDmg && (x.dmg > 0)) {
        const t = x.target;
        // Transparencia (Haunter)
        if (this.powerActive(t, 'Transparency') && t.owner !== s.owner) { const r = await this.flip(o, 1, 'Transparencia'); if (r[0]) { x.immune.add(t.u); this.log('Transparencia evita todos los efectos.'); } }
        x.dealtMain = this.attackDamage(x, t, x.dmg, { wr: x.wr, res: x.res, weak: x.weak });
        if (x.dealtMain > 0) this.log(`${this.nm(s)} hace ${x.dealtMain} de daño a ${this.nm(t)}.`);
        else if (x.dmg > 0) this.log(`El daño a ${this.nm(t)} fue evitado o reducido a 0.`);
      } else if (x.target && this.powerActive(x.target, 'Transparency') && x.target.owner !== s.owner && x.posts.length) {
        const r = await this.flip(o, 1, 'Transparencia'); if (r[0]) { x.immune.add(x.target.u); this.log('Transparencia evita todos los efectos.'); }
      }
      for (const fn of x.posts) { try { await fn(); } catch (err) { if (err instanceof GameOver) throw err; console.error(err); } }
    }
    if (a.name === 'Lie Low' && this.slots(p).includes(s)) s.fx.lieLow = { v: true, until: this.turnNo + 2 };
    await this.afterAttack(x);
    return true;
  }
  mkCtx(p, s, a, e) {
    const g = this; const o = this.opp(p);
    const x = {
      g, me: p, op: o, att: s, e, atk: a, def: o.active, target: o.active,
      dmg: parseInt(a.dmg) || 0, base: parseInt(a.dmg) || 0, wr: true, res: true, weak: true,
      cancelled: false, noDmg: false, posts: [], immune: new Set(), damaged: [], dealtMain: 0,
      isMainTarget(t) { return t === x.target; },
      name: e.nameEs,
      async flip(n = 1, label) { let r = await g.flip(p, n, label || (e.nameEs + ' — ' + a.nameEs)); if (x.lockOn) { g.log('Blanco Fijado: las cruces cuentan como caras.'); return n; } if (x.esp && r.some(v => !v)) { if (await g.ask(p, { kind: 'yesno', title: 'ESP de Sabrina: ¿relanzar las monedas?', purpose: 'reflip', res: r })) { r = await g.flip(p, n, 'Relanzamiento'); x.esp = false; } } return r.filter(v => v).length; },
      async flip1(label) { return (await x.flip(1, label)) === 1; },
      async flipUntilTails(label) { return g.flipUntilTails(p, label || a.nameEs); },
      post(fn) { x.posts.push(fn); },
      cancel(msg) { x.cancelled = true; if (msg !== false) g.log(msg || 'El ataque no hace nada.'); },
      status(t, st) { x.post(() => { if (t && !x.immune.has(t.u) && g.slots(g.ownerOf(t)).includes(t) && !(t.fx.immune) && !g.effectsBlocked(t, p)) g.setStatus(t, st, { koga: o === g.ownerOf(t) && p.perk === 'koga' && (st === 'poisoned') }); }); },
      self(st) { x.post(() => { if (g.slots(p).includes(s)) g.setStatus(s, st); }); },
      selfDmg(n) { n *= (x.selfMult || 1); x.post(() => { if (g.slots(p).includes(s)) { s.dmg += n; g.log(`${x.name} se hace ${n} de daño a sí mismo.`); } }); },
      dmgTo(t, n, opts = {}) { x.post(() => { if (t && g.allSlots().includes(t)) { const d = g.attackDamage(x, t, n, Object.assign({ wr: false }, opts)); if (d) g.log(`${g.nm(t)} recibe ${d} de daño.`); } }); },
      benchDmg(pl, n, filter) { for (const t of pl.bench.slice()) if (!filter || filter(t)) x.dmgTo(t, n); },
      count(t, type) { return g.energyCount(t, type); },
      cards(t, type) { return g.energyCardsOf(t, type); },
      async discardOwn(n, type, title) { // descarta energía del atacante
        const cards = g.energyCardsOf(s, type);
        if (!cards.length) return 0;
        const sel = n >= cards.length ? cards : await g.ask(p, { kind: 'cards', title: title || `Descarta ${n} energía de ${x.name}`, cards, min: n, max: n, purpose: 'discardOwnEnergy', slot: s });
        for (const c of sel) { g.removeFrom(s.energy, c); delete c.buzzap; g.toDiscard(c); }
        g.log(`${x.name} descarta ${sel.length} energía.`);
        return sel.length;
      },
      async discardOppEnergy(t, n = 1, title) {
        if (!t || !t.energy.length) return 0;
        if (t.att.some(c => g.def(c).name === "Brock's Protection")) { g.log('La Protección de Brock impide descartar energía.'); return 0; }
        if (g.effectsBlocked(t, p)) { g.log('El efecto no afecta a ' + g.nm(t) + '.'); return 0; }
        if (t.owner !== p.i && g.eff(t).name.indexOf('Unown') === 0 && g.findPower(g.ownerOf(t), '[Keep]').length) { g.log('[Conservar] impide descartar energía.'); return 0; }
        const sel = await g.ask(p, { kind: 'cards', title: title || `Elige ${n} energía para descartar de ${g.nm(t)}`, cards: t.energy.slice(), min: Math.min(n, t.energy.length), max: Math.min(n, t.energy.length), purpose: 'discardOppEnergy', slot: t });
        x.post(() => {}); // orden
        for (const c of sel) { g.removeFrom(t.energy, c); delete c.buzzap; if (g.stadiumIs('Ecogym') && t.owner !== p.i && g.def(c).etype) { delete c.inPlay; g.p[c.owner].hand.push(c); g.log('Ecogimnasio devuelve la Energía a la mano.'); } else g.toDiscard(c); }
        g.log(`Se descarta${sel.length > 1 ? 'n' : ''} ${sel.map(c => g.cn(c)).join(', ')} de ${g.nm(t)}.`);
        return sel.length;
      },
      async chooseOpp(where = 'all', title, purpose = 'damageOpp', optional) {
        const opts = where === 'bench' ? o.bench.slice() : g.slots(o);
        if (!opts.length) return null;
        return g.ask(p, { kind: 'slot', title: title || 'Elige un Pokémon del rival', options: opts, purpose, optional });
      },
      async chooseOwn(where = 'bench', title, purpose = 'own', optional) {
        const opts = where === 'bench' ? p.bench.slice() : g.slots(p);
        if (!opts.length) return null;
        return g.ask(p, { kind: 'slot', title: title || 'Elige uno de tus Pokémon', options: opts, purpose, optional });
      },
      mark(t, k, v = true, turns = 1) { if (t) { t.fx[k] = { v, until: g.turnNo + turns }; g.noteFx(t, k, v); } },
      markPost(t, k, v = true, turns = 1) { x.post(() => { if (t && !x.immune.has(t.u) && g.allSlots().includes(t) && !g.effectsBlocked(t, p)) { t.fx[k] = { v, until: g.turnNo + turns }; g.noteFx(t, k, v); } }); },
      heal(t, n) { const h = g.heal(t, n); if (h) g.log(`${g.nm(t)} se cura ${h}.`); return h; },
      log(m) { g.log(m); },
    };
    return x;
  }
  async afterAttack(x) {
    const p = this.p[this.cur]; const o = this.opp(p);
    if (x) {
      const s = x.att;
      // reacciones del defensor
      for (const [t, d] of x.damaged) {
        if (t.owner === p.i) continue;
        const alive = this.slots(o).includes(t);
        const tdef = this.def(t.cards[t.cards.length - 1]);
        const pw = tdef.pw ? tdef.pw.name : null;
        const ok = pw && (this.powerOn(t)) && (FX.pw[pw] && FX.pw[pw].ignoreStatus || !this.statusBlocksPower(t));
        if (!this.slots(p).includes(s)) break;
        if (ok && pw === 'Strikes Back') { s.dmg += 10; this.log('Contraataque: Machamp hace 10 de daño al atacante.'); }
        if (pw === 'Restless Sleep' && t.st === 'asleep' && this.powerOn(t)) { s.dmg += 20; this.log('Sueño Inquieto hace 20 de daño al atacante.'); }
        if (ok && pw === 'Pollen Defense' && this.isActive(t)) { const r = await this.flip(o, 1, 'Defensa de Polen'); if (r[0]) this.setStatus(s, 'confused'); }
        if (pw === 'Shock Blast' && this.powerOn(t) && this.isActive(t)) { const r = await this.flip(o, 1, 'Explosión de Choque'); if (!r[0]) { s.dmg += 20; if (alive) t.dmg += 20; this.log('Explosión de Choque hace 20 a cada Pokémon Activo.'); } }
        if (ok && pw === 'Energy Drain') { const r = await this.flip(o, 1, 'Drenar Energía'); if (r[0] && s.energy.length) { const [c] = await this.ask(o, { kind: 'cards', title: 'Elige energía del atacante para descartar', cards: s.energy.slice(), min: 1, max: 1, purpose: 'discardOppEnergy', slot: s }); this.removeFrom(s.energy, c); delete c.buzzap; this.toDiscard(c); this.log('Drenar Energía descarta una energía del atacante.'); } }
        if (ok && pw === 'Final Beam' && t.dmg >= this.hp(t)) { const r = await this.flip(o, 1, 'Rayo Final'); if (r[0]) { const w = this.energyCardsOf(t, 'W').length; const fake = this.mkCtx(o, t, { dmg: '0', name: 'Final Beam' }, this.eff(t)); fake.target = s; fake.def = s; const dd = this.attackDamage(fake, s, 20 * w, { wr: true }); this.log(`Rayo Final hace ${dd} de daño.`); } }
        if (t.fx.destiny && t.dmg >= this.hp(t)) { s.dmg = Math.max(s.dmg, this.hp(s)); this.log('Lazo Destino: el atacante también queda Fuera de Combate.'); }
        if (t.fx.counter && alive !== undefined) { const v = t.fx.counter.v; let amount = 0; if (v === 'equal') amount = d; else if (v === 'equalFlip') { const r = await this.flip(o, 1, 'Contraataque'); if (r[0]) amount = d; } else if (v === 'double') { const r = await this.flip(o, 1, 'Contraataque'); if (r[0]) amount = d * 2; } else amount = v; if (amount) { const fake = this.mkCtx(o, t, { dmg: '0', name: 'Counter' }, this.eff(t)); fake.target = s; fake.def = s; const dd = this.attackDamage(fake, s, amount, { wr: v === 10 }); this.log(`${this.nm(t)} contraataca por ${dd}.`); } }
        if (t.fx.lastHit === undefined) t.persist.lastAttack = { by: s.u, d, turn: this.turnNo, active: this.isActive(t) };
        // Garras Contraataque
        const claws = t.att.find(c => this.def(c).name === 'Counterattack Claws');
        if (claws && this.isActive(t)) { const r = await this.flip(o, 1, 'Garras Contraataque'); this.discardAtt(t, claws); if (r[0]) { s.dmg += 20; this.log('Garras Contraataque pone 2 contadores en el atacante.'); } }
        if (pw === 'Fluffy Wool' && this.isActive(t) && this.powerOn(t) && !this.statusBlocksPower(t)) { const r = await this.flip(o, 1, 'Lana Esponjosa'); if (r[0]) this.setStatus(s, 'asleep'); }
        if (t.fx.secrete) { this.setStatus(s, 'poisoned'); for (const b of p.bench) b.dmg += 10; this.log('Secretar Veneno envenena al atacante y daña su Banca.'); }
        // Huir (Tentacruel de Misty)
        if (ok && pw === 'Flee' && this.isActive(t) && alive && t.dmg < this.hp(t) && o.bench.length) {
          const sw = await this.ask(o, { kind: 'slot', title: 'Huir: ¿cambiar a Tentacruel de Misty con un Pokémon de tu Banca?', options: o.bench.slice(), optional: true, purpose: 'fleeSwitch' });
          if (sw) await this.switchActive(o, sw);
        }
      }
      // supervivencia al K.O. (Aguante, Blindaje, Cinta Focus, Viaje en el Tiempo, Repartir Exp.)
      for (const t of this.slots(o).slice()) {
        if (t.dmg < this.hp(t) || !x.damaged.some(([dd]) => dd === t)) continue;
        if (t.fx.endure) { t.dmg = this.hp(t) - 10; this.log(`Aguante: ${this.nm(t)} resiste con 10 PS.`); continue; }
        if (t.fx.armorUp) { const r = await this.flip(o, 1, 'Blindaje'); if (r[0]) { t.dmg = this.hp(t) - 10; this.log(`Blindaje: ${this.nm(t)} resiste con 10 PS.`); continue; } }
        const fb = t.att.find(c => this.def(c).name === 'Focus Band');
        if (fb) { const r = await this.flip(o, 1, 'Cinta Focus'); this.discardAtt(t, fb); if (r[0]) { t.dmg = this.hp(t) - 10; this.log(`Cinta Focus: ${this.nm(t)} resiste con 10 PS.`); continue; } }
        if (this.baseDef(t).pw && this.baseDef(t).pw.name === 'Time Travel' && this.powerOn(t) && !this.statusBlocksPower(t)) { const r = await this.flip(o, 1, 'Viaje en el Tiempo'); if (r[0]) { const wa = o.active === t; this.shuffleSlotIntoDeck(t); this.log('Viaje en el Tiempo: Celebi vuelve al mazo en vez de quedar Fuera de Combate.'); if (wa) { if (!o.bench.length) this.win(p.i, `${o.name} no tiene Pokémon en juego.`); const n = await this.ask(o, { kind: 'slot', title: 'Elige tu nuevo Pokémon Activo', options: o.bench.slice(), purpose: 'newActive' }); await this.switchActive(o, n || o.bench[0], 'force'); } continue; } }
        if (o.active === t) { const holder = this.slots(o).find(h => h !== t && h.att.some(c => this.def(c).name === 'EXP.ALL')); const be = t.energy.find(c => this.def(c).basic);
          if (holder && be) { this.removeFrom(t.energy, be); holder.energy.push(be); this.discardAtt(holder, holder.att.find(c => this.def(c).name === 'EXP.ALL')); this.log(`Repartir Exp.: una Energía pasa a ${this.nm(holder)}.`); } }
      }
      // Fortaleza
      if (x.pendingFortitude) for (const t of x.pendingFortitude) if (this.slots(o).includes(t) && t.dmg >= this.hp(t)) { const r = await this.flip(o, 1, 'Fortaleza'); if (r[0]) { t.dmg = this.hp(t) - 10; this.log('Fortaleza: Machamp de Giovanni resiste con 10 PS.'); } }
      // registrar para "Espejo" (Mirror Move)
      if (x.def) x.def.persist.lastHit = { turn: this.turnNo, dmg: x.dealtMain, statuses: true };
    }
    await this.resolveKOs(x);
    this.upd();
  }
}

root.PTCG = { FX_LABEL, Game, GameOver, DB, FX, T, STATUS_ES, shuffle, mkRng, r10, floor10, ceil10 };
})(typeof window !== 'undefined' ? window : globalThis);
