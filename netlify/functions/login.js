const bcrypt = require("bcryptjs");
const { connectarDB } = require("./utils/db");
const { generarToken } = require("./utils/auth");
const Usuari = require("./models/Usuari");
require("./models/Centre");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  await connectarDB();
  const { nomUsuari, contrasenya, centreId } = JSON.parse(event.body || "{}");

  if (!nomUsuari || !contrasenya || !centreId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falten camps" }) };
  }

  const usuari = await Usuari.findOne({ nomUsuari: nomUsuari.trim(), centre: centreId })
    .populate("centre", "nom");

  if (!usuari) {
    return { statusCode: 401, body: JSON.stringify({ error: "Usuari o contrasenya incorrectes" }) };
  }

  const ok = await bcrypt.compare(contrasenya, usuari.contrasenya);
  if (!ok) {
    return { statusCode: 401, body: JSON.stringify({ error: "Usuari o contrasenya incorrectes" }) };
  }

  const token = generarToken(usuari._id);
  return {
    statusCode: 200,
    body: JSON.stringify({
      token,
      nomUsuari: usuari.nomUsuari,
      nom: usuari.nom, cognom1: usuari.cognom1, cognom2: usuari.cognom2,
      curs: usuari.curs, email: usuari.email,
      centre: { _id: usuari.centre._id, nom: usuari.centre.nom },
    }),
  };
};
