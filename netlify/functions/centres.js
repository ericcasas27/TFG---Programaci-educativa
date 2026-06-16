const { connectarDB } = require("./utils/db");
const Centre = require("./models/Centre");

exports.handler = async (event) => {
  await connectarDB();

  // GET  → llista tots els centres ordenats alfabèticament
  if (event.httpMethod === "GET") {
    const centres = await Centre.find({}, "_id nom").sort({ nom: 1 });
    return { statusCode: 200, body: JSON.stringify(centres) };
  }

  // POST → crea un centre nou (o retorna l'existent si ja existeix)
  if (event.httpMethod === "POST") {
    const { nom } = JSON.parse(event.body || "{}");
    if (!nom?.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: "El nom del centre és obligatori" }) };
    }
    let centre = await Centre.findOne({ nom: nom.trim() });
    if (!centre) centre = await Centre.create({ nom: nom.trim() });
    return { statusCode: 200, body: JSON.stringify(centre) };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
