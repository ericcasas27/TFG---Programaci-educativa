import logo from "../assets/telerovnfons.png";

export default function BarraSuperior({ enObrirAjuda, enObrirSobre, enConnectarBluetooth, enDesconnectarBluetooth, btConnectat }) {
  return (
    <header className="barraSuperior">
      <div className="barraSuperior__esquerra">
        <div className="barraSuperior__logo">
          <img src={logo} alt="Logo TeleROV" className="barraSuperior__logoImg" />
        </div>
        <div className="barraSuperior__titol">TeleROV</div>
      </div>
      <nav className="barraSuperior__nav">
        {!btConnectat ? (
          <button
            className="barraSuperior__boto barraSuperior__boto--bt-off"
            onClick={enConnectarBluetooth}
          >
            🤖 Connectar robot
          </button>
        ) : (
          <button
            className="barraSuperior__boto barraSuperior__boto--bt-on"
            onClick={enDesconnectarBluetooth}
          >
            Robot connectat · Desconnectar
          </button>
        )}
        <button className="barraSuperior__boto" onClick={enObrirAjuda}>
          Ajuda / Instruccions d&apos;ús
        </button>
        <button className="barraSuperior__boto" onClick={enObrirSobre}>
          Sobre el projecte
        </button>
      </nav>
    </header>
  );
}