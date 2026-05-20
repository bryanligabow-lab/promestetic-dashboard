import { NextRequest, NextResponse } from 'next/server';
import { checkCredentials, makeSessionToken, AUTH_COOKIE, AUTH_MAX_AGE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) {
    return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 });
  }
  if (!checkCredentials(username, password)) {
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });
  }
  const token = await makeSessionToken(username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: AUTH_MAX_AGE,
    path: '/',
  });
  return res;
}
