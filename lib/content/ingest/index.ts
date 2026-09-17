/**
 * Content ingestion pipeline — Phase 3.6.
 *
 *   RAW / EXTERNAL SOURCE  ->  NORMALIZED TRIP CONTENT  ->  VALIDATED TripDetail
 *        (RawTripInput)         normalizeTripInput()          tripDetailSchema
 *
 * This is the whole boundary in one function. It never talks to a
 * database, a file format, or Supabase — see docs/ARCHITECTURE.md §14 for
 * where those plug in later. `ingestTripContent` always returns a `draft`
 * record on success (see ./types.ts's `ContentStatus` comment for why): a
 * freshly ingested brochure is never automatically publishable.
 */

import { normalizeTripInput } from './normalize';
import { draftTripDetailSchema, tripDetailSchema } from './schema';
import type { ContentRecord, DraftTripDetail, IngestResult, RawTripInput } from './types';
import type { TripDetail } from '../types';

export function ingestTripContent(raw: RawTripInput): IngestResult<TripDetail> {
  const normalized = normalizeTripInput(raw);
  const parsed = tripDetailSchema.safeParse(normalized);

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  const data = parsed.data as TripDetail;
  const record: ContentRecord<TripDetail> = { status: 'draft', data };
  return { ok: true, data, record };
}

/**
 * The same pipeline as `ingestTripContent`, against `draftTripDetailSchema`
 * instead of `tripDetailSchema` — for source content that genuinely has no
 * price, departure date, availability or host yet (see that schema's
 * comment in ./schema.ts). Still always `status: 'draft'`, still never
 * talks to a database — the only difference is which schema gate the
 * content has to pass. A record from here is not publishable until its
 * commercial fields are filled in and it separately passes
 * `ingestTripContent`/`tripDetailSchema`.
 */
export function ingestDraftTripContent(raw: RawTripInput): IngestResult<DraftTripDetail> {
  const normalized = normalizeTripInput(raw);
  const parsed = draftTripDetailSchema.safeParse(normalized);

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  const data = parsed.data as DraftTripDetail;
  const record: ContentRecord<DraftTripDetail> = { status: 'draft', data };
  return { ok: true, data, record };
}

/**
 * The one gate a `ContentRecord` must pass before the public query layer
 * (`lib/content/queries.ts`) may ever serve it. Not wired into `queries.ts`
 * in this phase (no CMS/admin flow exists to move a record to `published`
 * yet) — this exists so that boundary has a name and a single
 * implementation to call once that flow does.
 */
export function isPublishable<T>(record: ContentRecord<T>): boolean {
  return record.status === 'published';
}

export * from './normalize';
export * from './schema';
export * from './types';
