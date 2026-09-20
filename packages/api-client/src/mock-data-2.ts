import type { Title } from '@segen/types';
import { mockTitles as part1 } from './mock-data';

const part2: Title[] = [
  {
    id: '7', slug: 'keren-rally', kind: 'movie', title: 'Keren Rally',
    tagline: 'Dust, speed, glory',
    synopsis: 'A mechanic from Keren builds a rally car from scrap and races the highlands.',
    year: 2024, durationMinutes: 108, maturityRating: 'PG',
    genres: ['Sport', 'Comedy'], languages: ['Tigrinya', 'English'],
    cast: ['Filmon Asfaha'], director: 'Dawit Ghebrehiwet',
    posterGradient: ['#E50914', '#0A0A0B'], heroGradient: ['#E50914', '#0A0A0B'],
    rating: 4.4, trendingRank: 7,
  },
  {
    id: '8', slug: 'dahlak', kind: 'series', title: 'Dahlak',
    tagline: 'Islands of pearls and secrets',
    synopsis: 'A marine biologist discovers smuggling routes while mapping Dahlak.',
    year: 2024, seasons: 1, maturityRating: 'TV-14',
    genres: ['Mystery', 'Adventure'], languages: ['Tigrinya', 'Arabic', 'English'],
    cast: ['Nadia Ali', 'Samuel Girmay'], director: 'Meron Estifanos',
    posterGradient: ['#0A0A0B', '#E50914'], heroGradient: ['#0A0A0B', '#E50914'],
    rating: 4.5, trendingRank: 8, isOriginal: true,
  },
  {
    id: '9', slug: 'senait', kind: 'movie', title: 'Senait',
    tagline: 'A song for the diaspora',
    synopsis: 'A singer in Asmara and her brother in exile finish their father song.',
    year: 2021, durationMinutes: 118, maturityRating: 'PG-13',
    genres: ['Music', 'Drama'], languages: ['Tigrinya'],
    cast: ['Helen Tsegay'], director: 'Eseyas Tsegay',
    posterGradient: ['#131316', '#E50914'], heroGradient: ['#0A0A0B', '#131316'],
    rating: 4.7, trendingRank: 9,
  },
  {
    id: '10', slug: 'filfil', kind: 'movie', title: 'Filfil',
    tagline: 'The forest remembers',
    synopsis: 'A botanist protecting the Filfil rainforest uncovers a colonial map.',
    year: 2022, durationMinutes: 101, maturityRating: 'PG',
    genres: ['Adventure', 'History'], languages: ['Tigrinya', 'English'],
    cast: ['Ghidey Gebremedhin'], director: 'Lidya Tesfamariam',
    posterGradient: ['#1C1C20', '#F9F7F1'], heroGradient: ['#0A0A0B', '#1C1C20'],
    rating: 4.3, trendingRank: 10,
  },
  {
    id: '11', slug: 'opera-asmara', kind: 'movie', title: 'Opera Asmara',
    tagline: 'Encore for a cinema palace',
    synopsis: 'Projectionists fight to save the iconic Cinema Impero from demolition.',
    year: 2023, durationMinutes: 94, maturityRating: 'G',
    genres: ['Documentary', 'Culture'], languages: ['Tigrinya', 'Italian'],
    cast: ['Real Asmara voices'], director: 'Tomas Ghirmay',
    posterGradient: ['#F9F7F1', '#0A0A0B'], heroGradient: ['#131316', '#0A0A0B'],
    rating: 4.8,
  },
  {
    id: '12', slug: 'nakfa', kind: 'series', title: 'Nakfa',
    tagline: 'Courage has a name',
    synopsis: 'A limited series following medics, teachers, and engineers rebuilding.',
    year: 2025, seasons: 1, maturityRating: 'TV-14',
    genres: ['History', 'Drama'], languages: ['Tigrinya', 'English'],
    cast: ['Ensemble'], director: 'Hanna Ghebremedhin',
    posterGradient: ['#B20710', '#F9F7F1'], heroGradient: ['#0A0A0B', '#B20710'],
    rating: 4.9, isOriginal: true,
  },
];

export const allMockTitles: Title[] = [...part1, ...part2];
