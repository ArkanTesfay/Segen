import type { NextAuthOptions } from 'next-auth';
import CognitoProvider from 'next-auth/providers/cognito';
import { isAuthMocked } from '@segen/auth/src/index';

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
};
