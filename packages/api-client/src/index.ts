import type { PlaybackAuthorization, Title, WatchProgress } from '@segen/types';
import { allMockTitles } from './mock-data-2';

const mockTitles: Title[] = allMockTitles;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const USE_MOCK = !API_URL || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/** Demo HLS stream until MediaConvert pipeline is live (Phase 4). */
const DEMO_HLS = 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8';

/** The <video> element fires `timeupdate` ~4x/second — coalesce API writes. */
const PROGRESS_INTERVAL_MS = 10_000;
const lastProgressSent = new Map<string, number>();

/**
 * Shape the Go API actually returns: `titles` has no artwork columns yet, so
 * gradients are omitted, and pq string arrays can serialise as null.
 */
type WireTitle = Omit<Title, 'posterGradient' | 'heroGradient' | 'genres' | 'languages' | 'cast'> &
  Partial<Pick<Title, 'posterGradient' | 'heroGradient' | 'genres' | 'languages' | 'cast'>>;

/** Silky black / white / red pairs, picked deterministically so posters stay stable. */
const GRADIENT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['#1C1C20', '#E50914'],
  ['#131316', '#F9F7F1'],
  ['#B20710', '#0A0A0B'],
  ['#0A0A0B', '#F9F7F1'],
  ['#0A0A0B', '#B20710'],
];

function withGradients(t: WireTitle): Title {
  const seed = [...t.slug].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const [a, b] = GRADIENT_PAIRS[seed % GRADIENT_PAIRS.length];
  return {
    ...t,
    genres: t.genres ?? [],
    languages: t.languages ?? [],
    cast: t.cast ?? [],
    posterGradient: t.posterGradient ?? [a, b],
    heroGradient: t.heroGradient ?? [a, '#0A0A0B'],
  };
}

/**
 * Single fetch wrapper. `token` is the Cognito ID token from the NextAuth
 * session (web passes it in; mobile will pass its Amplify token). Authed
 * responses are per-user and are never written to the Next.js Data Cache,
 * because the Bearer header is not part of a cache key.
 */
async function api<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const headers = { ...((init?.headers as Record<string, string> | undefined) ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    ...(token ? { cache: 'no-store' } : { next: { revalidate: 60 } }),
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getTitles(): Promise<Title[]> {
  if (USE_MOCK) return mockTitles;
  const titles = await api<WireTitle[]>('/v1/titles');
  return titles.map(withGradients);
}

export async function getTitleBySlug(slug: string, token?: string): Promise<Title | undefined> {
  if (USE_MOCK) return mockTitles.find((t) => t.slug === slug);
  const title = await api<WireTitle>(`/v1/titles/${encodeURIComponent(slug)}`, token);
  return withGradients(title);
}

export async function authorizePlayback(titleId: string, token?: string): Promise<PlaybackAuthorization> {
  if (USE_MOCK) {
    return {
      titleId,
      hlsUrl: DEMO_HLS,
      expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      resumeSeconds: getStoredProgress(titleId),
    };
  }
  // Go route: GET /v1/playback/authorize?titleId=<id> (see apps/api/main.go)
  return api<PlaybackAuthorization>(`/v1/playback/authorize?titleId=${encodeURIComponent(titleId)}`, token);
}

export async function searchTitles(query: string, token?: string): Promise<Title[]> {
  const q = query.trim();
  if (USE_MOCK) {
    const all = await getTitles();
    if (!q) return all;
    const needle = q.toLowerCase();
    return all.filter((t) =>
      [t.title, t.synopsis, t.director, ...t.genres, ...t.cast].join(' ').toLowerCase().includes(needle),
    );
  }
  if (!q) return getTitles();
  // Go route: /v1/search (tsvector + trigram ILIKE), cached 60s when anonymous.
  const results = await api<WireTitle[]>(`/v1/search?q=${encodeURIComponent(q)}`, token);
  return results.map(withGradients);
}

// Shared business logic — reused later by React Native (AVPlayer / Media3)
export function playMovie(titleId: string, token?: string) {
  return authorizePlayback(titleId, token);
}

export function getStoredProgress(titleId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem('segen-progress');
    if (!raw) return 0;
    return (JSON.parse(raw) as Record<string, number>)[titleId] ?? 0;
  } catch {
    return 0;
  }
}

function writeLocalProgress(titleId: string, watchedSeconds: number, durationSeconds: number) {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem('segen-progress');
    const prev = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    window.localStorage.setItem(
      'segen-progress',
      JSON.stringify({ ...prev, [titleId]: Math.floor(watchedSeconds) }),
    );
    window.localStorage.setItem(
      'segen-progress-meta',
      JSON.stringify({ [titleId]: { watchedSeconds, durationSeconds, updatedAt: new Date().toISOString() } }),
    );
  } catch {
    /* noop */
  }
}

/**
 * Writes the resume position to Postgres (`POST /v1/progress`) when the caller
 * has a Cognito token, and always mirrors it to localStorage so signed-out/demo
 * playback still resumes. Throttled — see PROGRESS_INTERVAL_MS.
 */
export async function saveProgress(
  titleId: string,
  watchedSeconds: number,
  durationSeconds: number,
  token?: string,
): Promise<void> {
  writeLocalProgress(titleId, watchedSeconds, durationSeconds);
  if (USE_MOCK || !token) return;

  const now = Date.now();
  if (now - (lastProgressSent.get(titleId) ?? 0) < PROGRESS_INTERVAL_MS) return;
  lastProgressSent.set(titleId, now);
  try {
    await api<WatchProgress>('/v1/progress', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titleId,
        watchedSeconds: Math.floor(watchedSeconds),
        durationSeconds: Math.floor(durationSeconds),
      }),
    });
  } catch (e) {
    // A failed progress write must never break playback; retry on the next tick.
    lastProgressSent.delete(titleId);
    console.warn(`[segen] progress save failed for ${titleId}`, e);
  }
}

function readLocalMyList(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem('segen-my-list') ?? '[]') as string[];
  } catch {
    return [];
  }
}

function writeLocalMyList(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('segen-my-list', JSON.stringify(ids));
  } catch {
    /* noop */
  }
}

/**
 * Favorites from Postgres (`GET /v1/favorites`) when signed in; falls back to
 * the localStorage mirror when signed out or the API is unreachable, so
 * /my-list keeps working in demo mode.
 */
export async function getMyList(token?: string): Promise<string[]> {
  if (USE_MOCK || !token) return readLocalMyList();
  try {
    return await api<string[]>('/v1/favorites', token);
  } catch (e) {
    console.warn('[segen] favorites fetch failed — using local mirror', e);
    return readLocalMyList();
  }
}

/** Toggle favorite (`POST /v1/favorites?titleId=`); returns the updated id list. */
export async function toggleMyList(titleId: string, token?: string): Promise<string[]> {
  let next: string[];
  if (USE_MOCK || !token) {
    const list = readLocalMyList();
    next = list.includes(titleId) ? list.filter((id) => id !== titleId) : [...list, titleId];
  } else {
    const res = await api<{ titleId: string; favorited: boolean }>(
      `/v1/favorites?titleId=${encodeURIComponent(titleId)}`,
      token,
      { method: 'POST' },
    );
    const current = await getMyList(token);
    next = res.favorited ? [...new Set([...current, titleId])] : current.filter((id) => id !== titleId);
  }
  writeLocalMyList(next);
  return next;
}

export * from './mock-data';
export * from './mock-data-2';
