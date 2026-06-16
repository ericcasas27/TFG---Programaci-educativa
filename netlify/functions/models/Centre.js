const mongoose = require("mongoose");

const centreSchema = new mongoose.Schema({
  nom: { type: String, required: true, unique: true, trim: true },
  // Llista d'usuaris que pertanyen al centre. És una denormalització: la relació
  // ja existeix a Usuari.centre, però desar-la també aquí facilita consultar
  // "tots els alumnes d'un centre" sense fer una query separada a Usuari.
  usuaris: [{ type: mongoose.Schema.Types.ObjectId, ref: "Usuari" }],
  creatAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Centre || mongoose.model("Centre", centreSchema);
