import type { Session } from 'next-auth';

/**
 * The Bearer the Go API expects. The Cognito **ID token** is preferred: it
 * carries `aud` (the app client the Go verifier binds to) plus `email`, which
 * the API needs to upsert the `users` row. Access token is the fallback.
 */
export function apiTokenFrom(session: Session | null | undefined): string | undefined {
  return session?.idToken ?? session?.accessToken;
}
