import type { Metadata } from 'next';

import {
  CinematicStory,
  CreatorExperiences,
  FinalCTA,
  Hero,
  MeetYourPeople,
  TravelPassportTeaser,
  TravelTypeSelector,
  TravellerStories,
  TrustSignals,
  UpcomingExperiences,
  WhyWWS,
} from '@/components/marketing';

/**
 * Homepage — the first real WWS production page.
 *
 * Sections in the order given for this milestone. Navigation (01) and footer
 * (13) come from app/(marketing)/layout.tsx, already wrapping this page.
 *
 * Every section that shows real-world content (trips, community stats,
 * creators, stories) is built against lib/content/queries.ts and renders
 * honestly today: fixture trips are clearly fixtures, and sections with no
 * verified data render their real empty state rather than an invented one.
 * See lib/content/fixtures.ts for what is temporary and why.
 */

export const metadata: Metadata = {
  title: 'Wander With Stars — Travel with people, not just packages',
  description:
    'Curated group trips, built around the people you travel with. Discover upcoming departures and find your travel style.',
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustSignals />
      <TravelTypeSelector />
      <UpcomingExperiences />
      <MeetYourPeople />
      <CreatorExperiences />
      <CinematicStory />
      <WhyWWS />
      <TravellerStories />
      <TravelPassportTeaser />
      <FinalCTA />
    </>
  );
}
