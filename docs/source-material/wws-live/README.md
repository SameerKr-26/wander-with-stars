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
seeded directly rather than through the content-ingestion schema, and the
Phase 4.4A report for why every seeded record stays `draft`, not
`published`.
