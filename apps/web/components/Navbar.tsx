import Link from 'next/link';
import AuthButtons from './AuthButtons';

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="font-display text-2xl font-black tracking-[0.3em] text-segen">
          SEGEN
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-silk-muted md:flex">
          <Link className="transition hover:text-silk" href="/">Home</Link>
          <Link className="transition hover:text-silk" href="/movies">Movies</Link>
          <Link className="transition hover:text-silk" href="/series">Series</Link>
          <Link className="transition hover:text-silk" href="/my-list">My List</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/search"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-silk-muted transition hover:border-segen hover:text-silk"
          >
            Search
          </Link>
          <AuthButtons />
        </div>
      </div>
    </header>
  );
}

