// ============ INTELIGENCIA ARTIFICIAL ============
(function (root) {
const { FX } = root.PTCG;
const AI = {};
const lv = p => (p.ai && p.ai.level) || 2;

function deficit(tokens, cost) {
  const pool = tokens.slice(); let miss = 0;
  const need = cost.filter(x => x !== 'C'); const col = cost.length - need.length;
  for (const n of need) { let i = pool.indexOf(n); if (i < 0) i = pool.indexOf('A'); if (i < 0) miss++; else pool.splice(i, 1); }
  return miss + Math.max(0, col - pool.length);
}
function tokOf(g, c) { const d = g.def(c); if (d.name === 'Double Colorless Energy') return ['C', 'C']; if (d.name === 'Rainbow Energy') return ['A']; if (d.basic) return [d.etype]; return ['C']; }
function estDmg(g, att, def, a) {
  if (!a) return 0;
  let base = parseInt(a.dmg) || 0;
  const s = String(a.dmg || '');
  const F = FX.atk[a.fx];
  if (s.includes('×')) {
    const m = (a.text || '').match(/Flip (\d+) coins/); const n = m ? +m[1] : 2;
    if (/until you get tails/.test(a.text || '')) base = base * 1; else if (/number of Energy/.test(a.text || '')) base = base * g.energyCount(att) / 2; else if (/damage counters on/.test(a.text || '')) base = att.dmg ? base * att.dmg / 10 : 0; else base = base * n / 2;
  } else if (s.includes('+')) base += 10;
  if (/If tails, this attack does nothing/.test(a.text || '')) base /= 2;
  if (!def) return base;
  const ae = g.eff(att), de = g.eff(def);
  if (de.weak && ae.types.includes(de.weak)) base *= 2;
  if (de.res && ae.types.includes(de.res)) base -= 30;
  if (def.fx.preventAll || def.fx.immune) base = 0;
  if (def.fx.harden && base <= 30) base = 0;
  if (g.powerActive(def, 'Invisible Wall') && base >= 30) base = 0;
  return Math.max(0, base);
}
function bestAttack(g, p, s, def, extraTok) {
  const e = g.eff(s); const tok = g.energyTokens(s).concat(extraTok || []);
  let best = null;
  e.atk.forEach((a, i) => {
    const d = estDmg(g, s, def, a); const miss = deficit(tok, a.cost);
    const v = { i, a, dmg: d, miss };
    if (!best || (miss === 0 && (best.miss > 0 || d > best.dmg)) || (miss > 0 && best.miss > 0 && (d - miss * 15 > best.dmg - best.miss * 15))) best = v;
  });
  return best;
}
function slotValue(g, s, opp) { // valor de un Pokémon como atacante
  const b = bestAttack(g, g.ownerOf(s), s, opp ? opp.active : null);
  return (b ? b.dmg - b.miss * 12 : 0) + g.hpLeft(s) / 4 + s.cards.length * 8;
}
function cardValue(g, p, c) {
  const d = g.def(c);
  if (d.st === 'P') {
    let v = 10 + d.hp / 10;
    if (d.stage > 0 && g.slots(p).some(s => g.baseDef(s).name === d.from)) v += 30;
    if (d.stage === 0 && p.bench.length < 3) v += 15;
    return v;
  }
  if (d.st === 'E') { const need = g.slots(p).some(s => g.eff(s).atk.some(a => a.cost.includes(d.etype))); return need ? 18 : (d.basic ? 6 : 14); }
  const pri = { 'Professor Oak': 20, 'Bill': 18, 'Computer Search': 22, 'Gust of Wind': 20, 'PlusPower': 14, 'Energy Removal': 18, 'Super Energy Removal': 20, 'Pokémon Breeder': 16, 'Switch': 14, 'Potion': 10, 'Super Potion': 12 };
  return pri[d.name] || 9;
}
function pickN(list, n, score) { return list.slice().sort((a, b) => score(b) - score(a)).slice(0, n); }

// --------- decisiones ---------
AI.decide = async function (g, p, req) {
  const o = g.opp(p);
  const pur = req.purpose || '';
  switch (req.kind) {
    case 'yesno':
      if (pur === 'wishAccept') return false;
      if (pur === 'challenge') return p.bench.length < 3;
      if (pur === 'optionalDiscard') return o.bench.some(s => g.hpLeft(s) <= 10);
      return true;
    case 'option': {
      const n = req.options.length;
      if (pur === 'copyAttack' || pur === 'blockAttack') { let bi = 0, bv = -1; req.atks.forEach((a, i) => { const v = (parseInt(a.dmg) || 0) + (a.fx != null ? 5 : 0); if (v > bv) { bv = v; bi = i; } }); return bi; }
      if (pur === 'chooseStatus') return 2;
      if (pur === 'countersDraw') return Math.min(req.max, 2);
      if (pur === 'drawCount') return p.deck.length > 10 ? 3 : 0;
      if (pur === 'whichDeck') return 0;
      if (pur === 'treaty') return 1;
      if (pur === 'devolveStage') return 0;
      return Math.floor(g.rnd() * n);
    }
    case 'type': {
      const allowed = (req.only || ['G', 'R', 'W', 'L', 'P', 'F']).filter(t => !(req.exclude || []).includes(t));
      if (pur === 'resType' && o.active) { const t = g.eff(o.active).types[0]; if (allowed.includes(t)) return t; }
      if (pur === 'weakType' && req.slot) { const t = g.eff(req.slot).types[0]; if (allowed.includes(t)) return t; }
      if (pur === 'shiftType' && o.active) { const t = g.eff(o.active).weak; if (allowed.includes(t)) return t; }
      if (pur === 'buzzapType' && req.slot) { for (const a of g.eff(req.slot).atk) for (const c of a.cost) if (allowed.includes(c)) return c; }
      return allowed[0];
    }
    case 'order': {
      if (pur === 'orderOpp') return req.cards.slice().sort((a, b) => cardValue(g, o, a) - cardValue(g, o, b));
      return req.cards.slice().sort((a, b) => cardValue(g, p, b) - cardValue(g, p, a));
    }
    case 'cards': return pickCards(g, p, req);
    case 'slot': { const r = pickSlot(g, p, req); return r; }
    case 'slots': {
      const opts = req.options.slice(); const n = req.max;
      if (pur === 'scoopMany') return [];
      return pickN(opts, Math.max(req.min, Math.min(n, opts.length)), s => 100 - g.hpLeft(s) + s.energy.length * 5);
    }
  }
  return null;
};
function pickCards(g, p, req) {
  const o = g.opp(p); const pur = req.purpose || ''; const cards = req.cards; const min = req.min || 0; let max = req.max;
  if (!cards.length) return [];
  if (req.sumTo) { // pagar retirada: energías menos útiles primero
    const s = req.slot; const keep = c => { const best = bestAttack(g, p, s, o.active); return best && best.a.cost.includes(tokOf(g, c)[0]) ? 1 : 0; };
    const sorted = cards.slice().sort((a, b) => keep(a) - keep(b) || req.valueOf(a) - req.valueOf(b));
    const out = []; let sum = 0; for (const c of sorted) { if (sum >= req.sumTo) break; out.push(c); sum += req.valueOf(c); } return out;
  }
  let score;
  switch (pur) {
    case 'setupActive': score = c => { const d = g.def(c); const cheap = Math.min(...(d.atk.length ? d.atk.map(a => a.cost.length) : [5])); return d.hp - cheap * 12 + (d.atk.some(a => parseInt(a.dmg) >= 20 && a.cost.length <= 2) ? 20 : 0) - (d.pw && ['Rain Dance', 'Energy Trans', 'Damage Swap'].includes(d.pw.name) ? 40 : 0); }; break;
    case 'setupBench': case 'searchBasic': case 'attachFromHand': case 'getEnergy': case 'perfume_': return cards.slice(0, max);
    case 'discardOwnEnergy': case 'payOwnEnergy': { const s = req.slot; const best = s ? bestAttack(g, p, s, o.active) : null; score = c => -((best && best.a.cost.includes(tokOf(g, c)[0])) ? 10 : 0) - (g.def(c).name === 'Double Colorless Energy' ? 5 : 0); break; }
    case 'discardOppEnergy': { score = c => (g.def(c).name === 'Double Colorless Energy' ? 20 : 0) + (c.buzzap ? 25 : 0) + (g.def(c).basic ? 5 : 10); break; }
    case 'discardHand': case 'quiz': score = c => -cardValue(g, p, c); break;
    case 'perfume': score = c => -g.def(c).hp; break;
    default: score = c => cardValue(g, p, c);
  }
  const n = Math.max(min, Math.min(max, pur === 'discardHand' && min === 0 ? 0 : max));
  return pickN(cards, n, score);
}
function pickSlot(g, p, req) {
  const o = g.opp(p); const opts = req.options; const pur = req.purpose || '';
  if (!opts.length) return null;
  const best = (f) => opts.slice().sort((a, b) => f(b) - f(a))[0];
  const myAtk = p.active ? bestAttack(g, p, p.active, null) : null;
  switch (pur) {
    case 'damageOpp': case 'curseTo': return best(s => (g.hpLeft(s) <= 20 ? 100 : 0) - g.hpLeft(s) + s.cards.length * 10 + s.energy.length * 5);
    case 'gustTarget': {
      return best(s => { if (!p.active) return 0; const b = bestAttack(g, p, p.active, s); const d = b && b.miss === 0 ? estDmg(g, p.active, s, b.a) : 0; return (d >= g.hpLeft(s) ? 200 : 0) + d - g.hpLeft(s) / 3 + g.retreatCost(s) * 10 - g.energyCount(s) * 5 + s.cards.length * 15; });
    }
    case 'newActive': return best(s => { const b = bestAttack(g, p, s, o.active); return (b && b.miss === 0 ? 60 + b.dmg : -((b ? b.miss : 3) * 10)) + g.hpLeft(s) / 3 - (s.cards.length && g.eff(s).trainerMon ? 200 : 0); });
    case 'healOwn': case 'cureOwn': return best(s => s.dmg + (g.isActive(s) ? 15 : 0));
    case 'energyTarget': return best(s => { const b = bestAttack(g, p, s, o.active); return (b ? 30 - b.miss * 2 + b.dmg / 5 : 0) + (g.isActive(s) ? 20 : 0); });
    case 'energyFrom': return best(s => s.energy.length - (g.isActive(s) ? 5 : 0));
    case 'removeEnergy': return best(s => s.energy.length * 10 + (g.isActive(s) ? 15 : 0) + s.cards.length * 5);
    case 'scoopDamaged': return best(s => s.dmg - s.energy.length * 5);
    case 'own': case 'sacrifice': return best(s => g.hpLeft(s) - s.cards.length * 20);
    case 'defender': case 'attachTool': case 'giovanni': return best(s => (g.isActive(s) ? 50 : 0) + s.dmg);
    case 'curseFrom': return best(s => (g.hpLeft(s) > 20 ? s.dmg : -50));
    case 'swapFrom': return best(s => (g.isActive(s) ? 50 : 0) + s.dmg);
    case 'swapTo': return best(s => g.hpLeft(s));
    case 'bounceOpp': return best(s => s.cards.length * 20 + s.energy.length * 10);
    case 'narrow': return best(s => -slotValue(g, s, o));
    case 'ninjaSwitch': case 'fleeSwitch': case 'optionalSwitch': {
      if (!p.active) return null; if (g.hpLeft(p.active) > 30 && pur !== 'optionalSwitch') return null;
      if (pur === 'optionalSwitch' && g.hpLeft(p.active) > 40) return null;
      const b = best(s => g.hpLeft(s) + slotValue(g, s, o)); return g.hpLeft(b) > g.hpLeft(p.active) ? b : null;
    }
    case 'moveOppEnergy': return best(s => -g.energyCount(s));
    default: return opts[0];
  }
}

// --------- turno de la IA ---------
AI.takeTurn = async function (g, p) {
  const o = g.opp(p); const L = lv(p);
  const ok = () => !p.turnOver && g.winner == null;
  const sleep = ms => (g.io.aiDelay ? g.io.aiDelay(ms) : Promise.resolve());
  let guard = 0;
  // 1. básicos a la banca
  const maxBench = L === 1 ? 3 : (L === 2 ? 4 : 5);
  for (const c of p.hand.slice()) { if (!ok()) return; if (g.isBasicCard(c) && g.def(c).st === 'P' && p.bench.length < Math.min(maxBench, g.benchMax(p))) { await g.playBasic(p, c); await sleep(350); } }
  // 2. evolucionar
  let changed = true;
  while (changed && ok() && guard++ < 20) {
    changed = false;
    for (const c of p.hand.slice()) {
      const ts = g.evoTargets(p, c); if (!ts.length) continue;
      const t = ts.sort((a, b) => (g.isActive(b) ? 1 : 0) - (g.isActive(a) ? 1 : 0))[0];
      await g.evolve(p, c, t); await sleep(350); changed = true; break;
    }
  }
  // 3. entrenadores
  const thr = L === 1 ? 6 : (L === 2 ? 3 : 2);
  guard = 0; changed = true;
  while (changed && ok() && guard++ < 25) {
    changed = false;
    const cand = p.hand.filter(c => g.isTrainer(c) && g.canPlayTrainer(p, c) && !['Gust of Wind', 'PlusPower', 'Switch'].includes(g.def(c).name));
    let best = null, bv = 0;
    for (const c of cand) { const t = g.trainerFx(c); const v = t && t.ai ? t.ai(g, p, c) : (g.def(c).name === 'Clefairy Doll' || g.def(c).name === 'Mysterious Fossil' ? FX.tr[g.def(c).name].ai(g, p, c) : 0); if (v >= thr && v > bv) { bv = v; best = c; } }
    if (best && (L > 1 || g.rnd() < 0.6)) { await g.playTrainer(p, best); await sleep(450); changed = true;
      // tras robar, volver a intentar básicos/evoluciones
      for (const c of p.hand.slice()) if (ok() && g.isBasicCard(c) && g.def(c).st === 'P' && p.bench.length < Math.min(maxBench, g.benchMax(p))) await g.playBasic(p, c);
      for (const c of p.hand.slice()) { if (!ok()) break; const ts = g.evoTargets(p, c); if (ts.length) await g.evolve(p, c, ts[0]); }
    }
    if (p.forceEnd) return;
  }
  if (!ok()) return;
  // 4. poderes
  guard = 0;
  for (const s of g.slots(p)) {
    const d = g.baseDef(s); if (!d.pw) continue; const P = FX.pw[d.pw.name];
    while (ok() && guard++ < 10 && g.powerUsable(p, s) && P.ai && P.ai(g, p, s)) { await g.usePower(p, s); await sleep(350); if (P.once) break; }
  }
  if (!ok() || !p.active) return;
  // 5. retirada / cambio
  if (L >= 2) await maybeRetreat(g, p);
  if (!ok()) return;
  // 6. energía
  await attachBest(g, p);
  await sleep(300);
  // Danza Lluvia extra
  if (g.findPower(p, 'Rain Dance').length) {
    for (const c of p.hand.filter(c => g.def(c).name === 'Water Energy')) { const ts = g.slots(p).filter(s => g.canAttach(p, c, s) && g.eff(s).types.includes('W')); if (ts.length) await g.attach(p, c, pickSlot(g, p, { options: ts, purpose: 'energyTarget' })); }
  }
  if (p.flags.blaine) for (const c of p.hand.filter(c => g.def(c).name === 'Fire Energy')) { const ts = g.slots(p).filter(s => g.canAttach(p, c, s)); if (ts.length) await g.attach(p, c, ts[0]); }
  if (p.perk === 'misty' && !p.mistyExtra) { const c = p.hand.find(c => g.def(c).name === 'Water Energy'); if (c) { const ts = g.slots(p).filter(s => g.canAttach(p, c, s)); if (ts.length) await g.attach(p, c, pickSlot(g, p, { options: ts, purpose: 'energyTarget' })); } }
  if (!ok() || !p.active) return;
  // poderes otra vez (Energy Burn etc.)
  for (const s of g.slots(p)) { const d = g.baseDef(s); if (!d.pw) continue; const P = FX.pw[d.pw.name]; if (g.powerUsable(p, s) && P.ai && P.ai(g, p, s)) await g.usePower(p, s); }
  // 7. Ráfaga de Viento / PlusPower / Cambio
  if (L >= 2) {
    const gust = p.hand.find(c => g.def(c).name === 'Gust of Wind' && g.canPlayTrainer(p, c));
    if (gust && p.active && o.bench.length) {
      const b0 = bestAttack(g, p, p.active, o.active);
      const koNow = b0 && b0.miss === 0 && o.active && estDmg(g, p.active, o.active, b0.a) >= g.hpLeft(o.active);
      if (!koNow && b0 && b0.miss === 0) {
        const t = o.bench.find(s => estDmg(g, p.active, s, bestAttack(g, p, p.active, s).a) >= g.hpLeft(s));
        if (t) { await g.playTrainer(p, gust); await sleep(400); }
      }
    }
    const sw = p.hand.find(c => g.def(c).name === 'Switch' && g.canPlayTrainer(p, c));
    if (sw && p.active && (p.active.st === 'paralyzed' || p.active.st === 'asleep' || !g.attackList(p).some(a => a.ok))) {
      const cand = p.bench.find(s => { const b = bestAttack(g, p, s, o.active); return b && b.miss === 0; });
      if (cand) await g.playTrainer(p, sw);
    }
    const plus = p.hand.filter(c => g.def(c).name === 'PlusPower' && g.canPlayTrainer(p, c));
    if (plus.length && p.active && o.active) {
      const b = bestAttack(g, p, p.active, o.active);
      if (b && b.miss === 0) { const d = estDmg(g, p.active, o.active, b.a); const need = g.hpLeft(o.active) - d; if (need > 0 && need <= 10 * plus.length && d > 0) for (let k = 0; k * 10 < need; k++) await g.playTrainer(p, plus[k]); }
    }
  }
  if (!ok() || !p.active) return;
  // 8. atacar
  const usable = g.attackList(p).filter(a => a.ok);
  if (!usable.length) return;
  let choice;
  if (L === 1 && g.rnd() < 0.35) choice = usable[Math.floor(g.rnd() * usable.length)];
  else {
    choice = usable.map(u => {
      const d = estDmg(g, p.active, o.active, u.a);
      let v = d + (o.active && d >= g.hpLeft(o.active) ? 80 : 0);
      const t = u.a.text || '';
      if (/does (\d+) damage to itself/.test(t)) { const m = +t.match(/does (\d+) damage to itself/)[1]; if (m >= g.hpLeft(p.active)) v -= 150; else v -= m / 3; }
      if (/Discard (all|\d+|\w+) .*Energy/.test(t) && !(o.active && d >= g.hpLeft(o.active))) v -= 15;
      if (/Paralyzed|Asleep|Confused|Poisoned/.test(t) && /Defending/.test(t)) v += 12;
      if (/Search your deck|Draw/.test(t) && !d) v += (p.hand.length < 3 ? 15 : 5);
      if (/Benched/.test(t)) v += 5;
      if (!d && !u.a.fx && u.a.fx !== 0) v -= 5;
      return { u, v };
    }).sort((a, b) => b.v - a.v)[0].u;
  }
  await sleep(400);
  await g.attack(p, choice.i);
};
async function maybeRetreat(g, p) {
  const o = g.opp(p); const a = p.active; if (!a || !p.bench.length) return;
  if (!g.canRetreat(p)) return;
  const cur = bestAttack(g, p, a, o.active);
  const curOk = cur && cur.miss === 0;
  const danger = o.active && (() => { const b = bestAttack(g, o, o.active, a); return b && b.miss <= 1 && estDmg(g, o.active, a, b.a) >= g.hpLeft(a); })();
  let bestB = null, bv = -1e9;
  for (const s of p.bench) { const b = bestAttack(g, p, s, o.active); const v = (b && b.miss === 0 ? 50 + b.dmg : -(b ? b.miss : 4) * 15) + g.hpLeft(s) / 4; if (v > bv) { bv = v; bestB = s; } }
  const cost = g.retreatCost(a);
  const shouldMove = (!curOk && bv > 40) || (danger && g.hpLeft(bestB) > g.hpLeft(a) && bv > 0 && a.cards.length > 1) || (a.st === 'confused' && bv > 30);
  if (shouldMove && cost <= 2 && (cost === 0 || g.energyTokens(a).length - cost >= 0)) {
    await g.retreat(p, bestB);
  }
}
async function attachBest(g, p) {
  const o = g.opp(p);
  const en = p.hand.filter(c => g.isEnergy(c));
  if (!en.length || p.energyPlayed) return;
  let best = null, bv = -1e9;
  for (const c of en) for (const s of g.slots(p)) {
    if (!g.canAttach(p, c, s)) continue;
    const tok = g.energyTokens(s); const add = tokOf(g, c);
    const e = g.eff(s); if (!e.atk.length) continue;
    const before = Math.min(...e.atk.map(a => deficit(tok, a.cost)));
    const after = Math.min(...e.atk.map(a => deficit(tok.concat(add), a.cost)));
    const maxCost = Math.max(...e.atk.map(a => a.cost.length));
    let v = (before - after) * 30;
    const enablesNow = g.isActive(s) && before > 0 && after === 0;
    if (enablesNow) v += 100;
    if (g.isActive(s)) v += 15;
    if (before === 0 && tok.length >= maxCost) v -= 40;
    if (e.types.includes(add[0])) v += 6;
    if (g.def(c).name === 'Rainbow Energy' && g.hpLeft(s) <= 10) v -= 200;
    // preferir guardar DCE para Pokémon que lo necesitan
    if (g.def(c).name === 'Double Colorless Energy' && (before - after) < 2) v -= 10;
    // evoluciones en mano para esta línea
    if (p.hand.some(h => g.def(h).from === g.baseDef(s).name)) v += 10;
    v += s.cards.length * 3 + Math.min(g.hpLeft(s), 100) / 20;
    if (v > bv) { bv = v; best = [c, s]; }
  }
  if (best && bv > -20) await g.attach(p, best[0], best[1]);
}
AI.bestAttack = bestAttack; AI.estDmg = estDmg; AI.deficit = deficit;
root.PTCG.AI = AI;
})(typeof window !== 'undefined' ? window : globalThis);
