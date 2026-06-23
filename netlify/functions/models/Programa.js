const mongoose = require("mongoose");

const programaSchema = new mongoose.Schema(
  {
    usuariId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuari", required: true, index: true },
    nom:      { type: String, default: "Programa sense nom" },
    blocs:    { type: Array,  default: [] },
    repteId:  { type: String, default: null },
    grup:     { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Programa || mongoose.model("Programa", programaSchema);
