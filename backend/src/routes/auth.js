const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");

function isStrongPassword(pw) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/.test(pw);
}
  //REGISTER
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email i lozinka su obavezni." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Lozinka mora imati minimum 8 karaktera i bar: 1 veliko slovo, 1 malo slovo, 1 broj i 1 specijalni znak."
      });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Korisnik sa ovim email-om već postoji." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const emailVerifyToken = crypto.randomBytes(32).toString("hex");
    const emailVerifyTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      role: "USER",
      emailVerified: false,
      emailVerifyToken,
      emailVerifyTokenExpiresAt
    });
    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.status(201).json({
      message: "Korisnik uspešno registrovan.",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});
    // LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email i lozinka su obavezni." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "Neispravni podaci." });
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      return res.status(403).json({
        message: "Nalog je privremeno blokiran zbog previše neuspešnih pokušaja."
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= 5) {
        user.blockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginCount = 0;
      }

      await user.save();

      return res.status(401).json({ message: "Neispravni podaci." });
    }

    user.failedLoginCount = 0;
    user.blockedUntil = null;
    user.lastLoginAt = new Date();

    user.loginHistory.push({
      at: new Date(),
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });

    await user.save();

    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    return res.json({
      message: "Uspešno logovanje.",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});
  //ME
  router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "email role emailVerified lastLoginAt loginHistory createdAt updatedAt"
    );

    if (!user) return res.status(404).json({ message: "Korisnik nije pronađen." });

    return res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        loginHistory: user.loginHistory
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

module.exports = router;