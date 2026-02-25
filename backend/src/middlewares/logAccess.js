const AccessLog = require("../models/AccessLog");

const logAccess = (req, res, next) => {
  const start = Date.now();

  res.on("finish", async () => {
    try {
      await AccessLog.create({
        userId: req.user?.id || null,
        role: req.user?.role || null,
        ip: req.ip,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
      });
    } catch (err) {
      console.error("Access log error:", err);
    }
  });

  next();
};

module.exports = logAccess;
