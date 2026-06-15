const crypto = require("crypto");
const {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} = require("@simplewebauthn/server");

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function getWebAuthnConfig() {
  return {
    rpName: process.env.WEBAUTHN_RP_NAME || "ZastitaNaWebu",
    rpID: process.env.WEBAUTHN_RP_ID || "localhost",
    origin: process.env.WEBAUTHN_ORIGIN || "http://localhost:3000",
  };
}

function challengeExpiresAt() {
  return new Date(Date.now() + CHALLENGE_TTL_MS);
}

function isChallengeValid(expiresAt) {
  return !!expiresAt && expiresAt > new Date();
}

function bufferToBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlToUint8Array(value) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

function getActiveCredentials(user) {
  return (user.webauthnCredentials || []).filter(
    (credential) => credential.credentialID && credential.publicKey,
  );
}

async function createRegistrationOptions(user) {
  const { rpName, rpID } = getWebAuthnConfig();
  const credentials = getActiveCredentials(user);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: Buffer.from(user._id.toString()),
    userName: user.email,
    userDisplayName: user.name || user.email,
    attestationType: "none",
    excludeCredentials: credentials.map((credential) => ({
      id: credential.credentialID,
      transports: credential.transports || [],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    supportedAlgorithmIDs: [-7, -257],
  });

  return options;
}

async function verifyRegistration({ user, response, expectedChallenge }) {
  const { rpID, origin } = getWebAuthnConfig();

  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });
}

async function createAuthenticationOptions(user) {
  const { rpID } = getWebAuthnConfig();
  const credentials = getActiveCredentials(user);

  return generateAuthenticationOptions({
    rpID,
    allowCredentials: credentials.map((credential) => ({
      id: credential.credentialID,
      transports: credential.transports || [],
    })),
    userVerification: "preferred",
  });
}

async function verifyAuthentication({ response, credential, expectedChallenge }) {
  const { rpID, origin } = getWebAuthnConfig();

  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
    credential: {
      id: credential.credentialID,
      publicKey: base64UrlToUint8Array(credential.publicKey),
      counter: credential.counter || 0,
      transports: credential.transports || [],
    },
  });
}

function registrationInfoToCredential(registrationInfo) {
  const { credential, credentialDeviceType, credentialBackedUp } =
    registrationInfo;

  return {
    credentialID: credential.id,
    publicKey: bufferToBase64Url(credential.publicKey),
    counter: credential.counter || 0,
    deviceType: credentialDeviceType || null,
    backedUp: !!credentialBackedUp,
    transports: credential.transports || [],
    createdAt: new Date(),
    lastUsedAt: null,
  };
}

function generateRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(5).toString("hex").toUpperCase(),
  );
}

function normalizeRecoveryCode(code) {
  return String(code || "").trim().replace(/\s+/g, "").toUpperCase();
}

function hashRecoveryCode(code) {
  return crypto
    .createHash("sha256")
    .update(normalizeRecoveryCode(code))
    .digest("hex");
}

module.exports = {
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
};
