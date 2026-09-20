'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function SignOutActions() {
  return (
    <div className="mt-6 space-y-3">
      <button
        onClick={() => signIn('cognito', { callbackUrl: '/' })}
        className="w-full rounded-full bg-segen py-3 text-sm font-bold shadow-redglow hover:bg-segen-hover"
      >
        Sign in again
      </button>
      <p className="text-center text-xs text-silk-faint">
        <Link href="/" className="text-segen-glow">Back home</Link>
      </p>
    </div>
  );
}