# WWS live catalogue capture — Phase 4.4A

Source-material capture of the live Wander With Stars website
(<https://wander-with-stars.fripo.in/wander-with-stars>), taken 2026-09-28 to
bring the rebuilt application's trip catalogue into content parity with what
WWS actually publishes today. For trip data, that live site is the source of
truth — not memory, not a competitor site, not a generic travel description.

## How this was captured

Read-only browser automation (Playwright/chromium, the project's existing
e2e dependency) — no form was submitted, no enquiry was sent, no booking
action was taken, and the source platform was not modified in any way:

1. Loaded the homepage and read its rendered catalogue section, which lists
   every current trip as a card (title, destination, dates, price).
2. The homepage's initial HTML also embeds a structured JSON array (each
   trip's id, title, dates, price, currency, `packageItineraryId`, max
   group size) — read directly rather than re-derived from rendered text,
   since it is the page's own authoritative data.
3. Followed each distinct `packageItineraryId` to its `/trips/{id}` detail
   page (one departure id per trip was enough per package, since detail
   content is shared across a package's departures — verified by diffing
   two Thailand departure pages, which differ only in date/price) and
   captured the full rendered page text: overview, day-by-day itinerary,
   inclusions, exclusions, highlights, cancellation policy, and terms &
   conditions.
4. Cross-checked the rendered destination/price/date figures against the
   embedded JSON from step 2 — they agree in every case.

No cookies, authentication tokens, payment details, or any other visitor's
personal information were captured or stored — this is a public marketing
site with no login required to view trip content, and nothing in this
directory contains anything beyond that public trip content and the site's
own public technical metadata (page titles, URLs, timestamps).

## What was found

Exactly **3 trips**, run as **5 distinct departures** (see
`catalogue/wws-live-catalogue.json` for the full structured capture):

| Trip | Departures | Price range |
|---|---|---|
| Thailand Full Moon Party | Oct 25, Nov 22, Dec 22 2026 (3) | ₹49,999 – ₹64,999 |
| Vietnam Adventure: Culture and Scenic Beauty | Nov 13 2026 (1) | ₹64,999 |
| BALI New Year Special 8N/9D with Gili T & Nusa Penida | Dec 26 2026 – Jan 3 2027 (1) | ₹68,999 |

The homepage's "+1 more" text under Thailand's price list refers to that
trip's third departure date (not a fourth, hidden trip) — confirmed by the
embedded JSON, which lists exactly three Thailand entries sharing one
`packageItineraryId`.

## Directory structure

```text
wws-live/
  README.md                          this file
  catalogue/
    wws-live-catalogue.json          canonical structured capture — the
                                      parity-test source of truth
  raw/
    thailand-full-moon-party.txt     cleaned rendered-text capture per trip
    vietnam-adventure.txt            (site chrome/cookie-banner/nav removed;
    bali-new-year-special.txt         trip content preserved verbatim)
```

## Fidelity rules followed

- No paraphrasing, no shortening, no "improving" of the source wording.
  Itinerary day summaries, inclusion/exclusion labels, and policy text are
  transcribed as they render, in the source's own order.
- Where the source itself contains an inconsistency (the Bali page's Terms
  & Conditions section is a copy-paste of the Vietnam page's, referring to
  "Vietnam"/"Vietnamese" throughout), it is preserved and flagged in
  `raw/bali-new-year-special.txt`, not silently corrected — the same
  convention this project already established for the Vietnam PDF capture
  (Phase 3.7).
- Nothing absent from the source was invented. See
  `catalogue/wws-live-catalogue.json`'s `notCaptured` section for exactly
  what was deliberately left out and why (host/guide names, trip-specific
  FAQs, photos, and a "Highlights" field the current domain model has no
  place for).

## Where this data goes

`lib/content/ingest/sources/thailand-full-moon-party.ts` and
`bali-new-year-special.ts` ingest the trip CONTENT (title, overview,
itinerary, inclusions, exclusions, notes) through the existing
`ingestDraftTripContent` pipeline — draft status, exactly like the existing
Vietnam source. `scripts/seed-live-catalogue.ts` inserts that content plus
the real departure rows (dates, prices, capacity) into the local
Phase 4.1 database — see that script's own header for why departures are
seeded directly rather than through the content-ingestion schema.

## Vietnam provenance (Phase 4.4A → 4.4B)

There are two Vietnam records in this project, and they are **not merged**:

- **`lib/content/ingest/sources/vietnam-wws-7d6n.ts`** (Phase 3.7) — content
  transcribed from a WWS-supplied PDF. Title `"Vietnam 6N/7D"`, slug
  `vietnam-6n7d`. This is the record actually stored in the database and
  rendered at `/trips/vietnam-6n7d`.
- **`raw/vietnam-adventure.txt`** (Phase 4.4A) — an independent, read-only
  capture of the live site's own Vietnam page, titled on-screen
  `"Vietnam Adventure: Culture and Scenic Beauty"`.

Comparing the two (see `raw/vietnam-adventure.txt`'s own note) found the
itinerary, inclusions and exclusions match almost verbatim — this is the
same underlying WWS product, republished on the live site, not a different
trip. Two real differences were found and handled deliberately rather than
silently reconciled:

1. **The on-screen title differs** (`"Vietnam Adventure: Culture and Scenic
   Beauty"` vs. the PDF's `"Vietnam 6N/7D"`). The existing PDF-sourced
   record's title and slug were **not renamed** — changing a slug would
   break the existing route/tests for no content benefit, and the phase that
   captured this (4.4A) treated the live site's capture as confirmation and
   a source of missing commercial facts, not a wholesale replacement of an
   already-ingested record. `scripts/audit-live-parity.ts` (Phase 4.4B)
   reports this as a `KNOWN-DIFFERENCE`, not a `MISMATCH` — it is expected,
   not a bug.
2. **One exclusion line was missing from the PDF**: `"5% GST and 2% TCS"`
   appears on the live site but was never in the PDF capture. Phase 4.4B
   added this one line to `vietnam-wws-7d6n.ts`'s `exclusions` array (see
   that file's own comment) — a genuine content gap being closed, not a
   transcription "fix" of existing text.

The live capture's real commercial facts (departure Nov 13 2026, ₹64,999,
max group size 24) were never available from the PDF and are supplied
**only** via a separate `trip_departures` row
(`scripts/seed-live-catalogue.ts`) attached to the existing `vietnam-6n7d`
trip — the trip content record itself was not given a fabricated
`departureDate`/`price`/`availability`.

## Phase 4.4B — activation, publishing and parity audit

Phase 4.4A ended with all three trips seeded but `draft`/`draft` (content
and departure status) — correct for an automated capture that had not been
through human review. Phase 4.4B is the deliberate decision to publish that
capture:

- **`scripts/publish-live-catalogue.ts`** moves each of the three trips
  through the existing admin content lifecycle
  (`draft → review → approved → published`, `lib/admin/transitions.ts`'s
  `canTransition`, run as role `admin` one step at a time — never a direct
  `UPDATE ... SET content_status = 'published'`) and sets each trip's
  departure(s) to `booking_open`. Public visibility then follows from the
  existing RLS policies on `trips`/`trip_departures` — no special-case
  public policy was added, and no service-role data is used to render the
  public site.
- **`CONTENT_SOURCE=database`** (an existing env switch,
  `lib/content/db/source.ts`) makes `/trips`, `/trips/all` and
  `/trips/[slug]` read this seeded-and-published content instead of
  `lib/content/fixtures.ts`. The default remains `'fixtures'` — this is an
  explicit, opt-in mode for local verification against the local Supabase
  stack, not a silent behavior change, and there is no fallback from
  database to fixtures on a query failure (errors surface, they are not
  swallowed).
- **`scripts/audit-live-parity.ts`** is the automated MATCH / MISMATCH /
  MISSING / EXTRA-FABRICATED / KNOWN-DIFFERENCE comparison between this
  canonical capture and the rebuilt site's actual rendered pages (title,
  country, duration, price, itinerary day count, inclusion/exclusion
  section presence, absence of fabricated ratings/reviews/FAQs, horizontal
  overflow on desktop and mobile viewports). Run it with:

  ```sh
  npx tsx scripts/audit-live-parity.ts --base-url http://localhost:3000
  ```

  against a dev server running in database mode. It writes
  `parity-audit-report.md` in this directory and exits non-zero if any
  `MISMATCH` or `EXTRA-FABRICATED` finding exists.

### Resolved in Phase 4.4C: departure selection (was "one departure per trip route")

The live site gives each departure its own URL (`/trips/{departureId}`), so
all three of Thailand's departures are independently browsable there. This
project's route is still one per **trip slug**, not per departure — that
did not change — but as of Phase 4.4C, `/trips/thailand-full-moon-party`
now shows all three departures (Oct 25 ₹49,999, Nov 22 ₹59,999, Dec 22
₹64,999) as selectable options on that one route
(`components/trips/departure-panel.tsx`), rather than only ever showing the
soonest one. No new per-departure routes were introduced — see
docs/ARCHITECTURE.md's "Departure selection (Phase 4.4C)" section for why
that was a deliberate choice, not an oversight.
