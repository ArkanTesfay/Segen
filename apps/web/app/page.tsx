import Hero from '../components/Hero';
import Navbar from '../components/Navbar';
import { TitleRow } from '../components/Row';
import { getTitles } from '@segen/api-client/src/index';

export const revalidate = 60;

export default async function HomePage() {
  const titles = await getTitles();
  const hero = titles.find((t) => t.trendingRank === 1) ?? titles[0];
  const trending = [...titles].sort((a, b) => (a.trendingRank ?? 99) - (b.trendingRank ?? 99));
  const movies = titles.filter((t) => t.kind === 'movie');
  const series = titles.filter((t) => t.kind === 'series');

  return (
    <main className="bg-ink text-silk">
      <Navbar />
      <Hero title={hero} />
      <TitleRow heading="Trending Now" subtitle="Adaptive HLS • 4K-ready via CloudFront" items={trending} />
      <TitleRow heading="Eritrean Movies" subtitle="Cinema-first storytelling" items={movies} />
      <TitleRow heading="Series to Binge" subtitle="Originals in Tigrinya" items={series} />
      <footer className="mx-auto max-w-7xl px-4 py-10 text-xs text-silk-faint sm:px-6">
        SEGEN • Silky black / white / red • Go API + S3 + MediaConvert + CloudFront
      </footer>
    </main>
  );
}
