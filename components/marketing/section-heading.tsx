import type { ReactNode } from 'react';

import { Heading, Stack, Text } from '@/components/ui';

/**
 * Shared eyebrow + heading + intro pattern used across homepage sections.
 *
 * Not a components/ui primitive: this is a page-composition convenience
 * specific to the marketing section rhythm, not a generic design-system
 * building block. It exists purely to avoid retyping the same three-element
 * pattern eleven times, reusing Heading/Text/Stack from components/ui rather
 * than introducing new styling.
 */

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  id?: string;
  align?: 'start' | 'center';
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  align = 'start',
}: SectionHeadingProps) {
  const centered = align === 'center';

  return (
    <Stack
      gap={3}
      {...(centered ? { align: 'center' as const } : {})}
      className={centered ? 'text-center' : undefined}
    >
      {eyebrow ? (
        <Text variant="label" tone="brand" uppercase as="p">
          {eyebrow}
        </Text>
      ) : null}
      <Heading id={id} level="3xl" as="h2" className="max-w-[42ch]">
        {title}
      </Heading>
      {description ? (
        <Text variant="lead" tone="secondary" className="max-w-[62ch]">
          {description}
        </Text>
      ) : null}
    </Stack>
  );
}

/** A single restrained star mark, used sparingly as a section divider or accent. */
export function StarMark({ className }: { className?: string }): ReactNode {
  return (
    <span aria-hidden="true" className={className} style={{ color: 'var(--color-accent)' }}>
      ✦
    </span>
  );
}

/**
 * Editorial split heading — a large statement on one side, a short note or
 * link on the other, instead of the centred eyebrow/heading/description
 * stack every section otherwise repeats.
 *
 * Exists specifically to vary composition rhythm across the homepage (Phase
 * 3.3, Part A): several sections in a row using the same centred-stack recipe
 * is what reads as "section → card → section → card" rather than a
 * continuous editorial page. This is a second recipe, not a new design
 * language — same tokens, same type scale.
 */
export function EditorialStatement({
  eyebrow,
  title,
  note,
}: {
  eyebrow?: string;
  title: string;
  note?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-start justify-between sm:flex-row sm:items-end"
      style={{ gap: 'var(--space-6)' }}
    >
      <Stack gap={2} className="max-w-[34ch]">
        {eyebrow ? (
          <Text variant="label" tone="brand" uppercase as="p">
            {eyebrow}
          </Text>
        ) : null}
        <Heading level="3xl" as="h2">
          {title}
        </Heading>
      </Stack>
      {note ? (
        <div className="max-w-[36ch] sm:text-right">
          {typeof note === 'string' ? (
            <Text variant="small" tone="secondary">
              {note}
            </Text>
          ) : (
            note
          )}
        </div>
      ) : null}
    </div>
  );
}
