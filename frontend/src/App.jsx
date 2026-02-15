import { useEffect, useState } from "react";

export default function App() {
  const [msg, setMsg] = useState("Cargando...");

  useEffect(() => {
    fetch("/.netlify/functions/hello")
      .then((r) => r.json())
      .then((data) => setMsg(data.message))
      .catch(() => setMsg("Error llamando al backend"));
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Mi App (Frontend)</h1>
      <p>Respuesta del backend:</p>
      <pre>{msg}</pre>
    </div>
  );
}
