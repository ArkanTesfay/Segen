export interface SegenSessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  idToken?: string;
  accessToken?: string;
}

export function getCognitoEnv() {
  return {
    issuer: process.env.COGNITO_ISSUER ?? process.env.NEXT_PUBLIC_COGNITO_ISSUER ?? '',
    clientId: process.env.COGNITO_WEB_CLIENT_ID ?? process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '',
    domain: process.env.COGNITO_DOMAIN ?? process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? '',
    region: process.env.AWS_REGION ?? 'us-east-1',
  };
}

/** Dev fallback so `bun run dev` works before `terraform apply`. */
export function isAuthMocked(): boolean {
  const { issuer, clientId } = getCognitoEnv();
  return !issuer || !clientId || process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true';
}
