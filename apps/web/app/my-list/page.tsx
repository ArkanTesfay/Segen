'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '../../components/Navbar';
import { PosterCard } from '../../components/Row';
import { getMyList, getTitles } from '@segen/api-client/src/index';
import { apiTokenFrom } from '../../lib/session';
import type { Title } from '@segen/types';

export default function MyListPage() {
  const [titles, setTitles] = useState<Title[]>([]);
  const { data: session, status: sessionStatus } = useSession();
  const token = apiTokenFrom(session);

  useEffect(() => {
    // getMyList hits GET /v1/favorites when signed in (Bearer token) and falls
    // back to the localStorage mirror otherwise.
    if (sessionStatus === 'loading') return;
    let cancelled = false;
    (async () => {
      const [all, ids] = await Promise.all([getTitles(), getMyList(token)]);
      if (!cancelled) setTitles(all.filter((t) => new Set(ids).has(t.id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, token]);

  const empty = useMemo(() => titles.length === 0, [titles]);
  return (
    <main className="bg-ink pt-24 text-silk">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="font-display text-4xl font-black">My List</h1>
        <p className="mt-1 text-silk-muted">
          {token
            ? 'Synced to your SEGEN account (Postgres via the Go API).'
            : 'Saved on this device — sign in to sync across devices.'}
        </p>
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
