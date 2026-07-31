import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const scope = "https://www.googleapis.com/auth/gmail.compose";

type GmailConfig = { clientId: string; clientSecret: string };
type GmailToken = { accessToken: string; refreshToken: string; expiresAt: number; email: string };
type OAuthState = { state: string; verifier: string; expiresAt: number };

function files(dataRoot: string) {
  return {
    config: path.join(dataRoot, "gmail-oauth-config.json"),
    token: path.join(dataRoot, "gmail-oauth-token.json"),
    state: path.join(dataRoot, "gmail-oauth-state.json"),
  };
}

async function atomicJson(target: string, value: unknown) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  await rename(temporary, target);
}

export async function loadGmailConfig(dataRoot: string): Promise<GmailConfig | null> {
  try {
    const parsed = JSON.parse(await readFile(files(dataRoot).config, "utf8")) as GmailConfig;
    return parsed.clientId && parsed.clientSecret ? parsed : null;
  } catch { return null; }
}

export async function saveGmailConfig(dataRoot: string, config: GmailConfig) {
  if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(config.clientId.trim())) throw new Error("Enter a valid Google OAuth client ID.");
  if (config.clientSecret.trim().length < 10) throw new Error("Enter the Google OAuth client secret.");
  await atomicJson(files(dataRoot).config, { clientId: config.clientId.trim(), clientSecret: config.clientSecret.trim() });
}

function encryptionKey(secret: string) {
  return createHash("sha256").update(`pro-flow-gmail-token:${secret}`).digest();
}

async function saveToken(dataRoot: string, config: GmailConfig, token: GmailToken) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(config.clientSecret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(token), "utf8"), cipher.final()]);
  await atomicJson(files(dataRoot).token, {
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
  });
}

async function loadToken(dataRoot: string, config: GmailConfig): Promise<GmailToken | null> {
  try {
    const stored = JSON.parse(await readFile(files(dataRoot).token, "utf8")) as { iv: string; tag: string; ciphertext: string };
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(config.clientSecret), Buffer.from(stored.iv, "base64"));
    decipher.setAuthTag(Buffer.from(stored.tag, "base64"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(stored.ciphertext, "base64")), decipher.final()]).toString("utf8")) as GmailToken;
  } catch { return null; }
}

export async function gmailStatus(dataRoot: string) {
  const config = await loadGmailConfig(dataRoot);
  const token = config ? await loadToken(dataRoot, config) : null;
  return { configured: Boolean(config), connected: Boolean(token?.refreshToken), email: token?.email ?? "" };
}

export async function beginGmailOAuth(dataRoot: string, redirectUri: string) {
  const config = await loadGmailConfig(dataRoot);
  if (!config) throw new Error("Save the Google OAuth client credentials first.");
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  await atomicJson(files(dataRoot).state, { state, verifier, expiresAt: Date.now() + 10 * 60_000 } satisfies OAuthState);
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent select_account",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
}

export async function completeGmailOAuth(dataRoot: string, redirectUri: string, code: string, returnedState: string) {
  const config = await loadGmailConfig(dataRoot);
  if (!config) throw new Error("Google OAuth is not configured.");
  let pending: OAuthState;
  try { pending = JSON.parse(await readFile(files(dataRoot).state, "utf8")) as OAuthState; } catch { throw new Error("The Gmail connection request expired. Start again."); }
  await rm(files(dataRoot).state, { force: true });
  if (pending.state !== returnedState || pending.expiresAt < Date.now()) throw new Error("The Gmail authorization response could not be verified.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: pending.verifier }),
  });
  const result = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !result.access_token || !result.refresh_token) throw new Error(result.error_description ?? "Google did not return a reusable Gmail authorization.");
  const profileResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers: { authorization: `Bearer ${result.access_token}` } });
  const profile = await profileResponse.json() as { emailAddress?: string };
  if (!profileResponse.ok || !profile.emailAddress) throw new Error("Gmail connected, but the account address could not be verified.");
  await saveToken(dataRoot, config, { accessToken: result.access_token, refreshToken: result.refresh_token, expiresAt: Date.now() + (result.expires_in ?? 3600) * 1000, email: profile.emailAddress });
  return profile.emailAddress;
}

async function accessToken(dataRoot: string) {
  const config = await loadGmailConfig(dataRoot);
  if (!config) throw new Error("Gmail is not configured.");
  const token = await loadToken(dataRoot, config);
  if (!token) throw new Error("Connect Gmail before creating a draft.");
  if (token.expiresAt > Date.now() + 60_000) return token.accessToken;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: token.refreshToken, grant_type: "refresh_token" }),
  });
  const refreshed = await response.json() as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !refreshed.access_token) throw new Error(refreshed.error_description ?? "Gmail authorization expired. Reconnect Gmail.");
  await saveToken(dataRoot, config, { ...token, accessToken: refreshed.access_token, expiresAt: Date.now() + (refreshed.expires_in ?? 3600) * 1000 });
  return refreshed.access_token;
}

export async function createGmailDraft(dataRoot: string, rawMessage: Buffer) {
  const token = await accessToken(dataRoot);
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ message: { raw: rawMessage.toString("base64url") } }),
  });
  const result = await response.json() as { id?: string; message?: { id?: string }; error?: { message?: string } };
  if (!response.ok || !result.id) throw new Error(result.error?.message ?? "Gmail could not create the draft.");
  return { draftId: result.id, messageId: result.message?.id ?? "" };
}

export async function disconnectGmail(dataRoot: string) {
  await rm(files(dataRoot).token, { force: true });
}
