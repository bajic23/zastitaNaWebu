const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const AccessLog = require("../models/AccessLog");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

// OPERATOR vidi sve PUTNIKE
router.get("/users", requireAuth, requireRole("OPERATOR"), async (req, res) => {
  try {
    const users = await User.find({ role: "PUTNIK" })
      .select("name email role emailVerified lastLoginAt createdAt updatedAt")
      .sort({ createdAt: -1 });

    return res.json({ users });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

// PUTNIKA READ by ID
router.get("/users/:id", requireAuth, requireRole("OPERATOR"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Nevalidan ID korisnika." });
    }

    const user = await User.findOne({
      _id: req.params.id,
      role: "PUTNIK"
    }).select(
      "name email role emailVerified lastLoginAt loginHistory createdAt updatedAt"
    );

    if (!user) {
      return res.status(404).json({ message: "Putnik nije pronađen." });
    }

    return res.json({ user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

// OPERATOR access logs
router.get(
  "/access-logs",
  requireAuth,
  requireRole("OPERATOR"),
  async (req, res) => {
    try {
      const logs = await AccessLog.find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("userId", "name email role");

      return res.json({ logs });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Greška na serveru." });
    }
  }
);

// PUTNIK delete
router.delete(
  "/users/:id",
  requireAuth,
  requireRole("OPERATOR"),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Nevalidan ID korisnika." });
      }

      const targetUser = await User.findById(req.params.id);

      if (!targetUser) {
        return res.status(404).json({ message: "Korisnik nije pronađen." });
      }

      if (String(targetUser._id) === String(req.user.id)) {
        return res.status(400).json({
          message: "Operator ne može obrisati svoj nalog."
        });
      }

      if (targetUser.role !== "PUTNIK") {
        return res.status(403).json({
          message: "Operator može obrisati samo PUTNIKA."
        });
      }

      await User.findByIdAndDelete(req.params.id);

      return res.json({ message: "Putnik je uspešno obrisan." });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Greška na serveru." });
    }
  }
);

module.exports = router;