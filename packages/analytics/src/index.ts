export type ViewingEvent =
  | { type: 'play'; titleId: string; atSeconds?: number }
  | { type: 'pause'; titleId: string; atSeconds: number }
  | { type: 'progress'; titleId: string; atSeconds: number; durationSeconds: number }
  | { type: 'complete'; titleId: string }
  | { type: 'search'; query: string };

const queue: ViewingEvent[] = [];

export function trackViewingEvent(event: ViewingEvent) {
  queue.push(event);
  if (typeof window !== 'undefined') {
    try {
      const key = 'segen-view-events';
      const prev = JSON.parse(window.localStorage.getItem(key) ?? '[]');
      window.localStorage.setItem(key, JSON.stringify([...prev, { ...event, ts: Date.now() }].slice(-200)));
    } catch {
      /* noop */
    }
  }
  // Phase 3: flush to Go API /v1/analytics + PostHog. Kept local for speed in MVP.
}

export function getQueuedViewingEvents(): ViewingEvent[] {
  return [...queue];
}
