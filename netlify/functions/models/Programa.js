const mongoose = require("mongoose");

// Un programa és un nom i la seva col·lecció de blocs
const programaSchema = new mongoose.Schema(
  {
    nom:   { type: String, default: "Programa sense nom" },
    blocs: { type: Array,  default: [] },
  },
  { timestamps: true }
);

module.exports = programaSchema;
