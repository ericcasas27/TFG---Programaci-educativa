const { connectarDB } = require("./utils/db");
const { verificarToken, obtenirTokenDeCapcalera } = require("./utils/auth");
const Programa = require("./models/Programa");

exports.handler = async (event) => {
  await connectarDB();

  const token = obtenirTokenDeCapcalera(event.headers);
  const auth  = verificarToken(token);
  if (!auth) return { statusCode: 401, body: JSON.stringify({ error: "No autoritzat" }) };

  if (event.httpMethod === "GET") {
    const programes = await Programa.find({ usuariId: auth.id }).sort({ createdAt: -1 });
    return { statusCode: 200, body: JSON.stringify(programes) };
  }

  const cos = JSON.parse(event.body || "{}");

  if (event.httpMethod === "POST") {
    if (cos.tipus === "repte") {
      const { repteId, grup = Date.now(), programes } = cos;
      if (!repteId || !Array.isArray(programes))
        return { statusCode: 400, body: JSON.stringify({ error: "Falten camps" }) };
      const docs = programes.map((p) => ({
        usuariId: auth.id, nom: p.nom, blocs: p.blocs, repteId, grup,
      }));
      const desats = await Programa.insertMany(docs);
      return { statusCode: 201, body: JSON.stringify(desats) };
    }
    const { nom, blocs } = cos;
    const programa = await Programa.create({ usuariId: auth.id, nom, blocs });
    return { statusCode: 201, body: JSON.stringify(programa) };
  }

  if (event.httpMethod === "PUT") {
    const { id, nom, blocs } = cos;
    const programa = await Programa.findOneAndUpdate(
      { _id: id, usuariId: auth.id },
      { nom, blocs },
      { new: true }
    );
    if (!programa) return { statusCode: 404, body: JSON.stringify({ error: "No trobat" }) };
    return { statusCode: 200, body: JSON.stringify(programa) };
  }

  if (event.httpMethod === "DELETE") {
    const { id } = cos;
    const eliminat = await Programa.findOneAndDelete({ _id: id, usuariId: auth.id });
    if (!eliminat) return { statusCode: 404, body: JSON.stringify({ error: "No trobat" }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
