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
      <Link
        href="/"
        className="block w-full rounded-full border border-white/20 bg-white/5 py-3 text-center text-sm font-semibold text-silk backdrop-blur transition hover:border-segen"
      >
        Back to home
      </Link>
    </div>
  );
}