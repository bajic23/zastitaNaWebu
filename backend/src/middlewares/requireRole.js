module.exports = function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(401).json({ message: "Niste ulogovani." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Nemate prava pristupa." });
    }

    return next();
  };
};