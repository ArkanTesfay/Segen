'use client';

import { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/Navbar';
import { PosterCard } from '../../components/Row';
import { getMyList, getTitles } from '@segen/api-client/src/index';
import type { Title } from '@segen/types';

export default function MyListPage() {
  const [titles, setTitles] = useState<Title[]>([]);
  useEffect(() => {
    getTitles().then((all) => {
      const ids = new Set(getMyList());
      setTitles(all.filter((t) => ids.has(t.id)));
    });
  }, []);
  const empty = useMemo(() => titles.length === 0, [titles]);
  return (
    <main className="bg-ink pt-24 text-silk">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="font-display text-4xl font-black">My List</h1>
        <p className="mt-1 text-silk-muted">Saved on this device — syncs via Go API in Phase 3.</p>
        {empty ? (
          <div className="mt-8 rounded-lg border border-dashed border-white/15 p-10 text-center text-silk-muted">
            Nothing saved yet. Hover a title and add it to your list.
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3 pb-16">
            {titles.map((t) => (
              <PosterCard key={t.id} title={t} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
