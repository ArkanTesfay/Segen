import type { NextAuthOptions } from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';
import { isAuthMocked } from '@segen/auth/src/index';

const COGNITO_DOMAIN = process.env.COGNITO_DOMAIN ?? '';
const COGNITO_CLIENT_ID = process.env.COGNITO_WEB_CLIENT_ID ?? '';
const COGNITO_CLIENT_SECRET = process.env.COGNITO_WEB_CLIENT_SECRET ?? '';

const ID_TOKEN_LIFETIME_SECONDS = 3600;

/**
 * Cognito ID tokens live 1h while this session lives 4h, so refresh on demand —
 * otherwise the Go API would start answering 401 for an already signed-in user.
 */
async function refreshCognitoTokens(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: COGNITO_CLIENT_ID,
    refresh_token: refreshToken,
  });
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  // Confidential app clients must authenticate; Cognito accepts HTTP Basic here.
  if (COGNITO_CLIENT_SECRET) {
    headers.Authorization = `Basic ${Buffer.from(
      `${COGNITO_CLIENT_ID}:${COGNITO_CLIENT_SECRET}`,
    ).toString('base64')}`;
  }
  const res = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, { method: 'POST', headers, body, cache: 'no-store' });
  if (!res.ok) throw new Error(`Cognito refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id_token?: string; access_token?: string; expires_in?: number };
}

// Shared by the [...nextauth] route + any server component calling getServerSession().
// Kept outside the route file because Next.js routes only allow GET/POST/etc exports.
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? 'dev-only-secret-change-me',
  session: { strategy: 'jwt', maxAge: 4 * 3600 },
  providers: isAuthMocked()
    ? []
    : [
        CognitoProvider({
          clientId: process.env.COGNITO_WEB_CLIENT_ID || 'pending-cdk-deploy',
          // NextAuth runs on the server, so it CAN keep a secret safely — preferred.
          // If your app client is "public" (no secret) set COGNITO_WEB_CLIENT_SECRET empty
          // and Cognito must also have "no client secret" enabled for that client.
          clientSecret: process.env.COGNITO_WEB_CLIENT_SECRET || '',
          issuer: process.env.COGNITO_ISSUER || 'https://cognito-idp.us-east-1.amazonaws.com/pending',
        }),
      ],
  callbacks: {
    // Keep the Cognito tokens on the NextAuth JWT — web reads `session.idToken`
    // and sends it as the Bearer for every Go API call.
    async jwt({ token, account }) {
      if (account) {
        token.idToken = account.id_token;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ?? Math.floor(Date.now() / 1000) + ID_TOKEN_LIFETIME_SECONDS;
        return token;
      }
      const expiringSoon =
        typeof token.expiresAt === 'number' && Date.now() / 1000 > token.expiresAt - 60;
      if (expiringSoon && token.refreshToken && COGNITO_DOMAIN) {
        try {
          const fresh = await refreshCognitoTokens(token.refreshToken);
          token.idToken = fresh.id_token ?? token.idToken;
          token.accessToken = fresh.access_token ?? token.accessToken;
          token.expiresAt = Math.floor(Date.now() / 1000) + (fresh.expires_in ?? ID_TOKEN_LIFETIME_SECONDS);
          token.error = undefined;
        } catch (e) {
          console.error('[segen] Cognito token refresh failed', e);
          token.error = 'RefreshTokenError';
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.idToken = token.idToken;
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
};

