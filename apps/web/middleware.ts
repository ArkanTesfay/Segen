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
  // Real Cognito session is an HttpOnly NextAuth cookie.
  if (req.cookies.get('next-auth.session-token') ?? req.cookies.get('__Secure-next-auth.session-token')) {
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