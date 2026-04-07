import logo from "../assets/telerovnfons.png";

export default function BarraSuperior({ enObrirAjuda, enObrirSobre }) {

  const connectBluetooth = async () => {
    try {
      if (!navigator.bluetooth) {
        alert("Aquest navegador no suporta Web Bluetooth.");
        return;
      }

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true
      });

      alert(
        `Dispositiu seleccionat:\n${device.name || "Sense nom"}\nID: ${device.id}`
      );
    } catch (err) {
      console.error(err);
      alert("Error connectant per Bluetooth: " + err.message);
    }
  };

  return (
    <header className="barraSuperior">
      <div className="barraSuperior__esquerra">
        <div className="barraSuperior__logo">
          <img src={logo} alt="Logo TeleROV" className="barraSuperior__logoImg" />
        </div>
        <div className="barraSuperior__titol">TeleROV</div>
      </div>

      <nav className="barraSuperior__nav">
        <button className="barraSuperior__boto" onClick={connectBluetooth}>
          Connectar robot (Bluetooth)
        </button>

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