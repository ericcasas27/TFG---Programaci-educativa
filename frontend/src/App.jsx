import { useEffect, useMemo, useState } from "react";
import BarraSuperior from "./components/BarraSuperior";
import Finestra from "./components/Finestra";
import Fitxa from "./components/Fitxa";

import baixImg from "./assets/down.png";
import daltImg from "./assets/up.png";
import esquerraImg from "./assets/left.png";
import dretaImg from "./assets/right.png";
import repeteixImg from "./assets/repeat.png";
import esperaImg from "./assets/wait.png";
import aturaImg from "./assets/stop.png";
import perSempreImg from "./assets/forever.png";
import girEsquerraImg from "./assets/turnleft.png";
import girDretaImg from "./assets/turnright.png";
import banderaImg from "./assets/onflag.png";
import finalImg from "./assets/end.png";

const TIPUS_ULTIMS = new Set(["per-sempre", "final"]);
const TIPUS_PRIMER = "bandera";

const BLOCS_BASE = [
  { id: 1, tipus: "bandera", nom: "iniciar", imatge: banderaImg, valor: null, editable: false },
  { id: 2, tipus: "baix", nom: "baixar", imatge: baixImg, valor: 1, editable: true },
  { id: 3, tipus: "dalt", nom: "pujar", imatge: daltImg, valor: 1, editable: true },
  { id: 4, tipus: "esquerra", nom: "retrocedir", imatge: esquerraImg, valor: 1, editable: true },
  { id: 5, tipus: "dreta", nom: "avançar", imatge: dretaImg, valor: 1, editable: true },
  { id: 6, tipus: "inici-bucle", nom: "inici bucle", imatge: repeteixImg, valor: 4, editable: true },
  { id: 7, tipus: "fi-bucle", nom: "fi bucle", imatge: repeteixImg, valor: null, editable: false },
  { id: 8, tipus: "espera", nom: "esperar", imatge: esperaImg, valor: 10, editable: true },
  { id: 9, tipus: "atura", nom: "aturar", imatge: aturaImg, valor: null, editable: false },
  { id: 10, tipus: "per-sempre", nom: "repetir per sempre", imatge: perSempreImg, valor: null, editable: false },
  { id: 11, tipus: "gira-esquerra", nom: "girar esquerra", imatge: girEsquerraImg, valor: 1, editable: true },
  { id: 12, tipus: "gira-dreta", nom: "girar dreta", imatge: girDretaImg, valor: 1, editable: true },
  { id: 13, tipus: "final", nom: "finalitzar", imatge: finalImg, valor: null, editable: false },
];

function crearBlocPrograma(blocBase) {
  return {
    instanciaId: `${blocBase.tipus}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tipusId: blocBase.id,
    tipus: blocBase.tipus,
    nom: blocBase.nom,
    imatge: blocBase.imatge,
    valor: blocBase.valor,
    editable: blocBase.editable,
  };
}

function validarPrograma(programa) {
  let hiHaBandera = false;

  for (let i = 0; i < programa.length; i += 1) {
    const bloc = programa[i];

    if (bloc.tipus === TIPUS_PRIMER) {
      if (i !== 0) {
        return { valid: false, missatge: "La bandera només pot estar a la primera posició." };
      }
      if (hiHaBandera) {
        return { valid: false, missatge: "Només hi pot haver una bandera verda." };
      }
      hiHaBandera = true;
    }

    if (TIPUS_ULTIMS.has(bloc.tipus) && i !== programa.length - 1) {
      return { valid: false, missatge: `"${bloc.nom}" només pot estar a l'última posició.` };
    }
  }

  return { valid: true, missatge: "" };
}

export default function App() {
  const [missatge, setMissatge] = useState("Carregant...");
  const [ajudaOberta, setAjudaOberta] = useState(false);
  const [sobreObert, setSobreObert] = useState(false);

  const [programa, setPrograma] = useState([]);
  const [dragInfo, setDragInfo] = useState(null);
  const [slotActiu, setSlotActiu] = useState(null);
  const [avisPrograma, setAvisPrograma] = useState("");

  useEffect(() => {
    fetch("/.netlify/functions/hello")
      .then((r) => r.json())
      .then((data) => setMissatge(data.message))
      .catch(() => setMissatge("Error cridant al backend"));
  }, []);

  const aplicarCanviPrograma = (nouPrograma) => {
    const validacio = validarPrograma(nouPrograma);

    if (!validacio.valid) {
      setAvisPrograma(validacio.missatge);
      return false;
    }

    setPrograma(nouPrograma);
    setAvisPrograma("");
    return true;
  };

  const inserirBlocEnPosicio = (blocBase, index) => {
    const nouPrograma = [...programa];
    nouPrograma.splice(index, 0, crearBlocPrograma(blocBase));
    aplicarCanviPrograma(nouPrograma);
  };

  const canviarValorBlocPrograma = (instanciaId, nouValor) => {
    const valorValidat = Number.isNaN(nouValor) ? 1 : Math.max(1, nouValor);

    setPrograma((prev) =>
      prev.map((bloc) =>
        bloc.instanciaId === instanciaId
          ? { ...bloc, valor: valorValidat }
          : bloc
      )
    );
  };

  const eliminarBlocPrograma = (instanciaId) => {
    const nouPrograma = programa.filter((bloc) => bloc.instanciaId !== instanciaId);
    aplicarCanviPrograma(nouPrograma);
  };

  const esborrarPrograma = () => {
    setPrograma([]);
    setAvisPrograma("");
  };

  const iniciarPrograma = () => {
    alert("Botó d'inici preparat. La lògica d'execució la connectarem més endavant.");
  };

  const iniciarArrossegamentBase = (event, blocBase) => {
    setDragInfo({ origen: "paleta", blocId: blocBase.id });
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", String(blocBase.id));
  };

  const iniciarArrossegamentPrograma = (event, instanciaId) => {
    setDragInfo({ origen: "programa", instanciaId });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", instanciaId);
  };

  const finalitzarArrossegament = () => {
    setDragInfo(null);
    setSlotActiu(null);
  };

  const permetreDeixar = (event, index) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = dragInfo?.origen === "programa" ? "move" : "copy";
    setSlotActiu(index);
  };


  const deixarEnPosicio = (event, index) => {
    event.preventDefault();

    if (!dragInfo) return;

    if (dragInfo.origen === "paleta") {
      const blocBase = BLOCS_BASE.find((bloc) => bloc.id === dragInfo.blocId);
      if (blocBase) {
        const nouPrograma = [...programa];
        nouPrograma.splice(index, 0, crearBlocPrograma(blocBase));
        aplicarCanviPrograma(nouPrograma);
      }
    }

    if (dragInfo.origen === "programa") {
      const indexOrigen = programa.findIndex(
        (bloc) => bloc.instanciaId === dragInfo.instanciaId
      );

      if (indexOrigen !== -1) {
        const nouPrograma = [...programa];
        const [blocMogut] = nouPrograma.splice(indexOrigen, 1);
        let indexDesti = index;

        if (indexOrigen < index) {
          indexDesti -= 1;
        }

        nouPrograma.splice(indexDesti, 0, blocMogut);
        aplicarCanviPrograma(nouPrograma);
      }
    }

    setDragInfo(null);
    setSlotActiu(null);
  };

  const sequenciaGuardada = useMemo(() => {
    return programa.map((bloc, index) => ({
      ordre: index + 1,
      tipus: bloc.tipus,
      nom: bloc.nom,
      valor: bloc.valor,
    }));
  }, [programa]);

  return (
    <div className="aplicacio">
      <BarraSuperior
        enObrirAjuda={() => setAjudaOberta(true)}
        enObrirSobre={() => setSobreObert(true)}
      />

      <main className="pagina">
        <section className="seccioSuperior">
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
                  enComencarArrossegament={(event) =>
                    iniciarArrossegamentBase(event, bloc)
                  }
                  enClic={() => inserirBlocEnPosicio(bloc, programa.length)}
                />
              ))}
            </div>
          </div>

          <div className="panell panellCamera">
            <h2>Visor de càmera</h2>
            <div className="cameraPlaceholder">
              <p>{missatge}</p>
            </div>
          </div>
        </section>

        <section className="seccioInferior panell">
          <div className="capcaleraProgramacio">
            <h2>Espai de programació</h2>

            <div className="accionsPrograma">
              <button
                className="botoAccio botoAccio--iniciar"
                onClick={iniciarPrograma}
                aria-label="Iniciar programa"
                title="Iniciar programa"
                type="button"
              >
                <span className="iconaBoto">▶</span>
              </button>

              <button
                className="botoAccio botoAccio--esborrar"
                onClick={esborrarPrograma}
                aria-label="Esborrar programa"
                title="Esborrar programa"
                type="button"
              >
                <span className="iconaBoto">🗑</span>
              </button>
            </div>
          </div>

          {avisPrograma && <p className="avisPrograma">{avisPrograma}</p>}

          <div className="zonaProgramacio">
            {programa.length === 0 ? (
              <div
                className={`zonaBuidaDrop ${slotActiu === 0 ? "slotInsercio--actiu" : ""}`}
                onDragOver={(event) => permetreDeixar(event, 0)}
                onDrop={(event) => deixarEnPosicio(event, 0)}
              >
                <p className="zonaProgramacioBuit">
                  Arrossega aquí els blocs o fes clic als blocs de dalt.
                </p>
              </div>
            ) : (
              <div className="llistaPrograma">
                <div
                  className={`slotInsercio ${slotActiu === 0 ? "slotInsercio--actiu" : ""}`}
                  onDragOver={(event) => permetreDeixar(event, 0)}
                  onDrop={(event) => deixarEnPosicio(event, 0)}
                />

                {programa.flatMap((bloc, index) => [
                  <div
                    key={bloc.instanciaId}
                    className="blocPrograma"
                    draggable
                    onDragStart={(event) =>
                      iniciarArrossegamentPrograma(event, bloc.instanciaId)
                    }
                    onDragEnd={finalitzarArrossegament}
                  >
                    <Fitxa
                      imatge={bloc.imatge}
                      nom={bloc.nom}
                      valor={bloc.valor}
                      editable={bloc.editable}
                      mostrarValor={bloc.valor !== null}
                      mostrarNom={false}
                      arrossegable={false}
                      enCanviarValor={(nouValor) =>
                        canviarValorBlocPrograma(bloc.instanciaId, nouValor)
                      }
                    />

                    <button
                      className="botoEliminarBloc"
                      onClick={() => eliminarBlocPrograma(bloc.instanciaId)}
                      aria-label={`Eliminar bloc ${bloc.nom}`}
                    >
                      ×
                    </button>
                  </div>,

                  <div
                    key={`slot-${index + 1}`}
                    className={`slotInsercio ${slotActiu === index + 1 ? "slotInsercio--actiu" : ""}`}
                    onDragOver={(event) => permetreDeixar(event, index + 1)}
                    onDrop={(event) => deixarEnPosicio(event, index + 1)}
                  />,
                ])}
              </div>
            )}
          </div>

          <div className="resumPrograma">
            <h3>Seqüència guardada</h3>
            <pre>{JSON.stringify(sequenciaGuardada, null, 2)}</pre>
          </div>
        </section>
      </main>

      <Finestra
        titol="Ajuda / Instruccions d'ús"
        oberta={ajudaOberta}
        enTancar={() => setAjudaOberta(false)}
      >
        <p>
          Explicar instruccions.
        </p>
      </Finestra>

      <Finestra
        titol="Sobre el projecte"
        oberta={sobreObert}
        enTancar={() => setSobreObert(false)}
      >
        <p>Explicar projecte i penjar pfg.</p>
      </Finestra>
    </div>
  );
}