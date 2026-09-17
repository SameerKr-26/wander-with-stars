/**
 * Content ingestion contract — Phase 3.6.
 *
 * The source-independent shapes the ingestion pipeline is built around:
 *
 *   RAW / EXTERNAL SOURCE  ->  NORMALIZED TRIP CONTENT  ->  VALIDATED TripDetail
 *        (RawTripInput)        (normalize.ts's output)       (schema.ts)
 *
 * See docs/ARCHITECTURE.md §14 for the full pipeline diagram and the
 * source -> field mapping table.
 */

import type { TripDetail } from '../types';

/**
 * A not-yet-validated trip payload, field names matching `TripDetail`
 * (lib/content/types.ts) but values left as `unknown`.
 *
 * Deliberately loose rather than a stricter shape: the whole point of this
 * type is that it does not commit to a source format. A CSV row hands
 * every value across as a string (including numbers and dates); a JSON
 * export might already have real numbers; a manually-reviewed extraction
 * from a PDF brochure might have neither until someone transcribes it.
 * Whichever format-specific adapter reads the actual source (a CSV
 * parser, a spreadsheet reader, a document-extraction review step) is
 * responsible for producing an object with these field NAMES — turning
 * "Brochure title" into a `title` key, "Departure dates" into
 * `departureDate`, and so on, per the mapping table in
 * docs/ARCHITECTURE.md §14. Nothing in this module reads a specific file
 * format; `normalizeTripInput` and `tripDetailSchema` only ever see this
 * shape, regardless of what produced it.
 */
export type RawTripInput = Record<string, unknown>;

/**
 * Content lifecycle (Phase 3.6 §7). Purely an editorial-review status —
 * unrelated to a trip departure's booking/availability state
 * (docs/DATABASE.md §12's "Trip departure" state model, DRAFT -> PUBLISHED
 * -> BOOKING_OPEN -> ...), which tracks whether seats can be booked, not
 * whether the trip's CONTENT has been reviewed. A departure could be
 * `BOOKING_OPEN` while its content is still `review` if a correction is in
 * progress — the two lifecycles are independent on purpose.
 *
 *   draft      freshly ingested/normalized; nobody has reviewed it
 *   review     a human is actively checking it against the source
 *   approved   reviewed and correct, but not yet live
 *   published  the one status the public query layer may ever serve
 *   archived   was published, intentionally withdrawn (not "deleted")
 *
 * This is a status concept only in this phase — no admin UI, no RBAC
 * enforcement, no database column yet (see docs/ARCHITECTURE.md §14 and
 * docs/DATABASE.md §12 for what a future implementation needs to add).
 */
export type ContentStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';

/**
 * A piece of validated content plus where it stands in the review
 * lifecycle. `ingestTripContent` (./index.ts) always produces one of these
 * at `status: 'draft'` — never `'published'` — so a freshly ingested
 * brochure can never become visible to the public query layer
 * (`lib/content/queries.ts`) without an explicit, separate promotion step.
 * That promotion step (and who is allowed to perform it, especially for
 * `data.policy`) is exactly what docs/ARCHITECTURE.md §14's "approval
 * boundary" section describes and this phase does not implement.
 */
export interface ContentRecord<T> {
  status: ContentStatus;
  data: T;
  /** Free-form notes from whoever reviewed this — e.g. why it's stuck in review. */
  reviewNotes?: string;
}

/** One field's validation failure, in a shape simple enough to show a human reviewing extracted content. */
export interface IngestIssue {
  /** Dot/bracket path into the input, e.g. "price.amount" or "itineraryPreview.2.day". */
  path: string;
  message: string;
}

export type IngestResult<T> =
  { ok: true; data: T; record: ContentRecord<T> } | { ok: false; errors: IngestIssue[] };

/**
 * `TripDetail` with its four commercial fields (`departureDate`, `price`,
 * `availability`, `host`) made optional — see `draftTripDetailSchema` in
 * ./schema.ts for why this exists as a second, narrower shape instead of a
 * change to `TripDetail` itself. Used only by `ingestDraftTripContent`
 * (./index.ts); `lib/content/queries.ts` and every UI component keep using
 * the strict `TripDetail`.
 */
export type DraftTripDetail = Omit<
  TripDetail,
  'departureDate' | 'price' | 'availability' | 'host'
> &
  Partial<Pick<TripDetail, 'departureDate' | 'price' | 'availability' | 'host'>>;
