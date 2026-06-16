const bcrypt = require("bcryptjs");
const { connectarDB } = require("./utils/db");
const { generarToken } = require("./utils/auth");
const Usuari = require("./models/Usuari");
const Centre = require("./models/Centre");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  await connectarDB();
  const { nomUsuari, contrasenya, centreId, nom, cognom1, cognom2, curs, email } =
    JSON.parse(event.body || "{}");

  if (!nomUsuari || !contrasenya || !centreId || !nom || !cognom1 || !curs) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falten camps obligatoris" }) };
  }

  const centre = await Centre.findById(centreId);
  if (!centre) {
    return { statusCode: 400, body: JSON.stringify({ error: "Centre no vàlid" }) };
  }

  const existe = await Usuari.findOne({ nomUsuari: nomUsuari.trim(), centre: centreId });
  if (existe) {
    return { statusCode: 409, body: JSON.stringify({ error: "Nom d'usuari ja existeix en aquest centre" }) };
  }

  const hash = await bcrypt.hash(contrasenya, 10);
  const usuari = await Usuari.create({
    nomUsuari: nomUsuari.trim(), contrasenya: hash,
    centre: centreId,
    nom: nom.trim(), cognom1: cognom1.trim(),
    cognom2: cognom2?.trim() || "",
    curs: curs.trim(),
    email: email?.trim() || "",
  });

  await Centre.findByIdAndUpdate(centreId, { $addToSet: { usuaris: usuari._id } });

  const token = generarToken(usuari._id);
  return {
    statusCode: 201,
    body: JSON.stringify({
      token,
      nomUsuari: usuari.nomUsuari,
      nom: usuari.nom, cognom1: usuari.cognom1, cognom2: usuari.cognom2,
      curs: usuari.curs, email: usuari.email,
      centre: { _id: centre._id, nom: centre.nom },
    }),
  };
};
