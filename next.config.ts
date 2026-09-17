import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Phase 3.5C root-cause fix for "mobile menu doesn't open" / "trip detail
  // page appears empty" on a real phone: neither was an app bug. Next.js
  // dev servers block cross-origin requests to dev-only resources
  // (/_next/hmr and friends) by default — confirmed via the dev server's
  // own log: "Blocked cross-origin request to Next.js dev resource
  // /_next/hmr from '192.168.x.x'". A phone on the same Wi-Fi reaches this
  // server at its LAN IP, not `localhost`, so every dev-mode request from
  // it was rejected — silently breaking client-side hydration project-wide
  // (every 'use client' component, including the header's menu button and
  // TripItinerary), which is why it looked like the trip page was "empty"
  // and the nav button did nothing, everywhere on the page. This setting
  // only affects `next dev`; production builds (`next start`) never had
  // this restriction. `192.168.*.*` covers the common home-network range
  // regardless of which specific address DHCP hands this machine — add
  // this project's actual LAN prefix here if it differs (see the terminal's
  // own "- Network:" line when `next dev` starts).
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],

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
