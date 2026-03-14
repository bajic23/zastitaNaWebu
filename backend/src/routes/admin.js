const express = require("express");
const User = require("../models/User");
const AccessLog = require("../models/AccessLog");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

// ADMIN vidi sve usere
router.get("/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const users = await User.find({})
      .select("name email role emailVerified lastLoginAt createdAt updatedAt")
      .sort({ createdAt: -1 });

    return res.json({ users });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

// ADMIN menja role korisnicima
router.patch("/users/:id/role", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { role } = req.body ?? {};

    if (!["USER", "MANAGER", "ADMIN"].includes(role)) {
      return res.status(400).json({ message: "Nevalidna rola." });
    }

    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: "Korisnik nije pronađen." });
    }

    if (String(targetUser._id) === String(req.user.id) && role !== "ADMIN") {
      return res.status(400).json({
        message: "Admin ne može sebi ukloniti ADMIN rolu."
      });
    }

    targetUser.role = role;
    await targetUser.save();

    return res.json({
      message: "Rola uspešno promenjena.",
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

// ADMIN i MANAGER vide access logove
router.get(
  "/access-logs",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
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

module.exports = router;