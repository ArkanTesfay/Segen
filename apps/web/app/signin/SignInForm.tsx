'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@segen.er');
  const [name, setName] = useState('Demo Viewer');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { email, name, ts: Date.now() };
    // middleware.ts runs on the edge and can only read cookies, never localStorage.
    // Writing the cookie here is what makes /watch + /my-list reachable in demo mode.
    document.cookie = `segen-demo-user=${encodeURIComponent(
      JSON.stringify(payload),
    )}; path=/; max-age=${4 * 60 * 60}; samesite=lax`;
    try {
      window.localStorage.setItem('segen-demo-user', JSON.stringify(payload));
    } catch { /* noop */ }
    // Honour ?callbackUrl= that middleware attached when it bounced the user here.
    const cb = new URLSearchParams(window.location.search).get('callbackUrl');
    router.push(cb && cb.startsWith('/') ? cb : '/');
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="text-xs uppercase tracking-widest text-silk-muted">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          className="mt-1 w-full rounded-md border border-white/15 bg-ink-elevated px-4 py-3 text-silk focus:border-segen focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-widest text-silk-muted">Display name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-white/15 bg-ink-elevated px-4 py-3 text-silk focus:border-segen focus:outline-none"
        />
      </div>
      <button type="submit" className="w-full rounded-full bg-segen py-3 text-sm font-bold shadow-redglow hover:bg-segen-hover">
        Continue
      </button>
      <p className="text-center text-xs text-silk-faint">
        Demo mode — wire AWS Cognito to enable real Hosted UI. <Link href="/" className="text-segen-glow">Back home</Link>
      </p>
    </form>
  );
}
