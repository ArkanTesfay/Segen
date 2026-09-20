import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthMocked } from '@segen/auth/src/index';

const PROTECTED = ['/watch', '/my-list'];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const needsAuth = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();

  // Real Cognito session is an HttpOnly NextAuth cookie.
  const sessionCookie =
    req.cookies.get('next-auth.session-token') ?? req.cookies.get('__Secure-next-auth.session-token');
  if (sessionCookie) return NextResponse.next();

  const mocked = isAuthMocked();
  // Demo fallback (only meaningful while Cognito env is absent).
  if (mocked && req.cookies.get('segen-demo-user')) return NextResponse.next();

  const url = req.nextUrl.clone();
  if (mocked) {
    url.pathname = '/signin';
  } else {
    // Hand straight to the Cognito provider — /signin is the demo-only form.
    url.pathname = '/api/auth/signin/cognito';
  }
  url.searchParams.set('callbackUrl', path);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/watch/:path*', '/my-list/:path*'],
};