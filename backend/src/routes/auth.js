const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const passport = require("passport");
const QRCode = require("qrcode");
const { generateSecret, generateURI, verifySync } = require("otplib");

const User = require("../models/User");
const requireAuth = require("../middlewares/requireAuth");
const logger = require("../utils/logger");
const { generateOtp } = require("../utils/otp");
const {
  challengeExpiresAt,
  createAuthenticationOptions,
  createRegistrationOptions,
  generateRecoveryCodes,
  getActiveCredentials,
  hashRecoveryCode,
  isChallengeValid,
  registrationInfoToCredential,
  verifyAuthentication,
  verifyRegistration,
} = require("../services/webauthn");

const router = express.Router();
const handleValidation = require("../middlewares/handleValidation");
const {
  registerValidator,
  loginValidator,
  updateMeValidator,
} = require("../validators");
const ACCESS_COOKIE_NAME = "accessToken";
const MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MFA_ISSUER = process.env.MFA_ISSUER || "ZastitaNaWebu";

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

function generateMfaChallenge() {
  const token = crypto.randomBytes(32).toString("hex");

  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(Date.now() + MFA_CHALLENGE_TTL_MS),
  };
}

function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase(),
  );
}

function hashBackupCode(code) {
  return hashToken(String(code).trim().replace(/\s+/g, "").toUpperCase());
}

function verifyAuthenticatorCode(secret, code) {
  try {
    const result = verifySync({
      secret,
      token: String(code || "").trim(),
      window: 1,
    });

    return !!result.valid;
  } catch {
    return false;
  }
}

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
    mfaEnabled: !!user.mfaEnabled,
    webauthnEnabled: !!user.webauthnEnabled,
    webauthnCredentialCount: getActiveCredentials(user).length,
  };
}

async function issueLoginTokens(user, req, res) {
  user.failedLoginCount = 0;
  user.blockedUntil = null;
  user.mfaLoginChallengeHash = null;
  user.mfaLoginChallengeExpiresAt = null;
  user.mfaLoginAttempts = 0;
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

      if (user.mfaEnabled && user.mfaSecret) {
        const challenge = generateMfaChallenge();
        user.failedLoginCount = 0;
        user.blockedUntil = null;
        user.mfaLoginChallengeHash = challenge.hash;
        user.mfaLoginChallengeExpiresAt = challenge.expiresAt;
        user.mfaLoginAttempts = 0;
        await user.save();

        return res.json({
          message: "MFA verification required",
          requiresMfa: true,
          email: user.email,
          challengeToken: challenge.token,
        });
      }

      const refreshToken = await issueLoginTokens(user, req, res);

      return res.json({
        message: "Uspešno logovanje.",
        refreshToken,
        user: getAuthUserResponse(user),
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
    const { email, otp, challengeToken } = req.body ?? {};

    if (!email || !otp) {
      return res.status(400).json({ message: "Email i OTP kod su obavezni." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const otpCode = String(otp).trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user?.mfaEnabled && user.mfaSecret) {
      if (!challengeToken) {
        return res.status(400).json({ message: "MFA challenge nedostaje." });
      }

      const challengeHash = hashToken(String(challengeToken));
      const challengeExpired =
        !user.mfaLoginChallengeExpiresAt ||
        user.mfaLoginChallengeExpiresAt <= new Date();

      if (
        !user.mfaLoginChallengeHash ||
        user.mfaLoginChallengeHash !== challengeHash ||
        challengeExpired
      ) {
        user.mfaLoginChallengeHash = null;
        user.mfaLoginChallengeExpiresAt = null;
        user.mfaLoginAttempts = 0;
        await user.save();

        logger.info(`MFA challenge invalid for ${normalizedEmail}`);
        return res.status(401).json({ message: "MFA challenge je istekao." });
      }

      if (user.mfaLoginAttempts >= 5) {
        return res
          .status(429)
          .json({ message: "Previše neuspešnih MFA pokušaja." });
      }

      const normalizedBackupCode = hashBackupCode(otpCode);
      const backupCodeIndex = user.mfaBackupCodeHashes.findIndex(
        (codeHash) => codeHash === normalizedBackupCode,
      );
      const validTotp = verifyAuthenticatorCode(user.mfaSecret, otpCode);
      const validBackupCode = backupCodeIndex !== -1;

      if (!validTotp && !validBackupCode) {
        user.mfaLoginAttempts += 1;
        await user.save();

        logger.info(`MFA verification failed for ${normalizedEmail}`);
        return res.status(401).json({ message: "Neispravan MFA kod." });
      }

      if (validBackupCode) {
        user.mfaBackupCodeHashes.splice(backupCodeIndex, 1);
      }

      const refreshToken = await issueLoginTokens(user, req, res);

      logger.info(`MFA verification success for ${normalizedEmail}`);

      return res.json({
        message: "Uspešno logovanje.",
        refreshToken,
        user: getAuthUserResponse(user),
      });
    }

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
        .json({ message: "Previše neuspešnih OTP pokušaja." });
    }

    if (user.otpCode !== otpCode) {
      user.otpAttempts += 1;
      await user.save();

      logger.info(`OTP verification failed for ${normalizedEmail}`);

      if (user.otpAttempts > 5) {
        return res
          .status(429)
          .json({ message: "Previše neuspešnih OTP pokušaja." });
      }

      return res.status(401).json({ message: "Neispravan OTP kod." });
    }

    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;

    const refreshToken = await issueLoginTokens(user, req, res);

    logger.info(`OTP verification success for ${normalizedEmail}`);

    return res.json({
      message: "Uspešno logovanje.",
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

// MFA SETUP
router.post("/mfa/setup", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Korisnik nije pronađen." });
    }

    if (user.mfaEnabled) {
      return res.status(400).json({ message: "MFA je već uključen." });
    }

    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: MFA_ISSUER,
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    user.mfaTempSecret = secret;
    await user.save();

    return res.json({
      message: "MFA setup je kreiran.",
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška pri MFA setup-u." });
  }
});

// MFA VERIFY SETUP
router.post("/mfa/verify", requireAuth, async (req, res) => {
  try {
    const { code } = req.body ?? {};

    if (!code) {
      return res.status(400).json({ message: "MFA kod je obavezan." });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Korisnik nije pronađen." });
    }

    if (!user.mfaTempSecret) {
      return res.status(400).json({ message: "MFA setup nije pokrenut." });
    }

    if (!verifyAuthenticatorCode(user.mfaTempSecret, code)) {
      return res.status(401).json({ message: "Neispravan MFA kod." });
    }

    const backupCodes = generateBackupCodes();
    user.mfaEnabled = true;
    user.mfaSecret = user.mfaTempSecret;
    user.mfaTempSecret = null;
    user.mfaBackupCodeHashes = backupCodes.map(hashBackupCode);

    await user.save();

    return res.json({
      message: "MFA je uspešno uključen.",
      backupCodes,
      user: getAuthUserResponse(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška pri MFA verifikaciji." });
  }
});

// MFA DISABLE
router.post("/mfa/disable", requireAuth, async (req, res) => {
  try {
    const { code } = req.body ?? {};

    if (!code) {
      return res.status(400).json({ message: "MFA kod je obavezan." });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Korisnik nije pronađen." });
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({ message: "MFA nije uključen." });
    }

    const backupCodeHash = hashBackupCode(code);
    const backupCodeIndex = user.mfaBackupCodeHashes.findIndex(
      (codeHash) => codeHash === backupCodeHash,
    );
    const validCode =
      verifyAuthenticatorCode(user.mfaSecret, code) || backupCodeIndex !== -1;

    if (!validCode) {
      return res.status(401).json({ message: "Neispravan MFA kod." });
    }

    user.mfaEnabled = false;
    user.mfaSecret = null;
    user.mfaTempSecret = null;
    user.mfaBackupCodeHashes = [];
    user.mfaLoginChallengeHash = null;
    user.mfaLoginChallengeExpiresAt = null;
    user.mfaLoginAttempts = 0;

    await user.save();

    return res.json({
      message: "MFA je isključen.",
      user: getAuthUserResponse(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška pri isključivanju MFA." });
  }
});

// WEBAUTHN REGISTRATION OPTIONS
router.post("/webauthn/register/options", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Korisnik nije pronađen." });
    }

    const options = await createRegistrationOptions(user);
    user.webauthnRegistrationChallenge = options.challenge;
    user.webauthnRegistrationChallengeExpiresAt = challengeExpiresAt();
    await user.save();

    return res.json({ options });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Greška pri kreiranju passkey challenge-a." });
  }
});

// WEBAUTHN REGISTRATION VERIFY
router.post("/webauthn/register/verify", requireAuth, async (req, res) => {
  try {
    const { credential } = req.body ?? {};
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "Korisnik nije pronađen." });
    }

    if (!credential) {
      return res.status(400).json({ message: "Credential response nedostaje." });
    }

    if (
      !user.webauthnRegistrationChallenge ||
      !isChallengeValid(user.webauthnRegistrationChallengeExpiresAt)
    ) {
      user.webauthnRegistrationChallenge = null;
      user.webauthnRegistrationChallengeExpiresAt = null;
      await user.save();

      return res.status(401).json({ message: "Passkey challenge je istekao." });
    }

    const verification = await verifyRegistration({
      user,
      response: credential,
      expectedChallenge: user.webauthnRegistrationChallenge,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(401).json({ message: "Passkey registracija nije uspela." });
    }

    const newCredential = registrationInfoToCredential(
      verification.registrationInfo,
    );
    const existingCredential = await User.findOne({
      "webauthnCredentials.credentialID": newCredential.credentialID,
    });

    if (existingCredential) {
      return res
        .status(409)
        .json({ message: "Ovaj passkey je već registrovan." });
    }

    const recoveryCodes = generateRecoveryCodes();

    user.webauthnCredentials.push(newCredential);
    user.webauthnEnabled = true;
    user.webauthnRecoveryCodeHashes = recoveryCodes.map(hashRecoveryCode);
    user.webauthnRegistrationChallenge = null;
    user.webauthnRegistrationChallengeExpiresAt = null;
    await user.save();

    return res.json({
      message: "Passkey je uspešno aktiviran.",
      recoveryCodes,
      user: getAuthUserResponse(user),
    });
  } catch (error) {
    console.error(error);
    logger.error(error.stack || error.message || error);
    return res
      .status(400)
      .json({
        message: "Neuspešna passkey registracija.",
        detail:
          process.env.NODE_ENV === "production"
            ? undefined
            : error.message || String(error),
      });
  }
});

// WEBAUTHN LOGIN OPTIONS
router.post("/webauthn/login/options", loginLimiter, async (req, res) => {
  try {
    const { email } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ message: "Email je obavezan." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.webauthnEnabled || getActiveCredentials(user).length === 0) {
      return res
        .status(404)
        .json({ message: "Passkey nije aktiviran za ovaj nalog." });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message:
          "Email nije verifikovan. Proveri inbox i potvrdi email pre logovanja.",
      });
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      return res.status(403).json({ message: "Nalog je privremeno blokiran." });
    }

    const options = await createAuthenticationOptions(user);
    user.webauthnAuthenticationChallenge = options.challenge;
    user.webauthnAuthenticationChallengeExpiresAt = challengeExpiresAt();
    await user.save();

    return res.json({ options, email: user.email });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Greška pri kreiranju passkey login challenge-a." });
  }
});

// WEBAUTHN LOGIN VERIFY
router.post("/webauthn/login/verify", loginLimiter, async (req, res) => {
  try {
    const { email, credential } = req.body ?? {};

    if (!email || !credential) {
      return res
        .status(400)
        .json({ message: "Email i credential response su obavezni." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.webauthnEnabled) {
      return res.status(404).json({ message: "Passkey nalog nije pronađen." });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        message:
          "Email nije verifikovan. Proveri inbox i potvrdi email pre logovanja.",
      });
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      return res.status(403).json({ message: "Nalog je privremeno blokiran." });
    }

    if (
      !user.webauthnAuthenticationChallenge ||
      !isChallengeValid(user.webauthnAuthenticationChallengeExpiresAt)
    ) {
      user.webauthnAuthenticationChallenge = null;
      user.webauthnAuthenticationChallengeExpiresAt = null;
      await user.save();

      return res.status(401).json({ message: "Passkey challenge je istekao." });
    }

    const storedCredential = getActiveCredentials(user).find(
      (item) => item.credentialID === credential.id,
    );

    if (!storedCredential) {
      return res.status(404).json({ message: "Credential nije pronađen." });
    }

    const verification = await verifyAuthentication({
      response: credential,
      credential: storedCredential,
      expectedChallenge: user.webauthnAuthenticationChallenge,
    });

    if (!verification.verified) {
      return res.status(401).json({ message: "Passkey prijava nije uspela." });
    }

    storedCredential.counter = verification.authenticationInfo.newCounter;
    storedCredential.lastUsedAt = new Date();
    user.webauthnAuthenticationChallenge = null;
    user.webauthnAuthenticationChallengeExpiresAt = null;

    if (user.mfaEnabled && user.mfaSecret) {
      const challenge = generateMfaChallenge();
      user.failedLoginCount = 0;
      user.blockedUntil = null;
      user.mfaLoginChallengeHash = challenge.hash;
      user.mfaLoginChallengeExpiresAt = challenge.expiresAt;
      user.mfaLoginAttempts = 0;
      await user.save();

      return res.json({
        message: "MFA verification required",
        requiresMfa: true,
        email: user.email,
        challengeToken: challenge.token,
      });
    }

    const refreshToken = await issueLoginTokens(user, req, res);

    return res.json({
      message: "Uspešno logovanje preko passkey-ja.",
      refreshToken,
      user: getAuthUserResponse(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Neuspešna passkey prijava." });
  }
});

// WEBAUTHN RECOVERY
router.post("/webauthn/recovery", loginLimiter, async (req, res) => {
  try {
    const { email, recoveryCode } = req.body ?? {};

    if (!email || !recoveryCode) {
      return res
        .status(400)
        .json({ message: "Email i recovery kod su obavezni." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.webauthnEnabled) {
      return res.status(404).json({ message: "Passkey nalog nije pronađen." });
    }

    const codeHash = hashRecoveryCode(recoveryCode);

    if (!user.webauthnRecoveryCodeHashes.includes(codeHash)) {
      return res.status(401).json({ message: "Recovery kod nije validan." });
    }

    user.webauthnEnabled = false;
    user.webauthnCredentials = [];
    user.webauthnRecoveryCodeHashes = [];
    user.webauthnRegistrationChallenge = null;
    user.webauthnRegistrationChallengeExpiresAt = null;
    user.webauthnAuthenticationChallenge = null;
    user.webauthnAuthenticationChallengeExpiresAt = null;

    if (user.mfaEnabled && user.mfaSecret) {
      const challenge = generateMfaChallenge();
      user.mfaLoginChallengeHash = challenge.hash;
      user.mfaLoginChallengeExpiresAt = challenge.expiresAt;
      user.mfaLoginAttempts = 0;
      await user.save();

      return res.json({
        message: "Passkey je deaktiviran. Potrebna je MFA potvrda.",
        requiresMfa: true,
        email: user.email,
        challengeToken: challenge.token,
      });
    }

    const refreshToken = await issueLoginTokens(user, req, res);

    return res.json({
      message: "Recovery uspešan. Passkey je deaktiviran.",
      refreshToken,
      user: getAuthUserResponse(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Greška pri passkey recovery toku." });
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
      if (req.user.mfaEnabled && req.user.mfaSecret) {
        const challenge = generateMfaChallenge();
        req.user.failedLoginCount = 0;
        req.user.blockedUntil = null;
        req.user.mfaLoginChallengeHash = challenge.hash;
        req.user.mfaLoginChallengeExpiresAt = challenge.expiresAt;
        req.user.mfaLoginAttempts = 0;
        await req.user.save();

        return res.redirect(
          `http://localhost:3000/verify-otp?email=${encodeURIComponent(req.user.email)}&challengeToken=${encodeURIComponent(challenge.token)}`,
        );
      }

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
      "email role emailVerified lastLoginAt loginHistory createdAt updatedAt name googleId mfaEnabled webauthnEnabled webauthnCredentials",
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
        mfaEnabled: !!user.mfaEnabled,
        webauthnEnabled: !!user.webauthnEnabled,
        webauthnCredentialCount: getActiveCredentials(user).length,
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
          mfaEnabled: !!user.mfaEnabled,
          webauthnEnabled: !!user.webauthnEnabled,
          webauthnCredentialCount: getActiveCredentials(user).length,
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
