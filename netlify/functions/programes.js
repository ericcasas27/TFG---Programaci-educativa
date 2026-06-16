const { connectarDB } = require("./utils/db");
const { verificarToken, obtenirTokenDeCapcalera } = require("./utils/auth");
const Usuari = require("./models/Usuari");

// busca un programa per _id i per un usuari
function trobarPrograma(usuari, id) {
  const lliure = usuari.programes.lliures.id(id);
  if (lliure) return lliure;
  for (const partides of usuari.programes.reptes.values())
    for (const partida of partides) {
      const p = partida.programes.id(id);
      if (p) return p;
    }
  return null;
}

// elimina un programa per _id i x usuari
function eliminarPrograma(usuari, id) {
  if (usuari.programes.lliures.id(id)) {
    usuari.programes.lliures.pull(id);
    return true;
  }
  for (const [repteId, partides] of usuari.programes.reptes.entries()) {
    for (const partida of partides) {
      if (partida.programes.id(id)) {
        partida.programes.pull(id);
        const restants = partides.filter((p) => p.programes.length > 0);
        if (restants.length) usuari.programes.reptes.set(repteId, restants);
        else usuari.programes.reptes.delete(repteId);
        return true;
      }
    }
  }
  return false;
}

exports.handler = async (event) => {
  await connectarDB();

  const token  = obtenirTokenDeCapcalera(event.headers);
  const auth   = verificarToken(token);
  if (!auth) return { statusCode: 401, body: JSON.stringify({ error: "No autoritzat" }) };

  const usuari = await Usuari.findById(auth.id);
  if (!usuari) return { statusCode: 404, body: JSON.stringify({ error: "Usuari no trobat" }) };

  // retorna tots els programes de l'usuari ({ lliures, reptes })
  if (event.httpMethod === "GET") {
    const dades = usuari.toJSON().programes || { lliures: [], reptes: {} };
    return { statusCode: 200, body: JSON.stringify(dades) };
  }

  const cos = JSON.parse(event.body || "{}");

  // guarda un programa
  if (event.httpMethod === "POST") {
    if (cos.tipus === "repte") {
      const { repteId, data, programes } = cos;
      if (!repteId || !Array.isArray(programes))
        return { statusCode: 400, body: JSON.stringify({ error: "Falten camps" }) };
      const partida  = { data: data ?? Date.now(), programes };
      const partides = usuari.programes.reptes.get(repteId) || [];
      partides.push(partida);
      usuari.programes.reptes.set(repteId, partides);
      await usuari.save();
      const desada = usuari.programes.reptes.get(repteId).at(-1);
      return { statusCode: 201, body: JSON.stringify(desada.toJSON()) };
    }
    const { nom, blocs } = cos;
    usuari.programes.lliures.push({ nom, blocs });
    await usuari.save();
    return { statusCode: 201, body: JSON.stringify(usuari.programes.lliures.at(-1).toJSON()) };
  }

  // sobreescriu un programa
  if (event.httpMethod === "PUT") {
    const { id, nom, blocs } = cos;
    const prog = trobarPrograma(usuari, id);
    if (!prog) return { statusCode: 404, body: JSON.stringify({ error: "No trobat" }) };
    if (nom   !== undefined) prog.nom   = nom;
    if (blocs !== undefined) prog.blocs = blocs;
    usuari.markModified("programes");
    await usuari.save();
    return { statusCode: 200, body: JSON.stringify(prog.toJSON()) };
  }

  // elimina un programa
  if (event.httpMethod === "DELETE") {
    const { id } = cos;
    const trobat = eliminarPrograma(usuari, id);
    if (!trobat) return { statusCode: 404, body: JSON.stringify({ error: "No trobat" }) };
    usuari.markModified("programes");
    await usuari.save();
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
