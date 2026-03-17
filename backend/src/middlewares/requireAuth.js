const jwt = require("jsonwebtoken");

module.exports = function requireAuth(req, res, next) {
  let token = req.cookies?.accessToken || null;

  if (!token) {
    const header = req.headers.authorization || "";
    const [type, bearerToken] = header.split(" ");

    if (type === "Bearer" && bearerToken) {
      token = bearerToken;
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Niste autentifikovani." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: payload.sub,
      role: payload.role
    };

    return next();
  } catch (e) {
    return res.status(401).json({ message: "Nevažeći ili istekao token." });
  }
};