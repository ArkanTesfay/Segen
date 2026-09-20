import type { PlaybackAuthorization, Title } from '@segen/types';
import { allMockTitles } from './mock-data-2';

const mockTitles: Title[] = allMockTitles;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const USE_MOCK = !API_URL || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/** Demo HLS stream until MediaConvert pipeline is live (Phase 4). */
const DEMO_HLS = 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...init, next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getTitles(): Promise<Title[]> {
  if (USE_MOCK) return mockTitles;
  return api<Title[]>('/v1/titles');
}

export async function getTitleBySlug(slug: string): Promise<Title | undefined> {
  if (USE_MOCK) return mockTitles.find((t) => t.slug === slug);
  return api<Title>(`/v1/titles/${slug}`);
}

export async function authorizePlayback(titleId: string): Promise<PlaybackAuthorization> {
  if (USE_MOCK) {
    return {
      titleId,
      hlsUrl: DEMO_HLS,
      expiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      resumeSeconds: getStoredProgress(titleId),
    };
  }
  return api<PlaybackAuthorization>(`/v1/playback/${titleId}/authorize`, { method: 'POST' });
}

export async function searchTitles(query: string): Promise<Title[]> {
  const q = query.trim().toLowerCase();
  const all = await getTitles();
  if (!q) return all;
  return all.filter((t) =>
    [t.title, t.synopsis, t.director, ...t.genres, ...t.cast].join(' ').toLowerCase().includes(q),
  );
}

// Shared business logic — reused later by React Native (AVPlayer / Media3)
export function playMovie(titleId: string) {
  return authorizePlayback(titleId);
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

export function saveProgress(titleId: string, watchedSeconds: number, durationSeconds: number) {
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
      JSON.stringify({ ...(raw ? {} : {}), [titleId]: { watchedSeconds, durationSeconds, updatedAt: new Date().toISOString() } }),
    );
  } catch {
    /* noop */
  }
}

export function getMyList(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem('segen-my-list') ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function toggleMyList(titleId: string): string[] {
  const list = getMyList();
  const next = list.includes(titleId) ? list.filter((id) => id !== titleId) : [...list, titleId];
  try {
    window.localStorage.setItem('segen-my-list', JSON.stringify(next));
  } catch {
    /* noop */
  }
  return next;
}

export * from './mock-data';
export * from './mock-data-2';
