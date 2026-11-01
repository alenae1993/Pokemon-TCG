// ============ MAZOS META (modo "Todas las cartas") ============
// Era Mega: listas reales de Limitless TCG (Regional Puebla, 24-oct-2026, formato TEF-30C), adaptadas a las
// expansiones del juego. Era WOTC: listas representativas de los arquetipos clásicos (Bulbapedia y listas de la época).
(function (root) {
const P = root.PTCG;
const LT = 'https://www.limitlesstcg.com';
const MEGA = [
  { id: 'dragapult', name: 'Dragapult ex', cover: 'Dragapult ex', by: 'Andrew Hedrick', place: '1.º · Regional Puebla 2026', src: LT + '/decks/list/29678',
    desc: 'El mazo más jugado del formato (47% en Los Ángeles). Fantasma Asalto reparte 6 contadores por la Banca rival mientras Munkidori mueve daño y Budew traba Objetos.',
    subs: ['Dunsparce + Dudunsparce → 1 Budew y 1 Munkidori más', 'Crispin → Camarera', 'Unfair Stamp → Juez'],
    list: [[4, 'Dreepy'], [4, 'Drakloak'], [3, 'Dragapult ex'], [3, 'Munkidori'], [3, 'Budew'], [1, 'Meowth ex'], [1, 'Fezandipiti ex'],
      [4, "Lillie's Determination"], [3, "Boss's Orders"], [2, 'Waitress'], [1, "Rosa's Encouragement"], [2, 'Judge'], [4, 'Buddy-Buddy Poffin'], [4, 'Poké Pad'], [4, 'Crushing Hammer'], [3, 'Ultra Ball'], [3, 'Night Stretcher'], [2, 'Risky Ruins'],
      [3, 'R'], [3, 'P'], [3, 'D']] },
  { id: 'alakazam', name: 'Alakazam', cover: 'Alakazam', by: 'Nathan Ginsburg', place: '3.º · Regional Puebla 2026', src: LT + '/decks/list/30794',
    desc: 'Alakazam pone contadores según las cartas en tu mano: el mazo roba muchísimo y castiga desde lejos con Jaula de Combate protegiendo su Banca.',
    subs: ['Dunsparce + Dudunsparce → línea de Pikipek / Toucannon (robo)', 'Genesect y Flutter Mane → Meowth ex y Budew', 'Hilda → Ultra Ball', "Lillie's Pearl → Determinación de Lylia", 'Special Red Card → Juez', 'Energías especiales → Energía Psíquica básica'],
    list: [[4, 'Abra'], [4, 'Kadabra'], [3, 'Alakazam'], [2, "Lillie's Clefairy ex"], [1, 'Fezandipiti ex'], [2, 'Pikipek'], [1, 'Trumbeak'], [2, 'Toucannon'], [1, 'Meowth ex'], [1, 'Budew'],
      [4, 'Dawn'], [4, 'Ultra Ball'], [2, "Boss's Orders"], [4, 'Buddy-Buddy Poffin'], [4, 'Poké Pad'], [3, 'Wondrous Patch'], [2, 'Rare Candy'], [1, 'Sacred Ash'], [1, 'Judge'], [3, "Lillie's Determination"], [3, 'Battle Cage'],
      [8, 'P']] },
  { id: 'zoroark', name: "Zoroark ex de N", cover: "N's Zoroark ex", by: 'Fernando Cifuentes (Chile)', place: '13.º · Regional Puebla 2026', src: LT + '/decks/list/30800',
    desc: 'Comodín Nocturno copia los ataques de los Pokémon de N en la Banca (Zekrom, Reshiram) e Intercambio roba sin parar. Mucho Jefe y Entrenamiento de Cinturón Negro contra los ex.',
    subs: ['Pecharunt ex → Pecharunt', 'Cyrano → Pokétableta', 'Unfair Stamp → Juez', "N's Castle → Jaula de Combate"],
    list: [[4, "N's Zorua"], [4, "N's Zoroark ex"], [2, "N's Zekrom"], [2, 'Munkidori'], [1, "N's Reshiram"], [1, 'Yveltal'], [1, 'Budew'], [1, 'Pecharunt'], [1, 'Meowth ex'],
      [4, "Lillie's Determination"], [4, "Boss's Orders"], [2, "Black Belt's Training"], [2, 'Judge'], [3, 'Poké Pad'], [4, "N's PP Up"], [4, 'Ultra Ball'], [4, 'Buddy-Buddy Poffin'], [2, 'Night Stretcher'], [1, 'Energy Switch'], [2, 'Punk Helmet'], [2, "Team Rocket's Watchtower"], [2, 'Battle Cage'],
      [7, 'D']] },
  { id: 'rocketmewtwo', name: 'Mewtwo ex del Team Rocket', cover: "Team Rocket's Mewtwo ex", by: 'Lista de muestra de Limitless', place: 'Regional Puebla 2026', src: LT + '/decks/list/30834',
    desc: 'Todo el mazo es del Team Rocket: Spidops recarga Energía desde el descarte, los Partidarios del Team Rocket roban y buscan, y Mewtwo ex remata con Bola Borradora.',
    subs: ["Articuno del Team Rocket → Kangaskhan ex del Team Rocket", 'Bug Catching Set → Pokétableta', 'Maximum Belt → Camilla Nocturna', "Team Rocket's Energy → Energía Planta/Psíquica básica"],
    list: [[4, "Team Rocket's Tarountula"], [4, "Team Rocket's Spidops"], [2, "Team Rocket's Mimikyu"], [2, "Team Rocket's Mewtwo ex"], [2, "Team Rocket's Kangaskhan ex"], [1, "Lillie's Clefairy ex"],
      [3, "Team Rocket's Ariana"], [3, "Team Rocket's Giovanni"], [3, "Team Rocket's Proton"], [3, "Lillie's Determination"], [2, "Team Rocket's Archer"], [1, "Team Rocket's Petrel"], [4, "Team Rocket's Transceiver"], [4, 'Ultra Ball'], [3, 'Night Stretcher'], [2, 'Poké Pad'], [1, 'Energy Switch'], [1, 'Wondrous Patch'], [2, "Team Rocket's Factory"], [2, "Team Rocket's Watchtower"],
      [7, 'G'], [4, 'P']] },
  { id: 'lucario', name: 'Mega Lucario ex', cover: 'Mega Lucario ex', by: 'Lista de Limitless', place: '74.º · Regional Puebla 2026', src: LT + '/decks/list/30845',
    desc: 'Lucha pura: Gong de Lucha y Potencia Prémium Plus para golpes enormes, Hariyama y Solrock/Lunatone de apoyo y robo.',
    subs: ['Shaymin (DRI) → Shaymin (POR)', 'Ciphermaniac y Unfair Stamp → Juez', 'Gravity Mountain → Jaula de Combate'],
    list: [[3, 'Riolu'], [3, 'Mega Lucario ex'], [3, 'Solrock'], [2, 'Makuhita'], [2, 'Hariyama'], [2, 'Lunatone'], [1, 'Meowth ex'], [1, 'Shaymin'],
      [4, "Lillie's Determination"], [2, "Boss's Orders"], [4, 'Judge'], [1, "Wally's Compassion"], [4, 'Ultra Ball'], [4, 'Poké Pad'], [4, 'Fighting Gong'], [4, 'Premium Power Pro'], [1, 'Switch'], [1, 'Night Stretcher'], [2, 'Air Balloon'], [2, 'Battle Cage'],
      [10, 'F']] },
  { id: 'starmie', name: 'Mega Starmie / Mega Froslass', cover: 'Mega Starmie ex', by: 'Hanzell Ivan Caballero Torres', place: '135.º · Regional Puebla 2026', src: LT + '/decks/list/30888',
    desc: 'Dos Megas de Agua: Mega Starmie ignora todo con Rayo Nebulosa y Mega Froslass castiga las manos grandes. Ruinas Peligrosas daña a los Básicos rivales.',
    subs: ['Froslass y Glalie (TWM) → 1 Mega Froslass ex y 1 Staryu más', 'Duskull/Dusclops → Budew y Mega Starmie ex', "Larry's Skill → Maya", 'Hilda → Surfista', 'Crispin → Camarera', 'Salvatore → Juez', 'Energías especiales → Energía Agua'],
    list: [[4, 'Snorunt'], [3, 'Mega Froslass ex'], [4, 'Staryu'], [3, 'Mega Starmie ex'], [2, 'Munkidori'], [1, 'Meowth ex'], [1, 'Budew'],
      [4, 'Dawn'], [3, "Lillie's Determination"], [2, 'Surfer'], [2, "Wally's Compassion"], [2, "Boss's Orders"], [1, 'Waitress'], [1, 'Judge'], [4, 'Buddy-Buddy Poffin'], [4, 'Ultra Ball'], [3, 'Poké Pad'], [1, 'Switch'], [1, 'Air Balloon'], [4, 'Risky Ruins'],
      [8, 'W'], [2, 'D']] },
  { id: 'garchomp', name: 'Garchomp ex de Cintia', cover: "Cynthia's Garchomp ex", by: 'Juan Pablo de la Rosa Méndez', place: 'Regional Puebla 2026', src: LT + '/decks/list/30977',
    desc: 'Línea de Fase 2 de Cintia con Caramelo Raro: Garchomp ex golpea fuerte y Spiritomb castiga cuando la Banca sufre daño.',
    subs: ['Roselia/Roserade de Cintia (no están en el juego) → Solrock, Lunatone, Meowth ex, Fezandipiti ex y Budew', 'Hilda → Maya', 'Pokégear 3.0 → Ultra Ball', "Cynthia's Power Weight → Caramelo Raro", 'Special Red Card → Juez', 'Energías especiales → Energía Lucha'],
    list: [[4, "Cynthia's Gible"], [4, "Cynthia's Gabite"], [3, "Cynthia's Garchomp ex"], [1, "Cynthia's Spiritomb"], [2, 'Solrock'], [2, 'Lunatone'], [1, 'Meowth ex'], [1, 'Fezandipiti ex'], [2, 'Budew'],
      [4, "Boss's Orders"], [4, "Lillie's Determination"], [3, 'Dawn'], [4, 'Poké Pad'], [4, 'Ultra Ball'], [3, 'Fighting Gong'], [3, 'Buddy-Buddy Poffin'], [2, 'Night Stretcher'], [1, 'Judge'], [3, 'Rare Candy'], [1, 'Forest of Vitality'],
      [8, 'F']] },
  { id: 'absol', name: 'Mega Absol ex (Box)', cover: 'Mega Absol ex', by: 'Saúl Vázquez Rivera', place: 'Regional Puebla 2026', src: LT + '/decks/list/30925',
    desc: 'Caja de Básicos Oscuros: Munkidori mueve contadores, Mega Absol ex y Mega Audino ex rematan y el Team Rocket busca las piezas.',
    subs: ['Latias ex → Fezandipiti ex', 'Ogerpon Piedra ex → Koraidon ex', 'Pecharunt ex → Pecharunt', 'Cyrano y Pokégear 3.0 → Pokétableta y Búsqueda de Energía', "Xerosic's Machinations → Desguazador", "Lisia's Appeal → Cazador Pokémon", 'Special Red Card → Juez', 'Precious Trolley → Pokochos Gemelos'],
    list: [[4, 'Munkidori'], [2, 'Mega Absol ex'], [2, 'Mega Audino ex'], [1, 'Fezandipiti ex'], [1, 'Yveltal'], [1, 'Koraidon ex'], [1, 'Pecharunt'],
      [4, "Team Rocket's Petrel"], [4, "Boss's Orders"], [3, "Lillie's Determination"], [4, 'Poké Pad'], [1, 'Tool Scrapper'], [1, 'Pokémon Catcher'], [4, "Team Rocket's Transceiver"], [2, 'Energy Search'], [3, 'Judge'], [3, 'Energy Switch'], [2, 'Jumbo Ice Cream'], [2, 'Night Stretcher'], [1, 'Buddy-Buddy Poffin'], [2, "Team Rocket's Watchtower"],
      [9, 'D'], [2, 'P'], [1, 'F']] },
  { id: 'dhelmise', name: 'Dhelmise / Banette (Escondite)', cover: 'Dhelmise', by: 'Arquetipo del 19.º de Puebla (lista armada para el juego)', place: 'Oscuridad Absoluta', src: LT + '/tournaments/583',
    desc: 'Mazo de Oscuridad Absoluta: llena el descarte de Pokémon con Escondite para que Dhelmise golpee por 170 y Sinistcha/Spiritomb castiguen a todo el campo rival.',
    subs: ['Limitless no permitió abrir esa lista: la armé con las cartas de Oscuridad Absoluta del arquetipo'],
    list: [[4, 'Poltchageist'], [2, 'Sinistcha'], [4, 'Dhelmise'], [4, 'Shuppet'], [3, 'Banette'], [1, 'Spiritomb'], [1, 'Fezandipiti ex'], [1, 'Meowth ex'],
      [4, "Lillie's Determination"], [3, "Boss's Orders"], [4, 'Ultra Ball'], [4, 'Buddy-Buddy Poffin'], [4, 'Poké Pad'], [2, 'Night Stretcher'], [2, 'Judge'], [1, 'Switch'], [2, 'Air Balloon'], [2, 'Jacinthe'], [2, 'Wondrous Patch'],
      [10, 'P']] },
];
const BUL = 'https://bulbapedia.bulbagarden.net/wiki/';
const WOTC = [
  { id: 'haymaker', name: 'Haymaker', cover: 'base1-7', by: 'Arquetipo clásico', place: 'Base – Fossil (1999-2000)', src: BUL + 'Haymaker_(TCG)',
    desc: 'Tres Básicos de 70 PS (Hitmonchan, Electabuzz, Scyther) que atacan desde el turno 1, con Gust of Wind, PlusPower y Energy Removal para controlar al rival.',
    subs: ['Bulbapedia da las cartas sin cantidades: cantidades según las listas típicas de la época'],
    list: [[4, 'base1-7'], [4, 'base1-20'], [4, 'base2-10'],
      [4, 'Bill'], [3, 'Professor Oak'], [4, 'Energy Removal'], [3, 'Super Energy Removal'], [4, 'Gust of Wind'], [4, 'PlusPower'], [2, 'Computer Search'], [1, 'Item Finder'], [2, 'Scoop Up'],
      [4, 'Double Colorless Energy'], [9, 'base1-97'], [8, 'base1-100']] },
  { id: 'raindance', name: 'Raindance (Blastoise)', cover: 'base1-2', by: 'Arquetipo clásico', place: 'Base – Fossil (1999-2000)', src: BUL + 'Raindance_(TCG)',
    desc: 'Danza Lluvia de Blastoise une toda la Energía Agua que quieras: Articuno y Lapras golpean más fuerte con cada Energía extra.',
    subs: ['Bulbapedia da 14 Energías Agua y el resto sin cantidades: cantidades según las listas típicas'],
    list: [[4, 'base1-63'], [3, 'base1-42'], [3, 'base1-2'], [2, 'base3-2'], [2, 'base3-10'],
      [4, 'Pokémon Breeder'], [4, 'Professor Oak'], [4, 'Bill'], [2, 'Computer Search'], [2, 'Item Finder'], [2, 'Energy Retrieval'], [2, 'Lass'], [2, 'Super Energy Removal'], [3, 'Gust of Wind'], [2, 'PlusPower'], [2, 'Super Potion'], [2, 'Switch'], [1, 'Maintenance'],
      [14, 'base1-102']] },
  { id: 'damageswap', name: 'Damage Swap (Alakazam)', cover: 'base1-1', by: 'Arquetipo clásico', place: 'Base – Fossil (1999-2000)', src: BUL + 'Deck_archetype_(TCG)',
    desc: 'Intercambio de Daño de Alakazam mueve los contadores a Chansey y Mr. Mime, y Pokémon Center los borra: un muro casi imposible de derribar.',
    subs: ['Lista representativa del arquetipo (Alakazam / Chansey / Pokémon Center)'],
    list: [[4, 'base1-43'], [3, 'base1-32'], [3, 'base1-1'], [4, 'base1-3'], [2, 'base2-6'],
      [4, 'Pokémon Breeder'], [4, 'Professor Oak'], [4, 'Bill'], [4, 'Pokémon Center'], [2, 'Computer Search'], [2, 'Item Finder'], [2, 'Scoop Up'], [2, 'Gust of Wind'], [1, 'Switch'], [2, 'Energy Retrieval'],
      [4, 'Double Colorless Energy'], [13, 'base1-101']] },
  { id: 'dothewave', name: 'Do the Wave (Wigglytuff)', cover: 'base2-16', by: 'Arquetipo clásico', place: 'Base – Jungle (1999-2000)', src: BUL + 'Do_the_Wave_(TCG)',
    desc: 'Llena la Banca de Básicos y Wigglytuff hace 10 de daño más por cada uno: los mismos golpes de Haymaker con un remate extra.',
    subs: ['Lista de Bulbapedia sin cambios'],
    list: [[2, 'base2-16'], [3, 'base2-54'], [2, 'base1-7'], [2, 'base1-20'], [3, 'base2-10'],
      [4, 'Professor Oak'], [4, 'Bill'], [4, 'PlusPower'], [2, 'Computer Search'], [3, 'Gust of Wind'], [3, 'Item Finder'], [4, 'Energy Removal'], [2, 'Energy Retrieval'], [3, 'Super Energy Removal'], [1, 'Lass'], [1, 'Switch'],
      [4, 'Double Colorless Energy'], [6, 'base1-97'], [4, 'base1-100'], [3, 'base1-99']] },
  { id: 'darkvileplume', name: 'Hay Fever (Dark Vileplume)', cover: 'base5-13', by: 'Arquetipo clásico', place: 'Team Rocket (2000)', src: BUL + 'Deck_archetype_(TCG)',
    desc: 'Usa todos sus Entrenadores al principio y luego Dark Vileplume traba los Entrenadores de ambos jugadores con Fiebre del Heno mientras los Básicos fuertes atacan.',
    subs: ['Lista representativa del arquetipo (Dark Vileplume + Básicos de Haymaker)'],
    list: [[4, 'base2-58'], [3, 'base5-36'], [3, 'base5-13'], [4, 'base2-10'], [4, 'base1-20'], [3, 'base1-7'],
      [4, 'Professor Oak'], [4, 'Bill'], [4, 'Pokémon Breeder'], [2, 'Computer Search'], [3, 'Gust of Wind'],
      [4, 'Double Colorless Energy'], [6, 'base1-99'], [6, 'base1-97'], [6, 'base1-100']] },
  { id: 'sneasel', name: 'Sneasel / Slowking', cover: 'neo1-25', by: 'Arquetipo clásico', place: 'Neo (Modificado 2001)', src: BUL + 'Deck_archetype_(TCG)',
    desc: 'Paliza de Sneasel hace daño por cada Energía Oscura, Slowking anula Entrenadores rivales y los Bebés frenan los primeros turnos.',
    subs: ['Lista representativa del arquetipo con cartas de Neo', 'Energy Removal 2 y Super Energy Removal 2 son las versiones del juego'],
    list: [[4, 'neo1-25'], [3, 'neo1-73'], [2, 'neo1-14'], [3, 'neo1-20'], [2, 'neo1-22'], [2, 'neo2-11'],
      [4, 'Professor Elm'], [4, 'base6-108'], [2, 'Mary'], [3, 'Double Gust'], [3, 'Energy Removal 2'], [2, 'Super Energy Removal 2'], [3, 'Focus Band'], [1, 'Super Rod'], [2, 'Moo-Moo Milk'],
      [4, 'neo1-104'], [4, 'Recycle Energy'], [4, 'base4-124'], [8, 'base1-101']] },
];
function pickByName(n, mega) {
  const all = Object.values(P.DB).filter(d => d.name === n && (mega ? d.era === 'mega' : d.era !== 'mega'));
  if (!all.length) return null;
  if (mega) { const off = d => { const s = (P.MEGA_SETINFO || []).find(x => x.id === d.set); return !s || d.num <= s.official; }; const o = all.filter(off); return (o[0] || all[0]).id; }
  return all[0].id;
}
function resolve(deck, mega) {
  const E = mega ? (P.CampaignMega || {}).ENERGY_ID || {} : (P.Decks || {}).ENERGY_ID || {};
  const cards = [], missing = [];
  for (const [n, ref] of deck.list) {
    const id = (ref.length === 1 && E[ref]) ? E[ref] : P.DB[ref] ? ref : pickByName(ref, mega);
    if (!id) { missing.push(ref); continue; }
    for (let k = 0; k < n; k++) cards.push(id);
  }
  const cover = P.DB[deck.cover] ? deck.cover : pickByName(deck.cover, mega);
  return Object.assign({}, deck, { cards, missing, cover: cover || cards[0], era: mega ? 'mega' : 'wotc' });
}
const cache = {};
P.metaDecks = era => cache[era] || (cache[era] = (era === 'mega' ? MEGA : WOTC).map(d => resolve(d, era === 'mega')));
})(typeof window !== 'undefined' ? window : globalThis);
