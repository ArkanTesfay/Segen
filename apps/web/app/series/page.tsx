import Navbar from '../../components/Navbar';
import { PosterCard } from '../../components/Row';
import { getTitles } from '@segen/api-client/src/index';

export const revalidate = 60;

export default async function SeriesPage() {
  const titles = (await getTitles()).filter((t) => t.kind === 'series');
  return (
    <main className="bg-ink pt-24 text-silk">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="font-display text-4xl font-black">Series</h1>
        <p className="mt-1 text-silk-muted">Binge Eritrean originals.</p>
        <div className="mt-6 flex flex-wrap gap-3 pb-16">
          {titles.map((t) => (
            <PosterCard key={t.id} title={t} />
          ))}
        </div>
      </div>
    </main>
  );
}
