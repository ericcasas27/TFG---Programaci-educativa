const jwt = require("jsonwebtoken");

function generarToken(usuariId) {
  return jwt.sign({ id: usuariId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function verificarToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function obtenirTokenDeCapcalera(headers) {
  const auth = headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

module.exports = { generarToken, verificarToken, obtenirTokenDeCapcalera };