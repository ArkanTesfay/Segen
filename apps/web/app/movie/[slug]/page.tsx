import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { TitleRow } from '../../../components/Row';
import { getTitleBySlug, getTitles } from '@segen/api-client/src/index';

export const revalidate = 60;

export default async function TitlePage({ params }: { params: { slug: string } }) {
  const title = await getTitleBySlug(params.slug);
  if (!title) return notFound();
  const all = await getTitles();
  const more = all.filter((t) => t.id !== title.id).slice(0, 8);
  const [a, b] = title.heroGradient;

  return (
    <main className="bg-ink text-silk">
      <Navbar />
      <section className="relative overflow-hidden pt-28">
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${a}, #0A0A0B 75%), radial-gradient(60% 60% at 80% 10%, ${b}, transparent 70%)` }} />
        <div className="hero-fade absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-10 sm:px-6 md:grid-cols-[280px_1fr]">
          <div className="aspect-[2/3] overflow-hidden rounded-lg border border-white/10 shadow-card" style={{ background: `linear-gradient(160deg, ${title.posterGradient[0]}, ${title.posterGradient[1]})` }}>
            <div className="card-shine h-full w-full p-4">
              <p className="font-display text-2xl font-black">{title.title}</p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-segen-glow">{title.kind} • {title.year}</p>
            <h1 className="mt-1 font-display text-5xl font-black">{title.title}</h1>
            <p className="mt-2 text-silk-muted">{title.tagline}</p>
            <p className="mt-4 max-w-2xl leading-relaxed text-silk-muted">{title.synopsis}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {[title.maturityRating, ...title.genres, ...title.languages].map((g) => (
                <span key={g} className="rounded-full border border-white/15 px-3 py-1 text-silk-muted">{g}</span>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <Link href={`/watch/${title.id}`} className="rounded-full bg-segen px-7 py-3 text-sm font-bold shadow-redglow hover:bg-segen-hover">
                ▶ Play
              </Link>
              <Link href="/my-list" className="rounded-full border border-white/20 px-7 py-3 text-sm hover:border-segen">
                + My List
              </Link>
            </div>
            <dl className="mt-6 grid max-w-xl grid-cols-2 gap-3 text-sm">
              <div><dt className="text-silk-faint">Director</dt><dd>{title.director}</dd></div>
              <div><dt className="text-silk-faint">Cast</dt><dd>{title.cast.join(', ')}</dd></div>
            </dl>
          </div>
        </div>
      </section>
      <TitleRow heading="More Like This" items={more} />
    </main>
  );
}
