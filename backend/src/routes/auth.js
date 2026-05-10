const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const passport = require("passport");

const User = require("../models/User");
const requireAuth = require("../middlewares/requireAuth");
const logger = require("../utils/logger");
const { generateOtp } = require("../utils/otp");

const router = express.Router();
const handleValidation = require("../middlewares/handleValidation");
const {
  registerValidator,
  loginValidator,
  updateMeValidator,
} = require("../validators");
const ACCESS_COOKIE_NAME = "accessToken";

function getAccessTokenCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 1000 * 60 * 15,
  };
}

function clearAccessTokenCookie(res) {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
}

function isStrongPassword(pw) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/.test(pw);
}

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Previše pokušaja logovanja. Pokušaj ponovo kasnije." },
});
const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Previše pokušaja registracije. Pokušaj ponovo kasnije.",
  },
});

const generateRefreshToken = () => crypto.randomBytes(64).toString("hex");

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

function createAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
  );
}

function getAuthUserResponse(user) {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    name: user.name || "",
    emailVerified: user.emailVerified,
  };
}

async function issueLoginTokens(user, req, res) {
  user.failedLoginCount = 0;
  user.blockedUntil = null;
  user.lastLoginAt = new Date();
  user.loginHistory.push({
    at: new Date(),
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  const refreshToken = generateRefreshToken();
  user.refreshTokenHash = hashToken(refreshToken);

  await user.save();

  const accessToken = createAccessToken(user);
  res.cookie(ACCESS_COOKIE_NAME, accessToken, getAccessTokenCookieOptions());

  return refreshToken;
}

// REGISTER
router.post(
  "/register",
  registerLimiter,
  registerValidator,
  handleValidation,
  async (req, res) => {
    try {
      const { name, email, password } = req.body ?? {};

      if (!name || !email || !password) {
        return res.status(400).json({
          message: "Ime i prezime, email i lozinka su obavezni.",
        });
      }

      const normalizedName = String(name).trim();
      const normalizedEmail = String(email).trim().toLowerCase();

      if (!normalizedName) {
        return res.status(400).json({
          message: "Ime i prezime su obavezni.",
        });
      }

      if (!isStrongPassword(password)) {
        return res.status(400).json({
          message:
            "Lozinka mora imati minimum 10 karaktera i bar: 1 veliko slovo, 1 malo slovo, 1 broj i 1 specijalni znak.",
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
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role: "PUTNIK",
        emailVerified: false,
        emailVerifyToken,
        emailVerifyTokenExpiresAt,
      });

      return res.status(201).json({
        message: "Korisnik uspešno registrovan. Potvrdi email pre prijave.",
        emailVerifyToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Greška na serveru." });
    }
  },
);

// LOGIN
router.post(
  "/login",
  loginLimiter,
  loginValidator,
  handleValidation,
  async (req, res) => {
    try {
      const { email, password } = req.body ?? {};

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email i lozinka su obavezni." });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        return res.status(401).json({ message: "Neispravni podaci." });
      }

      if (!user.emailVerified) {
        return res.status(403).json({
          message:
            "Email nije verifikovan. Proveri inbox i potvrdi email pre logovanja.",
        });
      }

      if (user.blockedUntil && user.blockedUntil > new Date()) {
        return res.status(403).json({
          message:
            "Nalog je privremeno blokiran zbog previše neuspešnih pokušaja.",
        });
      }

      if (!user.passwordHash) {
        return res.status(400).json({
          message:
            "Ovaj nalog koristi Google prijavu. Uloguj se preko Google-a.",
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
      const otp = generateOtp();
      user.otpCode = otp.code;
      user.otpExpiresAt = otp.expiresAt;
      user.otpAttempts = 0;

      await user.save();

      logger.info(`OTP generated for ${user.email}`);
      console.log(`OTP for ${user.email}: ${otp.code}`);

      return res.json({
        message: "Uspešno logovanje.",
        requiresOtp: true,
        email: user.email,
        message: "OTP verification required",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Greška na serveru." });
    }
  },
);

// VERIFY OTP
router.post("/verify-otp", loginLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body ?? {};

    if (!email || !otp) {
      return res.status(400).json({ message: "Email i OTP kod su obavezni." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const otpCode = String(otp).trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.otpCode) {
      logger.info(`OTP verification failed for ${normalizedEmail}`);
      return res.status(400).json({ message: "OTP kod nije pronadjen." });
    }

    if (user.otpExpiresAt && user.otpExpiresAt <= new Date()) {
      user.otpCode = null;
      user.otpExpiresAt = null;
      user.otpAttempts = 0;
      await user.save();

      logger.info(`OTP expired for ${normalizedEmail}`);
      return res.status(400).json({ message: "OTP kod je istekao." });
    }

    if (user.otpAttempts > 5) {
      logger.info(
        `OTP verification failed for ${normalizedEmail}: too many attempts`,
      );
      return res
        .status(429)
        .json({ message: "Previse neuspesnih OTP pokusaja." });
    }

    if (user.otpCode !== otpCode) {
      user.otpAttempts += 1;
      await user.save();

      logger.info(`OTP verification failed for ${normalizedEmail}`);

      if (user.otpAttempts > 5) {
        return res
          .status(429)
          .json({ message: "Previse neuspesnih OTP pokusaja." });
      }

      return res.status(401).json({ message: "Neispravan OTP kod." });
    }

    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;

    const refreshToken = await issueLoginTokens(user, req, res);

    logger.info(`OTP verification success for ${normalizedEmail}`);

    return res.json({
      message: "Uspesno logovanje.",
      refreshToken,
      user: getAuthUserResponse(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greska na serveru." });
  }
});

// RESEND OTP
router.post("/resend-otp", loginLimiter, async (req, res) => {
  try {
    const { email } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ message: "Email je obavezan." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "Korisnik nije pronadjen." });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message:
          "Email nije verifikovan. Proveri inbox i potvrdi email pre logovanja.",
      });
    }

    const otp = generateOtp();
    user.otpCode = otp.code;
    user.otpExpiresAt = otp.expiresAt;
    user.otpAttempts = 0;
    await user.save();

    logger.info(`OTP generated for ${user.email}`);
    console.log(`OTP for ${user.email}: ${otp.code}`);

    return res.json({
      requiresOtp: true,
      email: user.email,
      message: "OTP verification required",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greska na serveru." });
  }
});

// GOOGLE LOGIN
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "http://localhost:3000/login?error=google_login_failed",
  }),
  async (req, res) => {
    try {
      req.user.failedLoginCount = 0;
      req.user.blockedUntil = null;
      req.user.lastLoginAt = new Date();

      req.user.loginHistory.push({
        at: new Date(),
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      const refreshToken = generateRefreshToken();
      req.user.refreshTokenHash = hashToken(refreshToken);

      await req.user.save();

      const accessToken = jwt.sign(
        { sub: req.user._id.toString(), role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
      );

      res.cookie(
        ACCESS_COOKIE_NAME,
        accessToken,
        getAccessTokenCookieOptions(),
      );

      return res.redirect(
        `http://localhost:3000/login/success?refreshToken=${encodeURIComponent(refreshToken)}`,
      );
    } catch (error) {
      console.error(error);
      return res.redirect(
        "http://localhost:3000/login?error=google_login_failed",
      );
    }
  },
);

// LOGOUT
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body ?? {};

    if (!refreshToken) {
      clearAccessTokenCookie(res);
      return res.status(400).json({ message: "Nedostaje refreshToken." });
    }

    const refreshHash = hashToken(refreshToken);

    const user = await User.findOne({ refreshTokenHash: refreshHash });
    if (!user) {
      clearAccessTokenCookie(res);
      return res.status(204).send();
    }

    user.refreshTokenHash = null;
    await user.save();

    clearAccessTokenCookie(res);
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
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
    );

    res.cookie(ACCESS_COOKIE_NAME, accessToken, getAccessTokenCookieOptions());

    return res.json({
      message: "Token uspešno osvežen.",
      refreshToken: newRefreshToken,
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
      "email role emailVerified lastLoginAt loginHistory createdAt updatedAt name googleId",
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
        hasGoogleAccount: !!user.googleId,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Greška na serveru." });
  }
});

// UPDATE ME
router.patch(
  "/me",
  requireAuth,
  updateMeValidator,
  handleValidation,
  async (req, res) => {
    try {
      const { name, email } = req.body ?? {};

      if (!name || !email) {
        return res.status(400).json({
          message: "Ime i email su obavezni.",
        });
      }

      const normalizedName = String(name).trim();
      const normalizedEmail = String(email).trim().toLowerCase();

      if (!normalizedName || !normalizedEmail) {
        return res.status(400).json({
          message: "Ime i email su obavezni.",
        });
      }

      const existingUserWithEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: req.user.id },
      });

      if (existingUserWithEmail) {
        return res.status(409).json({
          message: "Korisnik sa ovim email-om već postoji.",
        });
      }

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "Korisnik nije pronađen." });
      }

      user.name = normalizedName;
      user.email = normalizedEmail;

      await user.save();

      return res.json({
        message: "Profil je uspešno ažuriran.",
        user: {
          id: user._id,
          name: user.name || "",
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          lastLoginAt: user.lastLoginAt,
          loginHistory: user.loginHistory,
          hasGoogleAccount: !!user.googleId,
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Greška na serveru." });
    }
  },
);

// DELETE ME
router.delete("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      clearAccessTokenCookie(res);
      return res.status(404).json({ message: "Korisnik nije pronađen." });
    }

    user.refreshTokenHash = null;
    await user.deleteOne();

    clearAccessTokenCookie(res);

    return res.status(200).json({
      message: "Profil je uspešno obrisan.",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Greška pri brisanju profila." });
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
      emailVerifyTokenExpiresAt: { $gt: new Date() },
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
