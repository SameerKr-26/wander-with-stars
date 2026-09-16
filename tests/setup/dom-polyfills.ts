/**
 * DOM API stand-ins jsdom does not implement.
 *
 * Both are used by the Phase 3.4 editorial trip components:
 * `window.matchMedia` for prefers-reduced-motion checks (SiteHeader,
 * trip-discovery-experience.tsx, journey-entry.tsx), and
 * `IntersectionObserver` for journey-entry.tsx's scroll reveal. Neither
 * exists in jsdom 30 (verified), so any test that renders these components
 * without a stub throws a plain `TypeError`/`ReferenceError` — this has
 * nothing to do with the behaviour under test.
 *
 * Real intersection is never simulated: the mock observer simply never
 * fires, which is fine for these tests — they assert on content and
 * interaction, not on the reveal's visual (opacity/transform) state.
 *
 * `Element.prototype.scrollIntoView` is the same story: resetting filters
 * (trip-discovery-experience.tsx's `scrollToResults`) calls it
 * unconditionally, and jsdom has no implementation at all (not even a no-op
 * stub) to call.
 */

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  globalThis.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
