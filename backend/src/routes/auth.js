const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const passport = require("passport");

const User = require("../models/User");
const requireAuth = require("../middlewares/requireAuth");

const router = express.Router();

function isStrongPassword(pw) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/.test(pw);
}

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Previše pokušaja logovanja. Pokušaj ponovo kasnije." }
});

const generateRefreshToken = () => crypto.randomBytes(64).toString("hex");

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// REGISTER
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
          "Lozinka mora imati minimum 10 karaktera i bar: 1 veliko slovo, 1 malo slovo, 1 broj i 1 specijalni znak."
      });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Korisnik sa ovim email-om već postoji." });
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
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email i lozinka su obavezni." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "Neispravni podaci." });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message:
          "Email nije verifikovan. Proveri inbox i potvrdi email pre logovanja."
      });
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      return res.status(403).json({
        message:
          "Nalog je privremeno blokiran zbog previše neuspešnih pokušaja."
      });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        message: "Ovaj nalog koristi Google prijavu. Uloguj se preko Google-a."
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

    const refreshToken = generateRefreshToken();
    user.refreshTokenHash = hashToken(refreshToken);

    await user.save();

    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
    );

    return res.json({
      message: "Uspešno logovanje.",
      token,
      refreshToken,
      user: { id: user._id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

// GOOGLE LOGIN
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "http://localhost:3000/login?error=google_login_failed"
  }),
  async (req, res) => {
    try {
      req.user.failedLoginCount = 0;
      req.user.blockedUntil = null;
      req.user.lastLoginAt = new Date();

      req.user.loginHistory.push({
        at: new Date(),
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      });

      const refreshToken = generateRefreshToken();
      req.user.refreshTokenHash = hashToken(refreshToken);

      await req.user.save();

      const token = jwt.sign(
        { sub: req.user._id.toString(), role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
      );

      return res.redirect(
        `http://localhost:3000/login/success?token=${encodeURIComponent(token)}&refreshToken=${encodeURIComponent(refreshToken)}`
      );
    } catch (error) {
      console.error(error);
      return res.redirect("http://localhost:3000/login?error=google_login_failed");
    }
  }
);

// LOGOUT
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body ?? {};

    if (!refreshToken) {
      return res.status(400).json({ message: "Nedostaje refreshToken." });
    }

    const refreshHash = hashToken(refreshToken);

    const user = await User.findOne({ refreshTokenHash: refreshHash });
    if (!user) {
      return res.status(204).send();
    }

    user.refreshTokenHash = null;
    await user.save();

    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Greška pri logout-u." });
  }
});

// REFRESH
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body ?? {};

    if (!refreshToken) {
      return res.status(400).json({ message: "Nedostaje refreshToken." });
    }

    const refreshHash = hashToken(refreshToken);

    const user = await User.findOne({ refreshTokenHash: refreshHash });
    if (!user) {
      return res.status(401).json({ message: "Nevažeći refresh token." });
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      return res.status(403).json({ message: "Nalog je blokiran." });
    }

    const newRefreshToken = generateRefreshToken();
    user.refreshTokenHash = hashToken(newRefreshToken);

    await user.save();

    const accessToken = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
    );

    return res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Greška pri osvežavanju tokena." });
  }
});

// ME
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "email role emailVerified lastLoginAt loginHistory createdAt updatedAt name googleId"
    );

    if (!user) {
      return res.status(404).json({ message: "Korisnik nije pronađen." });
    }

    return res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        loginHistory: user.loginHistory,
        name: user.name || "",
        hasGoogleAccount: !!user.googleId
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

// VERIFY EMAIL
router.get("/verify-email", async (req, res) => {
  try {
    const token = String(req.query.token || "");
    if (!token) {
      return res.status(400).json({ message: "Token nedostaje." });
    }

    const user = await User.findOne({
      emailVerifyToken: token,
      emailVerifyTokenExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Token je nevažeći ili je istekao." });
    }

    user.emailVerified = true;
    user.emailVerifyToken = null;
    user.emailVerifyTokenExpiresAt = null;

    await user.save();

    return res.json({ message: "Email uspešno verifikovan." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

module.exports = router;