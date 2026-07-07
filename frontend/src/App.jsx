import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import BarraSuperior from "./components/BarraSuperior";
import Finestra from "./components/Finestra";
import Fitxa from "./components/Fitxa";
import SimuladorRobot from "./components/SimuladorRobot";
import { useAuth } from "./hooks/useAuth";
import { useProgrames } from "./hooks/useProgrames";
import { useRepte } from "./hooks/useRepte";
import { useEsp, CALIBRACIO_DEFECTE, aplicarCalibracio } from "./hooks/useEsp";
import { REPTES, CELL } from "./reptes/reptes";

import baixImg from "./assets/down.png";
import daltImg from "./assets/up.png";
import esquerraImg from "./assets/left.png";
import dretaImg from "./assets/right.png";
import repeteixImgIni from "./assets/inici_bucle.png";
import repeteixImgFi from "./assets/final_bucle.png";
import esperaImg from "./assets/wait.png";
import girEsquerraImg from "./assets/turnleft.png";
import girDretaImg from "./assets/turnright.png";
import banderaImg from "./assets/onflag.png";
import finalImg from "./assets/end.png";

const TIPUS_ULTIMS     = new Set(["per-sempre", "final"]);
const TIPUS_PRIMER     = "bandera";
const TIPUS_INICI_BUCLE = "inici-bucle";
const TIPUS_FI_BUCLE   = "fi-bucle";

const BLOCS_BASE = [
  { id: 1,  tipus: "bandera",       nom: "iniciar",        imatge: banderaImg,    valor: null, editable: false },
  { id: 2,  tipus: "baixar",        nom: "baixar",         imatge: baixImg,       valor: 1,    editable: true  },
  { id: 3,  tipus: "pujar",         nom: "pujar",          imatge: daltImg,       valor: 1,    editable: true  },
  { id: 4,  tipus: "retrocedir",    nom: "retrocedir",     imatge: esquerraImg,   valor: 1,    editable: true  },
  { id: 5,  tipus: "avançar",       nom: "avançar",        imatge: dretaImg,      valor: 1,    editable: true  },
  { id: 6,  tipus: "gira-esquerra", nom: "girar esquerra", imatge: girEsquerraImg,valor: 1,    editable: true  },
  { id: 7,  tipus: "gira-dreta",    nom: "girar dreta",    imatge: girDretaImg,   valor: 1,    editable: true  },
  { id: 8,  tipus: "inici-bucle",   nom: "inici bucle",    imatge: repeteixImgIni,valor: 3,    editable: true  },
  { id: 9,  tipus: "fi-bucle",      nom: "fi bucle",       imatge: repeteixImgFi, valor: null, editable: false },
  { id: 10, tipus: "espera",        nom: "esperar",        imatge: esperaImg,     valor: 3,    editable: true  },
  { id: 11, tipus: "final",         nom: "finalitzar",     imatge: finalImg,      valor: null, editable: false },
];

function crearBlocPrograma(blocBase) {
  return {
    instanciaId: `${blocBase.tipus}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tipusId: blocBase.id, tipus: blocBase.tipus, nom: blocBase.nom,
    imatge: blocBase.imatge, valor: blocBase.valor, editable: blocBase.editable,
  };
}

//reconstruir programa
function reconstruirBlocDeGuardat({ tipusId, valor }) {
  const base = BLOCS_BASE.find((b) => b.id === tipusId);
  if (!base) return null;
  const bloc = crearBlocPrograma(base);
  bloc.valor = valor;
  return bloc;
}

function programaLlest(programa) {
  if (programa.length === 0) return { llest: false, missatge: "" };
  if (programa[0]?.tipus !== TIPUS_PRIMER)
    return { llest: false, missatge: "El programa ha de començar amb la bandera verda." };
  if (programa[programa.length - 1]?.tipus !== "final")
    return { llest: false, missatge: "El programa ha d'acabar amb la bandera vermella (final)." };
  return { llest: true, missatge: "" };
}

function validarPrograma(programa) {
  let hiHaBandera = false;
  for (let i = 0; i < programa.length; i++) {
    const bloc = programa[i];
    if (bloc.tipus === TIPUS_PRIMER) {
      if (i !== 0)     return { valid: false, missatge: "La bandera només pot estar a la primera posició." };
      if (hiHaBandera) return { valid: false, missatge: "Només hi pot haver una bandera verda." };
      hiHaBandera = true;
    }
    if (TIPUS_ULTIMS.has(bloc.tipus) && i !== programa.length - 1)
      return { valid: false, missatge: `"${bloc.nom}" només pot estar a l'última posició.` };
  }
  return { valid: true, missatge: "" };
}

function analitzarBucles(programa) {
  const pila = []; const metaPerIndex = new Map(); let seguentId = 1;
  for (let i = 0; i < programa.length; i++) {
    const bloc = programa[i];
    if (bloc.tipus === TIPUS_INICI_BUCLE) { pila.push({ index: i }); continue; }
    if (bloc.tipus === TIPUS_FI_BUCLE) {
      if (pila.length === 0) return { valid: false, missatge: "Hi ha un 'fi bucle' sense el seu 'inici bucle'.", metaPerIndex };
      const inici = pila.pop(); const idBucle = seguentId++;
      metaPerIndex.set(inici.index, { idBucle, parellaIndex: i, tipus: "inici" });
      metaPerIndex.set(i, { idBucle, parellaIndex: inici.index, tipus: "fi" });
    }
  }
  if (pila.length > 0) return { valid: false, missatge: "Hi ha un o més 'inici bucle' sense el seu 'fi bucle'.", metaPerIndex };
  return { valid: true, missatge: "", metaPerIndex };
}

function expandirPrograma(programa, metaPerIndex, inici = 0, fi = programa.length) {
  const resultat = []; let i = inici;
  while (i < fi) {
    const bloc = programa[i];
    if (bloc.tipus === TIPUS_INICI_BUCLE) {
      const meta = metaPerIndex.get(i); if (!meta) break;
      const vegades = Math.max(1, Number(bloc.valor) || 1);
      const interior = expandirPrograma(programa, metaPerIndex, i + 1, meta.parellaIndex);
      for (let v = 0; v < vegades; v++) resultat.push(...interior.map((item) => ({ ...item })));
      i = meta.parellaIndex + 1; continue;
    }
    if (bloc.tipus === TIPUS_FI_BUCLE) { i++; continue; }
    resultat.push({ tipus: bloc.tipus, nom: bloc.nom, valor: bloc.valor, programaIndex: i });
    i++;
  }
  return resultat;
}

function traduirASecuenciaRobot(sequencia) {
  const mapa = { "pujar":"UP","baixar":"DOWN","avançar":"FORWARD","retrocedir":"BACK","gira-dreta":"RIGHT","gira-esquerra":"LEFT","espera":"QUIET","atura":"QUIET" };
  return sequencia.map((bloc) => {
    const ordre = mapa[bloc.tipus]; if (!ordre) return null;
    return `{${ordre},${bloc.valor ? bloc.valor * 1000 : 0}}`;
  }).filter(Boolean);
}

const BT_SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const BT_CHAR_UUID    = "12345678-1234-5678-1234-56789abcdef1";
const BT_MTU          = 180;

// Moviments que es poden calibrar
const MOVIMENTS_CALIBRABLES = [
  { cmd: "FORWARD", img: dretaImg,       nom: "Avançar"        },
  { cmd: "BACK",    img: esquerraImg,    nom: "Retrocedir"     },
  { cmd: "UP",      img: daltImg,        nom: "Pujar"          },
  { cmd: "DOWN",    img: baixImg,        nom: "Baixar"         },
  { cmd: "LEFT",    img: girEsquerraImg, nom: "Girar esquerra" },
  { cmd: "RIGHT",   img: girDretaImg,    nom: "Girar dreta"    },
];

function SelectorCentre({ centreId, onChange }) {
  const [centres,    setCentres   ] = useState([]);
  const [nouNom,     setNouNom    ] = useState("");
  const [afegint,    setAfegint   ] = useState(false);
  const [errorCentre,setErrorCentre] = useState("");

  useEffect(() => {
    fetch("/.netlify/functions/centres")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setCentres(d))
      .catch(() => {});
  }, []);

  const afegirCentre = async () => {
    if (!nouNom.trim()) { setErrorCentre("Escriu el nom del centre."); return; }
    setAfegint(true); setErrorCentre("");
    try {
      const res  = await fetch("/.netlify/functions/centres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nouNom.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCentres((prev) => [...prev.filter((c) => c._id !== data._id), data]
        .sort((a, b) => a.nom.localeCompare(b.nom)));
      onChange(data._id);
      setNouNom("");
    } catch (err) { setErrorCentre(err.message); }
    finally { setAfegint(false); }
  };

  return (
    <div className="selectorCentre">
      <select
        className="modalAuth_input"
        value={centreId}
        onChange={(e) => { onChange(e.target.value); }}
      >
        <option value="">-- Selecciona un centre --</option>
        {centres.map((c) => <option key={c._id} value={c._id}>{c.nom}</option>)}
        <option value="_nou_">➕ Afegir centre nou...</option>
      </select>
      {centreId === "_nou_" && (
        <div className="selectorCentre_nou">
          <input
            className="modalAuth_input"
            placeholder="Nom del centre educatiu"
            value={nouNom}
            onChange={(e) => setNouNom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && afegirCentre()}
            autoFocus
          />
          {errorCentre && <p className="modalAuth_error">{errorCentre}</p>}
          <button className="modalAuth_boto" onClick={afegirCentre} disabled={afegint}>
            {afegint ? "..." : "Confirmar centre"}
          </button>
        </div>
      )}
    </div>
  );
}

function ModalAuth({ enTancar, registrar, login, pestanyaInicial = "login" }) {
  const [pestanya,    setPestanya   ] = useState(pestanyaInicial);
  const [centreId,    setCentreId   ] = useState("");
  const [nomUsuari,   setNomUsuari  ] = useState("");
  const [contrasenya, setContrasenya] = useState("");
  const [nom,         setNom        ] = useState("");
  const [cognom1,     setCognom1    ] = useState("");
  const [cognom2,     setCognom2    ] = useState("");
  const [curs,        setCurs       ] = useState("");
  const [email,       setEmail      ] = useState("");
  const [error,       setError      ] = useState("");
  const [carregant,   setCarregant  ] = useState(false);

  const canviarPestanya = (p) => { setPestanya(p); setError(""); setCentreId(""); };

  const enviar = async () => {
    setError("");
    if (!centreId || centreId === "_nou_") { setError("Selecciona un centre educatiu."); return; }
    if (!nomUsuari.trim() || !contrasenya.trim()) { setError("Omple tots els camps obligatoris."); return; }
    if (pestanya === "registre" && (!nom.trim() || !cognom1.trim() || !curs.trim())) {
      setError("Omple tots els camps obligatoris."); return;
    }
    setCarregant(true);
    try {
      if (pestanya === "registre") {
        await registrar({ nomUsuari: nomUsuari.trim(), contrasenya, centreId, nom: nom.trim(), cognom1: cognom1.trim(), cognom2: cognom2.trim(), curs: curs.trim(), email: email.trim() });
      } else {
        await login({ nomUsuari: nomUsuari.trim(), contrasenya, centreId });
      }
      enTancar();
    } catch (err) {
      setError(err.message || "Error desconegut");
    } finally { setCarregant(false); }
  };

  return (
    <div className="modalAuth_fons" onClick={enTancar}>
      <div className="modalAuth_caixa modalAuth_caixa-ampla" onClick={(e) => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enTancar}>×</button>

        <div className="modalAuth_tabs">
          <button className={`modalAuth_tab${pestanya === "login" ? " modalAuth_tab-actiu" : ""}`}
            onClick={() => canviarPestanya("login")}>Iniciar sessió</button>
          <button className={`modalAuth_tab${pestanya === "registre" ? " modalAuth_tab-actiu" : ""}`}
            onClick={() => canviarPestanya("registre")}>Registrar-se</button>
        </div>

        <div className="modalAuth_cos">
          <label className="modalAuth_label">Centre educatiu *</label>
          <SelectorCentre centreId={centreId} onChange={setCentreId} />

          {pestanya === "registre" && (
            <>
              <div className="modalAuth_fila2">
                <div>
                  <label className="modalAuth_label">Nom *</label>
                  <input className="modalAuth_input" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="given-name" />
                </div>
                <div>
                  <label className="modalAuth_label">Primer cognom *</label>
                  <input className="modalAuth_input" value={cognom1} onChange={(e) => setCognom1(e.target.value)} autoComplete="family-name" />
                </div>
              </div>
              <div className="modalAuth_fila2">
                <div>
                  <label className="modalAuth_label">Segon cognom</label>
                  <input className="modalAuth_input" value={cognom2} onChange={(e) => setCognom2(e.target.value)} />
                </div>
                <div>
                  <label className="modalAuth_label">Curs i classe *</label>
                  <input className="modalAuth_input" placeholder="Ex: 5è A" value={curs} onChange={(e) => setCurs(e.target.value)} />
                </div>
              </div>
              <label className="modalAuth_label">Correu electrònic (opcional)</label>
              <input className="modalAuth_input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </>
          )}

          <label className="modalAuth_label">Nom d'usuari *</label>
          <input className="modalAuth_input" type="text" value={nomUsuari}
            onChange={(e) => setNomUsuari(e.target.value)} autoFocus autoComplete="username" />

          <label className="modalAuth_label">Contrasenya *</label>
          <input className="modalAuth_input" type="password" value={contrasenya}
            onChange={(e) => setContrasenya(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            autoComplete={pestanya === "registre" ? "new-password" : "current-password"} />

          {error && <p className="modalAuth_error">{error}</p>}
          <button className="modalAuth_boto" onClick={enviar} disabled={carregant}>
            {carregant ? "..." : pestanya === "registre" ? "Crear compte" : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalPerfil({ enTancar, usuari, actualitzarPerfil }) {
  const [nom,         setNom        ] = useState(usuari.nom      || "");
  const [cognom1,     setCognom1    ] = useState(usuari.cognom1  || "");
  const [cognom2,     setCognom2    ] = useState(usuari.cognom2  || "");
  const [curs,        setCurs       ] = useState(usuari.curs     || "");
  const [email,       setEmail      ] = useState(usuari.email    || "");
  const [centreId,    setCentreId   ] = useState(usuari.centre?._id || "");
  const [novaCont,    setNovaCont   ] = useState("");
  const [error,       setError      ] = useState("");
  const [carregant,   setCarregant  ] = useState(false);
  const [desat,       setDesat      ] = useState(false);

  const desar = async () => {
    setError(""); setDesat(false);
    if (!nom.trim() || !cognom1.trim() || !curs.trim()) {
      setError("Nom, primer cognom i curs són obligatoris."); return;
    }
    if (centreId === "_nou_" || !centreId) {
      setError("Selecciona un centre vàlid."); return;
    }
    setCarregant(true);
    try {
      const dades = { nom: nom.trim(), cognom1: cognom1.trim(), cognom2: cognom2.trim(), curs: curs.trim(), email: email.trim(), centreId };
      if (novaCont.trim()) dades.contrasenya = novaCont.trim();
      await actualitzarPerfil(dades);
      setDesat(true); setNovaCont("");
      setTimeout(enTancar, 900);
    } catch (err) {
      setError(err.message || "Error desant el perfil");
    } finally { setCarregant(false); }
  };

  return (
    <div className="modalAuth_fons" onClick={enTancar}>
      <div className="modalAuth_caixa modalAuth_caixa-ampla" onClick={(e) => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enTancar}>×</button>
        <h3 className="modalAuth_titol">Editar perfil</h3>
        <p className="modalPerfil_nomUsuari">👤 {usuari.nomUsuari}</p>
        <div className="modalAuth_cos">
          <label className="modalAuth_label">Centre educatiu *</label>
          <SelectorCentre centreId={centreId} onChange={setCentreId} />

          <div className="modalAuth_fila2">
            <div>
              <label className="modalAuth_label">Nom *</label>
              <input className="modalAuth_input" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div>
              <label className="modalAuth_label">Primer cognom *</label>
              <input className="modalAuth_input" value={cognom1} onChange={(e) => setCognom1(e.target.value)} />
            </div>
          </div>
          <div className="modalAuth_fila2">
            <div>
              <label className="modalAuth_label">Segon cognom</label>
              <input className="modalAuth_input" value={cognom2} onChange={(e) => setCognom2(e.target.value)} />
            </div>
            <div>
              <label className="modalAuth_label">Curs i classe *</label>
              <input className="modalAuth_input" value={curs} onChange={(e) => setCurs(e.target.value)} />
            </div>
          </div>

          <label className="modalAuth_label">Correu electrònic (opcional)</label>
          <input className="modalAuth_input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="modalAuth_label">Nova contrasenya (deixa buit per no canviar)</label>
          <input className="modalAuth_input" type="password" value={novaCont}
            onChange={(e) => setNovaCont(e.target.value)} autoComplete="new-password" />

          {error  && <p className="modalAuth_error">{error}</p>}
          {desat  && <p className="modalAuth_ok">✓ Perfil desat!</p>}
          <button className="modalAuth_boto" onClick={desar} disabled={carregant}>
            {carregant ? "..." : "Desar canvis"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalGuardar({ enTancar, enGuardar, programaActual, programesExistents = [] }) {
  const [nom,      setNom     ] = useState("");
  const [error,    setError   ] = useState("");
  const [carregant,setCarregant] = useState(false);
  const [confirmar, setConfirmar] = useState(null); // programa existent amb el mateix nom

  const executarGuardar = async (idSobreescriure = null) => {
    setCarregant(true);
    try {
      const blocs = programaActual.map((b) => ({ tipusId: b.tipusId, valor: b.valor }));
      await enGuardar(nom.trim(), blocs, idSobreescriure);
      enTancar();
    } catch (err) {
      setError(err.message || "Error guardant");
      setConfirmar(null);
    } finally {
      setCarregant(false);
    }
  };

  const enviar = () => {
    if (!nom.trim()) { setError("Posa un nom al programa."); return; }
    const existent = programesExistents.find(
      (p) => p.nom.trim().toLowerCase() === nom.trim().toLowerCase()
    );
    if (existent) { setConfirmar(existent); return; }
    executarGuardar();
  };
// modal sobre escriptura
  if (confirmar) return (
    <div className="modalAuth_fons" onClick={enTancar}>
      <div className="modalAuth_caixa" onClick={(e) => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enTancar}>×</button>
        <h3 className="modalAuth_titol">Sobreescriure?</h3>
        <div className="modalAuth_cos">
          <p className="modalGuardar_avis">
            Ja existeix un programa amb el nom <strong>"{confirmar.nom}"</strong>.
            Vols sobreescriure'l o prefereixes canviar el nom?
          </p>
          {error && <p className="modalAuth_error">{error}</p>}
          <button
            className="modalAuth_boto modalAuth_boto-perill"
            onClick={() => executarGuardar(confirmar._id)}
            disabled={carregant}
          >
            {carregant ? "..." : "Sobreescriure"}
          </button>
          <button
            className="modalAuth_boto"
            onClick={() => setConfirmar(null)}
            disabled={carregant}
          >
            Canviar nom
          </button>
        </div>
      </div>
    </div>
  );

  //modal normal
  return (
    <div className="modalAuth_fons" onClick={enTancar}>
      <div className="modalAuth_caixa" onClick={(e) => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enTancar}>×</button>
        <h3 className="modalAuth_titol">Guardar programa</h3>
        <div className="modalAuth_cos">
          <label className="modalAuth_label">Nom del programa</label>
          <input
            className="modalAuth_input"
            type="text"
            value={nom}
            onChange={(e) => { setNom(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            autoFocus
          />
          {error && <p className="modalAuth_error">{error}</p>}
          <button className="modalAuth_boto" onClick={enviar} disabled={carregant}>
            {carregant ? "..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const CLAU_LLIURES = '_lliures_';

function ModalProgramesGuardats({ enTancar, programes, enCarregar, enEliminar, carregantLlista }) {
  const [seleccio, setSeleccio] = useState(null);

  const lliures  = programes.filter(p => !p.repteId);
  const ambRepte = programes.filter(p => p.repteId);
  const repteIds = [...new Set(ambRepte.map(p => p.repteId))];
  const nomRepte = (id) => REPTES.find(r => r.id === id)?.nom || id;

  const opcions = repteIds.map(id => ({ valor: id, etiqueta: `🏆 ${nomRepte(id)}` }));
  if (lliures.length) opcions.push({ valor: CLAU_LLIURES, etiqueta: '📄 Programes sense repte' });
  const seleccioActiva = seleccio ?? opcions[0]?.valor ?? null;

  const totalProgrames = programes.length;

  const formatData = (g) => g
    ? new Date(Number(g)).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Sense data';

  const partidesDeRepte = (id) => {
    const grups = new Map();
    ambRepte.filter(p => p.repteId === id).forEach(p => {
      const g = p.grup ?? 0;
      if (!grups.has(g)) grups.set(g, []);
      grups.get(g).push(p);
    });
    return [...grups.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([grup, programes]) => ({ data: grup, programes }));
  };

  const filaPrograma = (p) => (
    <li key={p._id} className="programesLlista_item">
      <div className="programesLlista_info">
        <span className="programesLlista_nom">{p.nom}</span>
        <span className="programesLlista_blocs">{p.blocs.length} blocs</span>
      </div>
      <div className="programesLlista_accions">
        <button
          className="programesLlista_boto programesLlista_boto-carregar"
          onClick={() => { enCarregar(p); enTancar(); }}
        >▶ Carregar</button>
        <button
          className="programesLlista_boto programesLlista_boto-eliminar"
          onClick={() => enEliminar(p._id)}
        >🗑</button>
      </div>
    </li>
  );

  return (
    <div className="modalAuth_fons" onClick={enTancar}>
      <div className="modalAuth_caixa modalAuth_caixa-ampla" onClick={(e) => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enTancar}>×</button>
        <h3 className="modalAuth_titol">Els meus programes</h3>
        {carregantLlista ? (
          <p className="modalAuth_info">Carregant...</p>
        ) : totalProgrames === 0 ? (
          <p className="modalAuth_info">No tens cap programa guardat.</p>
        ) : (
          <div className="modalAuth_cos">
            <select
              className="modalAuth_input"
              value={seleccioActiva ?? ''}
              onChange={(e) => setSeleccio(e.target.value)}
            >
              {opcions.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
            </select>

            {seleccioActiva === CLAU_LLIURES ? (
              <ul className="programesLlista">{lliures.map(filaPrograma)}</ul>
            ) : seleccioActiva ? (
              partidesDeRepte(seleccioActiva).map((partida, i) => (
                <div key={partida.data ?? i} className="completioGrup">
                  <p className="completioGrup_titol">🏁 Completat el {formatData(partida.data)}</p>
                  <ul className="programesLlista">{partida.programes.map(filaPrograma)}</ul>
                </div>
              ))
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

//simulador config
function ModalConfiguracio({ enTancar, visibilitat, enAlternar }) {
  const elements = [
    { clau: "peixos",    etiqueta: "Peixos",           icona: "🐠" },
    { clau: "pedres",    etiqueta: "Pedres",           icona: "🪨" },
    { clau: "estrelles", etiqueta: "Estrelles de mar", icona: "⭐" },
    { clau: "algues",    etiqueta: "Algues",           icona: "🌿" },
    { clau: "llums",     etiqueta: "Llums",            icona: "💡" },
  ];
  const ajudes = [
    { clau: "graella", etiqueta: "Quadrícula 3D",        icona: "🧊" },
    { clau: "limits",  etiqueta: "Límits de la piscina", icona: "📐" },
  ];

  const Toggle = ({ clau, etiqueta, icona }) => (
    <button
      type="button"
      className={`configToggle${visibilitat[clau] ? " configToggle-actiu" : ""}`}
      onClick={() => enAlternar(clau)}
    >
      <span className="configToggle_icona">{icona}</span>
      <span className="configToggle_text">{etiqueta}</span>
      <span className="configToggle_estat">{visibilitat[clau] ? "ON" : "OFF"}</span>
    </button>
  );

  return (
    <div className="modalAuth_fons" onClick={enTancar}>
      <div className="modalAuth_caixa" onClick={(e) => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enTancar}>×</button>
        <h3 className="modalAuth_titol">Configuració del simulador</h3>
        <div className="modalAuth_cos">
          <p className="configSeccio">Elements de l'escena</p>
          <div className="configGrid">
            {elements.map((o) => <Toggle key={o.clau} {...o} />)}
          </div>
          <p className="configSeccio">Ajudes visuals</p>
          <div className="configGrid">
            {ajudes.map((o) => <Toggle key={o.clau} {...o} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// velocitat
function ModalVelocitats({ enTancar, velocitats, enDesar, midaCel }) {
  const [horit,  setHorit ] = useState(velocitats.horitzontal);
  const [vert,   setVert  ] = useState(velocitats.vertical);
  const [gir,    setGir   ] = useState(Math.round(velocitats.gir * (180 / Math.PI) * 10) / 10);

  const desar = () => {
    enDesar({ horitzontal: horit, vertical: vert, gir: gir * (Math.PI / 180) });
    enTancar();
  };

  const Camp = ({ label, valor, onChange, min, max, unitat }) => (
    <div className="velCamp">
      <label className="modalAuth_label">{label}</label>
      <div className="velCamp_fila">
        <input type="range" min={min} max={max} value={valor}
          onChange={e => onChange(Number(e.target.value))} className="velCamp_slider" />
        <span className="velCamp_valor">{valor} {unitat}</span>
      </div>
    </div>
  );

  return (
    <div className="modalAuth_fons" onClick={enTancar}>
      <div className="modalAuth_caixa" onClick={e => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enTancar}>×</button>
        <h3 className="modalAuth_titol">Velocitat del simulador</h3>
        <p className="modalVelocitats_info">Mida dels cubs de la graella: <strong>{midaCel} u</strong></p>
        <div className="modalAuth_cos">
          <Camp label="Velocitat horitzontal" valor={horit} onChange={setHorit}
            min={20} max={200} unitat="u/s" />
          <Camp label="Velocitat vertical" valor={vert} onChange={setVert}
            min={10} max={150} unitat="u/s" />
          <Camp label="Angle de gir" valor={gir} onChange={setGir}
            min={5} max={180} unitat="°/s" />
          <button className="modalAuth_boto" onClick={desar}>Aplicar</button>
        </div>
      </div>
    </div>
  );
}

// reptes
function ModalReptes({ enTancar, enIniciar, usuari, millorsResultats = {} }) {
  const [repteAConfigurar, setRepteAConfigurar] = useState(null);
  const [duracioMinuts,    setDuracioMinuts   ] = useState(2);
  const [modeMonedes,      setModeMonedes     ] = useState('totes');
  const [nombreMonedes,    setNombreMonedes   ] = useState(5);
  const [ambObstacles,     setAmbObstacles    ] = useState(false);
  const [zonaBoies,        setZonaBoies       ] = useState('superficie');

  const dificultatStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const formatTemps = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const millorText = (r) => {
    if (r.tipus === 'monedes') {
      const totes = millorsResultats[`${r.id}-totes`];
      const temps = millorsResultats[`${r.id}-temps`];
      const parts = [];
      if (totes != null) parts.push(`🏅 ${formatTemps(totes)}`);
      if (temps != null) parts.push(`🪙 ${temps}`);
      return parts.length ? parts.join(' · ') : null;
    }
    if (r.tipus === 'boies') {
      const sup = millorsResultats[`${r.id}-superficie`];
      const sub = millorsResultats[`${r.id}-submergit`];
      const parts = [];
      if (sup != null) parts.push(`🟢 ${sup}`);
      if (sub != null) parts.push(`🔵 ${sub}`);
      return parts.length ? `🏅 ${parts.join(' · ')}` : null;
    }
    const v = millorsResultats[r.id];
    if (v == null) return null;
    return `🏅 Millor temps: ${formatTemps(v)}`;
  };

  const handleJugar = (r) => {
    if (r.tipus === 'recorregut') { enIniciar(r); enTancar(); return; }
    if (r.tipus === 'boies') {
      setZonaBoies('superficie');
      setDuracioMinuts(Math.round(r.duracioSegons / 60));
    }
    if (r.tipus === 'monedes') {
      setModeMonedes('totes');
      setNombreMonedes(r.nombreMonedes ?? 5);
      setDuracioMinuts(Math.round((r.duracioSegons ?? 120) / 60));
      setAmbObstacles(false);
    }
    setRepteAConfigurar(r);
  };

  const handleConfirmar = () => {
    const r = repteAConfigurar;
    if (r.tipus === 'monedes') {
      const base = { ...r, mode: modeMonedes, obstacles: ambObstacles };
      enIniciar(modeMonedes === 'temps'
        ? { ...base, duracioSegons: duracioMinuts * 60 }
        : { ...base, nombreMonedes });
    } else {
      enIniciar({ ...r, zona: zonaBoies, duracioSegons: duracioMinuts * 60 });
    }
    enTancar();
  };

  if (!usuari) return (
    <div className="modalAuth_fons" onClick={enTancar}>
      <div className="modalAuth_caixa" onClick={e => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enTancar}>×</button>
        <h3 className="modalAuth_titol">Reptes</h3>
        <div className="modalAuth_cos">
          <p className="modalAuth_info">Has d'iniciar sessió per jugar als reptes.</p>
        </div>
      </div>
    </div>
  );

  //configurar reptes
  if (repteAConfigurar) {
    const esMonedes = repteAConfigurar.tipus === 'monedes';
    const esBoies   = repteAConfigurar.tipus === 'boies';
    const SliderTemps = (
      <>
        <label className="modalAuth_label">Temps de joc</label>
        <div className="repteConfig_slider-fila">
          <input
            type="range" min={1} max={15} value={duracioMinuts}
            onChange={e => setDuracioMinuts(Number(e.target.value))}
            className="velCamp_slider"
          />
          <span className="repteConfig_slider-valor">
            {duracioMinuts} {duracioMinuts === 1 ? 'minut' : 'minuts'}
          </span>
        </div>
      </>
    );

    return (
      <div className="modalAuth_fons" onClick={() => setRepteAConfigurar(null)}>
        <div className="modalAuth_caixa" onClick={e => e.stopPropagation()}>
          <button className="modalAuth_tancar" onClick={() => setRepteAConfigurar(null)}>×</button>
          <h3 className="modalAuth_titol">Configurar repte</h3>
          <div className="modalAuth_cos">
            <p className="repteConfig_nom">{repteAConfigurar.nom}</p>

            {esMonedes ? (
              <>
                <label className="modalAuth_label">Mode de joc</label>
                <div className="repteOpcions">
                  <button
                    className={`repteOpcio${modeMonedes === 'totes' ? ' repteOpcio-actiu' : ''}`}
                    onClick={() => setModeMonedes('totes')}
                  >🪙 Totes alhora</button>
                  <button
                    className={`repteOpcio${modeMonedes === 'temps' ? ' repteOpcio-actiu' : ''}`}
                    onClick={() => setModeMonedes('temps')}
                  >⏱ Per temps</button>
                </div>

                {modeMonedes === 'totes' ? (
                  <>
                    <label className="modalAuth_label">Nombre de monedes</label>
                    <select
                      className="modalAuth_input repteConfig_select"
                      value={nombreMonedes}
                      onChange={e => setNombreMonedes(Number(e.target.value))}
                    >
                      {Array.from({ length: 13 }, (_, i) => i + 3).map(n => (
                        <option key={n} value={n}>{n} monedes</option>
                      ))}
                    </select>
                  </>
                ) : SliderTemps}

                <label className="modalAuth_label">Dificultat</label>
                <div className="repteOpcions">
                  <button
                    className={`repteOpcio${!ambObstacles ? ' repteOpcio-actiu' : ''}`}
                    onClick={() => setAmbObstacles(false)}
                  >Sense obstacles</button>
                  <button
                    className={`repteOpcio${ambObstacles ? ' repteOpcio-actiu' : ''}`}
                    onClick={() => setAmbObstacles(true)}
                  >Amb obstacles</button>
                </div>
              </>
            ) : esBoies ? (
              <>
                <label className="modalAuth_label">Zona de les boies</label>
                <div className="repteOpcions">
                  <button
                    className={`repteOpcio${zonaBoies === 'superficie' ? ' repteOpcio-actiu' : ''}`}
                    onClick={() => setZonaBoies('superficie')}
                  >🟢 Superfície</button>
                  <button
                    className={`repteOpcio${zonaBoies === 'submergit' ? ' repteOpcio-actiu' : ''}`}
                    onClick={() => setZonaBoies('submergit')}
                  >🔵 Submergides</button>
                </div>
                {SliderTemps}
              </>
            ) : SliderTemps}

            <button className="modalAuth_boto" onClick={handleConfirmar}>▶ Jugar</button>
            <button
              className="modalAuth_boto modalAuth_boto-secundari"
              onClick={() => setRepteAConfigurar(null)}
            >← Tornar</button>
          </div>
        </div>
      </div>
    );
  }

  // llista de reptes
  return (
    <div className="modalAuth_fons" onClick={enTancar}>
      <div className="modalAuth_caixa modalAuth_caixa-ampla" onClick={e => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enTancar}>×</button>
        <h3 className="modalAuth_titol">Reptes</h3>
        <div className="modalAuth_cos">
          <ul className="reptes_llista">
            {REPTES.map(r => (
              <li key={r.id} className="reptes_item">
                <div className="reptes_info">
                  <span className="reptes_nom">{r.nom}</span>
                  <span className="reptes_dif">{dificultatStr(r.dificultat)}</span>
                  <span className="reptes_desc">{r.descripcio}</span>
                </div>
                <div className="reptes_accio">
                  {millorText(r) && (
                    <span className="reptes_millorTemps">{millorText(r)}</span>
                  )}
                  <button className="programesLlista_boto programesLlista_boto-carregar"
                    onClick={() => handleJugar(r)}>
                    Jugar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// repte completat
function ModalRepteCompletat({ repte, temps, numProgrames, numBoies, numMonedes, potGuardar, enGuardarITancar, enTancarSenseGuardar }) {
  const esBoies        = repte.tipus === 'boies';
  const esMonedesTemps = repte.tipus === 'monedes' && repte.mode === 'temps';
  const esMonedesTotes = repte.tipus === 'monedes' && repte.mode === 'totes';
  const perTemps       = esBoies || esMonedesTemps;   // reptes amb compte enrere
  const min = String(Math.floor(temps / 60)).padStart(2, '0');
  const sec = String(temps % 60).padStart(2, '0');
  return (
    <div className="modalAuth_fons">
      <div className="modalAuth_caixa" onClick={e => e.stopPropagation()}>
        <h3 className="modalAuth_titol">
          {esMonedesTotes ? '🏆 Tresor recollit!' : perTemps ? '⏱ Temps esgotat!' : '🏆 Repte completat!'}
        </h3>
        <div className="modalAuth_cos">
          <p className="modalRepteCompletat_nom">{repte.nom}</p>
          <div className="modalRepteCompletat_stats">
            {esBoies        && <div><span>Boies tocades</span><strong>{numBoies}</strong></div>}
            {esMonedesTemps && <div><span>Monedes recollides</span><strong>{numMonedes}</strong></div>}
            {esMonedesTotes && <div><span>Temps</span><strong>{min}:{sec}</strong></div>}
            {!perTemps && !esMonedesTotes && <div><span>Temps</span><strong>{min}:{sec}</strong></div>}
            <div><span>Programes executats</span><strong>{numProgrames}</strong></div>
          </div>
          {potGuardar ? (
            <>
              <button className="modalAuth_boto" onClick={enGuardarITancar}>
                💾 Tornar a l'inici guardant els programes
              </button>
              <button className="modalAuth_boto modalAuth_boto-secundari" onClick={enTancarSenseGuardar}>
                Tornar a l'inici sense guardar
              </button>
            </>
          ) : (
            <button className="modalAuth_boto" onClick={enTancarSenseGuardar}>Tornar a l'inici</button>
          )}
        </div>
      </div>
    </div>
  );
}

// Selector d'ESP previ a la calibració
function ModalSeleccionarEsp({ enTancar, enSeleccionar, token }) {
  const [llista,      setLlista     ] = useState([]);
  const [carregant,   setCarregant  ] = useState(true);
  const [seleccionat, setSeleccionat] = useState("");
  const [nouNom,      setNouNom     ] = useState("");
  const [error,       setError      ] = useState("");

  useEffect(() => {
    fetch("/.netlify/functions/esp", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setLlista(d); })
      .catch(() => {})
      .finally(() => setCarregant(false));
  }, [token]);

  const continuar = () => {
    if (seleccionat === "_nou_") {
      const nom = nouNom.trim();
      if (!nom) { setError("Escriu un nom per al robot."); return; }
      if (llista.some((e) => e.nom.toLowerCase() === nom.toLowerCase())) {
        setError("Ja existeix un ESP amb aquest nom. Tria'l de la llista."); return;
      }
      enSeleccionar(nom);
    } else if (seleccionat) {
      enSeleccionar(seleccionat);
    } else {
      setError("Selecciona un ESP o crea'n un de nou.");
    }
  };

  const meus   = llista.filter((e) => e.meu);
  const altres = llista.filter((e) => !e.meu);

  return (
    <div className="modalAuth_fons" onClick={enTancar}>
      <div className="modalAuth_caixa" onClick={(e) => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enTancar}>×</button>
        <h3 className="modalAuth_titol">Quin robot vols calibrar?</h3>
        <div className="modalAuth_cos">
          <p className="calib_info">
            Tria el teu ESP de la llista si ja l'has fet servir abans, o crea'n un de nou
            amb un nom identificatiu únic. Així podràs recuperar la seva calibració des de
            qualsevol ordinador.
          </p>
          {carregant ? (
            <p className="modalAuth_info">Carregant...</p>
          ) : (
            <>
              <label className="modalAuth_label">ESP registrats</label>
              <select
                className="modalAuth_input"
                value={seleccionat}
                onChange={(e) => { setSeleccionat(e.target.value); setError(""); }}
              >
                <option value="">-- Selecciona un ESP --</option>
                {meus.length > 0 && (
                  <optgroup label="Els meus">
                    {meus.map((e) => <option key={e._id} value={e.nom}>{e.nom}</option>)}
                  </optgroup>
                )}
                {altres.length > 0 && (
                  <optgroup label={meus.length > 0 ? "Altres ESP" : "ESP registrats"}>
                    {altres.map((e) => <option key={e._id} value={e.nom}>{e.nom}</option>)}
                  </optgroup>
                )}
                <option value="_nou_">➕ Nou ESP...</option>
              </select>
              {seleccionat === "_nou_" && (
                <input
                  className="modalAuth_input"
                  placeholder="Nom del robot (ex: ROV-1)"
                  value={nouNom}
                  onChange={(e) => { setNouNom(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && continuar()}
                  autoFocus
                />
              )}
              {error && <p className="modalAuth_error">{error}</p>}
              <button className="modalAuth_boto" onClick={continuar}>Continuar →</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal de calibració de moviments d'un ESP32
function ModalCalibracio({ enTancar, espNom, calibracio, enDesar, enProvar, btConnectat }) {
  const [cal,         setCal        ] = useState(() => ({ ...CALIBRACIO_DEFECTE, ...calibracio }));
  const [desant,      setDesant     ] = useState(false);
  const [arrossegant, setArrossegant] = useState(null);

  const fitxaDe   = (cmd) => MOVIMENTS_CALIBRABLES.find((m) => m.cmd === cmd);
  const assignar  = (rowCmd, nouCmd) => setCal((c) => ({ ...c, [rowCmd]: nouCmd }));
  const resetFila = (rowCmd) => setCal((c) => ({ ...c, [rowCmd]: rowCmd }));

  const desar = async () => {
    setDesant(true);
    try { await enDesar(cal); enTancar(); }
    finally { setDesant(false); }
  };

  return (
    <div className="modalAuth_fons" onClick={enTancar}>
      <div className="modalAuth_caixa modalAuth_caixa-ampla" onClick={(e) => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enTancar}>×</button>
        <h3 className="modalAuth_titol">Calibració · {espNom}</h3>
        <div className="modalAuth_cos">
          <p className="calib_info">
            Prova cada moviment amb el botó ▶. Si el robot en fa un altre, arrossega la
            fitxa correcta a la seva dreta per indicar quina ordre s'ha d'enviar realment.
          </p>

          <ul className="calibLlista">
            {MOVIMENTS_CALIBRABLES.map((m) => {
              const actual   = cal[m.cmd] || m.cmd;
              const correcte = actual === m.cmd;
              const fitxaAct = fitxaDe(actual);
              return (
                <li key={m.cmd} className="calibFila">
                  <div
                    className="calibFila_origen"
                    draggable
                    onDragStart={(e) => { setArrossegant(m.cmd); e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/plain", m.cmd); }}
                    onDragEnd={() => setArrossegant(null)}
                    title={`Arrossega «${m.nom}» cap a un altre moviment`}
                  >
                    <img src={m.img} alt="" className="calibFitxa_img" draggable="false" />
                    <span className="calibFila_nom">{m.nom}</span>
                  </div>

                  <span className="calibFila_fletxa">→</span>

                  <div
                    className={`calibFila_desti ${correcte ? "calibFila_desti-ok" : "calibFila_desti-remap"}${arrossegant ? " calibFila_desti-actiu" : ""}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const c = e.dataTransfer.getData("text/plain") || arrossegant;
                      if (c) assignar(m.cmd, c);
                      setArrossegant(null);
                    }}
                  >
                    {correcte ? (
                      <span className="calibFila_ok">✓ Correcte</span>
                    ) : (
                      <>
                        <img src={fitxaAct.img} alt="" className="calibFitxa_img" draggable="false" />
                        <span className="calibFila_nom">{fitxaAct.nom}</span>
                      </>
                    )}
                  </div>

                  <button className="calibFila_provar" onClick={() => enProvar(m.cmd, cal)} disabled={!btConnectat} title="Provar al robot">▶</button>
                  {!correcte && (
                    <button className="calibFila_reset" onClick={() => resetFila(m.cmd)} title="Restablir aquest moviment">↺</button>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="calib_accions">
            <button className="modalAuth_boto modalAuth_boto-secundari" onClick={() => setCal({ ...CALIBRACIO_DEFECTE })}>↺ Restablir tot</button>
            <button className="modalAuth_boto" onClick={desar} disabled={desant}>{desant ? "..." : "💾 Guardar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Primera visita: convida a registrar-se
function ModalBenvinguda({ enRegistrar, enSaltar }) {
  return (
    <div className="modalAuth_fons" onClick={enSaltar}>
      <div className="modalAuth_caixa" onClick={(e) => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enSaltar}>×</button>
        <h3 className="modalAuth_titol">Hola! Benvingut/da al TeleROV 🐠</h3>
        <div className="modalAuth_cos">
          <p className="tutorial_text">
            Si et registres podràs guardar els teus programes i jugar als reptes. És molt
            ràpid, només necessites:
          </p>
          <ul className="benvinguda_llista">
            <li>🏫 La teva escola</li>
            <li>😀 El teu nom</li>
            <li>👤 Un nom d'usuari</li>
            <li>🔒 Una contrasenya</li>
          </ul>
          <button className="modalAuth_boto" onClick={enRegistrar}>Registrar-me</button>
          <button className="modalAuth_boto modalAuth_boto-secundari" onClick={enSaltar}>Ara no, gràcies</button>
        </div>
      </div>
    </div>
  );
}

// Mini tutorial d'introducció a l'aplicació
function ModalTutorial({ enTancar }) {
  const [pas, setPas] = useState(0);

  const blocsTutorial = [
    { img: banderaImg,     nom: "Començar" },
    { img: finalImg,       nom: "Acabar" },
    { img: dretaImg,       nom: "Avançar" },
    { img: esquerraImg,    nom: "Retrocedir" },
    { img: daltImg,        nom: "Pujar" },
    { img: baixImg,        nom: "Baixar" },
    { img: girDretaImg,    nom: "Girar dreta" },
    { img: girEsquerraImg, nom: "Girar esquerra" },
  ];

  const passos = [
    (
      <div key="0">
        <h3 className="modalAuth_titol">Aprèn a programar jugant! 🎮</h3>
        <p className="tutorial_text">
          Aquí faràs programes ajuntant blocs, i un robot submarí els farà de veritat: es
          mourà per l'aigua tal com tu li diguis. Tu manes! 🐙
        </p>
      </div>
    ),
    (
      <div key="1">
        <h3 className="modalAuth_titol">Els blocs 🧩</h3>
        <p className="tutorial_text">
          Cada bloc és una ordre. Els poses en ordre i el robot els fa un darrere l'altre:
        </p>
        <div className="ajuda_llegenda">
          {blocsTutorial.map((b) => (
            <div className="ajuda_llegenda_item" key={b.nom}>
              <img src={b.img} alt="" /><span>{b.nom}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    (
      <div key="2">
        <h3 className="modalAuth_titol">Els reptes 🏆</h3>
        <p className="tutorial_text">També pots superar reptes programant. Per exemple:</p>
        <ul className="tutorial_reptes">
          <li>✏️ Dibuixar un quadrat sota l'aigua</li>
          <li>🟢 Caçar boies</li>
          <li>🪙 Recollir les monedes d'or d'un vaixell enfonsat</li>
        </ul>
        <p className="tutorial_broma">
          Ah, i una última cosa... els peixos NO es poden atrapar. Ni ho intentis! 🐠😜
        </p>
      </div>
    ),
  ];

  const ultim = pas === passos.length - 1;

  return (
    <div className="modalAuth_fons">
      <div className="modalAuth_caixa modalAuth_caixa-ampla" onClick={(e) => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enTancar}>×</button>
        <div className="modalAuth_cos">
          {passos[pas]}
          <div className="tutorial_punts">
            {passos.map((_, i) => (
              <span key={i} className={`tutorial_punt${i === pas ? " tutorial_punt-actiu" : ""}`} />
            ))}
          </div>
          <div className="tutorial_nav">
            {pas > 0 && (
              <button className="modalAuth_boto modalAuth_boto-secundari" onClick={() => setPas(pas - 1)}>← Enrere</button>
            )}
            {ultim
              ? <button className="modalAuth_boto" onClick={enTancar}>A jugar! 🎮</button>
              : <button className="modalAuth_boto" onClick={() => setPas(pas + 1)}>Següent →</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Explicació ràpida en començar un repte
function ModalRepteInfo({ enTancar }) {
  return (
    <div className="modalAuth_fons" onClick={enTancar}>
      <div className="modalAuth_caixa" onClick={(e) => e.stopPropagation()}>
        <button className="modalAuth_tancar" onClick={enTancar}>×</button>
        <h3 className="modalAuth_titol">Abans de començar 🗺️</h3>
        <div className="modalAuth_cos">
          <p className="tutorial_text">
            El mar està dividit en caselles, com un tauler. Cada bloc de moviment mou el
            robot <strong>mitja casella</strong>.
          </p>
          <div className="ajuda_avis ajuda_avis-info">
            👉 Per moure el robot <strong>una casella sencera</strong>, posa-li un
            <strong> 2</strong> (2 segons). El número del bloc és el <strong>temps</strong> que
            dura el moviment!
          </div>
          <button className="modalAuth_boto" onClick={enTancar}>Entesos! 👍</button>
        </div>
      </div>
    </div>
  );
}

// Explicació de velocitats i quadrícula, compartida entre l'ajuda general i la dels reptes
function AjudaVelocitats({ titol = "⚡ Velocitats i quadrícula" }) {
  return (
    <>
      <h4 className="ajuda_titol">{titol}</h4>
      <p className="ajuda_text">
        El mar està dividit en <strong>caselles</strong>, com un tauler. Normalment el robot
        avança <strong>mitja casella cada segon</strong>.
      </p>
      <div className="ajuda_avis ajuda_avis-info">
        👉 Per avançar <strong>una casella sencera</strong>, el robot s'ha de moure
        <strong> 2 segons</strong>. Per exemple: el bloc «avançar» amb un <strong>2</strong>,
        o dos blocs «avançar» amb un <strong>1</strong>.
      </div>
      <ul className="ajuda_passos">
        <li>El número del bloc són els <strong>segons</strong> que es mou el robot.</li>
        <li>Per girar i quedar mirant a un costat (un quart de volta), posa un <strong>2</strong> al bloc de girar.</li>
        <li>Vols que vagi més ràpid o més a poc a poc? Canvia-ho amb el botó <strong>⚡ Vel.</strong></li>
      </ul>
    </>
  );
}

// Ajuda del repte que s'està jugant
function ContingutAjudaRepte({ repte }) {
  if (!repte) return null;
  const dif = "★".repeat(repte.dificultat) + "☆".repeat(3 - repte.dificultat);

  const consells = {
    recorregut: [
      "Segueix les línies grogues amb el robot.",
      "Toca totes les boletes del camí: quan en toques una, es torna verda 🟢.",
      "Primer baixa el robot fins a les línies i després ves seguint-les fins al final.",
    ],
    boies: [
      "Porta el robot fins a la boia i toca-la.",
      "Quan en toques una, en surt una altra en un altre lloc.",
      "Toca'n tantes com puguis abans que s'acabi el temps! ⏱",
    ],
    monedes: [
      "Entra dins del vaixell enfonsat amb el robot.",
      "Passa per sobre de les monedes 🪙 per agafar-les.",
      "Agafa'n tantes com puguis, ràpid! Si has posat obstacles, vigila no xocar-hi.",
    ],
  };
  const passos = consells[repte.tipus] || [];

  return (
    <div className="ajuda">
      <p className="ajuda_intro">
        <strong>{repte.nom}</strong> <span className="ajudaRepte_dif">{dif}</span><br />
        {repte.descripcio}
      </p>

      <h4 className="ajuda_titol">🎯 Com superar-lo</h4>
      <ul className="ajuda_passos">
        {passos.map((c, i) => <li key={i}>{c}</li>)}
      </ul>

      <AjudaVelocitats />

      <p className="ajuda_nota">
        Quan acabis pots <strong>guardar</strong> els teus programes per tornar-los a fer
        servir. Si t'equivoques, clica <strong>↺ Reset</strong> per començar de nou.
      </p>
    </div>
  );
}

// Contingut de la finestra d'Ajuda
function ContingutAjuda() {
  const blocsLlegenda = [
    { img: banderaImg,     nom: "Iniciar (bandera verda)" },
    { img: finalImg,       nom: "Finalitzar (bandera vermella)" },
    { img: dretaImg,       nom: "Avançar" },
    { img: esquerraImg,    nom: "Retrocedir" },
    { img: daltImg,        nom: "Pujar" },
    { img: baixImg,        nom: "Baixar" },
    { img: girDretaImg,    nom: "Girar a la dreta" },
    { img: girEsquerraImg, nom: "Girar a l'esquerra" },
    { img: esperaImg,      nom: "Esperar" },
    { img: repeteixImgIni, nom: "Repetir: inici" },
    { img: repeteixImgFi,  nom: "Repetir: final" },
  ];

  const controlsCamera = [
    { ic: "◀ ▶", txt: "Gira la càmera al voltant del robot" },
    { ic: "👁",  txt: "Mira el robot de costat, des de dalt o des de baix" },
    { ic: "🎥",  txt: "La càmera segueix el robot. Clica-la perquè es quedi quieta" },
    { ic: "⌨",  txt: "Mou el robot amb el teclat (tecles W A S D i les fletxes)" },
    { ic: "📍",  txt: "Posa el robot on vulguis" },
    { ic: "🤖",  txt: "Mira com si fossis dins del robot" },
    { ic: "⚙️",  txt: "Tria què es veu al simulador" },
  ];

  return (
    <div className="ajuda">
      <p className="ajuda_intro">
        Amb el <strong>TeleROV</strong> mous un robot submarí! 🐠 Ajuntes blocs per fer un
        programa, el proves al simulador i, si tens el robot de veritat, l'hi pots enviar.
      </p>

      <h4 className="ajuda_titol">🧩 1. Crea el teu programa</h4>
      <svg className="ajuda_dibuix" viewBox="0 0 360 152" xmlns="http://www.w3.org/2000/svg"
           role="img" aria-label="Arrossega els blocs cap a l'espai de programació">
        <rect x="12" y="20" width="96" height="116" rx="10" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.18)" />
        <text x="60" y="38" textAnchor="middle" fill="#90caf9" fontSize="11" fontWeight="700">Blocs</text>
        <rect x="26" y="48" width="32" height="32" rx="7" fill="#43a047" />
        <rect x="62" y="48" width="32" height="32" rx="7" fill="#1e88e5" />
        <rect x="26" y="88" width="32" height="32" rx="7" fill="#fb8c00" />
        <rect x="62" y="88" width="32" height="32" rx="7" fill="#8e24aa" />
        <path d="M120 78 H160" stroke="#4fc3f7" strokeWidth="3" fill="none" strokeDasharray="6 5" />
        <path d="M156 70 L172 78 L156 86 Z" fill="#4fc3f7" />
        <rect x="190" y="20" width="158" height="116" rx="10" fill="rgba(41,182,246,0.06)" stroke="rgba(41,182,246,0.3)" />
        <text x="269" y="38" textAnchor="middle" fill="#90caf9" fontSize="11" fontWeight="700">Programa</text>
        <rect x="206" y="46" width="126" height="20" rx="5" fill="#2e7d32" />
        <text x="269" y="60" textAnchor="middle" fill="#fff" fontSize="10">🏁 iniciar</text>
        <rect x="206" y="70" width="126" height="20" rx="5" fill="#1565c0" />
        <text x="269" y="84" textAnchor="middle" fill="#fff" fontSize="10">avançar · 2</text>
        <rect x="206" y="94" width="126" height="20" rx="5" fill="#1565c0" />
        <text x="269" y="108" textAnchor="middle" fill="#fff" fontSize="10">girar dreta</text>
        <rect x="206" y="118" width="126" height="16" rx="5" fill="#c62828" />
        <text x="269" y="130" textAnchor="middle" fill="#fff" fontSize="9">finalitzar</text>
      </svg>
      <ol className="ajuda_passos">
        <li>Agafa un bloc i <strong>arrossega'l</strong> cap a l'espai del programa. També pots <strong>clicar-lo</strong>.</li>
        <li>Comença sempre amb la <strong>bandera verda</strong> 🟢 i acaba amb la <strong>vermella</strong> 🔴.</li>
        <li>El <strong>número</strong> del bloc diu quants segons dura el moviment.</li>
        <li>Per treure un bloc, clica la <strong>×</strong>. Per esborrar-ho tot, fes servir la paperera 🗑.</li>
      </ol>

      <div className="ajuda_llegenda">
        {blocsLlegenda.map((b) => (
          <div className="ajuda_llegenda_item" key={b.nom}>
            <img src={b.img} alt="" />
            <span>{b.nom}</span>
          </div>
        ))}
      </div>

      <h4 className="ajuda_titol">▶ 2. Prova-ho al simulador</h4>
      <p className="ajuda_text">
        Clica <strong>Simular</strong> (o la bandera verda) i veuràs el robot moure's a la
        pantalla. Així saps si el teu programa funciona. Si no tens cap robot connectat, el
        botó gros posa <strong>Simular</strong>.
      </p>
      <ul className="ajuda_passos">
        <li><strong>▶ Simular</strong> — fa anar el robot.</li>
        <li><strong>⏹ Stop</strong> — atura el robot.</li>
        <li><strong>↺ Reset</strong> — torna el robot al principi.</li>
        <li><strong>⚡ Vel.</strong> — canvia la velocitat del robot.</li>
      </ul>

      <h5 className="ajuda_subtitol">Moure la càmera</h5>
      <div className="ajuda_llegenda">
        {controlsCamera.map((c) => (
          <div className="ajuda_llegenda_item ajuda_llegenda_item-ample" key={c.txt}>
            <span className="ajuda_icona">{c.ic}</span>
            <span>{c.txt}</span>
          </div>
        ))}
      </div>
      <p className="ajuda_nota">També pots moure la càmera <strong>arrossegant</strong> amb el ratolí, i amb la <strong>rodeta</strong> l'apropes o l'allunyes.</p>

      <AjudaVelocitats titol="⚡ 3. Velocitats i quadrícula" />

      <h4 className="ajuda_titol">🤖 4. Connecta el robot real</h4>
      <div className="ajuda_avis">
        ⚠️ Per moure el robot de <strong>veritat</strong> l'has de tenir encès i a punt (amb la
        peça <strong>ESP32</strong>). Si no en tens, no passa res: pots fer servir el simulador igualment!
      </div>
      <svg className="ajuda_dibuix" viewBox="0 0 360 124" xmlns="http://www.w3.org/2000/svg"
           role="img" aria-label="L'aplicació es connecta per Bluetooth a l'ESP32, que controla el robot">
        <rect x="14" y="40" width="66" height="40" rx="4" fill="#263238" stroke="#90caf9" strokeWidth="1.5" />
        <rect x="8" y="80" width="78" height="6" rx="2" fill="#90caf9" />
        <text x="47" y="102" textAnchor="middle" fill="#b0bec5" fontSize="10">App TeleROV</text>
        <text x="120" y="56" textAnchor="middle" fontSize="20">📡</text>
        <text x="120" y="100" textAnchor="middle" fill="#4fc3f7" fontSize="9" fontWeight="700">Bluetooth</text>
        <rect x="150" y="44" width="62" height="36" rx="4" fill="#1b5e20" stroke="#66bb6a" strokeWidth="1.5" />
        <text x="181" y="66" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">ESP32</text>
        <text x="181" y="100" textAnchor="middle" fill="#b0bec5" fontSize="10">Controlador</text>
        <path d="M220 62 H252" stroke="#4fc3f7" strokeWidth="3" fill="none" strokeDasharray="6 5" />
        <path d="M248 54 L262 62 L248 70 Z" fill="#4fc3f7" />
        <rect x="270" y="44" width="76" height="40" rx="12" fill="#ffd600" />
        <circle cx="292" cy="60" r="6" fill="#fff" /><circle cx="293" cy="61" r="3" fill="#111" />
        <circle cx="316" cy="60" r="6" fill="#fff" /><circle cx="317" cy="61" r="3" fill="#111" />
        <text x="308" y="102" textAnchor="middle" fill="#b0bec5" fontSize="10">Robot (ROV)</text>
      </svg>
      <ol className="ajuda_passos">
        <li>Encén el robot.</li>
        <li>A dalt a la dreta, clica el botó <strong>📡 Bluetooth</strong>.</li>
        <li>Tria <strong>TeleROV</strong> a la llista que apareix.</li>
        <li>Quan vegis <strong>🔵 Connectat</strong>, clica <strong>Enviar al ROV</strong> i el robot farà el teu programa! 🎉</li>
      </ol>
      <p className="ajuda_nota">El Bluetooth funciona amb <strong>Chrome</strong> o <strong>Edge</strong> a l'ordinador o a l'Android. Als iPhone i iPad no va.</p>
    </div>
  );
}

// main
export default function App() {
  const { usuari, carregant: carregantAuth, registrar, login, actualitzarPerfil, logout } = useAuth();

  const {
    repteActiu, tempsTranscorregut, tempsRestant, programesRepte, checkpointsAssolits,
    boiesTocades, posicioBoia, monedes, monedesRecollides, posicioInicial: posicioInicialRepte,
    completat: repteCompletat, millorsResultats, iniciarRepte, acabarRepte, reiniciarRepte,
    afegirProgramaRepte, marcarCheckpoint, tocarBoia, recollirMoneda, registrarResultat,
  } = useRepte(usuari?.token ?? null);
  const { programes, carregarProgrames, guardarPrograma, guardarPartidaRepte, actualitzarPrograma, eliminarPrograma }
    = useProgrames(usuari?.token);
  const { calibracio, espNom, seleccionarEsp, desarCalibracio, reiniciarEsp } = useEsp(usuari?.token);

  const [ajudaOberta,    setAjudaOberta   ] = useState(false);
  const [ajudaRepteOberta, setAjudaRepteOberta] = useState(false);
  const [modalBenvingudaObert, setModalBenvingudaObert] = useState(false);
  const [tutorialObert,        setTutorialObert       ] = useState(false);
  const [modalRepteInfoObert,  setModalRepteInfoObert ] = useState(false);
  const [mostrarTutorialDespres, setMostrarTutorialDespres] = useState(false);
  const [authPestanya,         setAuthPestanya        ] = useState("login");
  const [sobreObert,     setSobreObert    ] = useState(false);
  const [seqOberta,      setSeqOberta     ] = useState(false);
  const [programa,       setPrograma      ] = useState([]);
  const [dragInfo,       setDragInfo      ] = useState(null);
  const [slotActiu,      setSlotActiu     ] = useState(null);
  const [dragGhost,      setDragGhost     ] = useState(null);
  const [avisPrograma,   setAvisPrograma  ] = useState("");
  const [sequenciaRobot, setSequenciaRobot] = useState([]);
  const [resetSignal,    setResetSignal   ] = useState(0);
  const [estatSimulador, setEstatSimulador] = useState("idle");
  const [btConnectat,    setBtConnectat   ] = useState(false);
  const [toastBt,        setToastBt       ] = useState(false);
  const [toastBtText,    setToastBtText   ] = useState("");
  const [instanciaActiva,  setInstanciaActiva ] = useState(null);
  const [robotExecutant,   setRobotExecutant  ] = useState(false);

  const [modalAuthObert,    setModalAuthObert   ] = useState(false);
  const [modalGuardarObert, setModalGuardarObert] = useState(false);
  const [modalProgramesObert, setModalProgramesObert] = useState(false);
  const [carregantProgrames,  setCarregantProgrames ] = useState(false);
  const [modalPerfilObert,   setModalPerfilObert  ] = useState(false);
  const [modalVelocitatObert,setModalVelocitatObert] = useState(false);
  const [modalReptesObert,   setModalReptesObert  ] = useState(false);
  const [modalEspObert,        setModalEspObert       ] = useState(false);
  const [modalCalibracioObert, setModalCalibracioObert] = useState(false);

  const VELOCITATS_DEFECTE = { horitzontal: 50, vertical: 50, gir: Math.PI / 4 };
  const [velocitats,          setVelocitats         ] = useState(VELOCITATS_DEFECTE);
  const [velocitatsPreviesRepte, setVelocitatsPreviesRepte] = useState(null);
  const refRepteSignal = useRef(0);
  const [repteSignal,  setRepteSignal ] = useState(0);


  const [modalConfigObert, setModalConfigObert] = useState(false);
  const [visibilitat, setVisibilitat] = useState({
    peixos: true, pedres: true, estrelles: true, algues: true, llums: true, graella: false, limits: false,
  });
  const alternarVisibilitat = (clau) => setVisibilitat((v) => ({ ...v, [clau]: !v[clau] }));

  const refBtDispositiu     = useRef(null);
  const refTimerSeguiment   = useRef(null);
  const refSimulador        = useRef(null);
  const refBtCaracteristica = useRef(null);
  const refTimerToastBt     = useRef(null);
  const refTouchDrag        = useRef(null);

  const mostrarToastBt = useCallback((text) => {
    setToastBtText(text);
    setToastBt(true);
    clearTimeout(refTimerToastBt.current);
    refTimerToastBt.current = setTimeout(() => setToastBt(false), 3000);
  }, []);

  const connectarBluetooth = async () => {
    if (!navigator.bluetooth) { mostrarToastBt("⚠️ Aquest navegador no suporta Bluetooth"); return; }
    try {
      const dispositiu = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: "TeleROV" },
        ],
        optionalServices: [BT_SERVICE_UUID],
      });
      refBtDispositiu.current = dispositiu;
      dispositiu.addEventListener("gattserverdisconnected", () => {
        setBtConnectat(false); refBtCaracteristica.current = null; refBtDispositiu.current = null;
        reiniciarEsp();
        mostrarToastBt("🔌 Robot desconnectat");
      });
      const servidor       = await dispositiu.gatt.connect();
      const servei         = await servidor.getPrimaryService(BT_SERVICE_UUID);
      const caracteristica = await servei.getCharacteristic(BT_CHAR_UUID);
      refBtCaracteristica.current = caracteristica;
      setBtConnectat(true); mostrarToastBt("Robot connectat!");
    } catch (err) {
      if (err.name !== "NotFoundError") mostrarToastBt("❌ Error de connexió Bluetooth");
    }
  };

  const desconnectarBluetooth = () => {
    if (refBtDispositiu.current?.gatt?.connected) refBtDispositiu.current.gatt.disconnect();
    setBtConnectat(false); refBtCaracteristica.current = null; refBtDispositiu.current = null;
    reiniciarEsp();
    mostrarToastBt("🔌 Robot desconnectat");
  };

  const iniciarSeguimentExecucio = (sequencia) => {
    clearTimeout(refTimerSeguiment.current);
    const mapa = new Set(["pujar","baixar","avançar","retrocedir","gira-dreta","gira-esquerra","espera"]);
    const passos = sequencia.filter(p => mapa.has(p.tipus));
    let i = 0;
    const executarSeguent = () => {
      if (i >= passos.length) { setInstanciaActiva(null); setRobotExecutant(false); mostrarToastBt("✅ Seqüència completada!"); return; }
      const pas = passos[i];
      const instanciaId = programa[pas.programaIndex]?.instanciaId ?? null;
      setInstanciaActiva(instanciaId);
      mostrarToastBt(`▶ ${pas.nom}${pas.valor ? ` · ${pas.valor}s` : ""}`);
      refTimerSeguiment.current = setTimeout(() => { i++; executarSeguent(); }, (pas.valor || 1) * 1000);
    };
    executarSeguent();
  };

  const enviarBrut = async (sequencia) => {
    const car = refBtCaracteristica.current; if (!car) return;
    const bytes = new TextEncoder().encode(sequencia.join(""));
    for (let i = 0; i < bytes.length; i += BT_MTU)
      await car.writeValueWithoutResponse(bytes.slice(i, i + BT_MTU));
  };
  // El que s'envia sempre al robot és la seqüència passada per la calibració de l'ESP
  const enviarSequencia = (sequencia) => enviarBrut(aplicarCalibracio(sequencia, calibracio));

  const analisiBucles = useMemo(() => analitzarBucles(programa), [programa]);

  const sequenciaCompilada = useMemo(() => {
    if (!analisiBucles.valid) return [];
    return expandirPrograma(programa, analisiBucles.metaPerIndex).map((bloc, index) => ({
      ordre: index + 1, tipus: bloc.tipus, nom: bloc.nom, valor: bloc.valor,
      programaIndex: bloc.programaIndex,
    }));
  }, [programa, analisiBucles]);

  const aplicarCanviPrograma = (nouPrograma) => {
    const v = validarPrograma(nouPrograma);
    if (!v.valid) { setAvisPrograma(v.missatge); return false; }
    setPrograma(nouPrograma); setAvisPrograma(""); return true;
  };

  const inserirBlocEnPosicio = (blocBase, index) => {
    const p = [...programa]; p.splice(index, 0, crearBlocPrograma(blocBase)); aplicarCanviPrograma(p);
  };

  // Click bloc
  const clicarBlocPaleta = (blocBase) => {
    if (blocBase.tipus === "bandera") {
      const p = [crearBlocPrograma(blocBase), ...programa];
      aplicarCanviPrograma(p);
    } else if (blocBase.tipus === "final") {
      const p = [...programa, crearBlocPrograma(blocBase)];
      aplicarCanviPrograma(p);
    } else {
      const teFinal = programa.length > 0 && programa[programa.length - 1].tipus === "final";
      const index = teFinal ? programa.length - 1 : programa.length;
      const p = [...programa];
      p.splice(index, 0, crearBlocPrograma(blocBase));
      aplicarCanviPrograma(p);
    }
  };

  const canviarValorBlocPrograma = (instanciaId, nouValor) => {
    const val = Number.isNaN(nouValor) ? 1 : Math.max(1, nouValor);
    setPrograma((prev) => prev.map((b) => b.instanciaId === instanciaId ? { ...b, valor: val } : b));
  };

  const eliminarBlocPrograma = (instanciaId) =>
    aplicarCanviPrograma(programa.filter((b) => b.instanciaId !== instanciaId));

  const programaBuit = () => {
    setPrograma([]); setAvisPrograma(""); setSequenciaRobot([]);
  };

  const programaAmbBanderes = () => {
    const bandera = crearBlocPrograma(BLOCS_BASE.find(b => b.tipus === "bandera"));
    const final   = crearBlocPrograma(BLOCS_BASE.find(b => b.tipus === "final"));
    setPrograma([bandera, final]); setAvisPrograma(""); setSequenciaRobot([]);
  };

  const esborrarPrograma = () => {
    if (repteActiu) programaAmbBanderes();
    else            programaBuit();
  };

  useEffect(() => {
    if (analisiBucles.valid) setSequenciaRobot(traduirASecuenciaRobot(sequenciaCompilada));
    else                     setSequenciaRobot([]);
  }, [sequenciaCompilada, analisiBucles.valid]);

  // Seqüència que s'envia al robot (la calibrada)
  const sequenciaCalibrada = useMemo(
    () => aplicarCalibracio(sequenciaRobot, calibracio),
    [sequenciaRobot, calibracio]
  );

  // Netejar el drop si no s'ha deixat anar res
  useEffect(() => {
    const enFinalitzar = () => { setDragInfo(null); setSlotActiu(null); };
    window.addEventListener("dragend", enFinalitzar);
    window.addEventListener("drop", enFinalitzar);
    return () => {
      window.removeEventListener("dragend", enFinalitzar);
      window.removeEventListener("drop", enFinalitzar);
    };
  }, []);

  const iniciarPrograma = async () => {
    if (programa.length === 0) return;
    const llest = programaLlest(programa);
    if (!llest.llest) { mostrarToastBt(`⚠️ ${llest.missatge}`); return; }
    if (!analisiBucles.valid) { mostrarToastBt(`⚠️ ${analisiBucles.missatge}`); return; }
    if (!btConnectat) { mostrarToastBt("📡 Connecta el robot per Bluetooth primer"); return; }
    const seq = traduirASecuenciaRobot(sequenciaCompilada);
    if (seq.length === 0) return;
    try {
      await enviarSequencia(seq);
      setRobotExecutant(true);
      if (repteActiu) afegirProgramaRepte([...programa]);
      refSimulador.current?.simular();
      iniciarSeguimentExecucio(sequenciaCompilada);
    } catch { mostrarToastBt("❌ Error enviant la seqüència"); }
  };

  // Primera visita: suggerim registrar-se i, en tancar, mostrem el tutorial
  useEffect(() => {
    if (carregantAuth) return;
    if (!localStorage.getItem("telerov_visitat")) {
      localStorage.setItem("telerov_visitat", "1");
      if (!usuari) setModalBenvingudaObert(true);
    }
  }, [carregantAuth, usuari]);

  const obrirAuth = (pestanya = "login") => { setAuthPestanya(pestanya); setModalAuthObert(true); };

  const handleTancarAuth = () => {
    setModalAuthObert(false);
    if (mostrarTutorialDespres) { setMostrarTutorialDespres(false); setTutorialObert(true); }
  };

  const handleBenvingudaRegistrar = () => {
    setModalBenvingudaObert(false);
    setMostrarTutorialDespres(true);
    obrirAuth("registre");
  };

  const handleBenvingudaSaltar = () => {
    setModalBenvingudaObert(false);
    setTutorialObert(true);
  };

  // guardar programa
  const handleGuardarPrograma = () => {
    if (programa.length === 0) { mostrarToastBt("⚠️ El programa és buit"); return; }
    const llest = programaLlest(programa);
    if (!llest.llest) { mostrarToastBt(`⚠️ ${llest.missatge}`); return; }
    if (!analisiBucles.valid) { mostrarToastBt(`⚠️ ${analisiBucles.missatge}`); return; }
    if (!usuari) { obrirAuth(); return; }
    setModalGuardarObert(true);
  };

  const handleConfirmarGuardar = async (nom, blocs, idSobreescriure) => {
    if (idSobreescriure) await actualitzarPrograma(idSobreescriure, nom, blocs);
    else                 await guardarPrograma(nom, blocs);
    mostrarToastBt("💾 Programa guardat!");
  };

  // carregar programa
  const handleObrirProgrames = async () => {
    if (!usuari) { obrirAuth(); return; }
    setModalProgramesObert(true);
    setCarregantProgrames(true);
    await carregarProgrames();
    setCarregantProgrames(false);
  };

  // guardar programa
  const handleCarregarPrograma = (programaGuardat) => {
    const blocs = programaGuardat.blocs
      .map(reconstruirBlocDeGuardat)
      .filter(Boolean);
    setPrograma(blocs);
    setAvisPrograma("");
    setSequenciaRobot([]);
    mostrarToastBt(`📂 "${programaGuardat.nom}" carregat`);
  };

  const handleEliminarPrograma = async (id) => {
    await eliminarPrograma(id);
  };

  // Prova un sol moviment al robot per calibrar
  const handleProvarMoviment = (cmd, cal) => {
    enviarBrut(aplicarCalibracio([`{${cmd},1500}`], cal));
  };

  // Tria un ESP (existent o nou), carrega la seva calibració i obre el modal de calibració
  const handleSeleccionarEsp = async (nom) => {
    await seleccionarEsp(nom);
    setModalEspObert(false);
    setModalCalibracioObert(true);
  };

  // Desa la calibració de l'ESP actiu
  const handleDesarCalibracio = async (cal) => {
    try {
      await desarCalibracio(espNom, cal);
      mostrarToastBt(`💾 Calibració de "${espNom}" guardada!`);
    } catch {
      mostrarToastBt("❌ No s'ha pogut guardar la calibració");
    }
  };

  const handleIniciarRepte = (repte) => {
    if (repte.velocitats) {
      setVelocitatsPreviesRepte(velocitats);
      setVelocitats(repte.velocitats);
    }
    iniciarRepte(repte);
    programaAmbBanderes();
    const sig = repteSignal + 1;
    refRepteSignal.current = sig;
    setRepteSignal(sig);
    setModalRepteInfoObert(true);
  };

  //restaura la velocitat x defecte al acabar el repte
  const handleAcabarRepte = () => {
    if (velocitatsPreviesRepte) {
      setVelocitats(velocitatsPreviesRepte);
      setVelocitatsPreviesRepte(null);
    }
    acabarRepte();
  };

  // Guarda els programes usats en aquest repte com una partida
  const handleAcabarRepteGuardant = async () => {
    const repte = repteActiu;
    const progs = programesRepte;
    if (repte && progs.length > 0) {
      const programesPartida = progs.map((seq, i) => ({
        nom: `Intent ${i + 1}`,
        blocs: seq.map(b => ({ tipusId: b.tipusId, valor: b.valor })),
      }));
      await guardarPartidaRepte(repte.id, programesPartida).catch(() => {});
      mostrarToastBt("💾 Programes del repte guardats!");
    }
    handleAcabarRepte();
  };

  // finalitza el repte
  useEffect(() => {
    if (!repteCompletat || !repteActiu) return;
    let valor;
    if (repteActiu.tipus === 'boies')        valor = boiesTocades;
    else if (repteActiu.tipus === 'monedes') valor = repteActiu.mode === 'temps' ? monedesRecollides : tempsTranscorregut;
    else                                     valor = tempsTranscorregut;
    registrarResultat(repteActiu, valor);
  }, [repteCompletat]);

  const executant = estatSimulador === "executant";
  const pausat    = estatSimulador === "pausat";
  const fet       = estatSimulador === "fet";
  const { llest, missatge: missatgeLlest } = programaLlest(programa);

  const gestionarSimular = () => {
    if (!analisiBucles.valid) { mostrarToastBt(`⚠️ ${analisiBucles.missatge}`); return; }
    if (repteActiu) afegirProgramaRepte([...programa]);
    refSimulador.current?.simular();
  };
  const gestionarAtura   = () => refSimulador.current?.aturar();
  const gestionarReset = () => {
    if (repteActiu) {
      reiniciarRepte();
      programaAmbBanderes();
      const sig = repteSignal + 1;
      refRepteSignal.current = sig;
      setRepteSignal(sig);
    }
    refSimulador.current?.reset();
    setRobotExecutant(false);
  };

  const iniciarArrossegamentBase = (e, blocBase) => {
    setDragInfo({ origen: "paleta", blocId: blocBase.id });
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", String(blocBase.id));
  };
  const iniciarArrossegamentPrograma = (e, instanciaId) => {
    setDragInfo({ origen: "programa", instanciaId });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", instanciaId);
  };
  const finalitzarArrossegament = () => { setDragInfo(null); setSlotActiu(null); setDragGhost(null); refTouchDrag.current = null; };
  const permetreDeixar = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragInfo?.origen === "programa" ? "move" : "copy";
    setSlotActiu(index);
  };
  const deixarEnPosicio = (e, index) => {
    e.preventDefault(); if (!dragInfo) return;
    if (dragInfo.origen === "paleta") {
      const bloc = BLOCS_BASE.find((b) => b.id === dragInfo.blocId);
      if (bloc) { const p = [...programa]; p.splice(index, 0, crearBlocPrograma(bloc)); aplicarCanviPrograma(p); }
    }
    if (dragInfo.origen === "programa") {
      const io = programa.findIndex((b) => b.instanciaId === dragInfo.instanciaId);
      if (io !== -1) {
        const p = [...programa]; const [mogut] = p.splice(io, 1);
        let id = index; if (io < index) id--;
        p.splice(id, 0, mogut); aplicarCanviPrograma(p);
      }
    }
    setDragInfo(null); setSlotActiu(null);
  };

  // rouch / pointer drag (dispositius tactil)
  const trobarSlotActiu = useCallback((cx, cy) => {
    const slots = document.querySelectorAll("[data-slot]");
    let millor = null, millorDist = Infinity;
    const PAD_H = 50;
    const PAD_V = 50;
    slots.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (cx < r.left - PAD_H || cx > r.right + PAD_H) return;
      const centreY = (r.top + r.bottom) / 2;
      const toleranciaV = Math.max(PAD_V, (r.bottom - r.top) / 2 + PAD_V);
      if (Math.abs(cy - centreY) > toleranciaV) return;
      const dist = Math.hypot(cx - (r.left + r.right) / 2, cy - centreY);
      if (dist < millorDist) { millorDist = dist; millor = Number(el.dataset.slot); }
    });
    return millor;
  }, []);

  const iniciarTouchDrag = useCallback((e, info, imatge) => {
    if (e.pointerType === "mouse") return;
    e.preventDefault();
    refTouchDrag.current = info;
    setDragInfo(info);
    setDragGhost({ x: e.clientX, y: e.clientY, imatge });
  }, []);

  const alPointerMove = useCallback((e) => {
    if (!refTouchDrag.current) return;
    setDragGhost((prev) => prev && { ...prev, x: e.clientX, y: e.clientY });
    setSlotActiu(trobarSlotActiu(e.clientX, e.clientY));
  }, [trobarSlotActiu]);

  const alPointerUp = useCallback((e) => {
    const drag = refTouchDrag.current;
    if (!drag) return;
    const slot = trobarSlotActiu(e.clientX, e.clientY);
    if (slot !== null) {
      if (drag.origen === "paleta") {
        const b = BLOCS_BASE.find((b) => b.id === drag.blocId);
        if (b) { const p = [...programa]; p.splice(slot, 0, crearBlocPrograma(b)); aplicarCanviPrograma(p); }
      } else if (drag.origen === "programa") {
        const io = programa.findIndex((b) => b.instanciaId === drag.instanciaId);
        if (io !== -1) {
          const p = [...programa]; const [m] = p.splice(io, 1);
          p.splice(io < slot ? slot - 1 : slot, 0, m); aplicarCanviPrograma(p);
        }
      }
    }
    finalitzarArrossegament();
  }, [trobarSlotActiu, programa]);

  return (
    <div
      className="aplicacio"
      onPointerMove={alPointerMove}
      onPointerUp={alPointerUp}
      onPointerCancel={() => { if (refTouchDrag.current) finalitzarArrossegament(); }}
    >
      <BarraSuperior
        enObrirAjuda={() => setAjudaOberta(true)}
        enObrirSobre={() => setSobreObert(true)}
        enConnectarBluetooth={connectarBluetooth}
        enDesconnectarBluetooth={desconnectarBluetooth}
        btConnectat={btConnectat}
        enObrirCalibracio={() => setModalEspObert(true)}
        usuari={usuari}
        enLogin={() => obrirAuth()}
        enLogout={logout}
        enObrirProgrames={handleObrirProgrames}
        enEditarPerfil={() => setModalPerfilObert(true)}
        nomRepteActiu={repteActiu ? `Repte: ${repteActiu.nom}` : null}
        tempsRepte={repteActiu
          ? (repteActiu.tipus === 'boies' || (repteActiu.tipus === 'monedes' && repteActiu.mode === 'temps')
              ? tempsRestant : tempsTranscorregut)
          : null}
        comptadorRepte={
          repteActiu?.tipus === 'boies' ? boiesTocades
          : repteActiu?.tipus === 'monedes'
            ? (repteActiu.mode === 'totes' ? `${monedesRecollides}/${repteActiu.nombreMonedes}` : monedesRecollides)
            : null}
        iconaComptador={repteActiu?.tipus === 'monedes' ? '🪙' : '🟢'}
        enSortirRepte={repteActiu ? handleAcabarRepte : null}
      />

      <div className={`toastBt${toastBt ? " toastBt-visible" : ""}`}>{toastBtText}</div>

      {modalAuthObert && (
        <ModalAuth
          enTancar={handleTancarAuth}
          registrar={registrar}
          login={login}
          pestanyaInicial={authPestanya}
        />
      )}

      {modalBenvingudaObert && (
        <ModalBenvinguda
          enRegistrar={handleBenvingudaRegistrar}
          enSaltar={handleBenvingudaSaltar}
        />
      )}

      {tutorialObert && <ModalTutorial enTancar={() => setTutorialObert(false)} />}

      {modalRepteInfoObert && <ModalRepteInfo enTancar={() => setModalRepteInfoObert(false)} />}

      {modalGuardarObert && (
        <ModalGuardar
          enTancar={() => setModalGuardarObert(false)}
          enGuardar={handleConfirmarGuardar}
          programaActual={programa}
          programesExistents={programes.filter(p => !p.repteId)}
        />
      )}

      {modalProgramesObert && (
        <ModalProgramesGuardats
          enTancar={() => setModalProgramesObert(false)}
          programes={programes}
          enCarregar={handleCarregarPrograma}
          enEliminar={handleEliminarPrograma}
          carregantLlista={carregantProgrames}
        />
      )}

      {modalConfigObert && (
        <ModalConfiguracio
          enTancar={() => setModalConfigObert(false)}
          visibilitat={visibilitat}
          enAlternar={alternarVisibilitat}
        />
      )}

      {modalPerfilObert && usuari && (
        <ModalPerfil
          enTancar={() => setModalPerfilObert(false)}
          usuari={usuari}
          actualitzarPerfil={actualitzarPerfil}
        />
      )}

      {modalVelocitatObert && (
        <ModalVelocitats
          enTancar={() => setModalVelocitatObert(false)}
          velocitats={velocitats}
          enDesar={setVelocitats}
          midaCel={CELL}
        />
      )}

      {modalReptesObert && (
        <ModalReptes
          enTancar={() => setModalReptesObert(false)}
          enIniciar={handleIniciarRepte}
          usuari={usuari}
          millorsResultats={millorsResultats}
        />
      )}

      {modalEspObert && (
        <ModalSeleccionarEsp
          enTancar={() => setModalEspObert(false)}
          enSeleccionar={handleSeleccionarEsp}
          token={usuari?.token}
        />
      )}

      {modalCalibracioObert && (
        <ModalCalibracio
          enTancar={() => setModalCalibracioObert(false)}
          espNom={espNom}
          calibracio={calibracio}
          enDesar={handleDesarCalibracio}
          enProvar={handleProvarMoviment}
          btConnectat={btConnectat}
        />
      )}

      {repteCompletat && repteActiu && (
        <ModalRepteCompletat
          repte={repteActiu}
          temps={tempsTranscorregut}
          numProgrames={programesRepte.length}
          numBoies={boiesTocades}
          numMonedes={monedesRecollides}
          potGuardar={!!usuari && programesRepte.length > 0}
          enGuardarITancar={handleAcabarRepteGuardant}
          enTancarSenseGuardar={handleAcabarRepte}
        />
      )}

      <main className="pagina">

        <div className="panell panellBlocs">
          <h2>Blocs de moviment</h2>
          <div className="blocs">
            {BLOCS_BASE.map((bloc) => (
              <Fitxa
                key={bloc.id}
                imatge={bloc.imatge}
                nom={bloc.nom}
                valor={bloc.valor}
                editable={false}
                mostrarValor={bloc.valor !== null}
                mostrarNom={true}
                arrossegable={true}
                enComencarArrossegament={(e) => iniciarArrossegamentBase(e, bloc)}
                enClic={() => clicarBlocPaleta(bloc)}
                enPointerDown={(e) => iniciarTouchDrag(e, { origen: "paleta", blocId: bloc.id }, bloc.imatge)}
              />
            ))}
          </div>
        </div>

        <div className="panell zonaSimulador">
          <div className="simuladorCapcalera">
            <h2>Simulador</h2>
            <div className="simuladorBotons">
              <button
                className="simulador-boto simulador-boto-vel"
                onClick={() => setModalVelocitatObert(true)}
                title="Configurar velocitats"
              >⚡ Vel.</button>
              <button
                className={`simulador-boto${executant ? " simulador-boto-executant" : ""}`}
                onClick={gestionarSimular}
                disabled={executant || !llest || !analisiBucles.valid}
              >
                {executant ? "⏳ Simulant..." : pausat ? "▶ Reprendre" : fet ? "▶ Tornar" : "▶ Simular"}
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
          </div>
          <div className="simuladorCanvasWrap">
            <SimuladorRobot
              ref={refSimulador}
              sequencia={sequenciaRobot}
              resetSignal={resetSignal}
              repteSignal={repteSignal}
              posicioInicial={posicioInicialRepte}
              onCanviarEstat={setEstatSimulador}
              visibilitat={visibilitat}
              onObrirConfig={() => setModalConfigObert(true)}
              velocitats={velocitats}
              btConnectat={btConnectat}
              onEnviarComandaBT={enviarSequencia}
              guiesVisuals={repteActiu?.guies ?? []}
              checkpoints={repteActiu?.checkpoints ?? []}
              checkpointsAssolits={checkpointsAssolits}
              onCheckpointAssolit={(idx) => marcarCheckpoint(idx, repteActiu)}
              modeRepte={!!repteActiu}
              boia={posicioBoia}
              radiBoia={repteActiu?.radiCheckpoint ?? 45}
              onBoiaTocada={tocarBoia}
              escenari={repteActiu?.escenari ?? "piscina"}
              monedes={monedes}
              onMonedaTocada={recollirMoneda}
              obstacles={!!repteActiu?.obstacles}
            />
          </div>
        </div>

        <div className="panell zonaPrograma">
          <div className="capcaleraProgramacio">
            <h2>Espai de programació</h2>
            <div className="accionsPrograma">
              {repteActiu && (
                <button
                  className="botoAccio botoAccio-ajudaRepte"
                  onClick={() => setAjudaRepteOberta(true)}
                  title={`Ajuda del repte: ${repteActiu.nom}`}
                  type="button"
                >
                  <span className="iconaBoto">❓</span>
                </button>
              )}
              <button
                className="botoAccio botoAccio-reptes botoAccio-amb-text"
                onClick={() => setModalReptesObert(true)}
                title="Reptes"
                type="button"
              >
                <span className="iconaBoto">🏆</span>
                <span className="textoBoto">Reptes</span>
              </button>
              <button
                className="botoAccio botoAccio-visualitzar"
                onClick={() => setSeqOberta(true)}
                title="Visualitzar seqüències"
                type="button"
                disabled={programa.length === 0}
              >
                <span className="iconaBoto">📋</span>
              </button>
              {/* Guardar programa */}
              <button
                className="botoAccio botoAccio-guardar"
                onClick={handleGuardarPrograma}
                title={usuari ? "Guardar programa" : "Inicia sessió per guardar"}
                type="button"
                disabled={programa.length === 0}
              >
                <span className="iconaBoto">💾</span>
              </button>
              {/* Recuperar programa */}
              {usuari && (
                <button
                  className="botoAccio botoAccio-recuperar"
                  onClick={handleObrirProgrames}
                  title="Els meus programes"
                  type="button"
                >
                  <span className="iconaBoto">📂</span>
                </button>
              )}
              <button
                className="botoAccio botoAccio-iniciar botoAccio-amb-text"
                onClick={btConnectat ? iniciarPrograma : gestionarSimular}
                title={btConnectat
                  ? (robotExecutant ? "El robot està executant una seqüència" : "Enviar al robot")
                  : "Simular el programa al simulador"}
                type="button"
                disabled={btConnectat ? robotExecutant : (executant || !llest || !analisiBucles.valid)}
              >
                <span className="iconaBoto">{btConnectat && robotExecutant ? "⏳" : "▶"}</span>
                <span className="textoBoto">
                  {btConnectat ? (robotExecutant ? "Executant..." : "Enviar al ROV") : "Simular"}
                </span>
              </button>
              <button
                className="botoAccio botoAccio-esborrar botoAccio-amb-text"
                onClick={esborrarPrograma}
                title="Esborrar programa"
                type="button"
              >
                <span className="iconaBoto">🗑</span>
                <span className="textoBoto">Esborrar programa</span>
              </button>
            </div>
          </div>

          {avisPrograma && <p className="avisPrograma">{avisPrograma}</p>}
          {analisiBucles.missatge && <p className="avisPrograma">{analisiBucles.missatge}</p>}
          {!avisPrograma && !analisiBucles.missatge && missatgeLlest && (
            <p className="avisPrograma avisPrograma-avis">{missatgeLlest}</p>
          )}

          <div className="zonaProgramacio">
            {programa.length === 0 ? (
              <div
                className={`zonaBuidaDrop${slotActiu === 0 ? " slotInsercio-actiu" : ""}`}
                data-slot={0}
                onDragOver={(e) => permetreDeixar(e, 0)}
                onDrop={(e) => deixarEnPosicio(e, 0)}
              >
                <p className="zonaProgramacioBuit">
                  🧩 Clica les peces o arrossega-les aquí per crear el programa
                </p>
              </div>
            ) : (
              <div className="llistaPrograma">
                <div
                  className={`slotInsercio${slotActiu === 0 ? " slotInsercio-actiu" : ""}`}
                  data-slot={0}
                  onDragOver={(e) => permetreDeixar(e, 0)}
                  onDrop={(e) => deixarEnPosicio(e, 0)}
                />
                {programa.flatMap((bloc, index) => [
                  <div
                    key={bloc.instanciaId}
                    className={`blocPrograma${instanciaActiva === bloc.instanciaId ? " blocPrograma-actiu" : ""}${bloc.tipus === 'bandera' ? " blocPrograma-bandera" : ""}`}
                    draggable
                    onDragStart={(e) => iniciarArrossegamentPrograma(e, bloc.instanciaId)}
                    onDragEnd={finalitzarArrossegament}
                    onPointerDown={(e) => iniciarTouchDrag(e, { origen: "programa", instanciaId: bloc.instanciaId }, bloc.imatge)}
                  >
                    <Fitxa
                      imatge={bloc.imatge} nom={bloc.nom} valor={bloc.valor}
                      editable={bloc.editable} mostrarValor={bloc.valor !== null}
                      mostrarNom={false} arrossegable={false}
                      enCanviarValor={(v) => canviarValorBlocPrograma(bloc.instanciaId, v)}
                      enClic={bloc.tipus === 'bandera'
                        ? (e) => { e.stopPropagation(); gestionarSimular(); }
                        : undefined}
                    />
                    <button
                      className="botoEliminarBloc"
                      onClick={() => eliminarBlocPrograma(bloc.instanciaId)}
                      aria-label={`Eliminar bloc ${bloc.nom}`}
                    >×</button>
                  </div>,
                  <div
                    key={`slot-${index + 1}`}
                    className={`slotInsercio${slotActiu === index + 1 ? " slotInsercio-actiu" : ""}`}
                    data-slot={index + 1}
                    onDragOver={(e) => permetreDeixar(e, index + 1)}
                    onDrop={(e) => deixarEnPosicio(e, index + 1)}
                  />,
                ])}
              </div>
            )}
          </div>
        </div>

      </main>

      <Finestra titol="Visualitzar seqüències" oberta={seqOberta} enTancar={() => setSeqOberta(false)}>
        <div className="modalSeq">
          <div className="modalSeq_columna">
            <h3 className="modalSeq_titol">Seqüència compilada</h3>
            <pre className="modalSeq_pre">{JSON.stringify(sequenciaCompilada, null, 2)}</pre>
          </div>
          {sequenciaRobot.length > 0 && (
            <div className="modalSeq_columna">
              <h3 className="modalSeq_titol">Seqüència robot</h3>
              <pre className="modalSeq_pre">{sequenciaRobot.join("\n")}</pre>
            </div>
          )}
          {sequenciaRobot.length > 0 && (
            <div className="modalSeq_columna">
              <h3 className="modalSeq_titol">Seqüència calibrada</h3>
              <pre className="modalSeq_pre">{sequenciaCalibrada.join("\n")}</pre>
            </div>
          )}
          {sequenciaRobot.length === 0 && (
            <div className="modalSeq_columna modalSeq_columna-buit">
              <p>Envia el programa al robot (▶) per veure la seqüència robot.</p>
            </div>
          )}
        </div>
      </Finestra>

      <Finestra titol="Ajuda / Instruccions d'ús" oberta={ajudaOberta} enTancar={() => setAjudaOberta(false)}>
        <ContingutAjuda />
      </Finestra>
      <Finestra
        titol={repteActiu ? `Ajuda · ${repteActiu.nom}` : "Ajuda del repte"}
        oberta={ajudaRepteOberta}
        enTancar={() => setAjudaRepteOberta(false)}
      >
        <ContingutAjudaRepte repte={repteActiu} />
      </Finestra>
      <Finestra titol="Sobre el projecte" oberta={sobreObert} enTancar={() => setSobreObert(false)}>
        <p>Explicar projecte i penjar pfg.</p>
      </Finestra>

      {dragGhost && (
        <img
          className="dragGhost"
          src={dragGhost.imatge}
          alt=""
          style={{ left: dragGhost.x, top: dragGhost.y }}
        />
      )}
    </div>
  );
}