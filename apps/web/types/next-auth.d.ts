import type { DefaultSession } from 'next-auth';

/**
 * NextAuth ships the Cognito tokens to the app via the jwt/session callbacks in
 * lib/auth.ts, so the client session type needs them declared.
 */
declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'];
    /** Cognito ID token — sent as `Authorization: Bearer` to the Go API. */
    idToken?: string;
    accessToken?: string;
    error?: 'RefreshTokenError';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: 'RefreshTokenError';
  }
}
