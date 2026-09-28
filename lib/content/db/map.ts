/**
 * Pure mapping from the normalized Phase 4.1 schema (`lib/content/db/schema.ts`)
 * to the existing WWS domain model (`lib/content/types.ts`).
 *
 * No React, no Supabase import — plain data in, plain data out, exactly like
 * `lib/content/filters.ts` and `lib/content/format.ts`, so this is testable
 * without a database and reusable by both `getUpcomingTrips` and
 * `getTripBySlug`.
 */
import type {
  AvailabilityStatus,
  GuidePreview,
  HostPreview,
  TripAccommodation,
  TripDetail,
  TripExtra,
  TripFAQ,
  TripImportantNote,
  TripItineraryDay,
  TripMedia,
  TripMeetingPoint,
  TripPolicy,
  TripPreview,
  TripTransport,
} from '../types';
import type {
  GuideRow,
  HostRow,
  TripAccommodationRow,
  TripDepartureRow,
  TripDepartureStatus,
  TripDetailRow,
  TripFaqRow,
  TripImportantNoteRow,
  TripMediaRow,
  TripMeetingPointRow,
  TripPolicySectionRow,
  TripRow,
  TripTransportRow,
} from './schema';

const byDisplayOrder = <T extends { display_order: number }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => a.display_order - b.display_order);

/**
 * Only these statuses have an honest `AvailabilityStatus` equivalent —
 * `draft` never reaches here (RLS/the caller already excludes it), and
 * `published` (announced, booking not yet open), `in_progress` and
 * `completed` have no meaningful "spots left" story to tell a browsing
 * traveller, so a trip whose only departures are in one of those states is
 * treated as not yet ready to preview rather than mapped with a guessed
 * status. `waitlisted` (`AvailabilityStatus`'s fourth value) has no
 * `trip_departures.status` counterpart today — no schema change invents one
 * without a real waitlist feature behind it.
 */
const AVAILABILITY_BY_DEPARTURE_STATUS: Partial<Record<TripDepartureStatus, AvailabilityStatus>> = {
  booking_open: 'open',
  almost_full: 'almost-full',
  sold_out: 'sold-out',
};

/**
 * Picks the one departure a `TripPreview`/`TripDetail` card composes with,
 * from an already RLS-filtered candidate list (`trip_departures` in the
 * query only ever contains rows the current reader may see at all).
 *
 * The earliest upcoming presentable departure — the one a traveller would
 * actually book next — takes priority; only presentable departures (see
 * `AVAILABILITY_BY_DEPARTURE_STATUS`) are considered at all. Returns
 * `undefined` when a trip has no such departure yet (a published trip with
 * only draft/announced departures, or none at all) — the caller treats that
 * as "not ready to preview", not as broken content.
 */
export function selectPresentableDeparture(
  departures: TripDepartureRow[],
): TripDepartureRow | undefined {
  const presentable = departures.filter((d) => d.status in AVAILABILITY_BY_DEPARTURE_STATUS);
  if (presentable.length === 0) return undefined;
  return [...presentable].sort((a, b) => a.departure_date.localeCompare(b.departure_date))[0];
}

function mapMedia(row: TripMediaRow): TripMedia {
  if (row.kind === 'image') {
    return {
      kind: 'image',
      src: row.src ?? '',
      alt: row.alt ?? '',
      ...(row.focal_point ? { focalPoint: row.focal_point } : {}),
    };
  }
  if (row.kind === 'video') {
    return { kind: 'video', src: row.src ?? '', poster: row.poster ?? '', alt: row.alt ?? '' };
  }
  return { kind: 'placeholder' };
}

function mapPersonPreview(row: HostRow | GuideRow): HostPreview | GuidePreview {
  return {
    name: row.name,
    ...(row.tagline ? { tagline: row.tagline } : {}),
    ...(row.avatar_kind
      ? {
          avatar: mapMedia({
            id: '',
            kind: row.avatar_kind,
            src: row.avatar_src,
            alt: row.avatar_alt,
            poster: row.avatar_poster,
            focal_point: null,
            is_hero: false,
            display_order: 0,
          }),
        }
      : {}),
  };
}

function selectHeroMedia(media: TripMediaRow[]): TripMedia {
  const hero = media.find((m) => m.is_hero);
  if (hero) return mapMedia(hero);
  return { kind: 'placeholder' };
}

function mapAccommodation(row: TripAccommodationRow): TripAccommodation {
  return {
    ...(row.name ? { name: row.name } : {}),
    ...(row.type ? { type: row.type } : {}),
    ...(row.description ? { description: row.description } : {}),
    ...(row.nights !== null ? { nights: row.nights } : {}),
  };
}

function mapTransport(row: TripTransportRow): TripTransport {
  return { mode: row.mode, ...(row.description ? { description: row.description } : {}) };
}

function mapMeetingPoint(row: TripMeetingPointRow): TripMeetingPoint {
  return {
    location: row.location,
    ...(row.meeting_time ? { time: row.meeting_time } : {}),
    ...(row.instructions ? { instructions: row.instructions } : {}),
  };
}

function mapImportantNote(row: TripImportantNoteRow): TripImportantNote {
  return {
    title: row.title,
    detail: row.detail,
    ...(row.category ? { category: row.category } : {}),
  };
}

function mapFaq(row: TripFaqRow): TripFAQ {
  return { question: row.question, answer: row.answer };
}

/**
 * `trip_policy_sections` is a flat, ordered row list; `TripPolicy` is a
 * named-slot object. `cancellation`/`refund`/`payment_terms` are each at
 * most one row (a database partial unique index enforces it) — the first
 * match wins, which is the only match. `additional` stays the array it
 * already is.
 */
function mapPolicy(rows: TripPolicySectionRow[]): TripPolicy | undefined {
  if (rows.length === 0) return undefined;
  const ordered = byDisplayOrder(rows);
  const find = (kind: TripPolicySectionRow['kind']) => ordered.find((r) => r.kind === kind);
  const cancellation = find('cancellation');
  const refund = find('refund');
  const paymentTerms = find('payment_terms');
  const additional = ordered.filter((r) => r.kind === 'additional');

  const policy: TripPolicy = {
    ...(cancellation
      ? { cancellation: { title: cancellation.title, body: cancellation.body } }
      : {}),
    ...(refund ? { refund: { title: refund.title, body: refund.body } } : {}),
    ...(paymentTerms
      ? { paymentTerms: { title: paymentTerms.title, body: paymentTerms.body } }
      : {}),
    ...(additional.length > 0
      ? { additionalTerms: additional.map((r) => ({ title: r.title, body: r.body })) }
      : {}),
  };
  return Object.keys(policy).length > 0 ? policy : undefined;
}

/**
 * Builds the `TripPreview` a discovery/homepage card needs, from one trip
 * row plus the departure `selectPresentableDeparture` chose for it.
 * `departure` is required here (not optional) precisely because
 * `TripPreview` requires `departureDate`/`price`/`availability` — the
 * caller only invokes this once a presentable departure genuinely exists.
 */
export function mapTripPreview(trip: TripRow, departure: TripDepartureRow): TripPreview {
  const availability = AVAILABILITY_BY_DEPARTURE_STATUS[departure.status];
  if (!availability) {
    throw new Error(
      `mapTripPreview called with a non-presentable departure (status: ${departure.status})`,
    );
  }
  if (!departure.price_amount || !departure.price_currency) {
    throw new Error(`Presentable departure ${departure.id} has no price set`);
  }
  if (!trip.hosts) {
    throw new Error(`Trip ${trip.slug} has a presentable departure but no host`);
  }

  const capacity = departure.capacity;
  const seatsLeft =
    capacity !== null ? Math.max(capacity - departure.seats_reserved, 0) : undefined;

  return {
    id: departure.id,
    slug: trip.slug,
    title: trip.title,
    destination: trip.destination,
    country: trip.country,
    departureDate: departure.departure_date,
    durationNights: trip.duration_nights,
    price: { amount: departure.price_amount, currency: departure.price_currency },
    availability: {
      status: availability,
      ...(seatsLeft !== undefined ? { spotsLeft: seatsLeft } : {}),
    },
    host: mapPersonPreview(trip.hosts),
    heroMedia: selectHeroMedia(trip.trip_media),
    styleScores: trip.style_scores,
    ...(trip.tagline ? { tagline: trip.tagline } : {}),
  };
}

/**
 * Builds the full `TripDetail` for `/trips/[slug]`, composing the trip's own
 * content with the one departure `selectPresentableDeparture` chose for its
 * commercial fields and departure-scoped logistics (accommodation,
 * transport, meeting point, guide). Every optional `TripDetail` field maps
 * to `undefined` — never a placeholder value — when the source table has no
 * rows for this trip, so `/trips/[slug]`'s existing "skip the section
 * entirely" behaviour keeps working unchanged.
 */
export function mapTripDetail(trip: TripDetailRow, departure: TripDepartureRow): TripDetail {
  const preview = mapTripPreview(trip, departure);
  const gallery = byDisplayOrder(trip.trip_media).map(mapMedia);
  const accommodation = departure.trip_accommodation.map(mapAccommodation);
  const transport = byDisplayOrder(departure.trip_transport).map(mapTransport);
  const meetingPoint = departure.trip_meeting_points[0];
  const importantNotes = byDisplayOrder(trip.trip_important_notes).map(mapImportantNote);
  const extras = byDisplayOrder(trip.trip_extras).map((row): TripExtra => ({
    name: row.name,
    ...(row.price_amount !== null && row.price_currency !== null
      ? { price: { amount: row.price_amount, currency: row.price_currency } }
      : {}),
    ...(row.description ? { description: row.description } : {}),
  }));
  const faqs = byDisplayOrder(trip.trip_faqs).map(mapFaq);
  const policy = mapPolicy(trip.trip_policy_sections);

  return {
    ...preview,
    overview: trip.overview,
    inclusions: byDisplayOrder(trip.trip_inclusions).map((r) => r.label),
    exclusions: byDisplayOrder(trip.trip_exclusions).map((r) => r.label),
    gallery,
    itineraryPreview: [...trip.itinerary_days]
      .sort((a, b) => a.day_number - b.day_number)
      .map((d): TripItineraryDay => ({ day: d.day_number, title: d.title, summary: d.summary })),
    ...(accommodation.length > 0 ? { accommodation } : {}),
    ...(transport.length > 0 ? { transport } : {}),
    ...(meetingPoint ? { meetingPoint: mapMeetingPoint(meetingPoint) } : {}),
    ...(importantNotes.length > 0 ? { importantNotes } : {}),
    ...(faqs.length > 0 ? { faqs } : {}),
    ...(policy ? { policy } : {}),
    ...(extras.length > 0 ? { extras } : {}),
    ...(departure.guides ? { guide: mapPersonPreview(departure.guides) } : {}),
  };
}
