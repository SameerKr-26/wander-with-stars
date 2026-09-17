import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import '@/components/trips/trip-detail.css';
import { TripBookingCTA } from '@/components/trips/trip-booking-cta';
import { TripEssentials } from '@/components/trips/trip-essentials';
import { TripExtras } from '@/components/trips/trip-extras';
import { TripFAQs } from '@/components/trips/trip-faq';
import { TripFirst24Hours } from '@/components/trips/trip-first-24-hours';
import { TripGallery } from '@/components/trips/trip-gallery';
import { TripHero } from '@/components/trips/trip-hero';
import { TripItinerary } from '@/components/trips/trip-itinerary';
import { TripLogistics } from '@/components/trips/trip-logistics';
import { TripOverview } from '@/components/trips/trip-overview';
import { TripPeople } from '@/components/trips/trip-host';
import { TripPolicies } from '@/components/trips/trip-policies';
import { getTripBySlug } from '@/lib/content/queries';

/**
 * /trips/[slug] — trip detail (Phase 3.5 "the trip detail experience",
 * extended in Phase 3.5B with the practical/commercial information layer).
 *
 * A continuous journey rather than a stack of identical cards: story
 * (ARRIVAL → THE FEELING → FIRST 24 HOURS → THE JOURNEY → GALLERY), then
 * practical reference (WHAT'S INCLUDED → BEFORE YOU GO → THE PEOPLE), then
 * commercial/policy information (EXTRAS → FAQ → TERMS), then ACTION.
 * Composed from small, separated components, each owning one
 * responsibility and skipping itself entirely when the content layer has
 * nothing honest to show for it — never an empty section shell or an
 * invented placeholder standing in for real content. Phase 3.5B's five new
 * sections (TripEssentials, TripExtras, TripFAQs, TripPolicies, plus
 * TripLogistics unchanged) follow the exact same rule: `lib/content/types.ts`
 * made every one of their fields optional specifically so this page has
 * nothing to fabricate when a fixture doesn't supply them.
 *
 * Reads only from lib/content/queries.ts, never lib/content/fixtures.ts
 * directly, so swapping fixtures for a real Supabase query later is a
 * one-file change (docs/ROADMAP.md Phase 5) — no visual component here
 * changes. No booking logic: the itinerary engine and booking flow are
 * later milestones (docs/ROADMAP.md Phases 5–6); TripBookingCTA states that
 * honestly rather than faking a checkout.
 *
 * An unknown slug is a real 404 via `notFound()`, not a fabricated "coming
 * soon" page for a URL that was never valid.
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const state = await getTripBySlug(slug);
  if (state.status !== 'ready') return { title: 'Trip not found — Wander With Stars' };
  return {
    title: `${state.data.title} — Wander With Stars`,
    description: state.data.overview,
  };
}

export default async function TripDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const state = await getTripBySlug(slug);

  if (state.status !== 'ready') {
    notFound();
  }

  const trip = state.data;
  const firstDay = trip.itineraryPreview[0];

  return (
    <>
      <TripHero trip={trip} />
      <TripOverview trip={trip} />
      <TripFirst24Hours day={firstDay} />
      <TripItinerary days={trip.itineraryPreview} />
      <TripGallery gallery={trip.gallery} />
      <TripLogistics trip={trip} />
      <TripEssentials trip={trip} />
      <TripPeople host={trip.host} guide={trip.guide} travellerCount={trip.travellerCount} />
      <TripExtras extras={trip.extras} />
      <TripFAQs faqs={trip.faqs} />
      <TripPolicies policy={trip.policy} />
      <TripBookingCTA />
    </>
  );
}
