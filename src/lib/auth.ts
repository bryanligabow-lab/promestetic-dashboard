/**
 * Auth simple por cookie firmada con HMAC-SHA256.
 * Usa Web Crypto API (SubtleCrypto) para que funcione tanto en
 * Node runtime como en Edge runtime (middleware).
 */

const COOKIE_NAME = 'pmst_session';
const ONE_WEEK = 60 * 60 * 24 * 7;

function getSecret(): string {
  return process.env.AUTH_SECRET || 'dev-secret-change-me';
}

const encoder = new TextEncoder();

async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

async function sign(value: string): Promise<string> {
  const key = await importKey();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return toHex(sig);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function makeSessionToken(username: string): Promise<string> {
  const issued = Date.now().toString();
  const payload = `${username}.${issued}`;
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ username: string } | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [user, issued, sig] = parts;
  const expected = await sign(`${user}.${issued}`);
  if (!timingSafeEqualHex(sig, expected)) return null;
  const ageMs = Date.now() - Number(issued);
  if (Number.isNaN(ageMs) || ageMs > ONE_WEEK * 1000) return null;
  return { username: user };
}

export function checkCredentials(user: string, pass: string): boolean {
  const expectedUser = process.env.AUTH_USER || '';
  const expectedPass = process.env.AUTH_PASSWORD || '';
  if (!expectedUser || !expectedPass) return false;
  return user === expectedUser && pass === expectedPass;
}

export const AUTH_COOKIE = COOKIE_NAME;
export const AUTH_MAX_AGE = ONE_WEEK;
