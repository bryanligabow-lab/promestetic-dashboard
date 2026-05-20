/**
 * Auth simple por cookie firmada.
 * Credenciales en env vars: AUTH_USER, AUTH_PASSWORD, AUTH_SECRET.
 */
import crypto from 'crypto';

const COOKIE_NAME = 'pmst_session';
const ONE_WEEK = 60 * 60 * 24 * 7;

function getSecret() {
  return process.env.AUTH_SECRET || 'dev-secret-change-me';
}

function sign(value: string): string {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

export function makeSessionToken(username: string): string {
  const issued = Date.now().toString();
  const payload = `${username}.${issued}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): { username: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [user, issued, sig] = parts;
  const expected = sign(`${user}.${issued}`);
  // timing-safe compare
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  // Expiración: 7 días
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
