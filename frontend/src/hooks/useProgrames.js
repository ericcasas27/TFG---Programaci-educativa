import { useState, useCallback } from "react";

const BUIT = { lliures: [], reptes: {} };


export function useProgrames(token) {
  const [programes, setProgrames] = useState(BUIT);

  const capcaleres = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const carregarProgrames = useCallback(async () => {
    if (!token) { setProgrames(BUIT); return; }
    const res  = await fetch("/.netlify/functions/programes", { headers: capcaleres });
    const data = await res.json();
    setProgrames({ lliures: data.lliures || [], reptes: data.reptes || {} });
  }, [token]);

  // Guarda un programa lliure
  const guardarPrograma = async (nom, blocs) => {
    const res  = await fetch("/.netlify/functions/programes", {
      method: "POST",
      headers: capcaleres,
      body: JSON.stringify({ nom, blocs }),
    });
    const data = await res.json();
    await carregarProgrames();
    return data;
  };

  // Guarda una partida sencera d'un repte (tots els programes usats)
  const guardarPartidaRepte = async (repteId, programesPartida, data = Date.now()) => {
    const res = await fetch("/.netlify/functions/programes", {
      method: "POST",
      headers: capcaleres,
      body: JSON.stringify({ tipus: "repte", repteId, data, programes: programesPartida }),
    });
    const desada = await res.json();
    await carregarProgrames();
    return desada;
  };

  const actualitzarPrograma = async (id, nom, blocs) => {
    const res  = await fetch("/.netlify/functions/programes", {
      method: "PUT",
      headers: capcaleres,
      body: JSON.stringify({ id, nom, blocs }),
    });
    const data = await res.json();
    await carregarProgrames();
    return data;
  };

  const eliminarPrograma = async (id) => {
    await fetch("/.netlify/functions/programes", {
      method: "DELETE",
      headers: capcaleres,
      body: JSON.stringify({ id }),
    });
    await carregarProgrames();
  };

  return { programes, carregarProgrames, guardarPrograma, guardarPartidaRepte, actualitzarPrograma, eliminarPrograma };
}
