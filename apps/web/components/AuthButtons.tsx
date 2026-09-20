'use client';

import { useEffect, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { isAuthMocked } from '@segen/auth/src/index';

function hasDemoUser() {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c.startsWith('segen-demo-user='));
}

function DemoButtons() {
  useSession();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(hasDemoUser()), []);

  if (signedIn) {
    return (
      <button
        onClick={() => {
          document.cookie = 'segen-demo-user=; path=/; max-age=0; samesite=lax';
          try { window.localStorage.removeItem('segen-demo-user'); } catch { /* noop */ }
          setSignedIn(false);
          window.location.href = '/';
        }}
        className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-segen"
      >
        Sign out
      </button>
    );
  }

  return (
    <a
      href="/signin"
      className="rounded-full border border-white/15 px-4 py-2 text-sm text-silk-muted transition hover:border-segen hover:text-silk"
      title="Cognito not configured yet — using local demo sign-in"
    >
      Sign in
    </a>
  );
}

function CognitoButtons() {
  const { data: session, status } = useSession();
  if (status === 'loading') {
    return <div className="skeleton-shimmer h-9 w-24 rounded-full" />;
  }
  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-[140px] truncate text-sm text-silk-muted sm:block">
          {session.user.email ?? session.user.name}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-segen"
        >
          Sign out
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => signIn('cognito', { callbackUrl: '/' })}
      className="rounded-full bg-segen px-4 py-2 text-sm font-semibold shadow-redglow transition hover:bg-segen-hover"
    >
      Sign in
    </button>
  );
}

export default function AuthButtons() {
  if (isAuthMocked()) return <DemoButtons />;
  return <CognitoButtons />;
}
