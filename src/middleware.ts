import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, AUTH_COOKIE } from '@/lib/auth';

/**
 * Protege todas las rutas del dashboard. Permite acceso libre a:
 * - /login
 * - /api/auth/* (login/logout)
 * - /api/webhook/* (Evolution debe llamar sin auth)
 * - assets estáticos (/_next, /favicon, /uploads)
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Reescribir /uploads/X.png → /api/file/X.png
  // Necesario porque Next.js standalone no sirve archivos del volumen en runtime.
  if (pathname.startsWith('/uploads/')) {
    const filename = pathname.replace('/uploads/', '');
    const url = req.nextUrl.clone();
    url.pathname = `/api/file/${filename}`;
    return NextResponse.rewrite(url);
  }

  // Públicos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/webhook/') ||
    pathname.startsWith('/api/file/')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    // Para API → 401 JSON
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: 'no autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Para páginas → redirige a /login
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
