// ============ PODERES POKÉMON ============
(function (root) {
const { FX } = root.PTCG;
const P = FX.pw;
const NB = ' Este poder no puede usarse si {S} está Dormido, Confundido o Paralizado.';
const NW = ' Este poder deja de funcionar mientras {S} esté Dormido, Confundido o Paralizado.';
function def(name, o) { P[name] = o; }
const pick = async (g, p, title, options, purpose, optional) => g.ask(p, { kind: 'slot', title, options, purpose, optional });

def('Bench Guard', { es: 'Mientras {S} esté en tu Banca, cada vez que uno de tus otros Pokémon en Banca reciba daño, puedes hacer que {S} reciba 10 de ese daño en su lugar.' });
def('Buzzap', { es: 'En cualquier momento de tu turno (antes de atacar), puedes dejar Fuera de Combate a {S} y unirlo a otro de tus Pokémon. Si lo haces, elige un tipo de Energía: {S} pasa a ser una carta de Energía de ese tipo que proporciona 2 Energías.' + NB,
  can: (g, p, s) => g.slots(p).length > 1,
  use: async (g, p, s) => {
    const t = await pick(g, p, 'Elige a qué Pokémon unir a Electrode', g.slots(p).filter(x => x !== s), 'energyTarget');
    if (!t) return false;
    const ty = await g.ask(p, { kind: 'type', title: 'Elige el tipo de Energía', exclude: ['C'], purpose: 'buzzapType', slot: t });
    const o = g.opp(p);
    const wasActive = p.active === s;
    g.removeSlot(s);
    const card = s.cards[s.cards.length - 1];
    for (const c of s.cards.slice(0, -1).concat(s.energy, s.att)) g.toDiscard(c);
    card.buzzap = ty; t.energy.push(card);
    g.log(`Electrode se convierte en Energía (${root.PTCG.T[ty]} ×2). ${o.name} toma un Premio.`);
    if (o.prizes.length) o.hand.push(o.prizes.pop());
    if (!o.prizes.length) g.win(o.i, 'tomó todas sus cartas de Premio.');
    if (wasActive) { const n = await g.ask(p, { kind: 'slot', title: 'Elige tu nuevo Pokémon Activo', options: p.bench.slice(), purpose: 'newActive' }); await g.switchActive(p, n || p.bench[0]); }
  }, ai: () => false });
def('Call the Boss', { es: 'Cuando juegues a {S} desde tu mano, puedes buscar en tu mazo la carta de Entrenador llamada Giovanni, enseñarla a tu rival y ponerla en tu mano. Baraja tu mazo después.',
  onPlay: async (g, p) => { const c = p.deck.find(c => g.def(c).name === 'Giovanni'); if (c && await g.ask(p, { kind: 'yesno', title: '¿Buscar la carta Giovanni en tu mazo?', purpose: 'yes' })) { g.removeFrom(p.deck, c); p.hand.push(c); g.shuffleDeck(p); } } });
def('Clairvoyance', { es: 'Tu rival juega con su mano boca arriba.' + NW });
def('Cowardice', { es: 'En cualquier momento de tu turno (antes de atacar), puedes devolver a {S} a tu mano (descarta todas las cartas unidas). No puede usarse el turno en que pusiste a {S} en juego.' + NB.replace('Este poder no puede usarse si', 'Tampoco si'),
  can: (g, p, s) => s.played !== g.turnNo && (p.active !== s || p.bench.length > 0),
  use: async (g, p, s) => { const wasActive = p.active === s; g.removeSlot(s); p.hand.push(...s.cards); for (const c of s.energy.concat(s.att)) g.toDiscard(c); if (wasActive) { const n = await g.ask(p, { kind: 'slot', title: 'Elige tu nuevo Pokémon Activo', options: p.bench.slice(), purpose: 'newActive' }); await g.switchActive(p, n || p.bench[0]); } },
  ai: (g, p, s) => s.dmg >= g.hp(s) - 10 && p.bench.length > 0 && p.active === s });
def('Curse', { es: 'Una vez durante tu turno (antes de atacar), puedes mover 1 contador de daño de uno de los Pokémon de tu rival a otro (aunque lo deje Fuera de Combate).' + NB, once: true,
  can: (g, p) => { const o = g.opp(p); return g.slots(o).some(s => s.dmg > 0) && g.slots(o).length > 1; },
  use: async (g, p) => { const o = g.opp(p); const from = await pick(g, p, 'Maldición: elige de dónde quitar 1 contador', g.slots(o).filter(s => s.dmg > 0), 'curseFrom'); const to = await pick(g, p, 'Elige a quién poner el contador', g.slots(o).filter(s => s !== from), 'curseTo'); from.dmg -= 10; to.dmg += 10; g.log(`Maldición mueve un contador a ${g.nm(to)}.`); },
  ai: (g, p) => true });
def('Damage Swap', { es: 'Tantas veces como quieras durante tu turno (antes de atacar), puedes mover 1 contador de daño de uno de tus Pokémon a otro, siempre que no lo dejes Fuera de Combate.' + NB,
  can: (g, p) => g.slots(p).some(s => s.dmg > 0) && g.slots(p).length > 1,
  use: async (g, p) => { const from = await pick(g, p, 'Cambio de Daño: ¿de qué Pokémon quitar 1 contador?', g.slots(p).filter(s => s.dmg > 0), 'swapFrom', true); if (!from) return false; const opts = g.slots(p).filter(s => s !== from && g.hpLeft(s) > 10); if (!opts.length) return false; const to = await pick(g, p, '¿A qué Pokémon moverlo?', opts, 'swapTo', true); if (!to) return false; from.dmg -= 10; to.dmg += 10; g.log(`Se mueve un contador de ${g.nm(from)} a ${g.nm(to)}.`); },
  ai: (g, p) => { const a = p.active; return a && a.dmg > 0 && g.hpLeft(a) <= 30 && p.bench.some(s => g.hpLeft(s) > 40); } });
def('Emerge', { es: 'Una vez durante tu turno (antes de atacar), puedes lanzar una moneda. Si sale cara, busca en tu mazo una carta de Evolución llamada Beedrill de Koga y ponla sobre {S} (cuenta como evolucionar). Baraja tu mazo después.' + NB, once: true,
  use: async (g, p, s) => { const r = await g.flip(p, 1, 'Emerger'); if (r[0]) { const c = p.deck.find(c => g.def(c).name === "Koga's Beedrill"); if (c) { g.removeFrom(p.deck, c); p.hand.push(c); await g.evolve(p, c, s, true); } g.shuffleDeck(p); } },
  ai: (g, p) => p.deck.some(c => g.def(c).name === "Koga's Beedrill") });
def('Energy Burn', { es: 'Tantas veces como quieras durante tu turno (antes de atacar), puedes convertir toda la Energía unida a {S} en Energía Fuego durante el resto del turno.' + NB,
  can: (g, p, s) => s.flags_burn !== g.turnNo,
  use: async (g, p, s) => { s.flags_burn = g.turnNo; g.log('Toda la energía de Charizard se convierte en Fuego.'); },
  ai: (g, p, s) => p.active === s });
def('Energy Charge', { es: 'Tantas veces como quieras durante tu turno (antes de atacar), si {S} es tu Pokémon Activo, puedes tomar 1 Energía Rayo unida a uno de tus Pokémon y unirla a {S}.' + NB,
  can: (g, p, s) => p.active === s && p.bench.some(b => g.energyCardsOf(b, 'L').some(c => !c.buzzap && g.def(c).basic)),
  use: async (g, p, s) => { const from = await pick(g, p, 'Elige de qué Pokémon tomar Energía Rayo', p.bench.filter(b => g.energyCardsOf(b, 'L').some(c => g.def(c).basic)), 'energyFrom', true); if (!from) return false; const c = from.energy.find(c => g.def(c).name === 'Lightning Energy'); g.removeFrom(from.energy, c); s.energy.push(c); },
  ai: (g, p, s) => true });
def('Energy Drain', { es: 'Si un ataque del rival hace daño a {S} (aunque quede Fuera de Combate), lanza una moneda. Si sale cara, elige 1 carta de Energía unida al Pokémon atacante y descártala. No funciona si {S} ya está Dormido, Confundido o Paralizado.' });
def('Energy Trans', { es: 'Tantas veces como quieras durante tu turno (antes de atacar), puedes tomar 1 Energía Planta unida a uno de tus Pokémon y unirla a otro distinto.' + NB,
  can: (g, p) => g.slots(p).length > 1 && g.slots(p).some(s => s.energy.some(c => g.def(c).name === 'Grass Energy')),
  use: async (g, p) => { const from = await pick(g, p, 'Trasvase: ¿de qué Pokémon tomar Energía Planta?', g.slots(p).filter(s => s.energy.some(c => g.def(c).name === 'Grass Energy')), 'energyFrom', true); if (!from) return false; const to = await pick(g, p, '¿A qué Pokémon unirla?', g.slots(p).filter(s => s !== from), 'energyTarget', true); if (!to) return false; const c = from.energy.find(c => g.def(c).name === 'Grass Energy'); g.removeFrom(from.energy, c); to.energy.push(c); g.log(`Trasvase de Energía: ${g.nm(from)} → ${g.nm(to)}.`); },
  ai: () => false });
def('Evolutionary Light', { es: 'Una vez durante tu turno (antes de atacar), puedes buscar en tu mazo una carta de Evolución, enseñarla a tu rival y ponerla en tu mano. Baraja tu mazo después.' + NB, once: true,
  can: (g, p) => p.deck.some(c => g.isEvoCard(c)),
  use: async (g, p) => { const opts = p.deck.filter(c => g.isEvoCard(c)); const [c] = await g.ask(p, { kind: 'cards', title: 'Busca una carta de Evolución', cards: opts, min: 1, max: 1, purpose: 'searchEvo', fromDeck: true }); g.removeFrom(p.deck, c); p.hand.push(c); g.shuffleDeck(p); },
  ai: () => true });
def('Final Beam', { es: 'Cuando {S} quede Fuera de Combate por un ataque, lanza una moneda. Si sale cara, este poder hace 20 de daño por cada Energía Agua unida a {S} al Pokémon que lo dejó Fuera de Combate (aplica Debilidad y Resistencia).' + NW });
def('Flee', { es: 'Si un ataque hace daño a {S} mientras es tu Pokémon Activo, puedes cambiarlo por uno de tus Pokémon en Banca. No funciona si {S} ya está Dormido, Confundido o Paralizado.' });
def('Fortitude', { es: 'Si {S} fuera a quedar Fuera de Combate por un ataque rival, lanza una moneda. Si sale cara, no queda Fuera de Combate y le quedan 10 PS. No funciona si {S} ya está Dormido, Confundido o Paralizado.' });
def('Fragrance Trap', { es: 'Una vez durante tu turno (antes de atacar), puedes lanzar una moneda. Si sale cara y tu rival tiene Pokémon en Banca, elige 1 y cámbialo por su Pokémon Activo.' + NB, once: true,
  can: (g, p) => g.opp(p).bench.length > 0,
  use: async (g, p) => { const r = await g.flip(p, 1, 'Trampa Aromática'); if (r[0]) { const o = g.opp(p); const t = await pick(g, p, 'Elige el Pokémon rival que pasará a ser Activo', o.bench.slice(), 'gustTarget'); await g.switchActive(o, t); } },
  ai: () => true });
def('Frenzy', { es: 'Si {S} hace daño estando Confundido (incluso a sí mismo), hace 30 de daño más.', ignoreStatus: true });
def('Gaseous Form', { es: '{S} obtiene +10 PS por cada carta de Energía Psíquica unida. Funciona aunque esté Dormido, Confundido o Paralizado.', ignoreStatus: true });
def('Gather Fire', { es: 'Una vez durante tu turno (antes de atacar), puedes tomar 1 Energía Fuego unida a otro de tus Pokémon y unirla a {S}.' + NB, once: true,
  can: (g, p, s) => g.slots(p).some(o => o !== s && o.energy.some(c => g.def(c).name === 'Fire Energy')),
  use: async (g, p, s) => { const from = await pick(g, p, 'Elige de qué Pokémon tomar Energía Fuego', g.slots(p).filter(o => o !== s && o.energy.some(c => g.def(c).name === 'Fire Energy')), 'energyFrom'); const c = from.energy.find(c => g.def(c).name === 'Fire Energy'); g.removeFrom(from.energy, c); s.energy.push(c); },
  ai: (g, p, s) => p.active === s });
def('Hay Fever', { es: 'No se pueden jugar cartas de Entrenador.' + NW });
def('Heal', { es: 'Una vez durante tu turno (antes de atacar), puedes lanzar una moneda. Si sale cara, retira 1 contador de daño de uno de tus Pokémon.' + NB, once: true,
  can: (g, p) => g.slots(p).some(s => s.dmg > 0),
  use: async (g, p) => { const r = await g.flip(p, 1, 'Curar'); if (r[0]) { const t = await pick(g, p, 'Elige un Pokémon para curar 10', g.slots(p).filter(s => s.dmg > 0), 'healOwn'); g.heal(t, 10); } },
  ai: () => true });
def('Healing Fire', { es: 'Cada vez que unas una Energía Fuego de tu mano a {S}, retira 1 contador de daño de él.' + NW });
def('Invisible Wall', { es: 'Cada vez que un ataque (incluso tuyo) haga 30 o más de daño a {S} (después de Debilidad y Resistencia), evita ese daño. (Los demás efectos siguen ocurriendo.)' + NW });
def('Kabuto Armor', { es: 'Cada vez que un ataque (incluso tuyo) haga daño a {S} (después de Debilidad y Resistencia), ese ataque sólo hace la mitad del daño (redondeado hacia abajo a la decena).' + NW });
def('Long-Distance Hypnosis', { es: 'Una vez durante tu turno (antes de atacar), puedes lanzar una moneda. Si sale cara, el Pokémon Defensor pasa a estar Dormido; si sale cruz, tu Pokémon Activo pasa a estar Dormido.' + NB, once: true,
  can: (g, p) => !!g.opp(p).active && !!p.active,
  use: async (g, p) => { const r = await g.flip(p, 1, 'Hipnosis a Distancia'); g.setStatus(r[0] ? g.opp(p).active : p.active, 'asleep'); },
  ai: (g, p) => !p.attackedPlanned && false });
def('Matter Exchange', { es: 'Una vez durante tu turno (antes de atacar), puedes descartar una carta de tu mano para robar una carta.' + NB, once: true,
  can: (g, p) => p.hand.length > 0 && p.deck.length > 0,
  use: async (g, p) => { const [c] = await g.ask(p, { kind: 'cards', title: 'Descarta una carta para robar otra', cards: p.hand.slice(), min: 1, max: 1, purpose: 'discardHand' }); g.removeFrom(p.hand, c); g.toDiscard(c); g.draw(p, 1); },
  ai: (g, p) => p.hand.length > 2 });
def('Natural Healing', { es: 'Una vez durante tu turno (antes de atacar), puedes retirar 1 contador de daño de {S}.' + NB, once: true,
  can: (g, p, s) => s.dmg > 0, use: async (g, p, s) => { g.heal(s, 10); }, ai: () => true });
def('Peek', { es: 'Una vez durante tu turno (antes de atacar), puedes mirar una de estas: la carta superior del mazo de cualquier jugador, una carta al azar de la mano de tu rival, o uno de los Premios de cualquier jugador.' + NB, once: true,
  use: async (g, p) => { const o = g.opp(p); const i = await g.ask(p, { kind: 'option', title: 'Fisgar: ¿qué quieres mirar?', options: ['Carta superior de mi mazo', 'Carta superior del mazo rival', 'Carta al azar de la mano rival', 'Uno de mis Premios', 'Uno de los Premios rivales'], purpose: 'peek' });
    let c = null; if (i === 0) c = p.deck[p.deck.length - 1]; if (i === 1) c = o.deck[o.deck.length - 1]; if (i === 2 && o.hand.length) c = o.hand[Math.floor(g.rnd() * o.hand.length)]; if (i === 3) c = p.prizes[0]; if (i === 4) c = o.prizes[0];
    if (c && !p.ai && g.io.show) await g.io.show(g, [c], 'Fisgar'); },
  ai: () => false });
def('Photosynthesis', { es: 'Todas las cartas de Energía unidas a {S} proporcionan Energía Planta en lugar de su tipo habitual. Funciona aunque esté Dormido, Confundido o Paralizado.', ignoreStatus: true });
def('Pollen Defense', { es: 'Si un ataque hace daño a {S} mientras es tu Pokémon Activo (aunque quede Fuera de Combate), lanza una moneda. Si sale cara, el Pokémon Activo rival pasa a estar Confundido. Funciona aunque esté Dormido, Confundido o Paralizado.', ignoreStatus: true });
def('Pollen Stench', { es: 'Una vez durante tu turno (antes de atacar), puedes lanzar una moneda. Si sale cara, el Pokémon Defensor pasa a estar Confundido; si sale cruz, tu Pokémon Activo pasa a estar Confundido.' + NB, once: true,
  can: (g, p) => !!g.opp(p).active && !!p.active,
  use: async (g, p) => { const r = await g.flip(p, 1, 'Hedor de Polen'); g.setStatus(r[0] ? g.opp(p).active : p.active, 'confused'); },
  ai: () => false });
def('Prehistoric Power', { es: 'No se pueden jugar más cartas de Evolución.' + NW });
def('Psylink', { es: '{S} siempre tiene una copia de cada ataque de tus Pokémon Psíquicos en juego (incluidos sus costes de Energía y demás requisitos).' + NB });
def('Rain Dance', { es: 'Tantas veces como quieras durante tu turno (antes de atacar), puedes unir 1 carta de Energía Agua a uno de tus Pokémon de tipo Agua. (No cuenta como tu unión de Energía del turno.)' + NB });
def('Rebellion', { es: 'Cada vez que {S} ataque, lanza 2 monedas. Si ambas salen cruz, el ataque no hace nada y {S} y todas sus cartas unidas se barajan en tu mazo. (Funciona aunque esté Confundido.)', ignoreStatus: true });
def('Rebirth', { es: 'Cuando {S} quede Fuera de Combate, puedes devolverlo a tu mano después de descartarlo. No puede usarse si estaba Dormido, Confundido o Paralizado al quedar Fuera de Combate.' });
def('Reel In', { es: 'Cuando juegues a {S} desde tu mano, elige hasta 3 Pokémon Básicos y/o cartas de Evolución de tu pila de descartes y ponlos en tu mano.',
  onPlay: async (g, p) => { const opts = p.discard.filter(c => g.def(c).st === 'P'); if (!opts.length) return; const sel = await g.ask(p, { kind: 'cards', title: 'Recoger: elige hasta 3 Pokémon de tu descarte', cards: opts, min: 0, max: Math.min(3, opts.length), purpose: 'getPokemon' }); for (const c of sel) { g.removeFrom(p.discard, c); p.hand.push(c); } } });
def('Relaxing Scent', { es: 'Mientras {S} sea tu Pokémon Activo, cada vez que un ataque (incluso tuyo) haga daño a cualquier Pokémon, sólo hace la mitad del daño (redondeado hacia arriba a la decena).' + NW });
def('Restless Sleep', { es: 'Si un ataque rival hace daño a {S} estando ya Dormido (aunque quede Fuera de Combate), este poder hace 20 de daño al Pokémon atacante.', ignoreStatus: true });
def('Retreat Aid', { es: 'Mientras {S} esté en tu Banca, pagas 1 Energía Incolora menos para retirar a tu Pokémon Activo.' });
def('Scram', { es: 'Si a {S} le quedan exactamente 10 PS, barájalo junto con todas sus cartas unidas en tu mazo.' + NW });
def('Shapeshift', { es: 'Una vez durante tu turno (antes de atacar), puedes unir una carta de Evolución de tu mano a {S} (no cuenta como evolucionar). Trata a {S} como si fuera ese Pokémon. No puede evolucionar, devolucionar ni usar el Poder de ese Pokémon. Durante tu turno, puedes descartar esa carta.' + NB, once: true,
  can: (g, p, s) => p.hand.some(c => g.isEvoCard(c)) && !s.att.some(c => g.isEvoCard(c)),
  use: async (g, p, s) => { const opts = p.hand.filter(c => g.isEvoCard(c)); const [c] = await g.ask(p, { kind: 'cards', title: 'Metamorfosis: elige una Evolución de tu mano', cards: opts, min: 1, max: 1, purpose: 'shapeshift' }); g.removeFrom(p.hand, c); s.att.push(c); g.log(`Ninetales de Brock toma la forma de ${g.cn(c)}.`); },
  ai: () => false });
def('Shell Armor', { es: 'Puedes reducir en 10 todo el daño hecho por ataques a {S} (después de Debilidad y Resistencia).' + NB });
def('Shift', { es: 'Una vez durante tu turno (antes de atacar), puedes cambiar el tipo de {S} al tipo de cualquier otro Pokémon en juego distinto de Incoloro.' + NB, once: true,
  use: async (g, p, s) => { const types = [...new Set(g.allSlots().filter(x => x !== s).flatMap(x => g.eff(x).types).filter(t => t !== 'C'))]; if (!types.length) return false; const t = await g.ask(p, { kind: 'type', title: 'Elige el nuevo tipo de Venomoth', only: types, purpose: 'shiftType', slot: s }); s.fx.typeShift = { v: t, until: g.turnNo + 1 }; g.log(`Venomoth ahora es de tipo ${root.PTCG.T[t]}.`); },
  ai: (g, p, s) => { const o = g.opp(p).active; return o && p.active === s && g.eff(o).weak && g.eff(o).weak !== 'C' && !g.eff(s).types.includes(g.eff(o).weak) && g.allSlots().some(x => x !== s && g.eff(x).types.includes(g.eff(o).weak)); } });
def('Shock Blast', { es: 'Si {S} es tu Pokémon Activo y recibe daño (aunque quede Fuera de Combate), lanza una moneda. Si sale cruz, este poder hace 20 de daño a cada Pokémon Activo. Funciona aunque esté Dormido, Confundido o Paralizado.', ignoreStatus: true });
def('Sinkhole', { es: 'Cada vez que el Pokémon Activo de tu rival se retire, tu rival lanza una moneda. Si sale cruz, este poder le hace 20 de daño (sin Debilidad ni Resistencia).' + NW });
def('Sneak Attack', { es: 'Cuando juegues a {S} desde tu mano, puedes elegir 1 de los Pokémon de tu rival. Si lo haces, {S} le hace 10 de daño (aplica Debilidad y Resistencia).',
  onPlay: async (g, p, s) => { const o = g.opp(p); const t = await g.ask(p, { kind: 'slot', title: 'Ataque Furtivo: elige un Pokémon rival (10 de daño)', options: g.slots(o), purpose: 'damageOpp', optional: true }); if (!t) return; const fake = g.mkCtx(p, s, { dmg: '0', nameEs: 'Ataque Furtivo' }, g.eff(s)); fake.target = t; fake.def = t; const wasActive = g.isActive(t); const d = g.attackDamage(fake, t, 10, { wr: wasActive }); g.log(`Ataque Furtivo hace ${d} de daño a ${g.nm(t)}.`); } });
def('Soak Up', { es: 'Una vez durante tu turno (antes de atacar), puedes tomar hasta 2 Energías Planta unidas a tus otros Pokémon y unirlas a {S}.' + NB, once: true,
  can: (g, p, s) => g.slots(p).some(o => o !== s && o.energy.some(c => g.def(c).name === 'Grass Energy')),
  use: async (g, p, s) => { for (let k = 0; k < 2; k++) { const opts = g.slots(p).filter(o => o !== s && o.energy.some(c => g.def(c).name === 'Grass Energy')); if (!opts.length) break; const from = await pick(g, p, `Absorber: elige de dónde tomar Energía Planta (${k + 1}/2)`, opts, 'energyFrom', true); if (!from) break; const c = from.energy.find(c => g.def(c).name === 'Grass Energy'); g.removeFrom(from.energy, c); s.energy.push(c); } },
  ai: (g, p, s) => p.active === s });
def('Step In', { es: 'Una vez durante tu turno (antes de atacar), si {S} está en tu Banca, puedes cambiarlo por tu Pokémon Activo.' + NB, once: true,
  can: (g, p, s) => p.bench.includes(s),
  use: async (g, p, s) => { await g.switchActive(p, s); },
  ai: (g, p, s) => { const a = p.active; return a && (g.attackList(p).every(x => !x.ok) || a.st) && g.energyCount(s) >= 2; } });
def('Sticky Goo', { es: 'Mientras {S} sea tu Pokémon Activo, tu rival paga 2 Energías Incoloras más para retirar a su Pokémon Activo.' + NW });
def('Strange Barrier', { es: 'Cada vez que un ataque de un Pokémon Básico (incluso tuyo) haga 20 o más de daño a {S} (después de Debilidad y Resistencia), reduce ese daño a 10.' + NW });
def('Strange Behavior', { es: 'Tantas veces como quieras durante tu turno (antes de atacar), puedes mover 1 contador de daño de uno de tus Pokémon a {S}, siempre que no lo dejes Fuera de Combate.' + NB,
  can: (g, p, s) => g.hpLeft(s) > 10 && g.slots(p).some(o => o !== s && o.dmg > 0),
  use: async (g, p, s) => { const from = await pick(g, p, 'Elige de qué Pokémon mover 1 contador a Slowbro', g.slots(p).filter(o => o !== s && o.dmg > 0), 'swapFrom', true); if (!from) return false; from.dmg -= 10; s.dmg += 10; },
  ai: (g, p, s) => { const a = p.active; return a && a !== s && a.dmg > 0 && g.hpLeft(a) <= 30 && g.hpLeft(s) > 30; } });
def('Strikes Back', { es: 'Cada vez que un ataque rival dañe a {S} (aunque quede Fuera de Combate), este poder hace 10 de daño al Pokémon atacante (sin Debilidad ni Resistencia). No funciona si {S} está Dormido, Confundido o Paralizado cuando el rival ataca.' });
def('Summon Minions', { es: 'Cuando juegues a {S} desde tu mano, busca en tu mazo hasta 2 Pokémon Básicos y ponlos en tu Banca. Baraja tu mazo después.',
  onPlay: async (g, p) => { const room = g.benchMax(p) - p.bench.length; const opts = p.deck.filter(c => g.isBasicCard(c) && g.def(c).st === 'P'); if (room > 0 && opts.length) { const sel = await g.ask(p, { kind: 'cards', title: 'Invocar Secuaces: elige hasta 2 Pokémon Básicos', cards: opts, min: 0, max: Math.min(2, room, opts.length), purpose: 'searchBasic', fromDeck: true }); for (const c of sel) { g.removeFrom(p.deck, c); p.bench.push(g.mkSlot(p, c)); } } g.shuffleDeck(p); } });
def('Thick Skinned', { es: '{S} no puede quedar Dormido, Confundido, Paralizado ni Envenenado. No funciona si ya está Dormido, Confundido o Paralizado.' });
def('Toxic Gas', { es: 'Ignora todos los Poderes Pokémon que no sean Gas Tóxico.' + NW });
def('Transform', { es: 'Si {S} es tu Pokémon Activo, trátalo como si fuera la misma carta que el Pokémon Defensor (tipo, PS, Debilidad, etc.), salvo que no puede evolucionar, siempre tiene este Poder y puedes tratar su Energía como de cualquier tipo.' + NW });
def('Transparency', { es: 'Cada vez que un ataque haga algo a {S}, lanza una moneda. Si sale cara, evita todos los efectos de ese ataque, incluido el daño.' + NW });
def('Trickery', { es: 'Una vez durante tu turno (antes de atacar), puedes cambiar 1 de tus Premios por la carta superior de tu mazo.' + NB, once: true,
  can: (g, p) => p.prizes.length > 0 && p.deck.length > 0,
  use: async (g, p) => { const i = Math.floor(g.rnd() * p.prizes.length); const t = p.deck.pop(); p.deck.push(p.prizes[i]); p.prizes[i] = t; g.log('Engaño: se intercambia un Premio con la carta superior del mazo.'); },
  ai: () => false });
})(typeof window !== 'undefined' ? window : globalThis);
