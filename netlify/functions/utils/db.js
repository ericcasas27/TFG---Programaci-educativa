const mongoose = require("mongoose");

let connectat = false;

async function connectarDB() {
  if (connectat) return;
  await mongoose.connect(process.env.MONGODB_URI);


  try {
    const coleccio = mongoose.connection.collection("usuaris");
    const indexos  = await coleccio.indexes();
    const hiHaAntic = indexos.some((idx) => idx.name === "nomUsuari_1");
    if (hiHaAntic) {
      await coleccio.dropIndex("nomUsuari_1");
      console.log("[DB] Índex nomUsuari_1 eliminat — migració completada");
    }
  } catch (e) {
    if (e.codeName !== "IndexNotFound") console.warn("[DB] Avís migració:", e.message);
  }

  const Usuari = require("../models/Usuari");
  await Usuari.syncIndexes();

  connectat = true;
}

module.exports = { connectarDB };
