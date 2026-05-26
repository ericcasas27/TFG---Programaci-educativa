
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import "./SimuladorRobot.css";

// ════════════════════════════════════════════════════════════════
// UTILITATS
// ════════════════════════════════════════════════════════════════

/** Analitza una cadena "{CMD,ms}" i retorna { cmd, ms } o null */
function analitzarComanda(cadena) {
  const coincidencia = cadena.match(/\{(\w+),(\d+)\}/);
  if (!coincidencia) return null;
  return { cmd: coincidencia[1], ms: parseInt(coincidencia[2]) };
}

/** Crea un MeshPhongMaterial amb color i opcions extres */
function crearMaterial(color, opcions = {}) {
  return new THREE.MeshPhongMaterial({ color, ...opcions });
}

/** Afegeix un Mesh al grup amb posició, rotació i escala opcionals */
function afegirPeca(grup, geometria, material, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const malla = new THREE.Mesh(geometria, material);
  malla.position.set(...pos);
  malla.rotation.set(...rot);
  grup.add(malla);
  return malla;
}

// ════════════════════════════════════════════════════════════════
// CONSTRUCCIÓ DEL ROBOT 3D
// El robot mira cap a +Z (cap a la càmera :)
// Gir = rotació al voltant de l'eix Y
// ════════════════════════════════════════════════════════════════

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

  // Braç DRET (-X) cub blau ───────────────────
  afegirPeca(grup, new THREE.CylinderGeometry(2.8, 2.8, 28, 8), matBrac,    [40, -14, 10], [0, 0, Math.PI / 2]);
  afegirPeca(grup, new THREE.BoxGeometry(16, 16, 16),            matBracDret,[55, -14, 10]);

  return grup;
}

// ════════════════════════════════════════════════════════════════
// ENTORN SUBMARÍ
// ════════════════════════════════════════════════════════════════

function construirEntorn(escena) {
  // Terra
  const terra = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900, 30, 30),
    new THREE.MeshPhongMaterial({ color: 0x5d4037 })
  );
  terra.rotation.x = -Math.PI / 2;
  terra.position.y = -158;
  escena.add(terra);

  // Pedres
  const matPedra = new THREE.MeshPhongMaterial({ color: 0x607d8b });
  for (let i = 0; i < 28; i++) {
    const radi = 8 + Math.random() * 22;
    const pedra = new THREE.Mesh(new THREE.SphereGeometry(radi, 8, 6), matPedra);
    pedra.position.set(
      (Math.random() - 0.5) * 700,
      -152 + radi * 0.35,
      (Math.random() - 0.5) * 700
    );
    pedra.scale.set(
      1 + Math.random() * 0.6,
      0.35 + Math.random() * 0.4,
      1 + Math.random() * 0.6
    );
    escena.add(pedra);
  }

  // Algues
  const colorsAlgues = [0x388e3c, 0x1b5e20, 0x43a047, 0x2e7d32];
  for (let i = 0; i < 20; i++) {
    const segments = 3 + Math.floor(Math.random() * 4);
    let y = -153;
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
      escena.add(alga);
      y += alçada;
      x += (Math.random() - 0.5) * 9;
      z += (Math.random() - 0.5) * 9;
    }
  }

  // Estrelles de mar
  for (let i = 0; i < 6; i++) {
    const estrella = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 11, 3, 5),
      new THREE.MeshPhongMaterial({ color: 0xFF5722 })
    );
    estrella.position.set((Math.random() - 0.5) * 580, -156, (Math.random() - 0.5) * 580);
    estrella.rotation.y = Math.random() * Math.PI;
    escena.add(estrella);
  }

  // Superfície de l'aigua (semitransparent)
  const superficie = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshPhongMaterial({ color: 0x81d4fa, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
  );
  superficie.rotation.x = -Math.PI / 2;
  superficie.position.y = 158;
  escena.add(superficie);

  // Raigs de llum des de la superfície
  const matRaig = new THREE.MeshBasicMaterial({
    color: 0x81d4fa, transparent: true, opacity: 0.06, side: THREE.DoubleSide
  });
  for (let i = 0; i < 7; i++) {
    const raig = new THREE.Mesh(new THREE.BoxGeometry(22, 320, 22), matRaig);
    raig.position.set(-240 + i * 80, 0, -80 + (i % 3) * 90);
    raig.rotation.z = (Math.random() - 0.5) * 0.28;
    escena.add(raig);
  }
}

// ════════════════════════════════════════════════════════════════
// PEIXOS
// ════════════════════════════════════════════════════════════════

function construirPeixos(escena) {
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
    escena.add(grup);

    llista.push({
      malla:     grup,
      velocitat: 28 + Math.random() * 22,
      direccio:  Math.random() > 0.5 ? 1 : -1,
      fase:      Math.random() * Math.PI * 2,
      y0:        grup.position.y,
    });
  }
  return llista;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ════════════════════════════════════════════════════════════════

const SimuladorRobot = forwardRef(function SimuladorRobot(
  { sequencia = [], resetSignal = 0, onReset, onCanviarEstat, onHudUpdate },
  ref
) {
  const refMuntatge  = useRef(null);
  const refMotor     = useRef(null);
  const refOnCanviarEstat = useRef(onCanviarEstat);
  const refOnHudUpdate    = useRef(onHudUpdate);
  const [estat, setEstat] = useState("idle");
  const [hud,   setHud  ] = useState({
    comanda: "EN ESPERA", progres: 0,
    profunditat: 50, angle: "0°", fet: false,
    x: 50, y: 50, z: 50, velocitat: 85,
  });
  const [toast, setToast]   = useState(false);
  const [amplia, setAmplia] = useState(false);
  const refTimerToast = useRef(null);

  useEffect(() => { refOnCanviarEstat.current = onCanviarEstat; }, [onCanviarEstat]);
  useEffect(() => { refOnHudUpdate.current    = onHudUpdate;    }, [onHudUpdate]);

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

    // Càmera fixe + efecte d'allunyament 
    const camera = new THREE.PerspectiveCamera(55, ample / alt, 1, 2000);
    camera.position.set(0, 130, 440);
    camera.lookAt(0, 0, 0);

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

    construirEntorn(escena);
    const robot  = construirRobot();    escena.add(robot);
    const peixos = construirPeixos(escena);

    // Límits de la piscina (unitats Three.js)
    const PISCINA = { xMin: -260, xMax: 260, yMin: -145, yMax: 145, zMin: -260, zMax: 260 };

    // Bombolles
    const bombolles = [];
    const geoBombolla = new THREE.SphereGeometry(2.4, 6, 6);

    // Simulació
    const sim = {
      x: 0, y: 0, z: 0,
      angleH:  0,    // yaw al voltant de Y (0 = cara a la càmera = +Z)
      VELOCITAT:   85,   // unitats/s avançar/retrocedir
      GIRO:        0.785*2,  // rad/s girar
      VELOCITAT_V: 65,   // unitats/s pujar/baixar
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

      // Llums animades
      llumCaustica1.position.set(Math.sin(t * 0.55) * 170, 140, Math.cos(t * 0.38) * 150);
      llumCaustica2.position.set(Math.cos(t * 0.43) * 150, 140, Math.sin(t * 0.67) * 170);

      // Moviment dels peixos 
      peixos.forEach((p) => {
        p.malla.position.x += p.direccio * p.velocitat * dt;
        p.malla.position.y  = p.y0 + Math.sin(t * 1.9 + p.fase) * 12;
        // Ondulació lateral suau (cos)
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

          // Límits de la piscina
          sim.x = Math.max(PISCINA.xMin, Math.min(PISCINA.xMax, sim.x));
          sim.y = Math.max(PISCINA.yMin, Math.min(PISCINA.yMax, sim.y));
          sim.z = Math.max(PISCINA.zMin, Math.min(PISCINA.zMax, sim.z));

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
        if (b.userData.vida <= 0 || b.position.y > 152) {
          escena.remove(b);
          b.material.dispose();
          bombolles.splice(i, 1);
        }
      }

      // Aplicar posició i orientació al robot
      robot.position.set(sim.x, sim.y, sim.z);
      robot.rotation.y = sim.angleH;
      llumRobot.position.set(sim.x, sim.y + 80, sim.z + 60);

      // Càmera segueix X i Y; Z fixe 
      camera.position.x += (sim.x - camera.position.x) * 0.055;
      camera.position.y  = sim.y + 130;
      camera.position.z  = 440;
      camera.lookAt(sim.x, sim.y, sim.z);

      // Actualitzar HUD cada 3 frames
      if (++comptadorHud % 3 === 0) {
        const profunditatPct = Math.round(((sim.y - PISCINA.yMin) / (PISCINA.yMax - PISCINA.yMin)) * 100);
        const graus = ((sim.angleH * 180 / Math.PI) % 360).toFixed(0);
        // Coordenades normalitzades al percentatge de la piscina
        const cx = Math.round(((sim.x - PISCINA.xMin) / (PISCINA.xMax - PISCINA.xMin)) * 100);
        const cy = Math.round(((sim.y - PISCINA.yMin) / (PISCINA.yMax - PISCINA.yMin)) * 100);
        const cz = Math.round(((sim.z - PISCINA.zMin) / (PISCINA.zMax - PISCINA.zMin)) * 100);
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

      renderitzador.render(escena, camera);
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

    refMotor.current = { renderitzador, escena, sim, bombolles };

    return () => {
      cancelAnimationFrame(idAnimacio);
      observador.disconnect();
      if (contenidor.contains(renderitzador.domElement)) contenidor.removeChild(renderitzador.domElement);
      renderitzador.dispose();
    };
  }, []);

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
    setHud({ comanda: "EN ESPERA", progres: 0, profunditat: 50, angle: "0°", fet: false, x: 50, y: 50, z: 50, velocitat: 85 });
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
  const gestionarReset = () => {
    const motor = refMotor.current;
    if (!motor) return;
    const { sim, bombolles, escena } = motor;
    sim.x = 0; sim.y = 0; sim.z = 0; sim.angleH = 0;
    sim.cua = []; sim.comandaActual = null;
    sim.executant = false; sim.acabat = false;
    bombolles.forEach((b) => { escena.remove(b); b.material.dispose(); });
    bombolles.length = 0;
    canviarEstat("idle");
    setHud({ comanda: "EN ESPERA", progres: 0, profunditat: 50, angle: "0°", fet: false, x: 50, y: 50, z: 50, velocitat: 85 });
    if (onReset) onReset();
  };

  // Exposar mètodes al pare 
  useImperativeHandle(ref, () => ({
    simular: gestionarInici,
    aturar:  gestionarAtura,
    reset:   gestionarReset,
  }));

  // Render
  const executant = estat === "executant";
  const pausat    = estat === "pausat";
  const fet       = estat === "fet";

  const contingutSimulador = (
    <div className={`simulador-contenidor${amplia ? " simulador-contenidor--modal" : ""}`}>

      <div ref={refMuntatge} className="simulador-canvas" />

      <div className="hud-panell hud-ordre">
        <div className="hud-ordre__etiqueta">Ordre activa</div>
        <div className={`hud-ordre__comanda${hud.fet ? " hud-ordre__comanda--fet" : ""}`}>
          {hud.comanda}
        </div>
        <div className="hud-ordre__progres-barra">
          <div
            className={`hud-ordre__progres-farcit${hud.fet ? " hud-ordre__progres-farcit--fet" : ""}`}
            style={{ width: `${hud.progres * 100}%` }}
          />
        </div>
      </div>

      <div className="hud-panell hud-stats">
        <div className="hud-stats__fila">
          <span className="hud-stats__etiqueta">Prof.</span>
          <span className="hud-stats__valor">{hud.profunditat}%</span>
        </div>
        <div className="hud-stats__fila">
          <span className="hud-stats__etiqueta">Angle</span>
          <span className="hud-stats__valor">{hud.angle}</span>
        </div>
        <div className="hud-stats__separador" />
        <div className="hud-stats__fila hud-stats__fila--coords">
          <span className="hud-stats__etiqueta">X</span>
          <span className="hud-stats__valor hud-stats__valor--petit">{hud.x}%</span>
          <span className="hud-stats__etiqueta">Y</span>
          <span className="hud-stats__valor hud-stats__valor--petit">{hud.y}%</span>
          <span className="hud-stats__etiqueta">Z</span>
          <span className="hud-stats__valor hud-stats__valor--petit">{hud.z}%</span>
        </div>
        <div className="hud-stats__separador hud-stats__extra" />
        <div className="hud-stats__fila hud-stats__extra">
          <span className="hud-stats__etiqueta">Vel.</span>
          <span className="hud-stats__valor hud-stats__valor--petit">{hud.velocitat} u/s</span>
        </div>
        <div className="hud-stats__fila hud-stats__extra">
          <span className="hud-stats__etiqueta">Piscina</span>
          <span className="hud-stats__valor hud-stats__valor--petit">520×290×520</span>
        </div>
      </div>

      <button
        className="simulador-boto-ampliar"
        onClick={() => setAmplia((v) => !v)}
        title={amplia ? "Reduir" : "Pantalla gran"}
      >
        {amplia ? "✕" : "⛶"}
      </button>

      <div className={`simulador-toast${toast ? " simulador-toast--visible" : ""}`}>
        ⚠️ Primer afegeix blocs al programa
      </div>

    </div>
  );

  return (
    <>
      {contingutSimulador}
      {amplia && (
        <>
          <div className="simulador-backdrop" onClick={() => setAmplia(false)} />
          <div className="simulador-barra-botons simulador-barra-botons--modal">
            <button
              className={`simulador-boto${executant ? " simulador-boto--executant" : ""}`}
              onClick={gestionarInici}
              disabled={executant}
            >
              {executant ? "⏳ Simulant..." : pausat ? "▶ Reprendre" : fet ? "▶ Tornar a simular" : "▶ Simular"}
            </button>
            {executant && (
              <button className="simulador-boto simulador-boto--stop" onClick={gestionarAtura}>
                ⏹ Stop
              </button>
            )}
            <button className="simulador-boto simulador-boto--reset" onClick={gestionarReset}>
              ↺ Reset
            </button>
          </div>
        </>
      )}
    </>
  );
});

export default SimuladorRobot;