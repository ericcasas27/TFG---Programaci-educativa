import { useState, useCallback } from "react";

// Calibració per defecte: cada ordre s'envia tal qual (identitat)
export const CALIBRACIO_DEFECTE = {
  FORWARD: "FORWARD", BACK: "BACK", UP: "UP", DOWN: "DOWN", LEFT: "LEFT", RIGHT: "RIGHT",
};

// Passa una seqüència d'ordres "{CMD,ms}" per la calibració d'un ESP.
// La seqüència calibrada és la que realment s'envia al robot per Bluetooth.
export function aplicarCalibracio(sequencia, calibracio) {
  return (sequencia || []).map((s) => {
    const m = String(s).match(/\{(\w+),(\d+)\}/);
    if (!m) return s;
    const nou = (calibracio && calibracio[m[1]]) || m[1];
    return `{${nou},${m[2]}}`;
  });
}

export function useEsp(token) {
  const [calibracio, setCalibracio] = useState({ ...CALIBRACIO_DEFECTE });
  const [espNom,     setEspNom]     = useState(null);

  // Selecciona un ESP pel seu nom i carrega (i activa) la seva calibració.
  // Si encara no existeix, parteix de la calibració per defecte.
  const seleccionarEsp = useCallback(async (nom) => {
    setEspNom(nom);
    try {
      const res = await fetch(`/.netlify/functions/esp?nom=${encodeURIComponent(nom)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const cal = { ...CALIBRACIO_DEFECTE, ...(data?.calibracio || {}) };
      setCalibracio(cal);
      return cal;
    } catch {
      const cal = { ...CALIBRACIO_DEFECTE };
      setCalibracio(cal);
      return cal;
    }
  }, [token]);

  // Desa la calibració d'un ESP (crea el registre si no existeix)
  const desarCalibracio = useCallback(async (nom, cal) => {
    setCalibracio({ ...CALIBRACIO_DEFECTE, ...cal });
    const res = await fetch("/.netlify/functions/esp", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ nom, calibracio: cal }),
    });
    if (!res.ok) throw new Error("No s'ha pogut guardar la calibració");
    return res.json();
  }, [token]);

  // En desconnectar el robot, deixem de tenir cap ESP actiu (calibració per defecte)
  const reiniciarEsp = useCallback(() => {
    setEspNom(null);
    setCalibracio({ ...CALIBRACIO_DEFECTE });
  }, []);

  return { calibracio, espNom, seleccionarEsp, desarCalibracio, reiniciarEsp };
}
