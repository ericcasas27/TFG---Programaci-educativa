import { useState, useCallback, useRef, useEffect } from 'react';
import {
  generarPosicioBoia, generarPosicioInicialBoies,
  generarMonedesVaixell, generarMonedaVaixell, generarPosicioInicialMonedes,
} from '../reptes/reptes';

// Reptes que funcionen amb compte enrere (temps límit).
function esModeTemps(repte) {
  return repte?.tipus === 'boies'
    || (repte?.tipus === 'monedes' && repte?.mode === 'temps');
}

// Clau amb què es desa el rècord al servidor. Les monedes tenen dos rànquings
// separats (per temps vs. totes) perquè es puntuen de manera diferent.
function clauRecord(repte) {
  if (repte.tipus === 'monedes') return `${repte.id}-${repte.mode}`;
  if (repte.tipus === 'boies')   return `${repte.id}-${repte.zona}`;
  return repte.id;
}

// Com es puntua (per al servidor): 'max' guarda el valor més alt, 'min' el més baix.
function tipusRecord(repte) {
  if (repte.tipus === 'boies') return 'boies';                    // max boies
  if (repte.tipus === 'monedes') return repte.mode === 'temps' ? 'boies' : 'recorregut';
  return 'recorregut';                                            // min temps
}

export function useRepte(token = null) {
  const [repteActiu,          setRepteActiu         ] = useState(null);
  const [tempsInici,          setTempsInici         ] = useState(null);
  const [tempsTranscorregut,  setTempsTranscorregut ] = useState(0);
  const [tempsRestant,        setTempsRestant        ] = useState(0);
  const [programesRepte,      setProgramesRepte     ] = useState([]);
  const [checkpointsAssolits, setCheckpointsAssolits] = useState(new Set());
  const [boiesTocades,        setBoiesTocades       ] = useState(0);
  const [posicioBoia,         setPosicioBoia        ] = useState(null);
  const [monedes,             setMonedes            ] = useState([]);   // reptes 'monedes'
  const [monedesRecollides,   setMonedesRecollides  ] = useState(0);    // reptes 'monedes'
  const [posicioInicial,      setPosicioInicial     ] = useState(null);
  const [completat,           setCompletat          ] = useState(false);
  const [millorsResultats,    setMillorsResultats   ] = useState({});
  const refTimer      = useRef(null);
  const refRepteActiu = useRef(null);

  // Carregar puntuacions del servidor quan hi ha sessió
  useEffect(() => {
    if (!token) { setMillorsResultats({}); return; }
    fetch("/.netlify/functions/reptes", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : {})
      .then(data => setMillorsResultats(data))
      .catch(() => {});
  }, [token]);

  // Cronòmetre: compta amunt sempre; en mode temps fa també compte enrere
  useEffect(() => {
    if (!tempsInici) { clearInterval(refTimer.current); return; }
    refTimer.current = setInterval(() => {
      const trans = Math.floor((Date.now() - tempsInici) / 1000);
      setTempsTranscorregut(trans);
      const repte = refRepteActiu.current;
      if (esModeTemps(repte)) {
        const rest = repte.duracioSegons - trans;
        if (rest <= 0) {
          clearInterval(refTimer.current);
          setTempsRestant(0);
          setCompletat(true);
        } else {
          setTempsRestant(rest);
        }
      }
    }, 1000);
    return () => clearInterval(refTimer.current);
  }, [tempsInici]);

  const prepararRepte = useCallback((repte) => {
    setProgramesRepte([]);
    setCheckpointsAssolits(new Set());
    setCompletat(false);
    setTempsTranscorregut(0);
    setBoiesTocades(0);
    setMonedesRecollides(0);
    setPosicioBoia(null);
    setMonedes([]);

    if (repte.tipus === 'boies') {
      setTempsRestant(repte.duracioSegons);
      const inici = generarPosicioInicialBoies();
      setPosicioInicial(inici);
      setPosicioBoia(generarPosicioBoia(repte.zona, inici));
    } else if (repte.tipus === 'monedes') {
      setPosicioInicial(generarPosicioInicialMonedes());
      if (repte.mode === 'temps') {
        setTempsRestant(repte.duracioSegons);
        setMonedes(generarMonedesVaixell(1, repte.obstacles));
      } else {
        setTempsRestant(0);   // mode 'totes': cronòmetre amunt, sense límit
        setMonedes(generarMonedesVaixell(repte.nombreMonedes, repte.obstacles));
      }
    } else {
      setPosicioInicial(repte.posicioInicial);
    }
  }, []);

  const iniciarRepte = useCallback((repte) => {
    refRepteActiu.current = repte;
    setRepteActiu(repte);
    prepararRepte(repte);
    setTempsInici(Date.now());
  }, [prepararRepte]);

  const acabarRepte = useCallback(() => {
    clearInterval(refTimer.current);
    refRepteActiu.current = null;
    setRepteActiu(null);
    setTempsInici(null);
    setTempsTranscorregut(0);
    setPosicioBoia(null);
    setMonedes([]);
  }, []);

  const reiniciarRepte = useCallback(() => {
    const repte = refRepteActiu.current;
    if (!repte) return;
    prepararRepte(repte);
    setTempsInici(Date.now());
  }, [prepararRepte]);

  const afegirProgramaRepte = useCallback((seqBlocs) => {
    setProgramesRepte(prev => [...prev, seqBlocs]);
  }, []);

  const marcarCheckpoint = useCallback((idx, repte) => {
    setCheckpointsAssolits(prev => {
      if (idx !== prev.size) return prev;
      const seg = new Set(prev);
      seg.add(idx);
      if (repte && seg.size === repte.checkpoints.length) {
        clearInterval(refTimer.current);
        setCompletat(true);
      }
      return seg;
    });
  }, []);

  const tocarBoia = useCallback(() => {
    const repte = refRepteActiu.current;
    if (!repte) return;
    setBoiesTocades(n => n + 1);
    setPosicioBoia(prev => generarPosicioBoia(repte.zona, prev));
  }, []);

  // Monedes: recull la moneda indicada. En mode 'temps' en genera una de nova;
  // en mode 'totes' acaba el repte quan no en queda cap.
  const recollirMoneda = useCallback((id) => {
    const repte = refRepteActiu.current;
    if (!repte) return;
    setMonedesRecollides(n => n + 1);
    setMonedes(prev => {
      const resta = prev.filter(m => m.id !== id);
      if (repte.mode === 'temps') {
        return [...resta, generarMonedaVaixell(resta, repte.obstacles)];
      }
      if (resta.length === 0) {
        clearInterval(refTimer.current);
        setCompletat(true);
      }
      return resta;
    });
  }, []);

  // Desa la puntuació al servidor si és millor que l'anterior.
  const registrarResultat = useCallback((repte, valor) => {
    if (!token) return;
    const clau = clauRecord(repte);
    const tipus = tipusRecord(repte);
    const maxEsMillor = tipus === 'boies';
    setMillorsResultats(prev => {
      const anterior = prev[clau];
      if (anterior != null && (maxEsMillor ? anterior >= valor : anterior <= valor)) return prev;
      fetch("/.netlify/functions/reptes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ repteId: clau, valor, tipus }),
      }).catch(() => {});
      return { ...prev, [clau]: valor };
    });
  }, [token]);

  return {
    repteActiu,
    tempsTranscorregut,
    tempsRestant,
    programesRepte,
    checkpointsAssolits,
    boiesTocades,
    posicioBoia,
    monedes,
    monedesRecollides,
    posicioInicial,
    completat,
    millorsResultats,
    iniciarRepte,
    acabarRepte,
    reiniciarRepte,
    afegirProgramaRepte,
    marcarCheckpoint,
    tocarBoia,
    recollirMoneda,
    registrarResultat,
  };
}
