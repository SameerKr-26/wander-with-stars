'use client';

import { useCallback, useState } from 'react';

/**
 * Scroll-reveal, gated on prefers-reduced-motion.
 *
 * A callback ref rather than useRef + useEffect: it only ever runs on the
 * client (refs never fire during SSR, so there is no server/client mismatch
 * to guard against), and every `setVisible` call happens from a callback —
 * an IntersectionObserver entry or the ref attaching — never synchronously
 * in an effect body.
 *
 * Shared by components/trips/journey-entry.tsx (Phase 3.4) and the trip
 * detail page's itinerary/route reveal (Phase 3.5) — one implementation of
 * "fade/scale in once, on first intersection" rather than two copies that
 * could drift.
 */
export function useReveal<T extends HTMLElement>() {
  const [visible, setVisible] = useState(false);

  const ref = useCallback(
    (el: T | null) => {
      if (!el || visible) return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setVisible(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.2 },
      );
      observer.observe(el);
    },
    [visible],
  );

  return [ref, visible] as const;
}
