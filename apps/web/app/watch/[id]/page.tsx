'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { authorizePlayback, getTitles, saveProgress } from '@segen/api-client/src/index';
import { trackViewingEvent } from '@segen/analytics/src/index';

export default function WatchPage({ params }: { params: { id: string } }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Loading adaptive stream…');
  const [quality, setQuality] = useState('Auto');

  useEffect(() => {
    let player: { destroy: () => Promise<void> } | null = null;
    let cancelled = false;

    async function init() {
      try {
        const titles = await getTitles();
        const meta = titles.find((t) => t.id === params.id) ?? titles[0];
        const auth = await authorizePlayback(meta.id);
        if (cancelled) return;
        trackViewingEvent({ type: 'play', titleId: meta.id, atSeconds: auth.resumeSeconds });

        const video = videoRef.current;
        if (!video) return;
        video.currentTime = auth.resumeSeconds || 0;

        const shaka = (await import('shaka-player')).default;
        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) {
          video.src = auth.hlsUrl;
          setStatus('Native HLS fallback');
          return;
        }
        const p = new shaka.Player(video);
        player = p as unknown as { destroy: () => Promise<void> };
        p.addEventListener('error', () => setStatus('Playback error — retrying'));
        p.addEventListener('adaptation', () => {
          try {
            const track = (p as unknown as { getVariantTracks: () => { height?: number }[] }).getVariantTracks().find((t) => t.height);
            if (track?.height) setQuality(`${track.height}p`);
          } catch { /* noop */ }
        });
        await (p as unknown as { load: (u: string) => Promise<void> }).load(auth.hlsUrl);
        if (cancelled) return;
        setStatus(`Playing • ${meta.title}`);
        video.play().catch(() => setStatus(`Ready • ${meta.title} — press play`));

        const onTime = () => {
          saveProgress(meta.id, video.currentTime, video.duration || 0);
          if (Math.floor(video.currentTime) % 30 === 0) {
            trackViewingEvent({ type: 'progress', titleId: meta.id, atSeconds: Math.floor(video.currentTime), durationSeconds: Math.floor(video.duration || 0) });
          }
        };
        video.addEventListener('timeupdate', onTime);
      } catch (e) {
        if (!cancelled) setStatus(`Stream failed to load: ${(e as Error).message}`);
      }
    }
    init();
    return () => {
      cancelled = true;
      player?.destroy().catch(() => undefined);
    };
  }, [params.id]);

  return (
    <main className="min-h-screen bg-ink text-silk">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="font-display text-xl font-black tracking-[0.3em] text-segen">SEGEN</Link>
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-silk-muted">{quality} • HLS adaptive</span>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-10">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black shadow-card">
          <video ref={videoRef} controls playsInline className="aspect-video w-full bg-black" />
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <p className="text-silk-muted">{status}</p>
          <Link href="/" className="text-segen-glow hover:text-silk">← Back to browse</Link>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/4 bg-segen" />
        </div>
        <p className="mt-4 text-xs text-silk-faint">
          MVP uses a demo HLS ladder. Phase 4 swaps this URL for CloudFront-signed MediaConvert output (360p → 1080p CMAF).
        </p>
      </div>
    </main>
  );
}
