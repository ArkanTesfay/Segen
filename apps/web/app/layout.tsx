import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'SEGEN — Eritrean Films & Series',
  description: 'Stream Eritrean movies and series in silky black, white and red. Fast HLS streaming on web, iOS and Android.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-ink text-silk">
      <body className="min-h-screen bg-ink font-sans text-silk antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

