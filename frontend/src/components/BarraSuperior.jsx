import { useState, useRef, useEffect } from "react";
import logo from "../assets/telerovnfons.png";

export default function BarraSuperior({
  enObrirAjuda,
  enObrirSobre,
  enConnectarBluetooth,
  enDesconnectarBluetooth,
  btConnectat,
  enObrirCalibracio,
  usuari,
  enLogin,
  enLogout,
  enObrirProgrames,
  enEditarPerfil,
  nomRepteActiu,
  tempsRepte,
  comptadorRepte,
  iconaComptador = "🟢",
  enSortirRepte,
  logoImg,
}) {
  const [modalUsuariObert, setModalUsuariObert] = useState(false);
  const refModal = useRef(null);

  // Tancar el modal si es clica fora
  useEffect(() => {
    if (!modalUsuariObert) return;
    const handleClickFora = (e) => {
      if (refModal.current && !refModal.current.contains(e.target)) {
        setModalUsuariObert(false);
      }
    };
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [modalUsuariObert]);

  return (
    <header className="barraSuperior">
      <div className="barraSuperior_esquerra">
        <div className="barraSuperior_logo">
          <img src={logo} alt="Logo TeleROV" className="barraSuperior_logoImg" />
        </div>
        <span className="barraSuperior_titol">TeleROV</span>
        {nomRepteActiu && (
          <div className="repteActiuBadge">
            <span className="repteActiuBadge_nom">{nomRepteActiu}</span>
            {comptadorRepte != null && (
              <span className="repteActiuBadge_boies">{iconaComptador} {comptadorRepte}</span>
            )}
            <span className="repteActiuBadge_temps">
              {String(Math.floor((tempsRepte ?? 0) / 60)).padStart(2,'0')}:
              {String((tempsRepte ?? 0) % 60).padStart(2,'0')}
            </span>
            <button className="repteActiuBadge_sortir" onClick={enSortirRepte} title="Sortir del repte">✕</button>
          </div>
        )}
      </div>

      <div className="barraSuperior_dreta">
        {btConnectat ? (
          <button
            className="barraSuperior_boto barraSuperior_boto-bt-on"
            onClick={enDesconnectarBluetooth}
          >
            🔵 Connectat
          </button>
        ) : (
          <button
            className="barraSuperior_boto barraSuperior_boto-bt-off"
            onClick={enConnectarBluetooth}
          >
            📡 Bluetooth
          </button>
        )}

        <button
          className="barraSuperior_boto"
          onClick={enObrirCalibracio}
          title={btConnectat ? "Calibració de moviments del robot" : "Connecta un robot per poder calibrar-lo"}
          type="button"
          disabled={!btConnectat}
        >
          🎚️ Calibració
        </button>

        {/* Auth */}
        {usuari ? (
          <div className="usuariMenu" ref={refModal}>
            <button
              className="barraSuperior_boto usuariMenu_boto"
              onClick={() => setModalUsuariObert((v) => !v)}
            >
              👤 {usuari.nomUsuari}
              <span className="usuariMenu_fletxa">{modalUsuariObert ? "▲" : "▼"}</span>
            </button>

            {modalUsuariObert && (
              <div className="usuariMenu_dropdown">
                <div className="usuariMenu_capcalera">
                  <div className="usuariMenu_info">
                    <span className="usuariMenu_nom">{usuari.nom ? `${usuari.nom} ${usuari.cognom1}` : usuari.nomUsuari}</span>
                    {usuari.centre && <span className="usuariMenu_centre">{usuari.centre.nom}</span>}
                    {usuari.curs   && <span className="usuariMenu_curs">{usuari.curs}</span>}
                  </div>
                  <button
                    className="usuariMenu_tancar"
                    onClick={() => setModalUsuariObert(false)}
                  >×</button>
                </div>
                <div className="usuariMenu_accions">
                  <button
                    className="usuariMenu_accio"
                    onClick={() => { enEditarPerfil?.(); setModalUsuariObert(false); }}
                  >
                    ✏️ Editar perfil
                  </button>
                  <button
                    className="usuariMenu_accio"
                    onClick={() => { enObrirProgrames(); setModalUsuariObert(false); }}
                  >
                    📂 Els meus programes
                  </button>
                  <button
                    className="usuariMenu_accio usuariMenu_accio-logout"
                    onClick={() => { enLogout(); setModalUsuariObert(false); }}
                  >
                    ⬡ Tancar sessió
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            className="barraSuperior_boto"
            onClick={enLogin}
          >
            👤 Iniciar sessió
          </button>
        )}

        <button className="barraSuperior_boto" onClick={enObrirAjuda}>❓ Ajuda</button>
        <button className="barraSuperior_boto" onClick={enObrirSobre}>ℹ️ Sobre</button>
      </div>
    </header>
  );
}