import Link from 'next/link';
import type { Title } from '@segen/types';

export default function Hero({ title }: { title: Title }) {
  const [a, b] = title.heroGradient;
  return (
    <section className="relative flex min-h-[86vh] items-end overflow-hidden">
      <div className="absolute inset-0" style={{ background: `radial-gradient(90% 90% at 15% 20%, ${b}, transparent 60%), linear-gradient(180deg, ${a}, #0A0A0B)` }} />
      <div className="absolute left-[8%] top-[18%] h-72 w-72 rounded-full bg-segen/25 blur-[110px]" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(249,247,241,0.09)_1px,transparent_1px)] [background-size:22px_22px] opacity-40" />
      <div className="hero-fade absolute inset-0" />
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:px-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-full bg-segen px-3 py-1 text-xs font-black tracking-[0.25em] text-silk">SEGEN ORIGINAL</span>
          <span className="text-xs uppercase tracking-[0.3em] text-silk-muted">#{title.trendingRank ?? 1} Trending</span>
        </div>
        <h1 className="font-display text-5xl font-black leading-none text-silk sm:text-7xl">{title.title}</h1>
        <p className="mt-2 text-sm uppercase tracking-[0.3em] text-segen-glow">{title.tagline}</p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-silk-muted sm:text-lg">{title.synopsis}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-silk-muted">
          <span className="rounded border border-white/20 px-2 py-0.5">{title.maturityRating}</span>
          <span>{title.year}</span>
          <span>•</span>
          <span>{title.genres.join(' • ')}</span>
          <span>•</span>
          <span>★ {title.rating.toFixed(1)}</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/watch/${title.id}`} className="rounded-full bg-silk px-7 py-3 text-sm font-bold text-ink transition hover:bg-white">
            ▶ Play
          </Link>
          <Link href={`/movie/${title.slug}`} className="rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-silk backdrop-blur transition hover:border-segen">
            More Info
          </Link>
        </div>
      </div>
    </section>
  );
}
