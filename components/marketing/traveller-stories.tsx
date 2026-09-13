import Link from 'next/link';

import { Container, EmptyState, Section, Text } from '@/components/ui';
import { getTravellerStories } from '@/lib/content/queries';
import type { ContentState, TravellerStory } from '@/lib/content/types';

import { SectionHeading } from './section-heading';

/**
 * Traveller stories — 10.
 *
 * No fabricated testimonials, ever. No verified stories exist yet, so this
 * renders its honest empty state. The `View` still renders real quotes when
 * they exist, keeping the architecture ready without inventing people.
 *
 * This is a homepage preview; "See traveller stories →" leads to the
 * dedicated /stories page, which shares this exact View and query — one
 * data source in two places.
 */

export function TravellerStoriesView({ state }: { state: ContentState<TravellerStory[]> }) {
  if (state.status !== 'ready') {
    return (
      <EmptyState
        title="Traveller stories are on the way"
        description="Once trips are complete, travellers who choose to share their experience will appear here — verified, in their own words."
      />
    );
  }

  return (
    <div
      className="grid"
      style={{ gap: 'var(--space-6)', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
    >
      {state.data.map((story) => (
        <blockquote
          key={story.id}
          className="flex flex-col"
          style={{
            gap: 'var(--space-3)',
            padding: 'var(--space-5)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-card)',
          }}
        >
          <Text style={{ fontSize: 'var(--text-lg)', lineHeight: 'var(--leading-normal)' }}>
            “{story.quote}”
          </Text>
          <footer>
            <Text variant="small" tone="secondary">
              {story.travellerName}
              {story.tripTitle ? ` · ${story.tripTitle}` : ''}
            </Text>
          </footer>
        </blockquote>
      ))}
    </div>
  );
}

async function TravellerStoriesContent() {
  const state = await getTravellerStories();
  return <TravellerStoriesView state={state} />;
}

export function TravellerStories() {
  return (
    <Section spacing="default">
      <Container>
        <div className="flex flex-col" style={{ gap: 'var(--space-8)' }}>
          <SectionHeading eyebrow="Traveller stories" title="In their own words" />
          <TravellerStoriesContent />
          <Link
            href="/stories"
            className="hover:text-text-brand-strong w-fit"
            style={{
              color: 'var(--color-text-brand)',
              fontWeight: 'var(--weight-label)',
              fontSize: 'var(--text-sm)',
            }}
          >
            See traveller stories →
          </Link>
        </div>
      </Container>
    </Section>
  );
}
