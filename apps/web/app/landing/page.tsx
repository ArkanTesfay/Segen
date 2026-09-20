import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { TitleRow } from '../../components/Row';
import { getTitles } from '@segen/api-client/src/index';
import type { Title } from '@segen/types';

export const revalidate = 60;

/**
 * Public landing page — the one page a signed-out visitor can actually read.
 * Middleware rewrites `/` here for anonymous visitors (URL stays `/`), and it
 * is where /signout's "Back to home" leads. The catalog preview uses the Go
 * API's PUBLIC /v1/titles endpoint, so no session is needed; every poster
 * click funnels through the auth gate into sign-in with a deep link.
 */
export default async function LandingPage() {
  let titles: Title[] = [];
  try {
    titles = await getTitles();
  } catch {
    // Catalog API unreachable — the marketing page must still render.
  }
  const trending = [...titles].sort((a, b) => (a.trendingRank ?? 99) - (b.trendingRank ?? 99)).slice(0, 12);
  const movies = titles.filter((t) => t.kind === 'movie').length;
  const series = titles.filter((t) => t.kind === 'series').length;

  return (
    <main className="bg-ink text-silk">
      <Navbar />
      <section className="relative flex min-h-[78vh] items-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(90% 90% at 18% 12%, #4A0810, transparent 60%), linear-gradient(180deg, #160609, #0A0A0B)' }}
        />
        <div className="absolute left-[10%] top-[16%] h-72 w-72 rounded-full bg-segen/25 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(249,247,241,0.09)_1px,transparent_1px)] [background-size:22px_22px] opacity-40" />
        <div className="hero-fade absolute inset-0" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-28 sm:px-6">
          <p className="font-display text-xs uppercase tracking-[0.4em] text-segen-glow">Eritrean films &amp; series</p>
          <h1 className="mt-3 font-display text-6xl font-black leading-[0.95] sm:text-8xl">
            Silky black
            <br />
            cinema.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-silk-muted sm:text-lg">
            Originals in Tigrinya and beyond — 4K adaptive HLS delivered worldwide from AWS. Sign in to start watching.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signin"
              className="rounded-full bg-segen px-8 py-3.5 text-sm font-bold shadow-redglow hover:bg-segen-hover"
            >
              Sign in to start watching
            </Link>
            {trending.length > 0 && (
              <a
                href="#now-streaming"
                className="rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-silk backdrop-blur transition hover:border-segen"
              >
                See what&apos;s streaming
              </a>
            )}
          </div>
          {trending.length > 0 && (
            <p className="mt-8 text-xs uppercase tracking-[0.3em] text-silk-faint">
              {titles.length} titles • {movies} movies • {series} series • new originals every month
            </p>
          )}
        </div>
      </section>
      {trending.length > 0 && (
        <div id="now-streaming" className="scroll-mt-20">
          <TitleRow heading="Now streaming" subtitle="Every card unlocks after sign-in" items={trending} />
        </div>
      )}
      <footer className="mx-auto max-w-7xl px-4 py-10 text-xs text-silk-faint sm:px-6">
        SEGEN • Silky black / white / red • Go API + S3 + MediaConvert + CloudFront
      </footer>
    </main>
  );
}
