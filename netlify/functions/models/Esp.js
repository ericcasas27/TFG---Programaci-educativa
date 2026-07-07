const mongoose = require("mongoose");

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
