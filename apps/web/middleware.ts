import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthMocked } from '@segen/auth/src/index';

/**
 * Sign-in-only app: while signed out, users may only reach the sign-in flow
 * itself and the logout landing page. Everything else bounces to sign-in.
 * `/api/auth` stays public because NextAuth's sign-in callback and the
 * sign-out POST need to work with no session.
 */
const PUBLIC_PATHS = ['/signin', '/signout', '/api/auth'];

function isSignedIn(req: NextRequest): boolean {
  // Real Cognito session is an HttpOnly NextAuth cookie. When the Cognito
  // tokens (id + access + refresh) push the session past the browser's 4KB
  // cookie limit, NextAuth stores it in numbered chunks — `...session-token.0`,
  // `.1`, … — so any chunk counts as signed in. Only checking the base name
  // would make every signed-in request look anonymous and cause a redirect
  // loop straight after a successful Cognito callback.
  const prefixes = ['next-auth.session-token', '__Secure-next-auth.session-token'];
  if (prefixes.some((p) => req.cookies.get(p) ?? req.cookies.get(`${p}.0`))) {
    return true;
  }
  // Demo fallback (only meaningful while Cognito env is absent).
  if (isAuthMocked() && req.cookies.get('segen-demo-user')) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const signedIn = isSignedIn(req);

  // Already signed in — the sign-in page is not for you.
  if (signedIn && (path === '/signin' || path.startsWith('/signin/'))) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  if (signedIn || isPublic) return NextResponse.next();

  // Signed out: everything bounces to /signin — the only visible page. In real
  // mode that page is a bridge that forwards straight to the Cognito Hosted UI.
  const url = req.nextUrl.clone();
  url.pathname = '/signin';
  url.search = '';
  // Preserve the deep link so the user lands back where they were headed.
  url.searchParams.set('callbackUrl', path + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on every route except Next.js internals and static assets — this wide
  // matcher is what makes the entire app sign-in-only.
  matcher: [
    '/((?!_next|favicon\\.ico|.*\\.(?:svg|png|jpe?g|gif|webp|ico|txt|xml|webmanifest|map)$).*)',
  ],
};