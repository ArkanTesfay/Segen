export type ContentKind = 'movie' | 'series';

export interface Title {
  id: string;
  slug: string;
  kind: ContentKind;
  title: string;
  tagline?: string;
  synopsis: string;
  year: number;
  durationMinutes?: number;
  seasons?: number;
  maturityRating: string;
  genres: string[];
  languages: string[];
  cast: string[];
  director: string;
  posterGradient: [string, string];
  heroGradient: [string, string];
  rating: number;
  trendingRank?: number;
  isOriginal?: boolean;
}

export interface PlaybackAuthorization {
  titleId: string;
  hlsUrl: string;
  dashUrl?: string;
  expiresAt: string;
  resumeSeconds: number;
}

export interface WatchProgress {
  titleId: string;
  watchedSeconds: number;
  durationSeconds: number;
  updatedAt: string;
}
