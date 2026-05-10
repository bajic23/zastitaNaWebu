const crypto = require("crypto");

const OTP_TTL_MS = 5 * 60 * 1000;

function generateOtp() {
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  return { code, expiresAt };
}

module.exports = {
  generateOtp,
  OTP_TTL_MS,
};
