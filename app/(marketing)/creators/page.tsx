import type { Metadata } from 'next';

import { Container, Section } from '@/components/ui';
import { CreatorExperiencesView } from '@/components/marketing/creator-experiences';
import { Highlight } from '@/components/marketing/highlight';
import { PageHeader } from '@/components/marketing/page-header';
import { getCreatorExperiences } from '@/lib/content/queries';

/**
 * /creators — the public creator directory page.
 *
 * Reuses the homepage's `CreatorExperiencesView` and `getCreatorExperiences()`
 * query — one data source, shown here and on the homepage. This is the public
 * page only; the creator *portal* (applications, dashboard, earnings) is a
 * separate, later milestone (docs/ROADMAP.md Phase 12) and is not part of
 * this route.
 */

export const metadata: Metadata = {
  title: 'Creators — Wander With Stars',
  description: 'Travel creators hosting Wander With Stars departures.',
};

async function CreatorsContent() {
  const state = await getCreatorExperiences();
  return <CreatorExperiencesView state={state} />;
}

export default function CreatorsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Creators"
        title={
          <>
            Travel led by people who know the <Highlight>way</Highlight>
          </>
        }
        description="Verified creators hosting WWS departures — published once the first ones are confirmed."
      />
      <Section spacing="tight">
        <Container>
          <CreatorsContent />
        </Container>
      </Section>
    </>
  );
}
