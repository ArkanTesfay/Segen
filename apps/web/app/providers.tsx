'use client';

import { SessionProvider } from 'next-auth/react';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Always provide session context. In MVP/mock mode (no Cognito env) it
  // simply resolves to `unauthenticated` — and AuthButtons renders the
  // demo /signin link. This fixes `useSession must be wrapped` errors.
  return <SessionProvider>{children}</SessionProvider>;
}

