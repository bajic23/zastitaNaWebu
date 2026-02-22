const mongoose = require("mongoose");

const loginEntrySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    ip: { type: String },
    userAgent: { type: String }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    // Ovde čuvaš bcrypt hash, NE plaintext lozinku
    passwordHash: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER"
    },

    // Aktivnost
    lastLoginAt: { type: Date },
    loginHistory: { type: [loginEntrySchema], default: [] },

    // Za brute force / blacklist logiku (korisno za projekat)
    failedLoginCount: { type: Number, default: 0 },
    blockedUntil: { type: Date, default: null },

    // Refresh token (ako radiš refresh token sistem)
    refreshTokenHash: { type: String, default: null },

    // Email verifikacija (ako radiš potvrdu email-a)
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, default: null },
    emailVerifyTokenExpiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);