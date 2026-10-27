// ============ DATOS DE CAMPAÑA: KANTO ============
(function (root) {
const P = root.PTCG;
const SETS = [
  { id: 'base1', name: 'Base Set', code: 'BS', unlock: 0, price: 100, art: 2, color: '#d33' },
  { id: 'base2', name: 'Jungle', code: 'JU', unlock: 1, price: 110, art: 2, color: '#3a3' },
  { id: 'base3', name: 'Fossil', code: 'FO', unlock: 2, price: 110, art: 2, color: '#a87' },
  { id: 'base4', name: 'Base Set 2', code: 'BS2', unlock: 3, price: 120, art: 2, color: '#c60' },
  { id: 'base5', name: 'Team Rocket', code: 'TR', unlock: 4, price: 130, art: 2, color: '#222' },
  { id: 'gym1', name: 'Gym Heroes', code: 'G1', unlock: 5, price: 140, art: 2, color: '#e80' },
  { id: 'gym2', name: 'Gym Challenge', code: 'G2', unlock: 6, price: 150, art: 2, color: '#a3f' },
  // Johto (se desbloquean con medallas de Johto)
  { id: 'neo1', name: 'Neo Genesis', code: 'N1', unlock: 0, price: 160, art: 2, color: '#d4a017', region: 'johto' },
  { id: 'neo2', name: 'Neo Discovery', code: 'N2', unlock: 2, price: 170, art: 2, color: '#7a5' , region: 'johto' },
  { id: 'neo3', name: 'Neo Revelation', code: 'N3', unlock: 4, price: 180, art: 2, color: '#36c', region: 'johto' },
  { id: 'neo4', name: 'Neo Destiny', code: 'N4', unlock: 6, price: 190, art: 2, color: '#a3c', region: 'johto' },
];
const KANTO_SETS = ['base1', 'base2', 'base3', 'base4', 'base5', 'gym1', 'gym2'];
const NEO_SETS = ['neo1', 'neo2', 'neo3', 'neo4'];
// ranuras de sobre (desde el mod de TTS "Real Boosters V2")
const R = (a, b) => { const o = []; for (let i = +a; i <= +b; i++) o.push(i); return o; };
const PACKS = {
  base1: { slots: [{ cards: [...R(23, 42), ...R(80, 90), 96], n: 3 }, { cards: [...R(43, 69), ...R(91, 95)], n: 5 }, { cards: R(97, 102), n: 2 }], rare: { holo: [...R(1, 7), ...R(9, 16)], rare: [...R(17, 22), ...R(70, 79)], holoOdds: 1 / 3 } },
  base2: { slots: [{ cards: R(33, 48), n: 3 }, { cards: R(49, 64), n: 7 }], rare: { holo: R(1, 16), rare: R(17, 32), holoOdds: 1 / 3 } },
  base3: { slots: [{ cards: [...R(31, 45), 58], n: 3 }, { cards: [...R(46, 57), ...R(59, 62)], n: 7 }], rare: { holo: R(1, 15), rare: R(16, 30), holoOdds: 1 / 3 } },
  base4: { slots: [{ cards: R(125, 130), n: 2 }, { cards: [...R(65, 100), ...R(118, 123)], n: 5 }, { cards: [...R(33, 64), ...R(109, 117), 124], n: 3 }], rare: { holo: R(1, 20), rare: [...R(21, 32), ...R(101, 108)], holoOdds: 1 / 3 } },
  base5: { slots: [{ cards: [...R(32, 48), ...R(73, 77), 81, 82], n: 3 }, { cards: [...R(49, 70), 78, 79], n: 7 }], rare: { holo: [...R(1, 17), 83], rare: [...R(18, 31), 71, 72, 80], holoOdds: 1 / 3 } },
  gym1: { slots: [{ cards: R(127, 132), n: 1 }, { cards: [...R(35, 60), ...R(105, 120)], n: 3 }, { cards: [...R(61, 96), ...R(121, 126)], n: 6 }], rare: { holo: R(1, 19), rare: [...R(20, 34), ...R(97, 104)], holoOdds: 1 / 3 } },
  gym2: { slots: [{ cards: R(127, 132), n: 1 }, { cards: [...R(31, 59), ...R(111, 123)], n: 3 }, { cards: [...R(60, 99), ...R(124, 126)], n: 6 }], rare: { holo: R(1, 20), rare: [...R(21, 30), ...R(100, 110)], holoOdds: 1 / 3 } },
  // Neo (composición del mod "Real Boosters V2")
  neo1: { slots: [{ cards: R(106, 111), n: 1 }, { cards: [...R(53, 82), ...R(99, 103)], n: 6 }, { cards: [...R(26, 52), ...R(91, 98)], n: 3 }], rare: { holo: R(1, 19), rare: [...R(20, 25), ...R(83, 90), 104, 105], holoOdds: 1 / 3 } },
  neo2: { slots: [{ cards: [...R(53, 71), 75], n: 7 }, { cards: [...R(37, 52), ...R(72, 74)], n: 3 }], rare: { holo: R(1, 17), rare: R(18, 36), holoOdds: 1 / 3 } },
  neo3: { slots: [{ cards: [...R(41, 59), 64], n: 7 }, { cards: [...R(28, 40), ...R(60, 63)], n: 3 }], rare: { holo: R(1, 14), rare: R(15, 27), holoOdds: 1 / 3, shiny: [65, 66], shinyOdds: 1 / 18 } },
  neo4: { slots: [{ cards: [...R(61, 91), 104, 105], n: 7 }, { cards: [...R(31, 60), ...R(97, 103)], n: 3 }], rare: { holo: R(1, 16), rare: [...R(17, 30), ...R(92, 96)], holoOdds: 1 / 3, shiny: R(106, 113), shinyOdds: 1 / 12 } },
};
function openPack(set, rng) {
  const def = PACKS[set]; const out = [];
  const pickDistinct = (arr, n) => { const a = arr.slice(); const r = []; while (r.length < n && a.length) r.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return r; };
  for (const s of def.slots) for (const n of pickDistinct(s.cards, s.n)) out.push(set + '-' + n);
  const shiny = def.rare.shiny && rng() < def.rare.shinyOdds;
  const holo = !shiny && rng() < def.rare.holoOdds;
  const pool = shiny ? def.rare.shiny : holo ? def.rare.holo : def.rare.rare;
  out.push(set + '-' + pool[Math.floor(rng() * pool.length)]);
  // orden: energía, comunes, poco comunes, rara al final
  const ord = { E: 0, C: 1, U: 2, R: 3, RH: 4, SH: 5, S: 5 };
  out.sort((a, b) => (ord[P.DB[a].rar] || 0) - (ord[P.DB[b].rar] || 0));
  return out.filter(id => P.DB[id]);
}
const PERKS = {
  brock: { name: 'Defensa Roca', es: 'Todo el daño que reciben sus Pokémon por ataques se reduce en 10.' },
  misty: { name: 'Marea Alta', es: 'Puede unir una Energía Agua extra cada turno.' },
  surge: { name: 'Sobrecarga', es: 'Sus Pokémon de tipo Rayo hacen 10 de daño más (antes de Debilidad y Resistencia).' },
  erika: { name: 'Aroma Floral', es: 'Al final de cada uno de sus turnos, cura 10 de daño a cada uno de sus Pokémon.' },
  koga: { name: 'Toxina Ninja', es: 'El veneno que provocan sus ataques hace 20 de daño en vez de 10.' },
  sabrina: { name: 'Telepatía', es: 'Roba 2 cartas al inicio de cada turno en vez de 1.' },
  blaine: { name: 'Llamas Eternas', es: 'Sus Pokémon empiezan con 1 Energía Fuego unida y sus Pokémon Fuego hacen 10 de daño más.' },
  giovanni: { name: 'Jefe del Team Rocket', es: 'Juega con sólo 5 cartas de Premio en lugar de 6, y sus Pokémon de Giovanni pueden evolucionar el mismo turno en que entran en juego.' },
};
// portraits = id de carta de entrenador usada como retrato
const GYMS = [
  { id: 'pewter', city: 'Ciudad Plateada', leader: 'Brock', owner: 'Brock', portrait: 'gym1-15', type: 'F', badge: 'boulder', badgeEs: 'Medalla Roca', perk: 'brock', level: 2, stadium: 'gym1-115', x: 22, y: 30,
    trainers: [{ name: 'Campista Liam', portrait: 'gym1-106', level: 1, types: ['F'], owner: 'Brock', sets: ['base1', 'gym1', 'gym2'] }, { name: 'Montañero Diego', portrait: 'base3-60', level: 2, types: ['F'], owner: 'Brock', sets: ['base1', 'base2', 'base3', 'gym1', 'gym2'] }],
    leaderTrainers: ['gym1-15', 'gym1-15', 'gym1-106', 'gym1-106', 'gym2-101', 'gym1-115', 'base1-91', 'base1-91', 'base1-94', 'base1-94', 'base1-84', 'base1-95'], quote: '¡Mis Pokémon son duros como la roca! ¿Podrás romper mi defensa?' },
  { id: 'cerulean', city: 'Ciudad Celeste', leader: 'Misty', owner: 'Misty', portrait: 'gym1-18', type: 'W', badge: 'cascade', badgeEs: 'Medalla Cascada', perk: 'misty', level: 3, stadium: 'gym1-108', x: 58, y: 18,
    trainers: [{ name: 'Nadador Luis', portrait: 'gym2-118', level: 2, types: ['W'], owner: 'Misty', sets: ['base1', 'base2', 'base3', 'gym1', 'gym2'] }, { name: 'Chica Diana', portrait: 'base1-75', level: 2, types: ['W', 'C'], owner: 'Misty', sets: ['base1', 'base4', 'gym1', 'gym2'] }],
    leaderTrainers: ['gym1-18', 'gym1-18', 'gym1-114', 'gym2-118', 'gym2-118', 'gym1-108', 'base1-91', 'base1-91', 'base1-91', 'base1-93', 'base1-84', 'base1-84', 'base1-94'], quote: '¡Mi estrategia es arrasar con Pokémon de agua!' },
  { id: 'vermilion', city: 'Ciudad Carmín', leader: 'Teniente Surge', owner: 'Lt. Surge', portrait: 'gym1-17', type: 'L', badge: 'thunder', badgeEs: 'Medalla Trueno', perk: 'surge', level: 3, stadium: 'gym1-120', x: 62, y: 62,
    trainers: [{ name: 'Marinero Dwayne', portrait: 'gym1-112', level: 2, types: ['L', 'C'], owner: 'Lt. Surge', sets: ['base1', 'base2', 'gym1', 'gym2'] }, { name: 'Rockero Baily', portrait: 'base1-77', level: 3, types: ['L'], owner: 'Lt. Surge', sets: ['base1', 'base3', 'base4', 'gym1', 'gym2'] }],
    leaderTrainers: ['gym1-17', 'gym1-17', 'gym1-112', 'gym1-120', 'base1-91', 'base1-91', 'base1-91', 'base1-93', 'base1-84', 'base1-84', 'base1-92', 'base1-92', 'base1-95'], quote: '¡Eh, chaval! ¡Mis Pokémon eléctricos me salvaron en la guerra!' },
  { id: 'celadon', city: 'Ciudad Azulona', leader: 'Erika', owner: 'Erika', portrait: 'gym1-16', type: 'G', badge: 'rainbow', badgeEs: 'Medalla Arcoíris', perk: 'erika', level: 4, stadium: 'gym1-107', x: 40, y: 44,
    trainers: [{ name: 'Beldad Tamia', portrait: 'gym1-110', level: 3, types: ['G'], owner: 'Erika', sets: ['base1', 'base2', 'gym1', 'gym2'] }, { name: 'Ojeadora Lola', portrait: 'gym1-109', level: 3, types: ['G', 'C'], owner: 'Erika', sets: ['base2', 'base4', 'gym1', 'gym2'] }],
    leaderTrainers: ['gym1-16', 'gym1-16', 'gym1-109', 'gym1-110', 'gym2-103', 'gym1-107', 'base1-91', 'base1-91', 'base1-94', 'base1-94', 'base1-84', 'base1-93', 'base1-92'], quote: 'Oh... qué tiempo tan agradable. Me he quedado dormida entre las flores...' },
  { id: 'fuchsia', city: 'Ciudad Fucsia', leader: 'Koga', owner: 'Koga', portrait: 'gym2-19', type: 'G', badge: 'soul', badgeEs: 'Medalla Alma', perk: 'koga', level: 4, stadium: 'gym2-114', x: 48, y: 82,
    trainers: [{ name: 'Malabarista Kirk', portrait: 'gym2-115', level: 3, types: ['G', 'P'], owner: 'Koga', sets: ['base1', 'base2', 'base3', 'gym2'] }, { name: 'Domador Phil', portrait: 'base1-76', level: 4, types: ['G', 'C'], owner: 'Koga', sets: ['base2', 'base3', 'base5', 'gym2'] }],
    leaderTrainers: ['gym2-19', 'gym2-19', 'gym2-106', 'gym2-115', 'gym2-114', 'base1-91', 'base1-91', 'base1-91', 'base1-93', 'base1-84', 'base1-84', 'base1-92', 'base5-78'], quote: '¡Ja, ja, ja! Un ninja domina el arte del veneno. ¡Sufre mis técnicas!' },
  { id: 'saffron', city: 'Ciudad Azafrán', leader: 'Sabrina', owner: 'Sabrina', portrait: 'gym2-20', type: 'P', badge: 'marsh', badgeEs: 'Medalla Pantano', perk: 'sabrina', level: 5, stadium: 'gym2-122', x: 52, y: 42,
    trainers: [{ name: 'Médium Rebeca', portrait: 'gym1-125', level: 4, types: ['P'], owner: 'Sabrina', sets: ['base1', 'base3', 'gym1', 'gym2'] }, { name: 'Psíquico Johan', portrait: 'gym1-117', level: 4, types: ['P', 'C'], owner: 'Sabrina', sets: ['base1', 'base2', 'base4', 'gym1', 'gym2'] }],
    leaderTrainers: ['gym2-20', 'gym2-110', 'gym1-117', 'gym1-117', 'gym2-121', 'gym2-122', 'base1-91', 'base1-91', 'base1-91', 'base1-88', 'base1-93', 'base1-84', 'base1-84', 'base1-79'], quote: 'Ya sabía que vendrías. Lo vi en mis visiones...' },
  { id: 'cinnabar', city: 'Isla Canela', leader: 'Blaine', owner: 'Blaine', portrait: 'gym2-17', type: 'R', badge: 'volcano', badgeEs: 'Medalla Volcán', perk: 'blaine', level: 5, stadium: 'gym2-113', x: 20, y: 86,
    trainers: [{ name: 'Ladrón Quinn', portrait: 'gym1-97', level: 4, types: ['R'], owner: 'Blaine', sets: ['base1', 'base2', 'base3', 'gym1', 'gym2'] }, { name: 'Supernecio Erik', portrait: 'gym1-105', level: 4, types: ['R', 'C'], owner: 'Blaine', sets: ['base1', 'base4', 'base5', 'gym1', 'gym2'] }],
    leaderTrainers: ['gym2-17', 'gym2-17', 'gym2-100', 'gym1-97', 'gym2-111', 'gym2-113', 'gym2-124', 'base1-91', 'base1-91', 'base1-88', 'base1-93', 'base1-84', 'base1-84', 'base1-92'], quote: '¡Hooo! ¡Más te vale tener Antiquemar! ¡Mis Pokémon queman!' },
  { id: 'viridian', city: 'Ciudad Verde', leader: 'Giovanni', owner: 'Giovanni', portrait: 'gym2-18', type: 'F', badge: 'earth', badgeEs: 'Medalla Tierra', perk: 'giovanni', level: 5, stadium: 'gym2-123', x: 18, y: 56,
    trainers: [{ name: 'Cinturón Negro Kiyo', portrait: 'gym2-105', level: 5, types: ['F'], owner: 'Giovanni', sets: ['base1', 'base2', 'base3', 'gym1', 'gym2'] }, { name: 'Recluta Rocket Atila', portrait: 'gym1-113', level: 5, types: ['G', 'F', 'P'], owner: 'Rocket', sets: ['base5', 'gym1', 'gym2'] }],
    leaderTrainers: ['gym2-18', 'gym2-18', 'gym2-104', 'gym2-105', 'gym2-123', 'base5-73', 'base1-91', 'base1-91', 'base1-91', 'base1-88', 'base1-93', 'base1-93', 'base1-84', 'base1-84', 'base1-79'], quote: 'Bienvenido. Soy Giovanni, líder de este gimnasio... y del Team Rocket.' },
];
// entrenadores de ruta (repetibles)
const ROUTES = [
  { id: 'r1', place: 'Ruta 1', name: 'Joven Pepe', portrait: 'base1-77', level: 1, types: ['C', 'F'], sets: ['base1'], req: 0, x: 22, y: 70 },
  { id: 'vf', place: 'Bosque Verde', name: 'Cazabichos Tomás', portrait: 'base2-64', level: 1, types: ['G'], sets: ['base1', 'base2'], req: 0, x: 20, y: 44 },
  { id: 'mm', place: 'Monte Moon', name: 'Súper Nerd Miguel', portrait: 'base3-62', level: 2, types: ['F', 'W'], sets: ['base1', 'base3'], req: 1, x: 40, y: 18 },
  { id: 'r24', place: 'Puente Pepita', name: 'Chica Reli', portrait: 'base1-75', level: 2, types: ['W', 'C'], sets: ['base1', 'base2'], req: 1, x: 60, y: 8 },
  { id: 'ssa', place: 'S.S. Anne', name: 'Caballero Arturo', portrait: 'base1-91', level: 3, types: ['C', 'L'], sets: ['base1', 'base2', 'base4'], req: 2, x: 66, y: 72 },
  { id: 'pt', place: 'Torre Pokémon', name: 'Médium Patricia', portrait: 'base3-58', level: 3, types: ['P'], sets: ['base1', 'base3'], req: 3, x: 80, y: 40 },
  { id: 'r12', place: 'Ruta 12', name: 'Pescador Ned', portrait: 'base1-88', level: 3, types: ['W'], sets: ['base1', 'base2', 'base3', 'base4'], req: 3, x: 82, y: 62 },
  { id: 'r17', place: 'Ciclovía', name: 'Motorista Billy', portrait: 'base5-76', level: 3, types: ['G', 'R'], sets: ['base1', 'base3', 'base5'], req: 4, x: 30, y: 72 },
  { id: 'sz', place: 'Zona Safari', name: 'Guarda Jeremy', portrait: 'base1-76', level: 4, types: ['G', 'C'], sets: ['base2', 'gym1'], req: 4, x: 56, y: 90 },
  { id: 'sf', place: 'Islas Espuma', name: 'Nadadora Alicia', portrait: 'gym1-123', level: 4, types: ['W'], sets: ['base1', 'base2', 'base3', 'base4', 'gym1', 'gym2'], req: 5, x: 34, y: 92 },
  { id: 'pm', place: 'Mansión Pokémon', name: 'Ladrón Simón', portrait: 'base5-74', level: 4, types: ['R', 'P'], sets: ['base1', 'base3', 'base5', 'gym2'], req: 6, x: 14, y: 80 },
  { id: 'vr', place: 'Calle Victoria', name: 'Entrenador Guay Samuel', portrait: 'base1-71', level: 5, types: ['F', 'W', 'L'], sets: null, req: 8, x: 8, y: 30 },
  { id: 'vr2', place: 'Calle Victoria', name: 'Entrenadora Guay Julia', portrait: 'base1-89', level: 5, types: ['P', 'G', 'R'], sets: null, req: 8, x: 8, y: 20 },
];
// entrenadores adicionales (se agrupan por lugar en el mapa)
ROUTES.push(
  { id: 'r22', place: 'Ruta 22', name: 'Rival Azul', portrait: 'base1-73', level: 1, types: ['W', 'C'], sets: ['base1'], req: 0, x: 9, y: 62, rival: true },
  { id: 'r2', place: 'Ruta 2', name: 'Chica Ana', portrait: 'base1-75', level: 1, types: ['C', 'W'], sets: ['base1'], req: 0, x: 24, y: 50 },
  { id: 'r1b', place: 'Ruta 1', name: 'Joven Toño', portrait: 'base1-91', level: 1, types: ['G', 'C'], sets: ['base1', 'base2'], req: 0 },
  { id: 'vf2', place: 'Bosque Verde', name: 'Cazabichos Samuel', portrait: 'base2-64', level: 1, types: ['G'], sets: ['base1', 'base2', 'base4'], req: 0 },
  { id: 'r3', place: 'Ruta 3', name: 'Joven Ben', portrait: 'base4-121', level: 1, types: ['F', 'C'], sets: ['base1', 'base2'], req: 1, x: 31, y: 24 },
  { id: 'r3b', place: 'Ruta 3', name: 'Cazabichos Colin', portrait: 'base2-64', level: 2, types: ['G'], sets: ['base1', 'base2', 'base3'], req: 1 },
  { id: 'r4', place: 'Monte Moon', name: 'Chica Lisa', portrait: 'base1-75', level: 2, types: ['P', 'C'], sets: ['base1', 'base2', 'base3'], req: 1 },
  { id: 'r25', place: 'Puente Pepita', name: 'Pokémaníaco Mark', portrait: 'base1-87', level: 2, types: ['C', 'F'], sets: ['base2', 'base3'], req: 1 },
  { id: 'r6', place: 'Ruta 6', name: 'Campista Ricardo', portrait: 'base4-123', level: 2, types: ['R', 'F'], sets: ['base1', 'base2', 'base4'], req: 2, x: 60, y: 51 },
  { id: 'ssar', place: 'S.S. Anne', name: 'Rival Azul', portrait: 'base1-73', level: 3, types: ['W', 'G', 'C'], sets: ['base1', 'base2', 'base3', 'base4'], req: 2, rival: true },
  { id: 'r9', place: 'Túnel Roca', name: 'Montañero Lenny', portrait: 'base3-60', level: 3, types: ['F'], sets: ['base1', 'base3', 'base4'], req: 3, x: 74, y: 22 },
  { id: 'r9b', place: 'Túnel Roca', name: 'Montañero Alan', portrait: 'base3-62', level: 3, types: ['F', 'L'], sets: ['base1', 'base3'], req: 3 },
  { id: 'r8', place: 'Ruta 8', name: 'Jugador Rich', portrait: 'base3-60', level: 3, types: ['L', 'C'], sets: ['base1', 'base2', 'base4'], req: 3, x: 67, y: 38 },
  { id: 'r11', place: 'Ruta 11', name: 'Ingeniero Bernie', portrait: 'base1-87', level: 3, types: ['L', 'F'], sets: ['base1', 'base3', 'base4'], req: 3, x: 75, y: 57 },
  { id: 'ptr', place: 'Torre Pokémon', name: 'Rival Azul', portrait: 'base1-73', level: 4, types: ['W', 'G', 'P'], sets: null, req: 4, rival: true },
  { id: 'r13', place: 'Ruta 13', name: 'Ornitólogo Sebastián', portrait: 'base2-64', level: 4, types: ['C', 'L'], sets: ['base2', 'base3', 'gym1'], req: 4, x: 73, y: 79 },
  { id: 'r14', place: 'Ruta 13', name: 'Motorista Lao', portrait: 'base5-75', level: 4, types: ['G', 'P'], sets: ['base1', 'base3', 'gym2'], req: 4 },
  { id: 'r15', place: 'Ruta 15', name: 'Belleza Grace', portrait: 'gym1-110', level: 4, types: ['G', 'W'], sets: ['base2', 'base4', 'gym1'], req: 5, x: 64, y: 84 },
  { id: 'pp', place: 'Central Eléctrica', name: 'Científico Taylor', portrait: 'base1-71', level: 4, types: ['L'], sets: ['base1', 'base3', 'base4', 'gym1', 'gym2'], req: 5, x: 88, y: 28 },
  { id: 'r21', place: 'Islas Espuma', name: 'Pescador Ronald', portrait: 'base1-88', level: 4, types: ['W', 'P'], sets: ['base1', 'base3', 'gym2'], req: 6 },
  { id: 'vr3', place: 'Calle Victoria', name: 'Entrenadora Guay Naomi', portrait: 'base1-76', level: 5, types: ['L', 'P', 'C'], sets: null, req: 8 },
  { id: 'cc', place: 'Cueva Celeste', name: 'Cazador de Leyendas', portrait: 'gym2-116', level: 5, types: ['P', 'L', 'R', 'W'], sets: null, req: 8, x: 48, y: 7 },
);
// Team Rocket: cadena de combates en orden, sólo Pokémon Oscuros
const ROCKET = [
  { id: 'mm2', place: 'Monte Moon', name: 'Recluta Rocket', portrait: 'base5-71', level: 2, types: ['G', 'P'], req: 1, quote: '¡Este fósil es propiedad del Team Rocket!' },
  { id: 'rk2', place: 'Puente Pepita', name: 'Recluta Rocket', portrait: 'base5-77', level: 2, types: ['C', 'F'], req: 1, quote: 'Ganaste el premio del puente... ¡ahora únete al Team Rocket!' },
  { id: 'rk3', place: 'Escondite Rocket', name: 'Recluta Rocket', portrait: 'base5-78', level: 3, types: ['G', 'F'], req: 3, x: 44, y: 53, quote: 'Nadie entra en el Casino Rocket sin permiso.' },
  { id: 'rk4', place: 'Escondite Rocket', name: 'Jessie y James', portrait: 'base5-15', level: 3, types: ['G', 'C'], req: 3, quote: '¡Prepárate para los problemas! ¡Y más vale que teman!' },
  { id: 'rk5', place: 'Torre Pokémon', name: 'Butch y Cassidy', portrait: 'base5-72', level: 4, types: ['P', 'F'], req: 4, quote: 'Esta torre ahora pertenece al Team Rocket.' },
  { id: 'silph', place: 'Silph S.A.', name: 'Admin Petrel', portrait: 'base5-76', level: 4, types: ['L', 'C'], req: 5, x: 56, y: 35, quote: 'La Master Ball de Silph será nuestra.' },
  { id: 'rk7', place: 'Silph S.A.', name: 'Admin Ariana', portrait: 'base5-16', level: 5, types: ['W', 'P'], req: 5, quote: 'No llegarás hasta el Jefe.' },
  { id: 'rkboss', place: 'Silph S.A.', name: 'Jefe Giovanni', portrait: 'base5-73', level: 5, types: ['R', 'W', 'P'], req: 6, perk: 'rocket', boss: true, quote: 'Así que eres tú quien ha estado arruinando mis planes. Te enseñaré el verdadero poder del Team Rocket.' },
];
PERKS.rocket = { name: 'Poder Oscuro', es: 'Sus Pokémon Oscuros hacen 10 de daño más (antes de Debilidad y Resistencia), pueden evolucionar el mismo turno en que entra el Básico, y juega con sólo 5 cartas de Premio.' };
const LEAGUE = { id: 'league', place: 'Meseta Añil', name: 'Campeón Azul', portrait: 'base5-74', level: 5, req: 8, x: 8, y: 8, quote: '¡Por fin llegas! Soy el Campeón de la Liga Pokémon. ¡Te enseñaré quién manda!' };
const STARTERS = [
  { id: 'overgrowth', name: 'Vegetación', desc: 'Planta y Agua: crecimiento constante y curación.', types: ['G', 'W'], cover: 'base1-44' },
  { id: 'zap', name: '¡Zap!', desc: 'Rayo y Psíquico: ataques rápidos y confusión.', types: ['L', 'P'], cover: 'base1-58' },
  { id: 'brushfire', name: 'Fuego Salvaje', desc: 'Fuego y Planta: gran daño a costa de energía.', types: ['R', 'G'], cover: 'base1-46' },
  { id: 'blackout', name: 'Apagón', desc: 'Agua y Lucha: resistencia y golpes fuertes.', types: ['W', 'F'], cover: 'base1-63' },
];
function leaderDeck(gym, rng) {
  if (gym.region === 'johto') return P.Decks.genDeck({ types: gym.deckTypes || [gym.type], sets: NEO_SETS, level: gym.level, rng, era: 'neo', colorless: gym.type === 'C' || !!gym.colorless, prefer: gym.prefer, trainers: johtoTrainers(gym.level, gym.extra) });
  return P.Decks.genDeck({ types: ['G', 'R', 'W', 'L', 'P', 'F', 'C'], sets: ['gym1', 'gym2'], level: gym.level, rng, owner: gym.owner, ownerOnly: true, allowOwners: true, colorless: true, trainers: gym.leaderTrainers });
}
function trainerDeck(t, rng, owner) {
  if (t.region === 'johto') return P.Decks.genDeck({ types: t.types, sets: t.sets || NEO_SETS, level: t.level, rng, era: 'neo', colorless: t.types.includes('C'), prefer: t.prefer, trainers: t.level >= 3 ? johtoTrainers(t.level) : undefined });
  return P.Decks.genDeck({ types: t.types, sets: t.sets || KANTO_SETS, level: t.level, rng, owner: t.owner || owner, allowOwners: !!(t.owner || owner), colorless: true });
}
function starterDeck(st, rng) {
  return P.Decks.genDeck({ types: st.types, sets: ['base1'], level: 1, rng, colorless: false });
}
function rocketDeck(r, rng) { return P.Decks.genDarkDeck({ types: r.types, level: r.region === 'johto' ? Math.min(5, r.level + 1) : r.level, rng, sets: r.region === 'johto' ? ['base5', 'neo4'] : ['base5', 'gym1', 'gym2'], lean: r.region === 'johto' ? true : undefined, prefer: r.prefer }); }
function rivalDeck(rng) {
  const types = ['W', 'L', 'P', 'F', 'R', 'G'].sort(() => rng() - 0.5).slice(0, 2);
  return P.Decks.genDeck({ types, level: 5, rng, colorless: true, sets: KANTO_SETS });
}
// entrenadores para mazos de Johto (por nombre)
function johtoTrainers(lvl, extra) {
  const t = []; const push = (n, k) => { const id = P.Decks.idOf(n); if (id) for (let i = 0; i < k; i++) t.push(id); };
  if (lvl <= 3) { push('Professor Elm', 2); push('Bill', 3); push('Potion', 2); push('Switch', 1); push('Berry', 2); push('Energy Ark', 1); push('Pokémon March', 1); }
  else { push('Professor Elm', 3); push('Bill', 2); push('Pokémon Breeder Fields', 2); push('Gust of Wind', 2); push('Focus Band', 2); push('Energy Removal', 2); push('Gold Berry', 1); push('Switch', 1); push('PlusPower', 1); if (lvl >= 5) push('Super Energy Removal', 1); }
  for (const n of extra || []) push(n, 1);
  return t;
}
// ===================== JOHTO =====================
const J = 'johto';
const pid = n => { const l = P.CARDS.filter(d => d.name === n); return (l.find(d => d.rar === 'RH') || l[0] || {}).id; };
Object.assign(PERKS, {
  falkner: { name: 'Viento de Cola', es: 'Sus Pokémon Incoloros hacen 10 de daño más (antes de Debilidad y Resistencia).' },
  bugsy: { name: 'Metamorfosis Rápida', es: 'Sus Pokémon Planta pueden evolucionar el mismo turno en que entran en juego.' },
  whitney: { name: 'Leche Mu-mu', es: 'Al final de cada uno de sus turnos, su Pokémon Activo se cura 20 de daño.' },
  morty: { name: 'Mal de Ojo', es: 'Tu Pokémon Activo paga 1 Energía más para retirarse.' },
  chuck: { name: 'Puño de Tormenta', es: 'Sus Pokémon Lucha hacen 10 de daño más (antes de Debilidad y Resistencia).' },
  jasmine: { name: 'Coraza de Acero', es: 'Todo el daño que reciben sus Pokémon por ataques se reduce en 10.' },
  pryce: { name: 'Frío Glaciar', es: 'Sus Pokémon Agua hacen 10 de daño más (antes de Debilidad y Resistencia).' },
  clair: { name: 'Sangre de Dragón', es: 'Sus Pokémon tienen 20 PS más.' },
  karen: { name: 'Corazón Siniestro', es: 'Sus Pokémon Siniestros y Oscuros hacen 10 de daño más y roba 2 cartas al inicio de cada turno.' },
  lance: { name: 'Maestro Dragón', es: 'Sus Pokémon tienen 20 PS más y juega con sólo 5 cartas de Premio.' },
  red: { name: 'Leyenda Viviente', es: 'Todos sus ataques hacen 10 de daño más y juega con sólo 5 cartas de Premio.' },
});
const JGYMS = [
  { id: 'violet', region: J, city: 'Ciudad Malva', leader: 'Pegaso', portrait: pid('Noctowl'), type: 'C', badge: 'zephyr', badgeEs: 'Medalla Céfiro', perk: 'falkner', level: 3, x: 70, y: 44, deckTypes: ['C'], prefer: ['Noctowl', 'Hoothoot', 'Togetic', 'Murkrow', 'Skarmory', 'Natu', 'Xatu', 'Delibird'],
    trainers: [{ name: 'Ornitólogo Rodrigo', portrait: pid('Hoothoot'), level: 2, types: ['C'], region: J, prefer: ['Hoothoot', 'Noctowl'] }, { name: 'Ornitólogo Abel', portrait: pid('Natu'), level: 3, types: ['C', 'P'], region: J }],
    quote: '¡Los Pokémon pájaro dominan los cielos! Te enseñaré su verdadero poder.' },
  { id: 'azalea', region: J, city: 'Pueblo Azalea', leader: 'Antón', portrait: pid('Scyther'), type: 'G', badge: 'hive', badgeEs: 'Medalla Colmena', perk: 'bugsy', level: 3, x: 56, y: 86, prefer: ['Scyther', 'Scizor', 'Ledyba', 'Ledian', 'Spinarak', 'Ariados', 'Pineco', 'Heracross', 'Yanma', 'Caterpie', 'Weedle'],
    trainers: [{ name: 'Cazabichos Alberto', portrait: pid('Ledyba'), level: 2, types: ['G'], region: J }, { name: 'Cazabichos Benito', portrait: pid('Spinarak'), level: 3, types: ['G'], region: J }],
    quote: '¡Soy un experto en Pokémon bicho! Mi investigación no tiene rival.' },
  { id: 'goldenrod', region: J, city: 'Ciudad Trigal', leader: 'Blanca', portrait: pid('Miltank'), type: 'C', badge: 'plain', badgeEs: 'Medalla Planicie', perk: 'whitney', level: 4, x: 40, y: 58, deckTypes: ['C'], prefer: ['Miltank', 'Snubbull', 'Granbull', 'Clefairy', 'Jigglypuff', 'Wigglytuff', 'Togepi', 'Furret', 'Aipom'],
    trainers: [{ name: 'Chica Carola', portrait: pid('Snubbull'), level: 3, types: ['C', 'P'], region: J }, { name: 'Belleza Victoria', portrait: pid('Jigglypuff'), level: 4, types: ['C', 'W'], region: J }],
    quote: '¡Todo el mundo está loco por los Pokémon! Yo también... ¡y voy a ganar!' },
  { id: 'ecruteak', region: J, city: 'Ciudad Iris', leader: 'Morti', portrait: pid('Misdreavus'), type: 'P', badge: 'fog', badgeEs: 'Medalla Niebla', perk: 'morty', level: 4, x: 42, y: 28, prefer: ['Gengar', 'Haunter', 'Gastly', 'Misdreavus', 'Dark Gengar', 'Dark Haunter'],
    trainers: [{ name: 'Sabio Jeffrey', portrait: pid('Gastly'), level: 3, types: ['P'], region: J }, { name: 'Médium Marta', portrait: pid('Misdreavus'), level: 4, types: ['P', 'D'], region: J }],
    quote: 'Aquí, en Ciudad Iris, los Pokémon legendarios son venerados. Yo los veré antes que tú.' },
  { id: 'cianwood', region: J, city: 'Ciudad Orquídea', leader: 'Aníbal', portrait: pid('Poliwrath'), type: 'F', badge: 'storm', badgeEs: 'Medalla Tormenta', perk: 'chuck', level: 4, x: 8, y: 60, deckTypes: ['F', 'W'], prefer: ['Poliwrath', 'Poliwag', 'Poliwhirl', 'Hitmontop', 'Hitmonchan', 'Hitmonlee', 'Tyrogue', 'Machop', 'Machoke', 'Heracross'],
    trainers: [{ name: 'Karateka Yoshi', portrait: pid('Hitmontop'), level: 3, types: ['F'], region: J }, { name: 'Karateka Lao', portrait: pid('Machop'), level: 4, types: ['F', 'W'], region: J }],
    quote: '¡Mis Pokémon y yo entrenamos bajo la cascada! ¡Wahahaha!' },
  { id: 'olivine', region: J, city: 'Ciudad Olivo', leader: 'Yasmina', portrait: pid('Steelix'), type: 'M', badge: 'mineral', badgeEs: 'Medalla Mineral', perk: 'jasmine', level: 5, x: 20, y: 38, deckTypes: ['M', 'F'], prefer: ['Steelix', 'Onix', 'Magnemite', 'Magneton', 'Skarmory', 'Scizor', 'Forretress'],
    trainers: [{ name: 'Caballero Preston', portrait: pid('Magnemite'), level: 4, types: ['M', 'L'], region: J }, { name: 'Marinero Garrett', portrait: pid('Onix'), level: 4, types: ['M', 'W'], region: J }],
    quote: 'Ehm... soy Yasmina. Uso Pokémon de tipo Acero. ¿Combatimos?' },
  { id: 'mahogany', region: J, city: 'Pueblo Caoba', leader: 'Fredo', portrait: pid('Piloswine'), type: 'W', badge: 'glacier', badgeEs: 'Medalla Glaciar', perk: 'pryce', level: 5, x: 64, y: 24, prefer: ['Piloswine', 'Swinub', 'Jynx', 'Smoochum', 'Dewgong', 'Seel', 'Delibird', 'Sneasel'],
    trainers: [{ name: 'Esquiadora Roxana', portrait: pid('Swinub'), level: 4, types: ['W'], region: J }, { name: 'Snowboarder Ronaldo', portrait: pid('Sneasel'), level: 5, types: ['W', 'D'], region: J }],
    quote: 'He vivido muchos inviernos con mis Pokémon. Te enseñaré la dureza del hielo.' },
  { id: 'blackthorn', region: J, city: 'Ciudad Endrino', leader: 'Débora', portrait: pid('Kingdra'), type: 'C', badge: 'rising', badgeEs: 'Medalla Dragón', perk: 'clair', level: 5, x: 86, y: 20, deckTypes: ['W', 'C'], prefer: ['Kingdra', 'Seadra', 'Horsea', 'Dratini', 'Dragonair', 'Dragonite', 'Light Dragonite', 'Light Dragonair', 'Gyarados'],
    trainers: [{ name: 'Entrenador Guay Pablo', portrait: pid('Dratini'), level: 5, types: ['W', 'C'], region: J, prefer: ['Dratini', 'Dragonair'] }, { name: 'Entrenadora Guay Fran', portrait: pid('Horsea'), level: 5, types: ['L', 'W'], region: J }],
    quote: 'Soy Débora, la mejor domadragones del mundo. ¡Prepárate!' },
];
const JROUTES = [
  { id: 'j29', region: J, place: 'Ruta 29', name: 'Joven Joaquín', portrait: pid('Sentret'), level: 1, types: ['C', 'G'], req: 0, x: 82, y: 70 },
  { id: 'jrival1', region: J, place: 'Ciudad Cerezo', name: 'Rival Plata', portrait: pid('Totodile'), level: 2, types: ['W', 'D'], req: 0, x: 76, y: 82, rival: true },
  { id: 'j30', region: J, place: 'Ruta 30', name: 'Cazabichos Don', portrait: pid('Caterpie'), level: 1, types: ['G'], req: 0, x: 76, y: 62 },
  { id: 'jsprout', region: J, place: 'Torre Bellsprout', name: 'Sabio Nico', portrait: pid('Gastly'), level: 2, types: ['P', 'G'], req: 0, x: 78, y: 38 },
  { id: 'jalph', region: J, place: 'Ruinas Alfa', name: 'Científico Unown', portrait: pid('Unown [A]'), level: 2, types: ['P'], req: 1, x: 60, y: 56, prefer: ['Unown'] },
  { id: 'j32', region: J, place: 'Ruta 32', name: 'Pescador Ralph', portrait: pid('Qwilfish'), level: 2, types: ['W'], req: 1, x: 66, y: 66 },
  { id: 'junion', region: J, place: 'Cueva Unión', name: 'Montañero Russell', portrait: pid('Onix'), level: 2, types: ['F'], req: 1, x: 62, y: 76 },
  { id: 'jilex', region: J, place: 'Encinar', name: 'Cazabichos Wade', portrait: pid('Pineco'), level: 3, types: ['G'], req: 2, x: 46, y: 82 },
  { id: 'j34', region: J, place: 'Ruta 34', name: 'Pokéfan Brandon', portrait: pid('Snubbull'), level: 3, types: ['C', 'W'], req: 2, x: 42, y: 72 },
  { id: 'jpark', region: J, place: 'Parque Nacional', name: 'Chica Krise', portrait: pid('Sunkern'), level: 3, types: ['G', 'C'], req: 3, x: 44, y: 42 },
  { id: 'jburned', region: J, place: 'Torre Quemada', name: 'Eusine', portrait: pid('Suicune'), level: 4, types: ['W', 'R', 'L'], req: 3, x: 34, y: 20, prefer: ['Suicune', 'Entei', 'Raikou'] },
  { id: 'jrival2', region: J, place: 'Torre Quemada', name: 'Rival Plata', portrait: pid('Croconaw'), level: 4, types: ['W', 'D', 'P'], req: 3, rival: true },
  { id: 'j38', region: J, place: 'Ruta 39', name: 'Granjera Lidia', portrait: pid('Miltank'), level: 3, types: ['C', 'F'], req: 4, x: 28, y: 32 },
  { id: 'jlight', region: J, place: 'Faro Olivo', name: 'Marinero Huey', portrait: pid('Chinchou'), level: 4, types: ['L', 'W'], req: 4, x: 14, y: 28 },
  { id: 'j40', region: J, place: 'Ruta 41', name: 'Nadadora Kaylee', portrait: pid('Corsola'), level: 4, types: ['W'], req: 4, x: 12, y: 50 },
  { id: 'jlake', region: J, place: 'Lago de la Furia', name: 'Pescador Andrés', portrait: pid('Shining Gyarados'), level: 5, types: ['W', 'C'], req: 6, x: 62, y: 8, prefer: ['Gyarados', 'Magikarp'] },
  { id: 'jice', region: J, place: 'Ruta Helada', name: 'Esquiador Diana', portrait: pid('Swinub'), level: 5, types: ['W', 'F'], req: 7, x: 76, y: 14 },
  { id: 'jden', region: J, place: 'Guarida Dragón', name: 'Domadragón Paulo', portrait: pid('Dratini'), level: 5, types: ['C', 'W'], req: 7, x: 94, y: 8, prefer: ['Dratini', 'Dragonair', 'Dragonite', 'Kingdra', 'Seadra', 'Horsea'] },
  { id: 'jvictory', region: J, place: 'Calle Victoria', name: 'Entrenadora Guay Lola', portrait: pid('Espeon'), level: 5, types: ['P', 'D', 'R'], req: 8, x: 94, y: 60 },
  { id: 'jrival3', region: J, place: 'Calle Victoria', name: 'Rival Plata', portrait: pid('Feraligatr'), level: 5, types: ['W', 'D', 'P'], req: 8, rival: true },
  { id: 'jsilver', region: J, place: 'Monte Plateado', name: 'Rojo', portrait: 'base1-4', level: 5, types: ['R', 'W', 'G', 'L'], req: 8, sets: KANTO_SETS.concat(NEO_SETS), x: 6, y: 8, boss: true, perk: 'red', quote: '...' },
];
const JROCKET = [
  { id: 'jrk1', region: J, place: 'Pozo Slowpoke', name: 'Recluta Rocket', portrait: 'base5-71', level: 3, types: ['W', 'P'], req: 1, x: 50, y: 92, prefer: ['Slowbro', 'Slowking', 'Weezing', 'Golduck'], quote: '¡Las colas de Slowpoke se venden muy caras!' },
  { id: 'jrk2', region: J, place: 'Lago de la Furia', name: 'Recluta Rocket', portrait: 'base5-77', level: 4, types: ['W', 'F'], req: 6, prefer: ['Gyarados', 'Omastar', 'Feraligatr', 'Croconaw'], quote: 'Nuestras ondas de radio hacen evolucionar a los Magikarp... ¡a la fuerza!' },
  { id: 'jrk3', region: J, place: 'Escondite Caoba', name: 'Admin Petrel', portrait: 'base5-76', level: 4, types: ['G', 'P'], req: 6, x: 70, y: 30, prefer: ['Ariados', 'Crobat', 'Forretress', 'Golbat', 'Muk'], quote: '¡No dejaré que arruines nuestro experimento!' },
  { id: 'jrk4', region: J, place: 'Torre Radio', name: 'Admin Ariana', portrait: 'base5-16', level: 5, types: ['R', 'D'], req: 7, x: 33, y: 52, prefer: ['Houndoom', 'Magcargo', 'Arcanine', 'Ninetales'], quote: 'Con la Torre Radio llamaremos a Giovanni de vuelta.' },
  { id: 'jrk5', region: J, place: 'Torre Radio', name: 'Ejecutivo Archer', portrait: 'base5-73', level: 5, types: ['F', 'D', 'W'], req: 7, prefer: ['Tyranitar', 'Scizor', 'Gengar', 'Feraligatr'], perk: 'rocket', boss: true, quote: 'El Team Rocket renacerá. Nuestro líder volverá a escuchar nuestra llamada.' },
];
const JELITE = [
  { id: 'je1', region: J, name: 'Alto Mando Mento', portrait: pid('Xatu'), level: 5, types: ['P'], perk: 'sabrina', prefer: ['Xatu', 'Natu', 'Slowking', 'Jynx', 'Espeon', 'Girafarig'], quote: 'Bienvenido a la Liga Pokémon. Soy Mento, y mis Pokémon psíquicos te esperan.' },
  { id: 'je2', region: J, name: 'Alto Mando Koga', portrait: pid('Crobat'), level: 5, types: ['G'], perk: 'koga', prefer: ['Crobat', 'Golbat', 'Zubat', 'Ariados', 'Forretress', 'Qwilfish'], quote: '¡Fua, ja, ja! Ahora formo parte del Alto Mando. Mis venenos son aún más letales.' },
  { id: 'je3', region: J, name: 'Alto Mando Bruno', portrait: pid('Hitmontop'), level: 5, types: ['F'], perk: 'chuck', prefer: ['Hitmontop', 'Hitmonlee', 'Hitmonchan', 'Machamp', 'Onix'], quote: '¡Hemos entrenado sin descanso! ¡Prepárate para la fuerza bruta!' },
  { id: 'je4', region: J, name: 'Alto Mando Karen', portrait: pid('Umbreon'), level: 5, types: ['D', 'P'], perk: 'karen', prefer: ['Umbreon', 'Murkrow', 'Houndoom', 'Houndour', 'Sneasel', 'Tyranitar', 'Dark Gengar'], quote: 'Los Pokémon fuertes, los Pokémon débiles... Un buen entrenador gana con sus favoritos.' },
  { id: 'je5', region: J, name: 'Campeón Lance', portrait: pid('Dragonite'), level: 5, types: ['W', 'C', 'L'], perk: 'lance', boss: true, prefer: ['Dragonite', 'Light Dragonite', 'Dragonair', 'Dratini', 'Kingdra', 'Gyarados', 'Aerodactyl', 'Charizard'], quote: 'Te estaba esperando. Soy Lance, el domadragones. Y el Campeón de la Liga.' },
];
const JLEAGUE = { id: 'jleague', place: 'Meseta Añil', name: 'Alto Mando de Johto', level: 5, req: 8, x: 96, y: 44 };
function eliteDeck(e, rng) { return P.Decks.genDeck({ types: e.types, sets: e.id === 'je5' ? KANTO_SETS.concat(NEO_SETS) : NEO_SETS, level: 5, rng, era: 'neo', colorless: e.types.includes('C'), prefer: e.prefer, trainers: johtoTrainers(5) }); }
function silverDeck(t, rng) { return P.Decks.genDeck({ types: t.types, sets: NEO_SETS, level: t.level, rng, era: 'neo', colorless: false, prefer: ['Feraligatr', 'Croconaw', 'Totodile', 'Sneasel', 'Golbat', 'Crobat', 'Magneton', 'Gengar'], trainers: t.level >= 3 ? johtoTrainers(t.level) : undefined }); }
for (const r of ROUTES) r.region = 'kanto';
for (const r of ROCKET) r.region = 'kanto';
for (const g of GYMS) g.region = 'kanto';
const REGIONS = {
  kanto: { id: 'kanto', name: 'Kanto', GYMS, ROUTES, ROCKET, LEAGUE, badgesKey: 'badges', home: { x: 31, y: 81, label: 'Pueblo Paleta' }, sets: KANTO_SETS },
  johto: { id: 'johto', name: 'Johto', GYMS: JGYMS, ROUTES: JROUTES, ROCKET: JROCKET, ELITE: JELITE, LEAGUE: JLEAGUE, badgesKey: 'badgesJ', home: { x: 90, y: 74, label: 'Pueblo Primavera' }, sets: NEO_SETS, packSet: 'neo4' },
};
P.Campaign = { SETS, PACKS, openPack, PERKS, GYMS, ROUTES, ROCKET, rocketDeck, LEAGUE, STARTERS, leaderDeck, trainerDeck, starterDeck, rivalDeck, REGIONS, KANTO_SETS, NEO_SETS, JGYMS, JROUTES, JROCKET, JELITE, eliteDeck, silverDeck, johtoTrainers };
})(typeof window !== 'undefined' ? window : globalThis);
