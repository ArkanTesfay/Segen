import Link from 'next/link';
import type { Title } from '@segen/types';

export function PosterCard({ title, rank }: { title: Title; rank?: number }) {
  const [a, b] = title.posterGradient;
  return (
    <Link
      href={`/movie/${title.slug}`}
      className="group relative w-[160px] shrink-0 overflow-hidden rounded-md border border-white/10 bg-ink-surface shadow-card transition duration-300 hover:-translate-y-1 hover:border-segen/60 sm:w-[190px]"
    >
      <div className="relative aspect-[2/3] w-full" style={{ background: `linear-gradient(160deg, ${a}, ${b})` }}>
        <div className="card-shine absolute inset-0 opacity-60" />
        <div className="absolute inset-0 flex flex-col justify-end p-3">
          <p className="font-display text-lg font-extrabold leading-tight text-silk drop-shadow">{title.title}</p>
          <p className="text-[11px] uppercase tracking-widest text-silk-muted">
            {title.year} • {title.kind}
          </p>
        </div>
        {title.isOriginal && (
          <span className="absolute left-2 top-2 rounded-full bg-segen px-2 py-0.5 text-[10px] font-bold tracking-widest text-silk">
            SEGEN
          </span>
        )}
        {typeof rank === 'number' && (
          <span className="absolute -left-1 bottom-1 select-none font-display text-7xl font-black text-silk/15">
            {rank}
          </span>
        )}
        <div className="absolute inset-0 bg-ink/0 transition group-hover:bg-ink/25" />
      </div>
      <div className="h-1 w-full bg-white/10">
        <div className="h-full w-0 bg-segen transition-all group-hover:w-1/3" />
      </div>
    </Link>
  );
}

export function TitleRow({ heading, subtitle, items }: { heading: string; subtitle?: string; items: Title[] }) {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-silk sm:text-2xl">{heading}</h2>
          {subtitle && <p className="text-sm text-silk-muted">{subtitle}</p>}
        </div>
        <span className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full w-1/2 bg-segen" />
        </span>
      </div>
      <div className="row-scroll no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {items.map((t, i) => (
          <PosterCard key={t.id} title={t} rank={t.trendingRank ?? i + 1} />
        ))}
      </div>
    </section>
  );
}
