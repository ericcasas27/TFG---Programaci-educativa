const bcrypt = require("bcryptjs");
const { connectarDB } = require("./utils/db");
const { generarToken, verificarToken, obtenirTokenDeCapcalera } = require("./utils/auth");
const Usuari = require("./models/Usuari");
const Centre = require("./models/Centre");

exports.handler = async (event) => {
  await connectarDB();

  const token   = obtenirTokenDeCapcalera(event.headers);
  const payload = verificarToken(token);
  if (!payload) return { statusCode: 401, body: JSON.stringify({ error: "No autenticat" }) };

  // GET → retorna el perfil complet de l'usuari autenticat
  if (event.httpMethod === "GET") {
    const usuari = await Usuari.findById(payload.id).populate("centre", "nom");
    if (!usuari) return { statusCode: 404, body: JSON.stringify({ error: "Usuari no trobat" }) };
    return {
      statusCode: 200,
      body: JSON.stringify({
        nomUsuari: usuari.nomUsuari,
        nom: usuari.nom, cognom1: usuari.cognom1, cognom2: usuari.cognom2,
        curs: usuari.curs, email: usuari.email,
        centre: { _id: usuari.centre._id, nom: usuari.centre.nom },
      }),
    };
  }

  // PUT → actualitza els camps editables (nom, cognoms, curs, email, centre, contrasenya)
  if (event.httpMethod === "PUT") {
    const { nom, cognom1, cognom2, curs, email, centreId, contrasenya } =
      JSON.parse(event.body || "{}");

    const actualitzar = {};
    if (nom    !== undefined) actualitzar.nom     = nom.trim();
    if (cognom1 !== undefined) actualitzar.cognom1 = cognom1.trim();
    if (cognom2 !== undefined) actualitzar.cognom2 = cognom2.trim();
    if (curs   !== undefined) actualitzar.curs    = curs.trim();
    if (email  !== undefined) actualitzar.email   = email.trim();
    if (contrasenya)          actualitzar.contrasenya = await bcrypt.hash(contrasenya, 10);

    if (centreId) {
      const centre = await Centre.findById(centreId);
      if (!centre) return { statusCode: 400, body: JSON.stringify({ error: "Centre no vàlid" }) };
      actualitzar.centre = centreId;
    }

    const actualitzat = await Usuari.findByIdAndUpdate(payload.id, actualitzar, { new: true })
      .populate("centre", "nom");

    const nouToken = generarToken(actualitzat._id);
    return {
      statusCode: 200,
      body: JSON.stringify({
        token: nouToken,
        nomUsuari: actualitzat.nomUsuari,
        nom: actualitzat.nom, cognom1: actualitzat.cognom1, cognom2: actualitzat.cognom2,
        curs: actualitzat.curs, email: actualitzat.email,
        centre: { _id: actualitzat.centre._id, nom: actualitzat.centre.nom },
      }),
    };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
