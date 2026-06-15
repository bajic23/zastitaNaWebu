type CredentialCreationOptionsJSON = {
  challenge: string;
  rp: PublicKeyCredentialRpEntity;
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  excludeCredentials?: Array<Omit<PublicKeyCredentialDescriptor, "id"> & { id: string }>;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  extensions?: AuthenticationExtensionsClientInputs;
};

type CredentialRequestOptionsJSON = {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<Omit<PublicKeyCredentialDescriptor, "id"> & { id: string }>;
  userVerification?: UserVerificationRequirement;
  extensions?: AuthenticationExtensionsClientInputs;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

function base64UrlToArrayBuffer(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null) {
  if (!buffer) return null;

  const bytes = new Uint8Array(buffer);
  let value = "";

  for (let index = 0; index < bytes.byteLength; index += 1) {
    value += String.fromCharCode(bytes[index]);
  }

  return window
    .btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function parseCreationOptions(options: CredentialCreationOptionsJSON) {
  return {
    ...options,
    challenge: base64UrlToArrayBuffer(options.challenge),
    user: {
      ...options.user,
      id: base64UrlToArrayBuffer(options.user.id),
    },
    excludeCredentials: options.excludeCredentials?.map((credential) => ({
      ...credential,
      id: base64UrlToArrayBuffer(credential.id),
    })),
  } satisfies PublicKeyCredentialCreationOptions;
}

function parseRequestOptions(options: CredentialRequestOptionsJSON) {
  return {
    ...options,
    challenge: base64UrlToArrayBuffer(options.challenge),
    allowCredentials: options.allowCredentials?.map((credential) => ({
      ...credential,
      id: base64UrlToArrayBuffer(credential.id),
    })),
  } satisfies PublicKeyCredentialRequestOptions;
}

function registrationCredentialToJSON(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: arrayBufferToBase64Url(response.attestationObject),
      clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
      transports:
        typeof response.getTransports === "function"
          ? response.getTransports()
          : [],
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

function authenticationCredentialToJSON(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
      clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
      signature: arrayBufferToBase64Url(response.signature),
      userHandle: arrayBufferToBase64Url(response.userHandle),
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || "WebAuthn zahtev nije uspeo.");
  }

  return data;
}

export function browserSupportsPasskeys() {
  return (
    typeof window !== "undefined" &&
    "PublicKeyCredential" in window &&
    !!navigator.credentials
  );
}

export async function registerPasskey() {
  if (!browserSupportsPasskeys()) {
    throw new Error("Ovaj browser ne podržava WebAuthn/passkey.");
  }

  const optionsRes = await fetch(`${apiUrl}/api/auth/webauthn/register/options`, {
    method: "POST",
    credentials: "include",
  });
  const { options } = await readJsonResponse<{ options: CredentialCreationOptionsJSON }>(
    optionsRes,
  );

  const credential = (await navigator.credentials.create({
    publicKey: parseCreationOptions(options),
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Passkey registracija je otkazana.");
  }

  const verifyRes = await fetch(`${apiUrl}/api/auth/webauthn/register/verify`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: registrationCredentialToJSON(credential) }),
  });

  return readJsonResponse<{
    message?: string;
    recoveryCodes?: string[];
    user?: unknown;
  }>(verifyRes);
}

export async function loginWithPasskey(email: string) {
  if (!browserSupportsPasskeys()) {
    throw new Error("Ovaj browser ne podržava WebAuthn/passkey.");
  }

  const normalizedEmail = email.trim();
  const optionsRes = await fetch(`${apiUrl}/api/auth/webauthn/login/options`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalizedEmail }),
  });
  const { options } = await readJsonResponse<{ options: CredentialRequestOptionsJSON }>(
    optionsRes,
  );

  const credential = (await navigator.credentials.get({
    publicKey: parseRequestOptions(options),
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Passkey prijava je otkazana.");
  }

  const verifyRes = await fetch(`${apiUrl}/api/auth/webauthn/login/verify`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: normalizedEmail,
      credential: authenticationCredentialToJSON(credential),
    }),
  });

  return readJsonResponse<{
    message?: string;
    refreshToken?: string;
    requiresMfa?: boolean;
    email?: string;
    challengeToken?: string;
    user?: { role?: string };
  }>(verifyRes);
}

export async function recoverPasskey(email: string, recoveryCode: string) {
  const res = await fetch(`${apiUrl}/api/auth/webauthn/recovery`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), recoveryCode }),
  });

  return readJsonResponse<{
    message?: string;
    refreshToken?: string;
    requiresMfa?: boolean;
    email?: string;
    challengeToken?: string;
    user?: { role?: string };
  }>(res);
}
