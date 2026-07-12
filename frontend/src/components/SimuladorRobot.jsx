
import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { GRAELLA, LIMITS_VAIXELL, OBSTACLES_VAIXELL } from "../reptes/reptes";
import "./SimuladorRobot.css";

// Límits de la piscina per defecte (unitats Three.js). Coincideixen amb GRAELLA.
const LIMITS_PISCINA = { xMin: -300, xMax: 300, yMin: -200, yMax: 100, zMin: -300, zMax: 300 };


/** Analitza una cadena "{CMD,ms}" i retorna { cmd, ms } o null */
function analitzarComanda(cadena) {
  const coincidencia = cadena.match(/\{(\w+),(\d+)\}/);
  if (!coincidencia) return null;
  return { cmd: coincidencia[1], ms: parseInt(coincidencia[2]) };
}

// Crea un MeshPhongMaterial amb color i opcions extres
function crearMaterial(color, opcions = {}) {
  return new THREE.MeshPhongMaterial({ color, ...opcions });
}

// Afegeix un Mesh al grup amb posició, rotació i escala opcionals
function afegirPeca(grup, geometria, material, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const malla = new THREE.Mesh(geometria, material);
  malla.position.set(...pos);
  malla.rotation.set(...rot);
  grup.add(malla);
  return malla;
}

// CONSTRUCCIÓ DEL ROBOT 3D
// El robot mira cap a +Z (cap a la càmera :)
// Gir = rotació al voltant de l'eix Y
function construirRobot() {
  const grup = new THREE.Group();

  // Materials
  const matGroc       = crearMaterial(0xFFD600, { emissive: 0xFFD600, emissiveIntensity: 0.18 });
  const matGrocFosc   = crearMaterial(0xFFC200, { emissive: 0xFFC200, emissiveIntensity: 0.12 });
  const matBlau       = crearMaterial(0x1E88E5, { emissive: 0x1565C0, emissiveIntensity: 0.2  });
  const matFosc       = crearMaterial(0x0d1b2e);
  const matBlanc      = crearMaterial(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.15 });
  const matPupila     = crearMaterial(0x111122);
  const matBrillant   = crearMaterial(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.9  });
  const matBrac       = crearMaterial(0x78909c, { emissive: 0x546e7a, emissiveIntensity: 0.1  });
  const matAntena     = crearMaterial(0x1E90FF, { emissive: 0x1E90FF, emissiveIntensity: 0.55 });
  const matGalta      = crearMaterial(0xFF8A65, { transparent: true,  opacity: 0.55           });
  const matBracEsq    = crearMaterial(0xFF1744, { emissive: 0xFF1744, emissiveIntensity: 0.3  }); // Esfera roja
  const matBracDret   = crearMaterial(0x2979FF, { emissive: 0x2979FF, emissiveIntensity: 0.3  }); // Cub blau

  // Cos 
  afegirPeca(grup, new THREE.BoxGeometry(52, 37, 34), matGroc);
  afegirPeca(grup, new THREE.BoxGeometry(52, 7,  34), matGrocFosc, [0, 15, 0]);

  // Cara
  afegirPeca(grup, new THREE.BoxGeometry(44, 32, 1), matGroc,  [0, 0, 16.2]);
  afegirPeca(grup, new THREE.BoxGeometry(38, 26, 2), matFosc,  [0, 0, 17  ]);
  afegirPeca(grup, new THREE.BoxGeometry(38, 26, 1), matFosc,  [0, 0, 17.2]);

  // Ulls
  // Ull esquerra (+X)
  afegirPeca(grup, new THREE.SphereGeometry(7.5, 14, 12), matBlanc,   [-12, 2,    17.5]);
  afegirPeca(grup, new THREE.SphereGeometry(4.2, 10,  8), matPupila,  [-11, 2,    23.5]);
  afegirPeca(grup, new THREE.SphereGeometry(1.8,  6,  6), matBrillant, [-9, 4.5,  25.5]);
  // Ull dret 
  afegirPeca(grup, new THREE.SphereGeometry(7.5, 14, 12), matBlanc,   [ 12, 2,    17.5]);
  afegirPeca(grup, new THREE.SphereGeometry(4.2, 10,  8), matPupila,  [ 13, 2,    23.5]);
  afegirPeca(grup, new THREE.SphereGeometry(1.8,  6,  6), matBrillant, [15, 4.5,  25.5]);

  // Galtes
  afegirPeca(grup, new THREE.SphereGeometry(5, 8, 8), matGalta, [-20, -4.5, 16]);
  afegirPeca(grup, new THREE.SphereGeometry(5, 8, 8), matGalta, [ 20, -4.5, 16]);

  // Propulsors laterals
  const geoMotorLateral = new THREE.CylinderGeometry(7.5, 7.5, 22, 14);
  const geoHelixLateral = new THREE.CylinderGeometry(6,   6,  2.5, 14);
  afegirPeca(grup, geoMotorLateral, matBlau,  [-37, 0, 0], [0, 0, Math.PI / 2]);
  afegirPeca(grup, geoMotorLateral, matBlau,  [ 37, 0, 0], [0, 0, Math.PI / 2]);
  afegirPeca(grup, geoHelixLateral, matGroc,  [-49, 0, 0], [0, 0, Math.PI / 2]);
  afegirPeca(grup, geoHelixLateral, matGroc,  [ 49, 0, 0], [0, 0, Math.PI / 2]);

  // Propulsor vertical
  afegirPeca(grup, new THREE.CylinderGeometry(5.5, 5.5, 15, 12), matBlau,  [0, 25, 0]);
  afegirPeca(grup, new THREE.CylinderGeometry(4.5, 4.5,  2, 12), matGroc,  [0, 33, 0]);

  // Antena
  afegirPeca(grup, new THREE.CylinderGeometry(1.5, 1.5, 22, 8), matBrac,   [5, 34, 0]);
  afegirPeca(grup, new THREE.SphereGeometry(5.5, 12, 12),        matAntena, [5, 46, 0]);

  // Braç ESQUERRE (+X) esfera vermella
  afegirPeca(grup, new THREE.CylinderGeometry(2.8, 2.8, 28, 8), matBrac,    [-40, -14, 10], [0, 0, Math.PI / 2]);
  afegirPeca(grup, new THREE.SphereGeometry(9, 12, 10),          matBracEsq, [-55, -14, 10]);

  // Braç DRET (-X) cub blau
  afegirPeca(grup, new THREE.CylinderGeometry(2.8, 2.8, 28, 8), matBrac,    [40, -14, 10], [0, 0, Math.PI / 2]);
  afegirPeca(grup, new THREE.BoxGeometry(16, 16, 16),            matBracDret,[55, -14, 10]);

  return grup;
}

// ENTORN SUBMARÍ
function construirEntorn(escena) {
  // Terra
  const terra = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900, 30, 30),
    new THREE.MeshPhongMaterial({ color: 0x5d4037 })
  );
  terra.rotation.x = -Math.PI / 2;
  terra.position.y = -215;
  escena.add(terra);

  // Pedres (agrupades per poder mostrar/ocultar)
  const grupPedres = new THREE.Group();
  const matPedra = new THREE.MeshPhongMaterial({ color: 0x607d8b });
  for (let i = 0; i < 28; i++) {
    const radi = 8 + Math.random() * 22;
    const pedra = new THREE.Mesh(new THREE.SphereGeometry(radi, 8, 6), matPedra);
    pedra.position.set(
      (Math.random() - 0.5) * 700,
      -209 + radi * 0.35,
      (Math.random() - 0.5) * 700
    );
    pedra.scale.set(
      1 + Math.random() * 0.6,
      0.35 + Math.random() * 0.4,
      1 + Math.random() * 0.6
    );
    grupPedres.add(pedra);
  }
  escena.add(grupPedres);

  // Algues (agrupades per poder mostrar/ocultar)
  const grupAlgues = new THREE.Group();
  const colorsAlgues = [0x388e3c, 0x1b5e20, 0x43a047, 0x2e7d32];
  for (let i = 0; i < 20; i++) {
    const segments = 3 + Math.floor(Math.random() * 4);
    let y = -210;
    let x = (Math.random() - 0.5) * 650;
    let z = (Math.random() - 0.5) * 650;
    for (let s = 0; s < segments; s++) {
      const alçada = 15 + Math.random() * 13;
      const alga = new THREE.Mesh(
        new THREE.CylinderGeometry(
          Math.max(0.4, 3 - s * 0.6),
          Math.max(0.4, 3.5 - s * 0.5),
          alçada, 6
        ),
        new THREE.MeshPhongMaterial({ color: colorsAlgues[Math.floor(Math.random() * colorsAlgues.length)] })
      );
      alga.position.set(x + (Math.random() - 0.5) * 7, y + alçada / 2, z + (Math.random() - 0.5) * 7);
      alga.rotation.set((Math.random() - 0.5) * 0.35, 0, (Math.random() - 0.5) * 0.35);
      grupAlgues.add(alga);
      y += alçada;
      x += (Math.random() - 0.5) * 9;
      z += (Math.random() - 0.5) * 9;
    }
  }
  escena.add(grupAlgues);

  // Estrelles de mar (agrupades)
  const grupEstrelles = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const estrella = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 11, 3, 5),
      new THREE.MeshPhongMaterial({ color: 0xFF5722 })
    );
    estrella.position.set((Math.random() - 0.5) * 500, -212, (Math.random() - 0.5) * 500);
    estrella.rotation.y = Math.random() * Math.PI;
    grupEstrelles.add(estrella);
  }
  escena.add(grupEstrelles);

  // Superfície de l'aigua (semitransparent)
  const superficie = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshPhongMaterial({ color: 0x81d4fa, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
  );
  superficie.rotation.x = -Math.PI / 2;
  superficie.position.y = 115;
  escena.add(superficie);

  // Raigs de llum des de la superfície (agrupats → "llums")
  const grupLlums = new THREE.Group();
  const matRaig = new THREE.MeshBasicMaterial({
    color: 0x81d4fa, transparent: true, opacity: 0.06, side: THREE.DoubleSide
  });
  for (let i = 0; i < 7; i++) {
    const raig = new THREE.Mesh(new THREE.BoxGeometry(22, 320, 22), matRaig);
    raig.position.set(-240 + i * 80, 0, -80 + (i % 3) * 90);
    raig.rotation.z = (Math.random() - 0.5) * 0.28;
    grupLlums.add(raig);
  }
  escena.add(grupLlums);

  return { pedres: grupPedres, algues: grupAlgues, estrelles: grupEstrelles, llums: grupLlums };
}

// QUADRÍCULA 3D + LÍMITS DE LA PISCINA
function nivellsEix(min, max, cell) {
  const v = [];
  for (let x = min; x <= max + 0.001; x += cell) v.push(x);
  return v;
}

function construirGraella(g) {
  const grup = new THREE.Group();
  const xs = nivellsEix(g.xMin, g.xMax, g.cell);
  const ys = nivellsEix(g.yMin, g.yMax, g.cell);
  const zs = nivellsEix(g.zMin, g.zMax, g.cell);
  const punts = [];
  for (const y of ys) for (const z of zs) punts.push(g.xMin, y, z, g.xMax, y, z); // paral·leles a X
  for (const x of xs) for (const z of zs) punts.push(x, g.yMin, z, x, g.yMax, z); // paral·leles a Y
  for (const x of xs) for (const y of ys) punts.push(x, y, g.zMin, x, y, g.zMax); // paral·leles a Z
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(punts, 3));
  const linies = new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.65 })
  );
  grup.add(linies);
  grup.visible = false;
  return grup;
}

// límits de la piscina amb esferes marcant els vèrtexs
function construirLimits(p) {
  const grup = new THREE.Group();
  const ample = p.xMax - p.xMin, alt = p.yMax - p.yMin, fons = p.zMax - p.zMin;
  const cx = (p.xMin + p.xMax) / 2, cy = (p.yMin + p.yMax) / 2, cz = (p.zMin + p.zMax) / 2;

  const caixa = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(ample, alt, fons)),
    new THREE.LineBasicMaterial({ color: 0xffd600, transparent: true, opacity: 0.85 })
  );
  caixa.position.set(cx, cy, cz);
  grup.add(caixa);

  const matVertex = new THREE.MeshBasicMaterial({ color: 0xff1744 });
  const geoVertex = new THREE.SphereGeometry(7, 10, 8);
  for (const x of [p.xMin, p.xMax])
    for (const y of [p.yMin, p.yMax])
      for (const z of [p.zMin, p.zMax]) {
        const vertex = new THREE.Mesh(geoVertex, matVertex);
        vertex.position.set(x, y, z);
        grup.add(vertex);
      }

  grup.visible = false;
  return grup;
}

// VAIXELL ENFONSAT (repte de monedes)
function construirVaixell() {
  const grup = new THREE.Group();
  const L = LIMITS_VAIXELL;

  const matFusta  = new THREE.MeshPhongMaterial({ color: 0x6b4423 });
  const matFustaF = new THREE.MeshPhongMaterial({ color: 0x4a2f17 });
  const matVela   = new THREE.MeshPhongMaterial({ color: 0xd9cfb0, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  // Panells del buc semitransparents perquè es vegi l'interior des de qualsevol angle
  const matCasc   = new THREE.MeshPhongMaterial({ color: 0x6b4423, transparent: true, opacity: 0.3, side: THREE.DoubleSide });

  const ample   = L.xMax - L.xMin;
  const fons    = L.zMax - L.zMin;
  const altParet = L.yMax - L.yMin;
  const cyParet  = (L.yMin + L.yMax) / 2;
  const gruix    = 10;

  // Terra de la bodega + juntes dels llistons
  const terra = new THREE.Mesh(new THREE.BoxGeometry(ample + 30, gruix, fons + 40), matFusta);
  terra.position.set(0, L.yMin - gruix / 2, 0);
  grup.add(terra);
  for (let z = L.zMin + 40; z < L.zMax; z += 50) {
    const junta = new THREE.Mesh(new THREE.BoxGeometry(ample + 20, 1.5, 3), matFustaF);
    junta.position.set(0, L.yMin + 1, z);
    grup.add(junta);
  }

  // Parets laterals
  for (const x of [L.xMin - gruix / 2, L.xMax + gruix / 2]) {
    const paret = new THREE.Mesh(new THREE.BoxGeometry(gruix, altParet, fons), matCasc);
    paret.position.set(x, cyParet, 0);
    grup.add(paret);
  }
  for (let z = L.zMin + 30; z <= L.zMax - 30; z += 70)
    for (const x of [L.xMin + 4, L.xMax - 4]) {
      const costella = new THREE.Mesh(new THREE.BoxGeometry(5, altParet, 12), matFustaF);
      costella.position.set(x, cyParet, z);
      grup.add(costella);
    }

  // Popa (darrera)
  const popa = new THREE.Mesh(new THREE.BoxGeometry(ample + gruix * 2, altParet, gruix), matCasc);
  popa.position.set(0, cyParet, L.zMin - gruix / 2);
  grup.add(popa);

  // Proa
  const proaLlarg = Math.hypot(L.xMax, 80);
  const angle = Math.atan2(L.xMax, 80);
  for (const signe of [-1, 1]) {
    const costat = new THREE.Mesh(new THREE.BoxGeometry(gruix, altParet, proaLlarg), matCasc);
    costat.position.set(signe * (L.xMax / 2), cyParet, L.zMax + 40);
    costat.rotation.y = -signe * angle;
    grup.add(costat);
  }
  const proaPunta = new THREE.Mesh(new THREE.ConeGeometry(26, 70, 4), matFusta);
  proaPunta.position.set(0, cyParet + 20, L.zMax + 95);
  proaPunta.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  grup.add(proaPunta);

  // Barana superior
  for (const x of [L.xMin, L.xMax]) {
    const barana = new THREE.Mesh(new THREE.BoxGeometry(gruix + 6, 8, fons), matFustaF);
    barana.position.set(x, L.yMax + 4, 0);
    grup.add(barana);
  }

  // Pals amb barra i vela esquinçada
  const construirPal = (z, inclinacio) => {
    const pal = new THREE.Group();
    const tronc = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 150, 10), matFusta);
    tronc.position.y = 75;
    pal.add(tronc);
    const barraVela = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 130, 8), matFusta);
    barraVela.rotation.z = Math.PI / 2; barraVela.position.y = 120;
    pal.add(barraVela);
    const vela = new THREE.Mesh(new THREE.PlaneGeometry(110, 80), matVela);
    vela.position.set(0, 95, 2);
    pal.add(vela);
    pal.position.set(0, L.yMax + 6, z);
    pal.rotation.z = inclinacio;
    grup.add(pal);
  };
  construirPal(150, 0.06);
  construirPal(-150, -0.13);

  grup.visible = false;
  return grup;
}

//obstacles solids
function construirObstaclesVaixell() {
  const grup = new THREE.Group();
  const matColumna = new THREE.MeshPhongMaterial({ color: 0x6b4423 });
  const matCaixa   = new THREE.MeshPhongMaterial({ color: 0x8d6e63 });
  const matVora    = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
  for (const o of OBSTACLES_VAIXELL) {
    const h = o.yTop - o.yBottom;
    if (o.tipus === 'columna') {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(o.radi, o.radi, h, 12), matColumna);
      col.position.set(o.x, (o.yTop + o.yBottom) / 2, o.z);
      grup.add(col);
    } else {
      const caixa = new THREE.Mesh(new THREE.BoxGeometry(o.hx * 2, h, o.hz * 2), matCaixa);
      caixa.position.set(o.x, (o.yTop + o.yBottom) / 2, o.z);
      grup.add(caixa);
      const vora = new THREE.Mesh(new THREE.BoxGeometry(o.hx * 2 + 2, 4, o.hz * 2 + 2), matVora);
      vora.position.set(o.x, o.yTop, o.z);
      grup.add(vora);
    }
  }
  grup.visible = false;
  return grup;
}

// monedes
let _monedaGeo = null, _monedaRimGeo = null, _monedaMat = null, _monedaRimMat = null;
function construirMoneda() {
  if (!_monedaGeo) {
    _monedaGeo    = new THREE.CylinderGeometry(15, 15, 3.5, 20);
    _monedaRimGeo = new THREE.TorusGeometry(15, 2.2, 8, 22);
    _monedaMat    = new THREE.MeshPhongMaterial({ color: 0xffd700, emissive: 0xffb300, emissiveIntensity: 0.45, shininess: 90 });
    _monedaRimMat = new THREE.MeshPhongMaterial({ color: 0xffca28, emissive: 0xffa000, emissiveIntensity: 0.35 });
  }
  const grup = new THREE.Group();
  const disc = new THREE.Mesh(_monedaGeo, _monedaMat);
  disc.rotation.x = Math.PI / 2;
  grup.add(disc);
  grup.add(new THREE.Mesh(_monedaRimGeo, _monedaRimMat));
  return grup;
}

// Empeny el robot fora de qualsevol obstacle sòlid
function resoldreColisionsVaixell(sim, obstacles) {
  const RR = 26;   // radi aprox del robot
  for (const o of obstacles) {
    if (sim.y < o.yBottom - RR || sim.y > o.yTop + RR) continue;
    if (o.tipus === 'columna') {
      let dx = sim.x - o.x, dz = sim.z - o.z;
      let d = Math.hypot(dx, dz);
      const minD = o.radi + RR;
      if (d < minD) {
        if (d < 0.001) { dx = 1; dz = 0; d = 1; }
        const f = (minD - d) / d;
        sim.x += dx * f; sim.z += dz * f;
      }
    } else {
      const dx = sim.x - o.x, dz = sim.z - o.z;
      const penX = (o.hx + RR) - Math.abs(dx);
      const penZ = (o.hz + RR) - Math.abs(dz);
      if (penX > 0 && penZ > 0) {
        if (penX < penZ) sim.x += (dx >= 0 ? 1 : -1) * penX;
        else             sim.z += (dz >= 0 ? 1 : -1) * penZ;
      }
    }
  }
}

// BOIA
function construirBoia() {
  const grup = new THREE.Group();
  const matCos = new THREE.MeshPhongMaterial({ color: 0x4caf50, emissive: 0x2e7d32, emissiveIntensity: 0.25 });

  // Cos inferior
  const cos = new THREE.Mesh(new THREE.SphereGeometry(16, 16, 14), matCos);
  cos.scale.set(1, 1.15, 1);
  cos.position.y = -4;
  grup.add(cos);

  // Punta cònica superior
  const con = new THREE.Mesh(new THREE.ConeGeometry(16, 22, 16), matCos);
  con.position.y = 16;
  grup.add(con);

  // Tap fosc i anella a dalt
  const matFosc = new THREE.MeshPhongMaterial({ color: 0x37474f });
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 5, 10), matFosc);
  tap.position.y = 28;
  grup.add(tap);
  const anella = new THREE.Mesh(new THREE.TorusGeometry(3.5, 1.2, 8, 14), matFosc);
  anella.position.y = 32;
  grup.add(anella);

  grup.userData.matCos = matCos;
  grup.visible = false;
  return grup;
}

// colors per a les boies
const COLORS_BOIA = [0x4caf50, 0xff7043, 0x29b6f6, 0xffca28, 0xab47bc, 0xec407a, 0x26a69a, 0xffa726];

// PEIXOS
function construirPeixos(escena) {
  const grupPeixos = new THREE.Group();
  const llista  = [];
  const colors  = [0xe65100, 0xf57c00, 0xc62828, 0xad1457, 0x00838f, 0x558b2f, 0x6a1b9a, 0xf06292];
  const matBlanc  = new THREE.MeshPhongMaterial({ color: 0xffffff });
  const matPupila = new THREE.MeshPhongMaterial({ color: 0x111111 });
  const matBrillo = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (let i = 0; i < 8; i++) {
    const grup = new THREE.Group();
    const color = colors[i % colors.length];
    const mat   = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.08 });
    const matVentre = new THREE.MeshPhongMaterial({ color: 0xfff9f0 });

    // Cos 
    const cos = new THREE.Mesh(new THREE.SphereGeometry(9, 14, 10), mat);
    cos.scale.set(1.0, 0.78, 1.45);
    grup.add(cos);

    // Panxa
    const panxa = new THREE.Mesh(new THREE.SphereGeometry(8.2, 10, 8), matVentre);
    panxa.scale.set(0.55, 0.5, 0.9);
    panxa.position.set(8.5, -1.5, 0);
    grup.add(panxa);

    // Cua
    const matCua = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.06 });
    const cuaSup = new THREE.Mesh(new THREE.ConeGeometry(5.5, 13, 6), matCua);
    cuaSup.rotation.z =  Math.PI / 2 + 0.38;
    cuaSup.position.set(-17, 3.5, 0);
    grup.add(cuaSup);
    const cuaInf = new THREE.Mesh(new THREE.ConeGeometry(5.5, 13, 6), matCua);
    cuaInf.rotation.z =  Math.PI / 2 - 0.38;
    cuaInf.position.set(-17, -3.5, 0);
    grup.add(cuaInf);

    // Aleta dorsal
    const aletaDors = new THREE.Mesh(new THREE.ConeGeometry(2.8, 9, 5), mat);
    aletaDors.rotation.z = -0.15;
    aletaDors.position.set(1, 10, 0);
    grup.add(aletaDors);

    // Aletes pectorals (costats)
    [-1, 1].forEach((costat) => {
      const aleta = new THREE.Mesh(new THREE.SphereGeometry(4, 6, 5), mat);
      aleta.scale.set(0.4, 0.3, 1.1);
      aleta.rotation.x = costat * 0.5;
      aleta.position.set(3, -3, costat * 10);
      grup.add(aleta);
    });

    // Ulls
    [-1, 1].forEach((costat) => {
      // Esclera
      const esclera = new THREE.Mesh(new THREE.SphereGeometry(2.8, 8, 8), matBlanc);
      esclera.position.set(8, 3, costat * 6.5);
      grup.add(esclera);
      // Pupil·la
      const pupila = new THREE.Mesh(new THREE.SphereGeometry(1.6, 6, 6), matPupila);
      pupila.position.set(9.8, 3.2, costat * 7.5);
      grup.add(pupila);
      // Brillantor
      const brillantor = new THREE.Mesh(new THREE.SphereGeometry(0.7, 5, 5), matBrillo);
      brillantor.position.set(10.5, 4.2, costat * 8);
      grup.add(brillantor);
    });

    // Boca 
    const matBoca = new THREE.MeshPhongMaterial({ color: 0xcc3300 });
    const bocaSup = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.55, 6, 10, Math.PI), matBoca);
    bocaSup.rotation.y = Math.PI / 2;
    bocaSup.rotation.z = Math.PI;
    bocaSup.position.set(10.5, 0.5, 0);
    grup.add(bocaSup);

    // Galtes
    const matGalta = new THREE.MeshPhongMaterial({ color: 0xff8fab, transparent: true, opacity: 0.5 });
    [-1, 1].forEach((costat) => {
      const galta = new THREE.Mesh(new THREE.SphereGeometry(1.8, 7, 7), matGalta);
      galta.position.set(8.5, 0.5, costat * 5.5);
      grup.add(galta);
    });

    // Posició 
    grup.position.set(
      (Math.random() - 0.5) * 480,
      -50 + Math.random() * 110,
      (Math.random() - 0.5) * 480
    );
    grupPeixos.add(grup);

    llista.push({
      malla:     grup,
      velocitat: 28 + Math.random() * 22,
      direccio:  Math.random() > 0.5 ? 1 : -1,
      fase:      Math.random() * Math.PI * 2,
      y0:        grup.position.y,
    });
  }
  escena.add(grupPeixos);
  return { grup: grupPeixos, llista };
}

// COMPONENT PRINCIPAL
const VISIBILITAT_DEFECTE = { peixos: true, pedres: true, estrelles: true, algues: true, llums: false, graella: false, limits: false };
const VISTA_DEFECTE       = { azimut: 0, elevacio: 0.286 };

const SimuladorRobot = forwardRef(function SimuladorRobot(
  {
    sequencia = [], resetSignal = 0, repteSignal = 0, posicioInicial = null,
    onReset, onCanviarEstat, onHudUpdate,
    visibilitat, onObrirConfig,
    velocitats,
    btConnectat = false, onEnviarComandaBT,
    guiesVisuals = [], checkpoints = [], checkpointsAssolits, onCheckpointAssolit,
    modeRepte = false,
    boia = null, radiBoia = 45, onBoiaTocada,
    escenari = "piscina", monedes = [], onMonedaTocada, obstacles = false,
  },
  ref
) {
  const refMuntatge  = useRef(null);
  const refMotor     = useRef(null);
  const refOnCanviarEstat = useRef(onCanviarEstat);
  const refOnHudUpdate    = useRef(onHudUpdate);
  const refVista          = useRef({ ...VISTA_DEFECTE });
  const refRadi           = useRef(460); // distància de la càmera (zoom)
  const [seguintRobot, setSeguintRobot] = useState(true);   // la càmera segueix el robot
  const refSeguintRobot = useRef(true);
  const refCentreCamera = useRef({ x: 0, y: 0, z: 0 });      // punt fix quan no el segueix
  const [iconaVertical, setIconaVertical] = useState("👁");
  const [vistaPip, setVistaPip] = useState(false);
  const refVistaPip       = useRef(false);
  const alternarPip = useCallback(() => {
    setVistaPip((v) => { refVistaPip.current = !v; return !v; });
  }, []);
  const [estat, setEstat] = useState("idle");
  const [hud,   setHud  ] = useState({
    comanda: "EN ESPERA", progres: 0,
    profunditat: 50, angle: "0°", fet: false,
    x: 50, y: 50, z: 50, velocitat: 50,
  });
  const [toast, setToast]   = useState(false);
  const [amplia, setAmplia] = useState(false);
  const refTimerToast = useRef(null);

  // Control per teclat
  const [teclatActiu,    setTeclatActiu   ] = useState(false);
  const [teclatMovRobot, setTeclatMovRobot] = useState(false);
  const [modalTeclatObert, setModalTeclatObert] = useState(false);
  const refTeclatActiu    = useRef(false);
  const refTeclatMovRobot = useRef(false);
  const refTeclesPremsades = useRef(new Set());
  const refTimerBTTeclat  = useRef(null);

  // Selector de posició
  const [pickerActiu, setPickerActiu] = useState(false);
  const refPickerActiu = useRef(false);
  const refVertexMeshes        = useRef([]);   // punts del picker (piscina)
  const refVertexMeshesVaixell = useRef([]);   // punts del picker (vaixell)
  const refVertexActius        = useRef([]);   // conjunt actiu segons l'escenari

  useEffect(() => { refOnCanviarEstat.current = onCanviarEstat; }, [onCanviarEstat]);
  useEffect(() => { refOnHudUpdate.current    = onHudUpdate;    }, [onHudUpdate]);

  const refCheckpoints         = useRef([]);
  const refCheckpointsAssolits = useRef(null);
  const refOnCheckpointAssolit = useRef(onCheckpointAssolit);
  useEffect(() => {
    refCheckpoints.current = checkpoints.map((cp, i) => ({
      ...cp, radi: cp.radi ?? 50, idx: i,
    }));
  }, [checkpoints]);
  useEffect(() => { refCheckpointsAssolits.current = checkpointsAssolits; }, [checkpointsAssolits]);
  useEffect(() => { refOnCheckpointAssolit.current = onCheckpointAssolit; }, [onCheckpointAssolit]);

  // Boia (reptes de boies)
  const refBoia            = useRef(null);
  const refUltimaBoiaTocada = useRef(null); // evita comptar la mateixa boia diversos cops
  const refRadiBoia        = useRef(radiBoia);
  const refOnBoiaTocada    = useRef(onBoiaTocada);
  useEffect(() => { refRadiBoia.current = radiBoia; }, [radiBoia]);
  useEffect(() => { refOnBoiaTocada.current = onBoiaTocada; }, [onBoiaTocada]);

  // Monedes (repte del vaixell) i límits dinàmics de l'escena
  const refLimits           = useRef(LIMITS_PISCINA);
  const refMonedes          = useRef([]);
  const refIdsMonedaTocades = useRef(new Set());
  const refObstaclesActius  = useRef([]);
  const refOnMonedaTocada   = useRef(onMonedaTocada);
  useEffect(() => { refOnMonedaTocada.current = onMonedaTocada; }, [onMonedaTocada]);

  // gestiona el canvi de boia
  useEffect(() => {
    refBoia.current = boia;
    const m = refMotor.current;
    if (!m?.boiaMesh) return;
    if (boia) {
      m.boiaMesh.position.set(boia.x, boia.y, boia.z);
      const color = COLORS_BOIA[Math.floor(Math.random() * COLORS_BOIA.length)];
      m.boiaMesh.userData.matCos.color.set(color);
      m.boiaMesh.userData.matCos.emissive.set(color);
      m.boiaMesh.visible = true;
    } else {
      m.boiaMesh.visible = false;
    }
  }, [boia]);

  //camera
  // Amb la càmera fixada gira de 90° en 90° per mantenir la vista perpendicular
  const girarEsquerra = useCallback(() => {
    refVista.current.azimut -= refSeguintRobot.current ? Math.PI / 4 : Math.PI / 2;
  }, []);
  const girarDreta = useCallback(() => {
    refVista.current.azimut += refSeguintRobot.current ? Math.PI / 4 : Math.PI / 2;
  }, []);
  const alternarVertical = useCallback(() => {
    const e = refVista.current.elevacio;
    if (Math.abs(e - 0.286) < 0.5) {
      refVista.current.elevacio = 1.35; setIconaVertical("🔼");
    } else if (e > 0.9) {
      refVista.current.elevacio = -1.35; setIconaVertical("🔽");
    } else {
      refVista.current.elevacio = 0.286; setIconaVertical("👁");
    }
  }, []);

  // Activa/desactiva que la càmera segueixi el robot.
  const alternarSeguiment = useCallback(() => {
    const nou = !refSeguintRobot.current;
    refSeguintRobot.current = nou;
    setSeguintRobot(nou);
    if (!nou) {
      const lim = refLimits.current;
      refCentreCamera.current = {
        x: (lim.xMin + lim.xMax) / 2,
        y: (lim.yMin + lim.yMax) / 2,
        z: (lim.zMin + lim.zMax) / 2,
      };
      // Vista frontal: azimut al múltiple de 90° més proper i sense inclinació
      const v = refVista.current;
      v.azimut = Math.round(v.azimut / (Math.PI / 2)) * (Math.PI / 2);
      v.elevacio = 0;
      setIconaVertical("👁");
    }
  }, []);

  // canvis de visibilitat dels elements de l'escena
  useEffect(() => {
    const m = refMotor.current;
    if (!m) return;
    const vis = visibilitat || VISIBILITAT_DEFECTE;
    const esVaixell = escenari === "vaixell";
    m.peixos.grup.visible      = vis.peixos;
    m.entorn.pedres.visible    = !esVaixell && vis.pedres;
    m.entorn.estrelles.visible = !esVaixell && vis.estrelles;
    m.entorn.algues.visible    = !esVaixell && vis.algues;
    m.entorn.llums.visible     = !esVaixell && vis.llums;
    m.limits.visible           = !esVaixell && vis.limits;
  }, [visibilitat, escenari]);

  // Quadrícula i punts del picker
  useEffect(() => {
    const m = refMotor.current;
    if (!m) return;
    const baseGraella = (visibilitat || VISIBILITAT_DEFECTE).graella;
    const esVaixell = escenari === "vaixell";
    const mostrar = pickerActiu || modeRepte || baseGraella;
    m.graella.visible        = !esVaixell && mostrar;
    m.graellaVaixell.visible = esVaixell && mostrar;
    // El picker actua sobre els vèrtexs de la graella de l'escenari actual
    const setActiu   = esVaixell ? refVertexMeshesVaixell.current : refVertexMeshes.current;
    const setInactiu = esVaixell ? refVertexMeshes.current : refVertexMeshesVaixell.current;
    refVertexActius.current = setActiu;
    if (setActiu[0])   setActiu[0].material.visible = pickerActiu;
    if (setInactiu[0]) setInactiu[0].material.visible = false;
  }, [visibilitat, modeRepte, pickerActiu, escenari]);

  // Aplicar velocitats al sim quan canvien
  useEffect(() => {
    const m = refMotor.current;
    if (!m || !velocitats) return;
    m.sim.VELOCITAT   = velocitats.horitzontal;
    m.sim.VELOCITAT_V = velocitats.vertical;
    m.sim.GIRO        = velocitats.gir;
  }, [velocitats]);

  // Teleportar robot a posicioInicial quan canvia repteSignal
  useEffect(() => {
    const m = refMotor.current;
    if (!m || !posicioInicial) return;
    const { sim, bombolles, escena } = m;
    sim.x = posicioInicial.x; sim.y = posicioInicial.y;
    sim.z = posicioInicial.z; sim.angleH = posicioInicial.angleH ?? 0;
    sim.cua = []; sim.comandaActual = null; sim.executant = false; sim.acabat = false;
    bombolles.forEach(b => { escena.remove(b); b.material.dispose(); });
    bombolles.length = 0;
    canviarEstat("idle");
  }, [repteSignal]);

  // Construir guies visuals del repte
  useEffect(() => {
    const m = refMotor.current;
    if (!m) return;
    if (m.grupGuies) { m.escena.remove(m.grupGuies); m.grupGuies = null; }
    if (!guiesVisuals?.length) return;
    const grup = new THREE.Group();
    guiesVisuals.forEach(({ from, to }) => {
      const dir = new THREE.Vector3(to[0]-from[0], to[1]-from[1], to[2]-from[2]);
      const len = dir.length();
      const mid = [(from[0]+to[0])/2, (from[1]+to[1])/2, (from[2]+to[2])/2];
      const cil = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3, len, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd600 })
      );
      cil.position.set(...mid);
      cil.quaternion.setFromUnitVectors(
        new THREE.Vector3(0,1,0),
        dir.clone().normalize()
      );
      grup.add(cil);
    });

    // Esferes als checkpoints
    checkpoints.forEach((cp, idx) => {
      const duplicada = checkpoints.some((c, j) =>
        j < idx && c.x === cp.x && c.y === cp.y && c.z === cp.z);
      if (duplicada) return;
      const assolit = checkpointsAssolits?.has(idx);
      const esf = new THREE.Mesh(
        new THREE.SphereGeometry(12, 10, 8),
        new THREE.MeshBasicMaterial({ color: assolit ? 0x00e676 : 0xffd600, transparent: true, opacity: 0.75 })
      );
      esf.position.set(cp.x, cp.y, cp.z);
      esf.userData.checkpointIdx = idx;
      grup.add(esf);
    });
    m.escena.add(grup);
    m.grupGuies = grup;
  }, [guiesVisuals, checkpoints]);

  // canviar color esferes marcades
  useEffect(() => {
    const m = refMotor.current;
    if (!m?.grupGuies) return;
    m.grupGuies.children.forEach(mesh => {
      if (mesh.userData.checkpointIdx !== undefined) {
        const assolit = checkpointsAssolits?.has(mesh.userData.checkpointIdx);
        mesh.material.color.set(assolit ? 0x00e676 : 0xffd600);
      }
    });
  }, [checkpointsAssolits]);

  const canviarEstat = (nouEstat) => {
    setEstat(nouEstat);
    refOnCanviarEstat.current?.(nouEstat);
  };

  const canviarHud = (nouesDades) => {
    setHud(nouesDades);
    refOnHudUpdate.current?.(nouesDades);
  };

  // Inicialitzar Three.js
  useEffect(() => {
    const contenidor = refMuntatge.current;
    if (!contenidor) return;

    const ample  = contenidor.clientWidth  || 580;
    const alt    = contenidor.clientHeight || 326;

    // Renderer
    const renderitzador = new THREE.WebGLRenderer({ antialias: true });
    renderitzador.setSize(ample, alt);
    renderitzador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    contenidor.appendChild(renderitzador.domElement);

    // Escena
    const escena = new THREE.Scene();
    escena.fog        = new THREE.FogExp2(0x29b6f6, 0.0008);
    escena.background = new THREE.Color(0x0288d1);

    // Càmera orbital (vista exterior)
    const camera = new THREE.PerspectiveCamera(55, ample / alt, 1, 2000);
    camera.position.set(0, 130, 440);
    camera.lookAt(0, 0, 0);

    // Càmera del robot (1a persona)
    const robotCamera = new THREE.PerspectiveCamera(75, 16 / 9, 1, 2000);

    // Il·luminació
    escena.add(new THREE.AmbientLight(0x88ccff, 1.2));
    const llumSol = new THREE.DirectionalLight(0xffffff, 1.4);
    llumSol.position.set(80, 300, 150);
    escena.add(llumSol);
    const llumOmplir = new THREE.DirectionalLight(0xaaddff, 0.6);
    llumOmplir.position.set(-100, 100, 300);
    escena.add(llumOmplir);
    const llumCaustica1 = new THREE.PointLight(0x4fc3f7, 1.8, 600);
    const llumCaustica2 = new THREE.PointLight(0x29b6f6, 1.4, 600);
    escena.add(llumCaustica1);
    escena.add(llumCaustica2);
    const llumRobot = new THREE.PointLight(0xffffff, 1.1, 230); // segueix el robot
    escena.add(llumRobot);

    const entorn = construirEntorn(escena);
    const robot  = construirRobot();    escena.add(robot);
    const peixos = construirPeixos(escena);
    const graella = construirGraella(GRAELLA); escena.add(graella);

    // Mateixa quadrícula però ajustada al buc del vaixell 
    const graellaVaixell = construirGraella({ ...LIMITS_VAIXELL, cell: GRAELLA.cell }); escena.add(graellaVaixell);
    const limits  = construirLimits(LIMITS_PISCINA);  escena.add(limits);
    const boiaMesh = construirBoia();          escena.add(boiaMesh);

    // Escenari del vaixell enfonsat (repte de monedes)
    const vaixell       = construirVaixell();          escena.add(vaixell);
    const obstaclesMesh = construirObstaclesVaixell(); escena.add(obstaclesMesh);
    const grupMonedes   = new THREE.Group();           escena.add(grupMonedes);

    // Estat inicial de l'escenari
    const esVaixellIni = escenari === "vaixell";
    refLimits.current          = esVaixellIni ? LIMITS_VAIXELL : LIMITS_PISCINA;
    vaixell.visible            = esVaixellIni;
    obstaclesMesh.visible      = esVaixellIni && !!obstacles;
    refObstaclesActius.current = (esVaixellIni && obstacles) ? OBSTACLES_VAIXELL : [];

    // Aplicar visibilitat inicial
    const visIni = visibilitat || VISIBILITAT_DEFECTE;
    peixos.grup.visible      = visIni.peixos;
    entorn.pedres.visible    = !esVaixellIni && visIni.pedres;
    entorn.estrelles.visible = !esVaixellIni && visIni.estrelles;
    entorn.algues.visible    = !esVaixellIni && visIni.algues;
    entorn.llums.visible     = !esVaixellIni && visIni.llums;
    graella.visible          = !esVaixellIni && visIni.graella;
    graellaVaixell.visible   = esVaixellIni && visIni.graella;
    limits.visible           = !esVaixellIni && visIni.limits;

    // Bombolles
    const bombolles = [];
    const geoBombolla = new THREE.SphereGeometry(2.4, 6, 6);

    // Simulació
    const sim = {
      x: 0, y: 0, z: 0,
      angleH: 0,
      VELOCITAT: 50,
      GIRO: Math.PI/4,
      VELOCITAT_V: 50,
      cua: [], comandaActual: null, tempsComandat: 0,
      executant: false, acabat: false,
    };

    let ultimTemps = null;
    let idAnimacio;
    let comptadorHud = 0;

    function animar(timestamp) {
      idAnimacio = requestAnimationFrame(animar);

      if (!ultimTemps) ultimTemps = timestamp;
      const dt = Math.min((timestamp - ultimTemps) / 1000, 0.05);
      ultimTemps = timestamp;
      const t = timestamp / 1000;
      const lim = refLimits.current;   // límits actius (piscina o vaixell)

      // Llums animades
      llumCaustica1.position.set(Math.sin(t * 0.55) * 170, 140, Math.cos(t * 0.38) * 150);
      llumCaustica2.position.set(Math.cos(t * 0.43) * 150, 140, Math.sin(t * 0.67) * 170);

      // Transició visual fora / dins de l'aigua
      const sobreLAigua = camera.position.y > 145;
      if (sobreLAigua) {
        escena.background.set(0x87ceeb);   // cel blau clar
        escena.fog.color.set(0xb0e0f5);
        escena.fog.density = 0.00045;
      } else {
        escena.background.set(0x0288d1);   // blau submarí
        escena.fog.color.set(0x29b6f6);
        escena.fog.density = 0.0008;
      }

      // Moviment dels peixos
      peixos.llista.forEach((p) => {
        p.malla.position.x += p.direccio * p.velocitat * dt;
        p.malla.position.y  = p.y0 + Math.sin(t * 1.9 + p.fase) * 12;
        p.malla.rotation.z = 0.12 * Math.sin(t * 3.5 + p.fase);
        if (p.malla.position.x >  300) { p.direccio = -1; p.malla.rotation.y = Math.PI; }
        if (p.malla.position.x < -300) { p.direccio =  1; p.malla.rotation.y = 0; }
      });

      // Lògica de simulació
      if (sim.executant) {
        if (!sim.comandaActual && sim.cua.length > 0) {
          sim.comandaActual = { ...sim.cua.shift() };
          sim.tempsComandat = 0;
        }

        if (sim.comandaActual) {
          sim.tempsComandat += dt * 1000;
          const { cmd } = sim.comandaActual;

          const dirX = Math.sin(sim.angleH);
          const dirZ = Math.cos(sim.angleH);

          if      (cmd === "RIGHT")   sim.angleH   -= sim.GIRO       * dt;
          else if (cmd === "LEFT")    sim.angleH   += sim.GIRO       * dt;
          else if (cmd === "FORWARD") { sim.x += dirX * sim.VELOCITAT   * dt; sim.z += dirZ * sim.VELOCITAT   * dt; }
          else if (cmd === "BACK")    { sim.x -= dirX * sim.VELOCITAT   * dt; sim.z -= dirZ * sim.VELOCITAT   * dt; }
          else if (cmd === "UP")      sim.y        += sim.VELOCITAT_V * dt;
          else if (cmd === "DOWN")    sim.y        -= sim.VELOCITAT_V * dt;

          // Límits de l'escena (piscina o buc del vaixell) + obstacles sòlids
          sim.x = Math.max(lim.xMin, Math.min(lim.xMax, sim.x));
          sim.y = Math.max(lim.yMin, Math.min(lim.yMax, sim.y));
          sim.z = Math.max(lim.zMin, Math.min(lim.zMax, sim.z));
          if (refObstaclesActius.current.length) resoldreColisionsVaixell(sim, refObstaclesActius.current);

          // Generar bombolles darrere del robot
          if (cmd !== "QUIET" && Math.random() < 0.32 && bombolles.length < 90) {
            const matBombolla = new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.45 });
            const malla = new THREE.Mesh(geoBombolla, matBombolla);
            malla.position.set(
              sim.x - dirX * 38 + (Math.random() - 0.5) * 26,
              sim.y + (Math.random() - 0.5) * 22,
              sim.z - dirZ * 38 + (Math.random() - 0.5) * 26
            );
            malla.userData = {
              vy: 18 + Math.random() * 30,
              vx: (Math.random() - 0.5) * 9,
              vz: (Math.random() - 0.5) * 9,
              vida: 1.0,
            };
            escena.add(malla);
            bombolles.push(malla);
          }

          if (sim.tempsComandat >= sim.comandaActual.ms) sim.comandaActual = null;

        } else if (sim.cua.length === 0) {
          sim.executant = false;
          sim.acabat    = true;
          // Notifiquem via setEstat directe
          setEstat("fet");
          refOnCanviarEstat.current?.("fet");
        }
      }

      // Actualitzar bombolles
      for (let i = bombolles.length - 1; i >= 0; i--) {
        const b = bombolles[i];
        b.position.y += b.userData.vy * dt;
        b.position.x += b.userData.vx * dt;
        b.position.z += b.userData.vz * dt;
        b.userData.vida -= dt * 0.32;
        b.material.opacity = b.userData.vida * 0.45;
        if (b.userData.vida <= 0 || b.position.y > 112) {
          escena.remove(b);
          b.material.dispose();
          bombolles.splice(i, 1);
        }
      }

      // Moviment per teclat (actualitza sim directament cada frame)
      if (refTeclatActiu.current && !sim.executant) {
        const keys = refTeclesPremsades.current;
        const vH = sim.VELOCITAT * dt, vV = sim.VELOCITAT_V * dt, vG = sim.GIRO * dt;
        const dX = Math.sin(sim.angleH), dZ = Math.cos(sim.angleH);
        if (keys.has('w') || keys.has('W')) { sim.x += dX*vH; sim.z += dZ*vH; }
        if (keys.has('s') || keys.has('S')) { sim.x -= dX*vH; sim.z -= dZ*vH; }
        if (keys.has('a') || keys.has('A')) sim.angleH += vG;
        if (keys.has('d') || keys.has('D')) sim.angleH -= vG;
        if (keys.has('ArrowUp'))   sim.y += vV;
        if (keys.has('ArrowDown')) sim.y -= vV;
        sim.x = Math.max(lim.xMin, Math.min(lim.xMax, sim.x));
        sim.y = Math.max(lim.yMin, Math.min(lim.yMax, sim.y));
        sim.z = Math.max(lim.zMin, Math.min(lim.zMax, sim.z));
        if (refObstaclesActius.current.length) resoldreColisionsVaixell(sim, refObstaclesActius.current);
      }

      // Detecció de checkpoints
      const seguentIdx = refCheckpointsAssolits.current?.size ?? 0;
      const cpSeguent  = refCheckpoints.current[seguentIdx];
      if (cpSeguent) {
        const dist = Math.hypot(sim.x-cpSeguent.x, sim.y-cpSeguent.y, sim.z-cpSeguent.z);
        if (dist < cpSeguent.radi) refOnCheckpointAssolit.current?.(seguentIdx);
      }

      // Detecció de boia 
      const b = refBoia.current;
      if (b && b !== refUltimaBoiaTocada.current) {
        const dist = Math.hypot(sim.x-b.x, sim.y-b.y, sim.z-b.z);
        if (dist < refRadiBoia.current) {
          refUltimaBoiaTocada.current = b;
          refOnBoiaTocada.current?.();
        }
      }

      // Animació de la boia
      if (boiaMesh.visible) {
        boiaMesh.rotation.y = t * 0.6;
        boiaMesh.position.y = (refBoia.current?.y ?? boiaMesh.position.y) + Math.sin(t * 2) * 3;
      }

      // Detecció de monedes
      if (refMonedes.current.length) {
        const radi = refRadiBoia.current;
        for (const mon of refMonedes.current) {
          if (refIdsMonedaTocades.current.has(mon.id)) continue;
          const dm = Math.hypot(sim.x - mon.x, sim.y - mon.y, sim.z - mon.z);
          if (dm < radi) {
            refIdsMonedaTocades.current.add(mon.id);
            refOnMonedaTocada.current?.(mon.id);
          }
        }
      }
      // Gir i balanceig de les monedes
      grupMonedes.children.forEach((coin) => {
        coin.rotation.y = t * 1.8;
        coin.position.y = (coin.userData.baseY ?? coin.position.y) + Math.sin(t * 2 + coin.userData.id) * 4;
      });

      // Aplicar posició i orientació al robot
      robot.position.set(sim.x, sim.y, sim.z);
      robot.rotation.y = sim.angleH;
      llumRobot.position.set(sim.x, sim.y + 80, sim.z + 60);

      // Càmera orbital. Orbita al voltant del robot o, si el seguiment està desactivat, d'un punt fix. 
      const v = refVista.current || VISTA_DEFECTE;
      const R = refRadi.current;
      const cosE = Math.cos(v.elevacio);
      const centre = refSeguintRobot.current
        ? { x: sim.x, y: sim.y, z: sim.z }
        : refCentreCamera.current;
      const objX = centre.x + Math.sin(v.azimut) * cosE * R;
      const objY = centre.y + Math.sin(v.elevacio) * R;
      const objZ = centre.z + Math.cos(v.azimut) * cosE * R;
      camera.position.x += (objX - camera.position.x) * 0.06;
      camera.position.y += (objY - camera.position.y) * 0.06;
      camera.position.z += (objZ - camera.position.z) * 0.06;
      camera.lookAt(centre.x, centre.y, centre.z);

      // Actualitzar HUD cada 3 frames
      if (++comptadorHud % 3 === 0) {
        const profunditatPct = Math.round(((sim.y - lim.yMin) / (lim.yMax - lim.yMin)) * 100);
        const graus = ((sim.angleH * 180 / Math.PI) % 360).toFixed(0);
        // Coordenades normalitzades al percentatge de l'escena
        const cx = Math.round(((sim.x - lim.xMin) / (lim.xMax - lim.xMin)) * 100);
        const cy = Math.round(((sim.y - lim.yMin) / (lim.yMax - lim.yMin)) * 100);
        const cz = Math.round(((sim.z - lim.zMin) / (lim.zMax - lim.zMin)) * 100);
        canviarHud({
          comanda:     sim.comandaActual ? sim.comandaActual.cmd : (sim.acabat ? "FINALITZAT" : "EN ESPERA"),
          progres:     sim.comandaActual ? Math.min(1, sim.tempsComandat / sim.comandaActual.ms) : 0,
          profunditat: 100 - profunditatPct,
          angle:       `${graus}°`,
          fet:         sim.acabat,
          x: cx, y: cy, z: cz,
          velocitat:   sim.VELOCITAT,
        });
      }

      const cw = contenidor.clientWidth  || ample;
      const ch = contenidor.clientHeight || alt;

      const dirX = Math.sin(sim.angleH);
      const dirZ = Math.cos(sim.angleH);
      robotCamera.position.set(sim.x + dirX * 60, sim.y + 2, sim.z + dirZ * 60);
      robotCamera.lookAt(sim.x + dirX * 600, sim.y + 2, sim.z + dirZ * 600);

      if (refVistaPip.current) {
        // Vista GRAN: robot (primera persona)
        escena.background.set(0x0288d1);
        escena.fog.color.set(0x29b6f6);
        escena.fog.density = 0.0008;

        robotCamera.aspect = cw / ch;
        robotCamera.updateProjectionMatrix();
        renderitzador.setScissorTest(false);
        renderitzador.setViewport(0, 0, cw, ch);
        renderitzador.render(escena, robotCamera);

        // Vista PETITA (exterior)
        const pipW = Math.floor(cw * 0.28);
        const pipH = Math.floor(pipW * ch / cw);
        const pipX = cw - pipW - 10;
        const pipY = 56;  

        if (sobreLAigua) {
          escena.background.set(0x87ceeb);
          escena.fog.color.set(0xb0e0f5);
          escena.fog.density = 0.00045;
        } else {
          escena.background.set(0x0288d1);
          escena.fog.color.set(0x29b6f6);
          escena.fog.density = 0.0008;
        }

        camera.aspect = pipW / pipH;
        camera.updateProjectionMatrix();
        renderitzador.setScissorTest(true);
        renderitzador.setViewport(pipX, pipY, pipW, pipH);
        renderitzador.setScissor(pipX, pipY, pipW, pipH);
        renderitzador.render(escena, camera);
        renderitzador.setScissorTest(false);

        // Restaurar aspect de la càmera orbital per al frame següent
        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();

      } else {
        // Vista NORMAL
        renderitzador.setScissorTest(false);
        renderitzador.setViewport(0, 0, cw, ch);
        renderitzador.render(escena, camera);
      }
    }

    idAnimacio = requestAnimationFrame(animar);

    const alRedimensionar = () => {
      const a2 = contenidor.clientWidth;
      const h2 = contenidor.clientHeight;
      if (!a2 || !h2) return;
      camera.aspect = a2 / h2;
      camera.updateProjectionMatrix();
      renderitzador.setSize(a2, h2);
    };
    const observador = new ResizeObserver(alRedimensionar);
    observador.observe(contenidor);

    // Zoom amb la roda del ratolí
    const alScroll = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.08 : 0.92;
      refRadi.current = Math.max(180, Math.min(1100, refRadi.current * factor));
    };
    contenidor.addEventListener("wheel", alScroll, { passive: false });

    // Raycaster per al selector de posició
    const raycaster = new THREE.Raycaster();

    // Arrossegar per orbitar la càmera
    let arrossegant = false, ultX = 0, ultY = 0, startX = 0, startY = 0;
    const alPointerDown = (e) => {
      arrossegant = true;
      startX = ultX = e.clientX;
      startY = ultY = e.clientY;
      contenidor.setPointerCapture(e.pointerId);
      contenidor.style.cursor = "grabbing";
    };
    const alPointerMove = (e) => {
      if (!arrossegant) return;
      const dx = e.clientX - ultX, dy = e.clientY - ultY;
      ultX = e.clientX; ultY = e.clientY;
      refVista.current.azimut   += dx * 0.007;
      refVista.current.elevacio  = Math.max(-1.45, Math.min(1.45, refVista.current.elevacio - dy * 0.007));
    };
    const alPointerUp = (e) => {
      arrossegant = false;
      contenidor.style.cursor = "grab";

      const esClick = Math.hypot(e.clientX - startX, e.clientY - startY) < 8;
      if (refPickerActiu.current && esClick) {
        const rect = renderitzador.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width)  * 2 - 1,
          -((e.clientY - rect.top)  / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(ndc, camera);
        const encerts = raycaster.intersectObjects(refVertexActius.current);
        if (encerts.length > 0) {
          const p = encerts[0].object.position;
          sim.x = p.x; sim.y = p.y; sim.z = p.z; sim.angleH = 0;
          setPickerActiu(false);
          refPickerActiu.current = false;
        }
      }
    };
    contenidor.style.cursor = "grab";
    contenidor.addEventListener("pointerdown", alPointerDown);
    contenidor.addEventListener("pointermove", alPointerMove);
    contenidor.addEventListener("pointerup",   alPointerUp);
    contenidor.addEventListener("pointercancel", alPointerUp);

    refMotor.current = { renderitzador, escena, sim, bombolles, peixos, entorn, graella, graellaVaixell, limits, boiaMesh, vaixell, obstaclesMesh, grupMonedes };

    // Teclat
    const alKeyDown = (e) => {
      if (!refTeclatActiu.current) return;
      const k = e.key;
      if (['w','W','s','S','a','A','d','D','ArrowUp','ArrowDown'].includes(k)) {
        e.preventDefault();
        refTeclesPremsades.current.add(k);
      }
    };
    const alKeyUp = (e) => {
      refTeclesPremsades.current.delete(e.key);
    };
    document.addEventListener('keydown', alKeyDown);
    document.addEventListener('keyup',   alKeyUp);

    // Construir esferes de vèrtex per al picker
    const vertexGeo = new THREE.SphereGeometry(8, 6, 6);
    const afegirVertexs = (bounds) => {
      const meshes = [];
      const mat = new THREE.MeshBasicMaterial({ visible: false });
      for (let x = bounds.xMin; x <= bounds.xMax + 0.001; x += bounds.cell)
        for (let y = bounds.yMin; y <= bounds.yMax + 0.001; y += bounds.cell)
          for (let z = bounds.zMin; z <= bounds.zMax + 0.001; z += bounds.cell) {
            const m = new THREE.Mesh(vertexGeo, mat);
            m.position.set(x, y, z);
            escena.add(m);
            meshes.push(m);
          }
      return meshes;
    };
    refVertexMeshes.current        = afegirVertexs(GRAELLA);
    refVertexMeshesVaixell.current = afegirVertexs({ ...LIMITS_VAIXELL, cell: GRAELLA.cell });
    refVertexActius.current        = esVaixellIni ? refVertexMeshesVaixell.current : refVertexMeshes.current;

    return () => {
      cancelAnimationFrame(idAnimacio);
      observador.disconnect();
      contenidor.removeEventListener("wheel", alScroll);
      contenidor.removeEventListener("pointerdown", alPointerDown);
      contenidor.removeEventListener("pointermove", alPointerMove);
      contenidor.removeEventListener("pointerup",   alPointerUp);
      contenidor.removeEventListener("pointercancel", alPointerUp);
      document.removeEventListener('keydown', alKeyDown);
      document.removeEventListener('keyup',   alKeyUp);
      if (contenidor.contains(renderitzador.domElement)) contenidor.removeChild(renderitzador.domElement);
      renderitzador.dispose();
    };
  }, []);

  // Canvi d'escenari 
  useEffect(() => {
    const m = refMotor.current;
    if (!m) return;
    const esVaixell = escenari === "vaixell";
    refLimits.current          = esVaixell ? LIMITS_VAIXELL : LIMITS_PISCINA;
    m.vaixell.visible          = esVaixell;
    m.obstaclesMesh.visible    = esVaixell && !!obstacles;
    refObstaclesActius.current = (esVaixell && obstacles) ? OBSTACLES_VAIXELL : [];
  }, [escenari, obstacles]);

  // Reconstruir les monedes quan canvia la llista
  useEffect(() => {
    const m = refMotor.current;
    if (!m) return;
    const g = m.grupMonedes;
    while (g.children.length) g.remove(g.children[0]);
    (monedes || []).forEach((mon) => {
      const coin = construirMoneda();
      coin.position.set(mon.x, mon.y, mon.z);
      coin.userData.id = mon.id;
      coin.userData.baseY = mon.y;
      g.add(coin);
    });
    refMonedes.current = monedes || [];
  }, [monedes]);

  // Reiniciar posició
  useEffect(() => {
    const motor = refMotor.current;
    if (!motor) return;
    const { sim, bombolles, escena } = motor;

    sim.x = 0; sim.y = 0; sim.z = 0; sim.angleH = 0;
    sim.cua = []; sim.comandaActual = null;
    sim.executant = false; sim.acabat = false;
    bombolles.forEach((b) => { escena.remove(b); b.material.dispose(); });
    bombolles.length = 0;

    canviarEstat("idle");
    setHud({ comanda: "EN ESPERA", progres: 0, profunditat: 50, angle: "0°", fet: false, x: 50, y: 50, z: 50, velocitat: 50 });
    if (onReset) onReset();
  }, [resetSignal]);

  // Iniciar o reprendre la simulació
  const gestionarInici = () => {
    const motor = refMotor.current;
    if (!motor) return;
    const { sim } = motor;

    if (estat === "pausat") {
      sim.executant = true;
      canviarEstat("executant");
      return;
    }

    if (estat === "fet") {
      sim.cua           = sequencia.map(analitzarComanda).filter(Boolean);
      sim.comandaActual = null;
      sim.tempsComandat = 0;
      sim.executant     = true;
      sim.acabat        = false;
      canviarEstat("executant");
      return;
    }

    if (sequencia.length === 0) {
      setToast(true);
      clearTimeout(refTimerToast.current);
      refTimerToast.current = setTimeout(() => setToast(false), 2800);
      return;
    }

    sim.cua           = sequencia.map(analitzarComanda).filter(Boolean);
    sim.comandaActual = null;
    sim.tempsComandat = 0;
    sim.executant     = true;
    sim.acabat        = false;
    canviarEstat("executant");
  };

  // Aturar / pausar la simulació
  const gestionarAtura = () => {
    const motor = refMotor.current;
    if (!motor) return;
    motor.sim.executant = false;
    canviarEstat("pausat");
  };

  // Reset intern
  const refPosicioInicial = useRef(posicioInicial);
  useEffect(() => { refPosicioInicial.current = posicioInicial; }, [posicioInicial]);

  const gestionarReset = () => {
    const motor = refMotor.current;
    if (!motor) return;
    const { sim, bombolles, escena } = motor;
    const pos = refPosicioInicial.current;
    sim.x      = pos?.x      ?? 0;
    sim.y      = pos?.y      ?? 0;
    sim.z      = pos?.z      ?? 0;
    sim.angleH = pos?.angleH ?? 0;
    sim.cua = []; sim.comandaActual = null;
    sim.executant = false; sim.acabat = false;
    bombolles.forEach((b) => { escena.remove(b); b.material.dispose(); });
    bombolles.length = 0;
    canviarEstat("idle");
    setHud({ comanda: "EN ESPERA", progres: 0, profunditat: 50, angle: "0°", fet: false, x: 50, y: 50, z: 50, velocitat: 50 });
    if (onReset) onReset();
  };

  // Exposar mètodes al pare 
  useImperativeHandle(ref, () => ({
    simular: gestionarInici,
    aturar:  gestionarAtura,
    reset:   gestionarReset,
  }));

  const activarTeclat = (movRobot) => {
    setTeclatActiu(true);
    setTeclatMovRobot(movRobot);
    refTeclatActiu.current    = true;
    refTeclatMovRobot.current = movRobot;
  };

  const desactivarTeclat = () => {
    setTeclatActiu(false);
    setTeclatMovRobot(false);
    refTeclatActiu.current    = false;
    refTeclatMovRobot.current = false;
    refTeclesPremsades.current.clear();
    clearInterval(refTimerBTTeclat.current);
  };

  const alternarTeclat = () => {
    if (teclatActiu) { desactivarTeclat(); return; }
    if (btConnectat) { setModalTeclatObert(true); return; }
    activarTeclat(false);
  };

  const alternarPicker = () => {
    const nou = !pickerActiu;
    setPickerActiu(nou);
    refPickerActiu.current = nou;
  };

  // Render
  // Enviar comandes BT en temps real mentre hi ha teclat + BT actius
  useEffect(() => {
    if (!teclatActiu || !teclatMovRobot || !onEnviarComandaBT) return;
    const DURACIO = 200;
    const INTERVAL = 150;
    const mapKey = { w:'FORWARD', W:'FORWARD', s:'BACK', S:'BACK', a:'LEFT', A:'LEFT', d:'RIGHT', D:'RIGHT', ArrowUp:'UP', ArrowDown:'DOWN' };
    refTimerBTTeclat.current = setInterval(() => {
      const keys = refTeclesPremsades.current;
      for (const [k, cmd] of Object.entries(mapKey)) {
        if (keys.has(k)) { onEnviarComandaBT([`{${cmd},${DURACIO}}`, "{FINAL,0}"]).catch(() => {}); break; }
      }
    }, INTERVAL);
    return () => clearInterval(refTimerBTTeclat.current);
  }, [teclatActiu, teclatMovRobot, onEnviarComandaBT]);

  const executant = estat === "executant";
  const pausat    = estat === "pausat";
  const fet       = estat === "fet";

  const contingutSimulador = (
    <div className={`simulador-contenidor${amplia ? " simulador-contenidor-modal" : ""}`}>

      <div ref={refMuntatge} className="simulador-canvas" />

      <div className="hud-panell hud-ordre">
        <div className="hud-ordre_etiqueta">Ordre activa</div>
        <div className={`hud-ordre_comanda${hud.fet ? " hud-ordre_comanda-fet" : ""}`}>
          {hud.comanda}
        </div>
        <div className="hud-ordre_progres-barra">
          <div
            className={`hud-ordre_progres-farcit${hud.fet ? " hud-ordre_progres-farcit-fet" : ""}`}
            style={{ width: `${hud.progres * 100}%` }}
          />
        </div>
      </div>

      <div className="hud-panell hud-stats">
        <div className="hud-stats_fila">
          <span className="hud-stats_etiqueta">Prof.</span>
          <span className="hud-stats_valor">{hud.profunditat}%</span>
        </div>
        <div className="hud-stats_fila">
          <span className="hud-stats_etiqueta">Angle</span>
          <span className="hud-stats_valor">{hud.angle}</span>
        </div>
        <div className="hud-stats_separador" />
        <div className="hud-stats_fila hud-stats_fila-coords">
          <span className="hud-stats_etiqueta">X</span>
          <span className="hud-stats_valor hud-stats_valor-petit">{hud.x}%</span>
          <span className="hud-stats_etiqueta">Y</span>
          <span className="hud-stats_valor hud-stats_valor-petit">{hud.y}%</span>
          <span className="hud-stats_etiqueta">Z</span>
          <span className="hud-stats_valor hud-stats_valor-petit">{hud.z}%</span>
        </div>
        <div className="hud-stats_separador hud-stats_extra" />
        <div className="hud-stats_fila hud-stats_extra">
          <span className="hud-stats_etiqueta">Vel.</span>
          <span className="hud-stats_valor hud-stats_valor-petit">{hud.velocitat} u/s</span>
        </div>
        <div className="hud-stats_fila hud-stats_extra">
          <span className="hud-stats_etiqueta">{escenari === "vaixell" ? "Vaixell" : "Piscina"}</span>
          <span className="hud-stats_valor hud-stats_valor-petit">{escenari === "vaixell" ? "340×290×600" : "600×300×600"}</span>
        </div>
      </div>

      <button
        className="simulador-boto-ampliar"
        onClick={() => setAmplia((v) => !v)}
        title={amplia ? "Reduir" : "Pantalla gran"}
      >
        {amplia ? "✕" : "⛶"}
      </button>

      <div className={`simulador-toast${toast ? " simulador-toast-visible" : ""}`}>
        ⚠️ Primer afegeix blocs al programa
      </div>

      {vistaPip && (
        <div className="pip-marc">
          <span className="pip-etiqueta">🌐 EXTERIOR</span>
        </div>
      )}

      {pickerActiu && (
        <div className="pickerOverlay">
          <span>Clica un punt de la quadrícula per col·locar el robot</span>
        </div>
      )}

      {modalTeclatObert && (
        <div className="modalAuth_fons" onClick={() => setModalTeclatObert(false)}>
          <div className="modalAuth_caixa" onClick={e => e.stopPropagation()}>
            <button className="modalAuth_tancar" onClick={() => setModalTeclatObert(false)}>×</button>
            <h3 className="modalAuth_titol">Control per teclat</h3>
            <div className="modalAuth_cos">
              <p className="teclatAjuda">W/S avançar·retrocedir · A/D girar · ↑↓ pujar·baixar</p>
              <button className="modalAuth_boto" onClick={() => { activarTeclat(false); setModalTeclatObert(false); }}>
                Activar (només simulador)
              </button>
              {btConnectat && (
                <button className="modalAuth_boto" onClick={() => { activarTeclat(true); setModalTeclatObert(false); }}>
                  Activar (simulador + robot real)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="controlsCamera">
        <button className="controlCamera" onClick={girarEsquerra} title="Girar la vista a l'esquerra" type="button">◀</button>
        <button className="controlCamera" onClick={alternarVertical} title="Vista normal / des de dalt / des de baix" type="button">{iconaVertical}</button>
        <button className="controlCamera" onClick={girarDreta} title="Girar la vista a la dreta" type="button">▶</button>
        <button
          className={`controlCamera${seguintRobot ? " controlCamera-actiu-verd" : ""}`}
          onClick={alternarSeguiment}
          title={seguintRobot
            ? "La càmera segueix el robot · clica per fixar-la"
            : "Càmera fixa · clica per tornar a seguir el robot"}
          type="button"
        >{seguintRobot ? "🎥" : "📌"}</button>
        <button
          className={`controlCamera${teclatActiu ? " controlCamera-actiu-verd" : ""}`}
          onClick={alternarTeclat}
          title={teclatActiu ? "Desactivar control per teclat" : "Control per teclat"}
          type="button"
        >⌨</button>
        <button
          className={`controlCamera${pickerActiu ? " controlCamera-actiu" : ""}`}
          onClick={alternarPicker}
          title="Col·locar el robot"
          type="button"
        >📍</button>
        <button
          className={`controlCamera controlCamera-pip${vistaPip ? " controlCamera-actiu" : ""}`}
          onClick={alternarPip}
          title="Vista del robot (primera persona)"
          type="button"
        >🤖</button>
        <button className="controlCamera controlCamera-config" onClick={onObrirConfig} title="Configuració del simulador" type="button">⚙️</button>
      </div>

    </div>
  );

  return (
    <>
      {contingutSimulador}
      {amplia && (
        <>
          <div className="simulador-backdrop" onClick={() => setAmplia(false)} />
          <div className="simulador-barra-botons simulador-barra-botons-modal">
            <button
              className={`simulador-boto${executant ? " simulador-boto-executant" : ""}`}
              onClick={gestionarInici}
              disabled={executant}
            >
              {executant ? "⏳ Simulant..." : pausat ? "▶ Reprendre" : fet ? "▶ Tornar a simular" : "▶ Simular"}
            </button>
            {executant && (
              <button className="simulador-boto simulador-boto-stop" onClick={gestionarAtura}>
                ⏹ Stop
              </button>
            )}
            <button className="simulador-boto simulador-boto-reset" onClick={gestionarReset}>
              ↺ Reset
            </button>
          </div>
        </>
      )}
    </>
  );
});

export default SimuladorRobot;