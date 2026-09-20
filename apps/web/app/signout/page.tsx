import Link from 'next/link';
import SignOutActions from './SignOutActions';

export default function SignOutPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-silk">
      <div className="absolute left-1/2 top-[10%] h-64 w-64 -translate-x-1/2 rounded-full bg-segen/20 blur-[110px]" />
      <div className="relative w-full max-w-md rounded-lg border border-white/10 bg-ink-surface p-8 shadow-card">
        <Link href="/" className="font-display text-2xl font-black tracking-[0.3em] text-segen">SEGEN</Link>
        <h1 className="mt-3 font-display text-3xl font-black">You&apos;re signed out</h1>
        <p className="mt-1 text-sm text-silk-muted">Your session has ended. See you at the next screening.</p>
        <SignOutActions />
      </div>
    </main>
  );
}