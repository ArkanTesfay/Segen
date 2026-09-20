'use client';

import { useState } from 'react';
import Navbar from '../../components/Navbar';
import { PosterCard } from '../../components/Row';
import { searchTitles } from '@segen/api-client/src/index';
import type { Title } from '@segen/types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Title[]>([]);
  const [loading, setLoading] = useState(false);

  async function onSearch(q: string) {
    setQuery(q);
    setLoading(true);
    try {
      setResults(await searchTitles(q));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-ink pt-24 text-silk">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="font-display text-4xl font-black">Search</h1>
        <input
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search Teza, Asmara, drama…"
          className="mt-4 w-full max-w-xl rounded-full border border-white/15 bg-ink-elevated px-5 py-3 text-silk placeholder:text-silk-faint focus:border-segen focus:outline-none"
        />
        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer aspect-[2/3] rounded-md" />
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3 pb-16">
            {results.map((t) => (
              <PosterCard key={t.id} title={t} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
