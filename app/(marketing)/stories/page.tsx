import type { Metadata } from 'next';

import { Container, Section } from '@/components/ui';
import { PageHeader } from '@/components/marketing/page-header';
import { TravellerStoriesView } from '@/components/marketing/traveller-stories';
import { getTravellerStories } from '@/lib/content/queries';

/**
 * /stories — editorial travel stories.
 *
 * Reuses the same `TravellerStoriesView` and `getTravellerStories()` query as
 * the homepage's "Traveller stories" section, so this is genuinely one data
 * source shown in two places, not a duplicate fixture that could drift.
 * Empty today because no verified stories exist yet — see the view's own
 * comment for why that is a real state, not a placeholder to dress up.
 */

export const metadata: Metadata = {
  title: 'Stories — Wander With Stars',
  description: 'Traveller stories from Wander With Stars departures.',
};

async function StoriesContent() {
  const state = await getTravellerStories();
  return <TravellerStoriesView state={state} />;
}

export default function StoriesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stories"
        title="In their own words"
        description="Stories from travellers who've completed a WWS departure — published once they're verified."
      />
      <Section spacing="tight">
        <Container>
          <StoriesContent />
        </Container>
      </Section>
    </>
  );
}
