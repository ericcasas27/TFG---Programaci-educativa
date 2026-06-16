const { connectarDB } = require("./utils/db");
const { verificarToken, obtenirTokenDeCapcalera } = require("./utils/auth");
const Usuari = require("./models/Usuari");

exports.handler = async (event) => {
  await connectarDB();

  const token   = obtenirTokenDeCapcalera(event.headers);
  const payload = verificarToken(token);
  if (!payload) return { statusCode: 401, body: JSON.stringify({ error: "No autenticat" }) };

  // GET → retorna totes les puntuacions de l'usuari
  if (event.httpMethod === "GET") {
    const usuari = await Usuari.findById(payload.id, "reptes");
    if (!usuari) return { statusCode: 404, body: JSON.stringify({ error: "Usuari no trobat" }) };
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(usuari.reptes ?? new Map())),
    };
  }

  // POST { repteId, valor, tipus } → desa si és millor que l'anterior
  if (event.httpMethod === "POST") {
    const { repteId, valor, tipus } = JSON.parse(event.body || "{}");
    if (!repteId || valor == null || !tipus)
      return { statusCode: 400, body: JSON.stringify({ error: "Falten camps" }) };

    const usuari = await Usuari.findById(payload.id, "reptes");
    if (!usuari) return { statusCode: 404, body: JSON.stringify({ error: "Usuari no trobat" }) };

    const anterior = usuari.reptes?.get(repteId);
    const maxEsMillor = tipus === "boies";
    const esMillor = anterior == null || (maxEsMillor ? valor > anterior : valor < anterior);

    if (esMillor) {
      await Usuari.findByIdAndUpdate(payload.id, { $set: { [`reptes.${repteId}`]: valor } });
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ desat: esMillor }),
    };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
