const express = require("express");
const User = require("../models/User");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

router.get("/users", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const users = await User.find({})
      .select("email role emailVerified lastLoginAt createdAt updatedAt")
      .sort({ createdAt: -1 });

    return res.json({ users });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

router.patch("/users/:id/role", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { role } = req.body ?? {};
    if (!["USER", "ADMIN"].includes(role)) {
      return res.status(400).json({ message: "Nevalidna rola." });
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("email role");

    if (!updated) return res.status(404).json({ message: "Korisnik nije pronađen." });

    return res.json({
      message: "Rola uspešno promenjena.",
      user: { id: updated._id, email: updated.email, role: updated.role }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

module.exports = router;