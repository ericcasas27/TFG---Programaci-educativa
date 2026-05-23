import { useEffect, useMemo, useRef, useState } from "react";
import BarraSuperior from "./components/BarraSuperior";
import Finestra from "./components/Finestra";
import Fitxa from "./components/Fitxa";
import SimuladorRobot from "./components/SimuladorRobot";

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

const TIPUS_ULTIMS    = new Set(["per-sempre", "final"]);
const TIPUS_PRIMER    = "bandera";
const TIPUS_INICI_BUCLE = "inici-bucle";
const TIPUS_FI_BUCLE    = "fi-bucle";

const BLOCS_BASE = [
  { id: 1,  tipus: "bandera",       nom: "iniciar",        imatge: banderaImg,    valor: null, editable: false },
  { id: 2,  tipus: "baixar",        nom: "baixar",         imatge: baixImg,       valor: 1,    editable: true  },
  { id: 3,  tipus: "pujar",         nom: "pujar",          imatge: daltImg,       valor: 1,    editable: true  },
  { id: 4,  tipus: "retrocedir",    nom: "retrocedir",     imatge: esquerraImg,   valor: 1,    editable: true  },
  { id: 5,  tipus: "avançar",       nom: "avançar",        imatge: dretaImg,      valor: 1,    editable: true  },
  { id: 6,  tipus: "gira-esquerra", nom: "girar esquerra", imatge: girEsquerraImg,valor: 1,    editable: true  },
  { id: 7,  tipus: "gira-dreta",    nom: "girar dreta",    imatge: girDretaImg,   valor: 1,    editable: true  },
  { id: 8,  tipus: "inici-bucle",   nom: "inici bucle",    imatge: repeteixImgIni,   valor: 3,    editable: true  },
  { id: 9,  tipus: "fi-bucle",      nom: "fi bucle",       imatge: repeteixImgFi,   valor: null, editable: false },
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

export default function App() {
  const [ajudaOberta,    setAjudaOberta   ] = useState(false);
  const [sobreObert,     setSobreObert    ] = useState(false);
  const [seqOberta,      setSeqOberta     ] = useState(false);
  const [programa,       setPrograma      ] = useState([]);
  const [dragInfo,       setDragInfo      ] = useState(null);
  const [slotActiu,      setSlotActiu     ] = useState(null);
  const [avisPrograma,   setAvisPrograma  ] = useState("");
  const [sequenciaRobot, setSequenciaRobot] = useState([]);
  const [resetSignal,    setResetSignal   ] = useState(0);
  const [estatSimulador, setEstatSimulador] = useState("idle");
  const [btConnectat,    setBtConnectat   ] = useState(false);
  const [toastBt,        setToastBt       ] = useState(false);
  const [toastBtText,    setToastBtText   ] = useState("");
  const [instanciaActiva, setInstanciaActiva] = useState(null);
 
  const refBtDispositiu    = useRef(null);
  const refTimerSeguiment  = useRef(null);
  const refSimulador        = useRef(null);
  const refBtCaracteristica = useRef(null);
  const refTimerToastBt     = useRef(null);

  const mostrarToastBt = (text) => {
    setToastBtText(text);
    setToastBt(true);
    clearTimeout(refTimerToastBt.current);
    refTimerToastBt.current = setTimeout(() => setToastBt(false), 3000);
  };

 const connectarBluetooth = async () => {
    if (!navigator.bluetooth) {
      mostrarToastBt("⚠️ Aquest navegador no suporta Bluetooth");
      return;
    }
    try {
      const dispositiu = await navigator.bluetooth.requestDevice({
        filters: [{ name: "TeleROV" }],
        optionalServices: [BT_SERVICE_UUID],
      });
      refBtDispositiu.current = dispositiu;
      dispositiu.addEventListener("gattserverdisconnected", () => {
        setBtConnectat(false);
        refBtCaracteristica.current = null;
        refBtDispositiu.current = null;
        mostrarToastBt("🔌 Robot desconnectat");
      });
      const servidor       = await dispositiu.gatt.connect();
      const servei         = await servidor.getPrimaryService(BT_SERVICE_UUID);
      const caracteristica = await servei.getCharacteristic(BT_CHAR_UUID);
      refBtCaracteristica.current = caracteristica;
      setBtConnectat(true);
      mostrarToastBt("✅ Robot connectat!");
    } catch (err) {
      if (err.name !== "NotFoundError") {
        mostrarToastBt("❌ Error de connexió Bluetooth");
      }
    }
  };

  const desconnectarBluetooth = () => {
      if (refBtDispositiu.current?.gatt?.connected) {
        refBtDispositiu.current.gatt.disconnect();
      }
      setBtConnectat(false);
      refBtCaracteristica.current = null;
      refBtDispositiu.current = null;
      mostrarToastBt("🔌 Robot desconnectat");
    };

    const iniciarSeguimentExecucio = (sequencia) => {
      clearTimeout(refTimerSeguiment.current);
      const mapa = new Set(["pujar","baixar","avançar","retrocedir","gira-dreta","gira-esquerra","espera"]);
      const passos = sequencia.filter(p => mapa.has(p.tipus)); // ← filtra bandera/final
      let i = 0;
      const executarSeguent = () => {
        if (i >= passos.length) {
          setInstanciaActiva(null);
          mostrarToastBt("✅ Seqüència completada!");
          return;
        }
        const pas = passos[i];
        const instanciaId = programa[pas.programaIndex]?.instanciaId ?? null;
        setInstanciaActiva(instanciaId);
        mostrarToastBt(`▶ ${pas.nom}${pas.valor ? ` · ${pas.valor}s` : ""}`);
        refTimerSeguiment.current = setTimeout(() => { i++; executarSeguent(); }, (pas.valor || 1) * 1000);
      };
      executarSeguent();
    };


  const enviarSequencia = async (sequencia) => {
    const car = refBtCaracteristica.current;
    if (!car) return;
    const bytes = new TextEncoder().encode(sequencia.join(""));
    for (let i = 0; i < bytes.length; i += BT_MTU) {
      await car.writeValueWithoutResponse(bytes.slice(i, i + BT_MTU));
    }
  };

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

  const canviarValorBlocPrograma = (instanciaId, nouValor) => {
    const val = Number.isNaN(nouValor) ? 1 : Math.max(1, nouValor);
    setPrograma((prev) => prev.map((b) => b.instanciaId === instanciaId ? { ...b, valor: val } : b));
  };

  const eliminarBlocPrograma = (instanciaId) =>
    aplicarCanviPrograma(programa.filter((b) => b.instanciaId !== instanciaId));

  const esborrarPrograma = () => { setPrograma([]); setAvisPrograma(""); setSequenciaRobot([]); };

  useEffect(() => {
    if (analisiBucles.valid) {
      setSequenciaRobot(traduirASecuenciaRobot(sequenciaCompilada));
    } else {
      setSequenciaRobot([]);
    }
  }, [sequenciaCompilada, analisiBucles.valid]);

  const iniciarPrograma = async () => {
    if (programa.length === 0) return;
    if (!btConnectat) {
      mostrarToastBt("📡 Connecta el robot per Bluetooth primer");
      return;
    }
    const seq = traduirASecuenciaRobot(sequenciaCompilada);
    if (seq.length === 0) return;
    try {
      await enviarSequencia(seq);
      refSimulador.current?.simular();
      iniciarSeguimentExecucio(sequenciaCompilada);
    } catch {
      mostrarToastBt("❌ Error enviant la seqüència");
    }
  };

  const executant = estatSimulador === "executant";
  const pausat    = estatSimulador === "pausat";
  const fet       = estatSimulador === "fet";

  const gestionarSimular = () => refSimulador.current?.simular();
  const gestionarAtura   = () => refSimulador.current?.aturar();
  const gestionarReset   = () => { refSimulador.current?.reset(); setSequenciaRobot([]); };

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
  const finalitzarArrossegament = () => { setDragInfo(null); setSlotActiu(null); };
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

  return (
    <div className="aplicacio">
      <BarraSuperior
        enObrirAjuda={() => setAjudaOberta(true)}
        enObrirSobre={() => setSobreObert(true)}
        enConnectarBluetooth={connectarBluetooth}
        enDesconnectarBluetooth={desconnectarBluetooth}
        btConnectat={btConnectat}
      />

      <div className={`toastBt${toastBt ? " toastBt--visible" : ""}`}>{toastBtText}</div>

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
                enClic={() => inserirBlocEnPosicio(bloc, programa.length)}
              />
            ))}
          </div>
        </div>

        <div className="panell zonaSimulador">
          <div className="simuladorCapcalera">
            <h2>Simulador</h2>
            <div className="simuladorBotons">
              <button
                className={`simulador-boto${executant ? " simulador-boto--executant" : ""}`}
                onClick={gestionarSimular}
                disabled={executant}
              >
                {executant ? "⏳ Simulant..." : pausat ? "▶ Reprendre" : fet ? "▶ Tornar" : "▶ Simular"}
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
          </div>
          <div className="simuladorCanvasWrap">
            <SimuladorRobot
              ref={refSimulador}
              sequencia={sequenciaRobot}
              resetSignal={resetSignal}
              onReset={() => setSequenciaRobot([])}
              onCanviarEstat={setEstatSimulador}
            />
          </div>
        </div>

        <div className="panell zonaPrograma">
          <div className="capcaleraProgramacio">
            <h2>Espai de programació</h2>
            <div className="accionsPrograma">
              <button
                className="botoAccio botoAccio--visualitzar"
                onClick={() => setSeqOberta(true)}
                title="Visualitzar seqüències"
                type="button"
                disabled={programa.length === 0}
              >
                <span className="iconaBoto">📋</span>
              </button>
              <button
                className="botoAccio botoAccio--iniciar"
                onClick={iniciarPrograma}
                title="Enviar al robot"
                type="button"
              >
                <span className="iconaBoto">▶</span>
              </button>
              <button
                className="botoAccio botoAccio--esborrar"
                onClick={esborrarPrograma}
                title="Esborrar programa"
                type="button"
              >
                <span className="iconaBoto">🗑</span>
              </button>
            </div>
          </div>

          {avisPrograma && <p className="avisPrograma">{avisPrograma}</p>}
          {analisiBucles.missatge && <p className="avisPrograma">{analisiBucles.missatge}</p>}

          <div className="zonaProgramacio">
            {programa.length === 0 ? (
              <div
                className={`zonaBuidaDrop${slotActiu === 0 ? " slotInsercio--actiu" : ""}`}
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
                  className={`slotInsercio${slotActiu === 0 ? " slotInsercio--actiu" : ""}`}
                  onDragOver={(e) => permetreDeixar(e, 0)}
                  onDrop={(e) => deixarEnPosicio(e, 0)}
                />
                {programa.flatMap((bloc, index) => [
                  <div
                    key={bloc.instanciaId}
                    className={`blocPrograma${instanciaActiva === bloc.instanciaId ? " blocPrograma--actiu" : ""}`}
                    draggable
                    onDragStart={(e) => iniciarArrossegamentPrograma(e, bloc.instanciaId)}
                    onDragEnd={finalitzarArrossegament}
                  >
                    <Fitxa
                      imatge={bloc.imatge} nom={bloc.nom} valor={bloc.valor}
                      editable={bloc.editable} mostrarValor={bloc.valor !== null}
                      mostrarNom={false} arrossegable={false}
                      enCanviarValor={(v) => canviarValorBlocPrograma(bloc.instanciaId, v)}
                    />
                    <button
                      className="botoEliminarBloc"
                      onClick={() => eliminarBlocPrograma(bloc.instanciaId)}
                      aria-label={`Eliminar bloc ${bloc.nom}`}
                    >×</button>
                  </div>,
                  <div
                    key={`slot-${index + 1}`}
                    className={`slotInsercio${slotActiu === index + 1 ? " slotInsercio--actiu" : ""}`}
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
          <div className="modalSeq__columna">
            <h3 className="modalSeq__titol">Seqüència compilada</h3>
            <pre className="modalSeq__pre">{JSON.stringify(sequenciaCompilada, null, 2)}</pre>
          </div>
          {sequenciaRobot.length > 0 && (
            <div className="modalSeq__columna">
              <h3 className="modalSeq__titol">Seqüència robot</h3>
              <pre className="modalSeq__pre">{sequenciaRobot.join("\n")}</pre>
            </div>
          )}
          {sequenciaRobot.length === 0 && (
            <div className="modalSeq__columna modalSeq__columna--buit">
              <p>Envia el programa al robot (▶) per veure la seqüència robot.</p>
            </div>
          )}
        </div>
      </Finestra>

      <Finestra titol="Ajuda / Instruccions d'ús" oberta={ajudaOberta} enTancar={() => setAjudaOberta(false)}>
        <p>Explicar instruccions.</p>
      </Finestra>
      <Finestra titol="Sobre el projecte" oberta={sobreObert} enTancar={() => setSobreObert(false)}>
        <p>Explicar projecte i penjar pfg.</p>
      </Finestra>
    </div>
  );
}