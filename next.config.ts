import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Fail the production build on type errors rather than shipping them.
  // Next 16 removed `next lint`, so ESLint is no longer part of `next build`:
  // it runs as its own step via `npm run lint` (and in CI).
  typescript: {
    ignoreBuildErrors: false,
  },

  // Remote image hosts are added in the catalogue milestone (Phase 5), when we
  // know where trip media is actually served from. Supabase Storage is the
  // expected default; nothing is whitelisted speculatively.
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
