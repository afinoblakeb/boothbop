import { createPrivateKey, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const API_ROOT = "https://api.appstoreconnect.apple.com";
const DEFAULT_SECRETS_PATH = path.join(
  os.homedir(),
  ".config",
  "afino",
  "secrets.env",
);

function expandHome(value) {
  return value.startsWith("~/")
    ? path.join(os.homedir(), value.slice(2))
    : value;
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

export async function loadAppStoreCredentials() {
  const values = { ...process.env };
  const secretsPath =
    process.env.APPCONNECT_SECRETS_PATH ?? DEFAULT_SECRETS_PATH;

  try {
    for (const rawLine of (await readFile(secretsPath, "utf8")).split(
      /\r?\n/,
    )) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const separator = line.indexOf("=");
      const key = line.slice(0, separator).trim();
      const value = line
        .slice(separator + 1)
        .trim()
        .replace(/^(['"])(.*)\1$/, "$2");
      if (!values[key]) values[key] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const credentials = {
    keyId: values.APPCONNECT_KEY_ID,
    issuerId: values.APPCONNECT_ISSUER_ID,
    keyPath: values.APPCONNECT_KEY_PATH
      ? expandHome(values.APPCONNECT_KEY_PATH)
      : undefined,
  };
  const missing = Object.entries(credentials)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(
      `Missing App Store Connect credentials: ${missing.join(", ")}. See docs/RELEASE.md.`,
    );
  }
  return credentials;
}

export async function createAppStoreToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(
    JSON.stringify({ alg: "ES256", kid: credentials.keyId, typ: "JWT" }),
  );
  const payload = base64url(
    JSON.stringify({
      iss: credentials.issuerId,
      iat: now,
      exp: now + 600,
      aud: "appstoreconnect-v1",
    }),
  );
  const key = createPrivateKey(await readFile(credentials.keyPath));
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key,
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

export class AppStoreConnectClient {
  constructor(credentials) {
    this.credentials = credentials;
    this.token = null;
    this.tokenCreatedAt = 0;
  }

  async request(apiPath, { method = "GET", body } = {}) {
    if (!this.token || Date.now() - this.tokenCreatedAt > 8 * 60 * 1000) {
      this.token = await createAppStoreToken(this.credentials);
      this.tokenCreatedAt = Date.now();
    }
    const response = await fetch(new URL(apiPath, API_ROOT), {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 204) return null;

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const details = payload?.errors
        ?.map((item) =>
          [item.status, item.code, item.title, item.detail]
            .filter(Boolean)
            .join(" "),
        )
        .join("; ");
      throw new Error(
        `App Store Connect ${method} ${apiPath} failed (${response.status})${
          details ? `: ${details}` : ""
        }`,
      );
    }
    return payload;
  }
}

export async function createAppStoreClient() {
  return new AppStoreConnectClient(await loadAppStoreCredentials());
}
