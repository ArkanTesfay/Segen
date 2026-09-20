import Link from 'next/link';
import SignInForm from './SignInForm';

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-silk">
      <div className="absolute left-1/2 top-[10%] h-64 w-64 -translate-x-1/2 rounded-full bg-segen/20 blur-[110px]" />
      <div className="relative w-full max-w-md rounded-lg border border-white/10 bg-ink-surface p-8 shadow-card">
        <Link href="/" className="font-display text-2xl font-black tracking-[0.3em] text-segen">SEGEN</Link>
        <h1 className="mt-3 font-display text-3xl font-black">Welcome back</h1>
        <p className="mt-1 text-sm text-silk-muted">Silky black cinema, secured by AWS Cognito.</p>
        <SignInForm />
      </div>
    </main>
  );
}
