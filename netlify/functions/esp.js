const { connectarDB } = require("./utils/db");
const { verificarToken, obtenirTokenDeCapcalera } = require("./utils/auth");
const Esp = require("./models/Esp");

// Ordres que es poden calibrar (no es desa res més)
const COMANDES = ["FORWARD", "BACK", "UP", "DOWN", "LEFT", "RIGHT"];

exports.handler = async (event) => {
  await connectarDB();

  // si l'usuari està identificat, podrem atribuir-li l'ESP
  const auth   = verificarToken(obtenirTokenDeCapcalera(event.headers));
  const userId = auth?.id ?? null;

  if (event.httpMethod === "GET") {
    const nom = (event.queryStringParameters?.nom || "").trim();

    // GET amb nom : calibració d'aquest ESP. Si l'usuari està identificat, el marquem com a usuari que l'ha feta servir.
    if (nom) {
      const esp = await Esp.findOne({ nom });
      if (esp && userId) {
        await Esp.updateOne({ _id: esp._id }, { $addToSet: { usuarisUsats: userId } });
      }
      const calibracio = esp ? Object.fromEntries(esp.calibracio) : {};
      return { statusCode: 200, body: JSON.stringify({ nom, calibracio }) };
    }

    // GET sense paràmetres : llista de tots els ESP, marcant quins són "meus"
    const esps = await Esp.find({}, "nom creador usuarisUsats").sort({ nom: 1 });
    const llista = esps.map((e) => ({
      _id: e._id,
      nom: e.nom,
      meu: !!userId && (
        String(e.creador) === String(userId) ||
        e.usuarisUsats.some((u) => String(u) === String(userId))
      ),
    }));
    return { statusCode: 200, body: JSON.stringify(llista) };
  }

  // POST : crea o actualitza la calibració d'un ESP identificat pel seu nom
  if (event.httpMethod === "POST") {
    const { nom, calibracio } = JSON.parse(event.body || "{}");
    if (!nom?.trim()) return { statusCode: 400, body: JSON.stringify({ error: "Falta el nom de l'ESP" }) };

    // Només desem ordres vàlides
    const net = {};
    for (const c of COMANDES) {
      if (COMANDES.includes(calibracio?.[c])) net[c] = calibracio[c];
    }

    const existent = await Esp.findOne({ nom: nom.trim() });
    const set = { nom: nom.trim(), calibracio: net };
    if (!existent && userId) set.creador = userId;   // el creador només s'assigna en crear-lo

    const update = { $set: set };
    if (userId) update.$addToSet = { usuarisUsats: userId };

    const esp = await Esp.findOneAndUpdate(
      { nom: nom.trim() },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return { statusCode: 200, body: JSON.stringify({ nom: esp.nom, calibracio: Object.fromEntries(esp.calibracio) }) };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
