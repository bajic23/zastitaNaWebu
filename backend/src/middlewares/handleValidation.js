const { validationResult } = require("express-validator");

module.exports = function handleValidation(req, res, next) {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    message: "Validacija nije prošla.",
    errors: errors.array().map((error) => ({
      field: error.path,
      message: error.msg
    }))
  });
};