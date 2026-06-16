export const CELL = 100;  //mida arestes quadricula
export const GRAELLA = {
  xMin: -300, xMax: 300,
  yMin: -200, yMax: 100,
  zMin: -300, zMax: 300,
  cell: CELL,
};

const VELOCITATS_REPTE = { //mitja cela i 45ª per segon
  horitzontal: CELL / 2,
  vertical:    CELL / 2,
  gir:         Math.PI / 4,
};

// repte quadrat
const MIDA_QUADRAT = 100;
const Y_QUADRAT    = 0;
const Y_SUPERFICIE = 100;
const ANGLE_INICI  = Math.PI / 2; 

function construirGuiesQuadrat() {
  const s = MIDA_QUADRAT;
  const y = Y_QUADRAT;
  const cantonades = [[-s, y, -s], [s, y, -s], [s, y, s], [-s, y, s]];
  return cantonades.map((origen, i) => ({ from: origen, to: cantonades[(i + 1) % 4] }));
}

// reptes boies: posicions vàlides (vèrtexs de la quadrícula) 
const PASSOS_XZ    = [-200, -100, 0, 100, 200];
const PROFUNDITATS = [100, 0, -100];

function posicioGraella(zona) {
  const x = PASSOS_XZ[Math.floor(Math.random() * PASSOS_XZ.length)];
  const z = PASSOS_XZ[Math.floor(Math.random() * PASSOS_XZ.length)];
  const y = zona === 'submergit'
    ? PROFUNDITATS[Math.floor(Math.random() * PROFUNDITATS.length)]
    : Y_SUPERFICIE;
  return { x, y, z };
}


export function generarPosicioBoia(zona, evitar) {
  let p;
  do { p = posicioGraella(zona); }
  while (evitar && p.x === evitar.x && p.y === evitar.y && p.z === evitar.z);
  return p;
}

// el robot sempre comença a la superfície
export function generarPosicioInicialBoies() {
  const p = posicioGraella('superficie');
  return { x: p.x, y: Y_SUPERFICIE, z: p.z, angleH: 0 };
}

// repte vaixell
export const LIMITS_VAIXELL = { xMin: -200, xMax: 200, yMin: -200, yMax: 100, zMin: -300, zMax: 300 };

// obstacles del vaixell quan es trien
export const OBSTACLES_VAIXELL = [
  { tipus: 'columna', x:   0, z:  150, radi: 16, yBottom: -200, yTop: 100  },
  { tipus: 'columna', x:   0, z: -150, radi: 16, yBottom: -200, yTop: 100  },
  { tipus: 'caixa',   x: -75, z:   30, hx: 36, hz: 36, yBottom: -200, yTop: -118 },
  { tipus: 'caixa',   x:  75, z:  -50, hx: 30, hz: 46, yBottom: -200, yTop: -138 },
];

const MONEDA_X = [-120, -60, 0, 60, 120];
const MONEDA_Z = [-240, -120, 0, 120, 240];
const Y_MONEDA = LIMITS_VAIXELL.yMin + 14;   // monedes al teerra

let seguentMonedaId = 1;

//les monedes no poden apareixer dins un obstacle
function cellesMonedaDisponibles(ambObstacles) {
  const celles = [];
  for (const x of MONEDA_X)
    for (const z of MONEDA_Z) {
      if (ambObstacles && OBSTACLES_VAIXELL.some(o => Math.hypot(x - o.x, z - o.z) < 70)) continue;
      celles.push({ x, z });
    }
  return celles;
}

function crearMoneda(x, z) {
  return { id: seguentMonedaId++, x, y: Y_MONEDA, z };
}

// pel mode totes les monedes
export function generarMonedesVaixell(n, ambObstacles = false) {
  const celles = cellesMonedaDisponibles(ambObstacles);
  for (let i = celles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [celles[i], celles[j]] = [celles[j], celles[i]];
  }
  return celles.slice(0, Math.min(n, celles.length)).map(c => crearMoneda(c.x, c.z));
}

// pel mode temps, genera una moneda
export function generarMonedaVaixell(existents = [], ambObstacles = false) {
  const ocupades = new Set(existents.map(m => `${m.x},${m.z}`));
  const lliures = cellesMonedaDisponibles(ambObstacles).filter(c => !ocupades.has(`${c.x},${c.z}`));
  const c = lliures[Math.floor(Math.random() * lliures.length)] ?? { x: 0, z: 0 };
  return crearMoneda(c.x, c.z);
}

// pos inicial robot al barco
export function generarPosicioInicialMonedes() {
  return { x: 0, y: 70, z: -270, angleH: 0 };
}

export const REPTES = [
  {
    id:          'quadrat-horitzontal',
    nom:         'El quadrat submarí',
    descripcio:  'Submergeix el robot i traça un quadrat horitzontal seguint les línies grogues.',
    dificultat:  1,
    tipus:       'recorregut',
    posicioInicial: { x: -MIDA_QUADRAT, y: Y_SUPERFICIE, z: -MIDA_QUADRAT, angleH: ANGLE_INICI },
    guies: construirGuiesQuadrat(),
    checkpoints: [
      { x: -MIDA_QUADRAT, y: Y_QUADRAT, z: -MIDA_QUADRAT },
      { x:  MIDA_QUADRAT, y: Y_QUADRAT, z: -MIDA_QUADRAT },
      { x:  MIDA_QUADRAT, y: Y_QUADRAT, z:  MIDA_QUADRAT },
      { x: -MIDA_QUADRAT, y: Y_QUADRAT, z:  MIDA_QUADRAT },
      { x: -MIDA_QUADRAT, y: Y_QUADRAT, z: -MIDA_QUADRAT },
    ],
    radiCheckpoint: 45,
    velocitats: VELOCITATS_REPTE,
  },
  {
    id:          'boies',
    nom:         'Caça-boies',
    descripcio:  "Ves a tocar la boia; cada cop que en toques una, n'apareix una altra.",
    dificultat:  2,
    tipus:       'boies',
    duracioSegons: 120,
    radiCheckpoint: 45,
    velocitats: VELOCITATS_REPTE,
  },
  {
    id:          'monedes-vaixell',
    nom:         'El tresor del vaixell enfonsat',
    descripcio:  "Explora les restes d'un vaixell enfonsat i recull les monedes d'or escampades pel terra.",
    dificultat:  3,
    tipus:       'monedes',
    escenari:    'vaixell',
    duracioSegons: 120,
    nombreMonedes: 5,
    radiCheckpoint: 40,
    velocitats: VELOCITATS_REPTE,
  },
];
