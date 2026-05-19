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
    name: {
      type: String,
      trim: true,
      default: ""
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      default: null
    },

    googleId: {
      type: String,
      default: null
    },

    role: {
      type: String,
      enum: ["PUTNIK","OPERATOR"],
      default: "PUTNIK"
    },

    lastLoginAt: { type: Date },

    loginHistory: {
      type: [loginEntrySchema],
      default: []
    },

    failedLoginCount: {
      type: Number,
      default: 0
    },

    otpCode: {
      type: String,
      default: null
    },

    otpExpiresAt: {
      type: Date,
      default: null
    },

    otpAttempts: {
      type: Number,
      default: 0
    },

    mfaEnabled: {
      type: Boolean,
      default: false
    },

    mfaSecret: {
      type: String,
      default: null
    },

    mfaTempSecret: {
      type: String,
      default: null
    },

    mfaBackupCodeHashes: {
      type: [String],
      default: []
    },

    mfaLoginChallengeHash: {
      type: String,
      default: null
    },

    mfaLoginChallengeExpiresAt: {
      type: Date,
      default: null
    },

    mfaLoginAttempts: {
      type: Number,
      default: 0
    },

    blockedUntil: {
      type: Date,
      default: null
    },

    refreshTokenHash: {
      type: String,
      default: null
    },

    emailVerified: {
      type: Boolean,
      default: false
    },

    emailVerifyToken: {
      type: String,
      default: null
    },

    emailVerifyTokenExpiresAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
