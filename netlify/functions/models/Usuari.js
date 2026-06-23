const mongoose = require("mongoose");

const usuariSchema = new mongoose.Schema({
  nomUsuari:  { type: String, required: true, trim: true, minlength: 3 },
  contrasenya:{ type: String, required: true },
  centre:     { type: mongoose.Schema.Types.ObjectId, ref: "Centre", required: true },
  nom:        { type: String, required: true, trim: true },
  cognom1:    { type: String, required: true, trim: true },
  cognom2:    { type: String, trim: true, default: "" },
  curs:       { type: String, required: true, trim: true },
  email:      { type: String, trim: true, default: "" },
  reptes:     { type: Map, of: Number, default: {} },
  creatAt:    { type: Date, default: Date.now },
});

// Nom d'usuari únic DINS d'un centre (però pot repetir-se entre centres)
usuariSchema.index({ nomUsuari: 1, centre: 1 }, { unique: true });

module.exports = mongoose.models.Usuari || mongoose.model("Usuari", usuariSchema);
