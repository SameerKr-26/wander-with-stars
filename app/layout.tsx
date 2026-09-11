import type { Metadata, Viewport } from 'next';

import './globals.css';

/**
 * Root layout.
 *
 * Metadata is intentionally minimal. Full SEO — canonical URLs, Open Graph,
 * structured data, sitemap and robots — is built in Phase 3 alongside the
 * public site (docs/ROADMAP.md).
 */
export const metadata: Metadata = {
  title: 'Wander With Stars',
  description: 'A social travel platform for curated, creator-led group adventures.',
  robots: {
    // The foundation scaffold must not be indexed. Revisited in Phase 3.
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
