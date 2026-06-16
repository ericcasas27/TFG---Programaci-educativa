import { useState, useEffect } from "react";

const CLAU_STORAGE = "telerov_usuari";

function desarUsuari(dades) {
  localStorage.setItem(CLAU_STORAGE, JSON.stringify(dades));
}

function esborrarUsuari() {
  localStorage.removeItem(CLAU_STORAGE);
}

export function useAuth() {
  const [usuari,    setUsuari   ] = useState(null);
  const [carregant, setCarregant] = useState(true);

  useEffect(() => {
    try {
      const guardat = localStorage.getItem(CLAU_STORAGE);
      if (guardat) setUsuari(JSON.parse(guardat));
    } catch { /* corrupte */ }
    setCarregant(false);
  }, []);

  const registrar = async (dades) => {
    const res  = await fetch("/.netlify/functions/registre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dades),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    desarUsuari(data);
    setUsuari(data);
  };

  const login = async (dades) => {
    const res  = await fetch("/.netlify/functions/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dades),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    desarUsuari(data);
    setUsuari(data);
  };

  const actualitzarPerfil = async (dades) => {
    const res = await fetch("/.netlify/functions/perfil", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${usuari?.token}`,
      },
      body: JSON.stringify(dades),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    desarUsuari(data);
    setUsuari(data);
  };

  const logout = () => {
    esborrarUsuari();
    setUsuari(null);
  };

  return { usuari, carregant, registrar, login, actualitzarPerfil, logout };
}
