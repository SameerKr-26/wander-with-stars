import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';

import './globals.css';

/**
 * Manrope — the locked primary typeface (docs/WWS_VISUAL_IDENTITY.md §5).
 *
 * `next/font` self-hosts the files and inlines the @font-face rules, so there
 * is no request to Google at runtime: no third-party connection, no layout
 * shift from a late swap, and nothing to leak to a font CDN.
 *
 * Weights are exactly the five the document specifies — 400 body, 500
 * emphasis, 600 label, 700 heading, 800 display. Loading more would ship
 * bytes nothing uses.
 */
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Wander With Stars',
  description: 'A social travel platform for curated, creator-led group adventures.',
  robots: {
    // Nothing here is public product yet. Revisited when the site is built.
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Warm ivory base, so the browser chrome matches the page rather than
  // flashing white on load.
  themeColor: '#FFFBF5',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
