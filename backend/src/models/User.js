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
    passwordHash: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER"
    },


    lastLoginAt: { type: Date },
    loginHistory: { type: [loginEntrySchema], default: [] },

    failedLoginCount: { type: Number, default: 0 },
    blockedUntil: { type: Date, default: null },

    refreshTokenHash: { type: String, default: null },
    
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, default: null },
    emailVerifyTokenExpiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);