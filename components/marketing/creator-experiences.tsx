import Link from 'next/link';

import { Container, EmptyState, ImageFrame, Section, Text } from '@/components/ui';
import { getCreatorExperiences } from '@/lib/content/queries';
import type { ContentState, CreatorExperience } from '@/lib/content/types';

import { EditorialStatement } from './section-heading';

/**
 * Creator experiences — 07, framed on the homepage as "the person behind the
 * journey": every WWS trip is led by a named host or creator, not sold as a
 * self-guided package. This is deliberately a concept, not a biography — no
 * specific person is named or pictured here. Inventing a name, face or
 * backstory for a "founder" or creator that doesn't exist in any project
 * document would be fabricating a real individual's identity, which is a
 * different and more serious problem than an invented trip fixture (see
 * CLAUDE.md). The real people (verified creators) appear once they exist —
 * this section and /creators already render them the moment
 * getCreatorExperiences() returns data.
 *
 * "Meet our creators →" leads to the dedicated /creators page — this section
 * is the homepage introduction, not the destination.
 *
 * No verified creators exist in the repository yet
 * (docs/PRODUCT_REQUIREMENTS.md §9 is a later phase), so this ships its real
 * empty state today. The `View` still renders a populated grid when data
 * exists, so the architecture is proven even though nothing exercises it yet.
 */

export function CreatorExperiencesView({ state }: { state: ContentState<CreatorExperience[]> }) {
  if (state.status !== 'ready') {
    return (
      <EmptyState
        title="Creator-led trips are joining the lineup"
        description="WWS is opening departures to travel creators. Verified creator experiences will appear here."
      />
    );
  }

  return (
    <div
      className="grid"
      style={{ gap: 'var(--space-6)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
    >
      {state.data.map((creator) => (
        <div key={creator.id} className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
          <ImageFrame
            src={creator.avatar?.kind === 'image' ? creator.avatar.src : undefined}
            alt={creator.avatar?.kind === 'image' ? creator.avatar.alt : undefined}
            ratio="square"
            radius="panel"
          />
          <Text style={{ fontWeight: 'var(--weight-subheading)' }}>{creator.name}</Text>
          <Text variant="small" tone="secondary">
            {creator.tagline}
          </Text>
        </div>
      ))}
    </div>
  );
}

async function CreatorExperiencesContent() {
  const state = await getCreatorExperiences();
  return <CreatorExperiencesView state={state} />;
}

export function CreatorExperiences() {
  return (
    <Section spacing="tight" style={{ background: 'var(--color-background-secondary)' }}>
      <Container>
        <div className="flex flex-col" style={{ gap: 'var(--space-6)' }}>
          <EditorialStatement
            eyebrow="The person behind the journey"
            title="Every trip has a name attached to it"
            note="Not a self-guided itinerary — a host or creator who travels with the group, from arrival to departure."
          />
          <CreatorExperiencesContent />
          <Link
            href="/creators"
            className="hover:text-text-brand-strong w-fit"
            style={{
              color: 'var(--color-text-brand)',
              fontWeight: 'var(--weight-label)',
              fontSize: 'var(--text-sm)',
            }}
          >
            Meet our creators →
          </Link>
        </div>
      </Container>
    </Section>
  );
}
