/**
 * Content normalization boundary — Phase 3.6.
 *
 * Runs BEFORE `schema.ts` sees the data (raw → HERE → schema.ts →
 * TripDetail). Everything here is a mechanical, deterministic reshaping of
 * data that is already present — never a guess at data that is missing.
 *
 * Hard rule, repeated at every function below because it is the one this
 * file exists to enforce: normalization NEVER invents a missing field,
 * infers a price, infers a date, infers policy language, or fabricates an
 * itinerary activity. If a value is absent, it stays absent — that is
 * `schema.ts`'s job to accept (if optional) or reject (if required).
 * Ambiguous input (a date that could be DD/MM or MM/DD, for instance) is
 * left untouched rather than guessed at, so validation fails loudly on it
 * instead of silently picking the wrong interpretation.
 */

import type { RawTripInput } from './types';

/**
 * Lowercase kebab-case, ASCII alphanumerics and hyphens only. Applied to a
 * slug that already exists on the source (cleaning it), or derived from
 * `title` when no slug was supplied at all — deriving a slug from a title
 * is a deterministic transform of data already provided, not invented
 * data: the same title always produces the same slug.
 */
export function normalizeSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents (é -> e) rather than dropping the character
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Collapses internal whitespace runs and trims — never alters the actual words. */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Recursively trims/collapses whitespace on every string in an
 * object/array structure. Non-string values (numbers, booleans, null,
 * undefined) pass through untouched.
 */
export function deepTrimStrings<T>(value: T): T {
  if (typeof value === 'string') {
    return normalizeWhitespace(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepTrimStrings(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = deepTrimStrings(val);
    }
    return result as T;
  }
  return value;
}

/**
 * `2026-11-14T00:00:00.000Z` -> `2026-11-14`: a lossless truncation of a
 * fuller ISO datetime string down to the date-only value
 * `TripDetail.departureDate` expects — not a reinterpretation. Anything
 * that isn't already unambiguously ISO-shaped (already `YYYY-MM-DD`, or
 * `YYYY-MM-DDTHH:mm:ss...`) is returned exactly as given, so a genuinely
 * ambiguous or malformed date reaches validation unchanged and fails there
 * with a clear message, rather than being silently "corrected" to a
 * possibly-wrong date.
 */
export function normalizeDateInput(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const isoDateTime = /^(\d{4}-\d{2}-\d{2})T/.exec(trimmed);
  if (isoDateTime) return isoDateTime[1];
  return value;
}

/** Lowercases a value if it's a string; otherwise returns it untouched. */
function lowercaseIfString(value: unknown): unknown {
  return typeof value === 'string' ? value.toLowerCase() : value;
}

/** `inr` / `Inr` / ` INR ` -> `INR`. Leaves anything that isn't a plain string alone. */
function normalizeCurrencyCode(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

function normalizeMedia(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  const media = value as Record<string, unknown>;
  return { ...media, kind: lowercaseIfString(media.kind) };
}

function normalizePrice(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  const price = value as Record<string, unknown>;
  return { ...price, currency: normalizeCurrencyCode(price.currency) };
}

function normalizeImportantNote(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  const note = value as Record<string, unknown>;
  return note.category === undefined
    ? note
    : { ...note, category: lowercaseIfString(note.category) };
}

/**
 * The full pipeline's normalization step. Only touches fields that exist
 * and already look like the shape they're supposed to be — anything
 * missing or structurally unexpected is passed through untouched for
 * `schema.ts` to reject with a specific error, rather than this function
 * guessing at a repair.
 */
export function normalizeTripInput(raw: RawTripInput): RawTripInput {
  const trimmed = deepTrimStrings(raw);
  const result: RawTripInput = { ...trimmed };

  if (typeof result.slug === 'string' && result.slug.length > 0) {
    result.slug = normalizeSlug(result.slug);
  } else if (typeof result.title === 'string' && result.title.length > 0) {
    result.slug = normalizeSlug(result.title);
  }

  if (result.departureDate !== undefined) {
    result.departureDate = normalizeDateInput(result.departureDate);
  }

  if (result.price !== undefined) {
    result.price = normalizePrice(result.price);
  }

  if (result.availability !== null && typeof result.availability === 'object') {
    const availability = result.availability as Record<string, unknown>;
    result.availability = { ...availability, status: lowercaseIfString(availability.status) };
  }

  if (result.heroMedia !== undefined) {
    result.heroMedia = normalizeMedia(result.heroMedia);
  }

  if (Array.isArray(result.gallery)) {
    result.gallery = result.gallery.map(normalizeMedia);
  }

  if (result.styleScores !== null && typeof result.styleScores === 'object') {
    const scores = result.styleScores as Record<string, unknown>;
    const normalizedScores: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(scores)) {
      normalizedScores[key.toLowerCase()] = val;
    }
    result.styleScores = normalizedScores;
  }

  if (Array.isArray(result.importantNotes)) {
    result.importantNotes = result.importantNotes.map(normalizeImportantNote);
  }

  if (Array.isArray(result.extras)) {
    result.extras = result.extras.map((extra) => {
      if (extra === null || typeof extra !== 'object') return extra;
      const e = extra as Record<string, unknown>;
      return e.price === undefined ? e : { ...e, price: normalizePrice(e.price) };
    });
  }

  return result;
}
