const jwt = require("jsonwebtoken");

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Nedostaje Bearer token." });
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