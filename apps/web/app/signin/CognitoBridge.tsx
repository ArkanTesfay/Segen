'use client';

import { useCallback, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

/**
 * Real-mode /signin: POSTs to NextAuth (CSRF handled by next-auth/react) and
 * forwards the browser straight to the Cognito Hosted UI — the user never sees
 * a second page. The button doubles as a manual retry if the redirect stalls.
 */
export default function CognitoBridge() {
  const [started, setStarted] = useState(false);

  const go = useCallback(() => {
    // Only relative destinations — an absolute callbackUrl would be an open redirect.
    const cb = new URLSearchParams(window.location.search).get('callbackUrl');
    signIn('cognito', { callbackUrl: cb && cb.startsWith('/') ? cb : '/' });
    setStarted(true);
  }, []);

  useEffect(() => {
    go();
  }, [go]);

  return (
    <div className="mt-6 space-y-4">
      <button
        onClick={go}
        className="w-full rounded-full bg-segen py-3 text-sm font-bold shadow-redglow hover:bg-segen-hover"
      >
        {started ? 'Taking too long? Try again' : 'Continue'}
      </button>
      <p className="text-center text-xs text-silk-faint">Redirecting to secure AWS Cognito sign-in…</p>
    </div>
  );
}