const mongoose = require("mongoose");

// Calibració d'un ESP32. Com que el Web Bluetooth no exposa la MAC real del
// dispositiu, cada ESP s'identifica per un NOM únic que assigna l'usuari. Per a cada
// ordre lògica (FORWARD, BACK, UP, DOWN, LEFT, RIGHT) la calibració indica quina ordre
// real se li ha d'enviar perquè el robot la faci bé.
// A més, es desa qui l'ha creada (creador) i quins usuaris l'han feta servir
// (usuarisUsats), per poder separar al selector les calibracions pròpies de la resta.
const espSchema = new mongoose.Schema(
  {
    nom:          { type: String, required: true, unique: true, trim: true },
    calibracio:   { type: Map, of: String, default: {} },
    creador:      { type: mongoose.Schema.Types.ObjectId, ref: "Usuari", default: null },
    usuarisUsats: [{ type: mongoose.Schema.Types.ObjectId, ref: "Usuari" }],
  },
  { timestamps: true }
);

module.exports = mongoose.models.Esp || mongoose.model("Esp", espSchema);
