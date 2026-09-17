import { Badge, Stack, Text } from '@/components/ui';
import type { TripImportantNote } from '@/lib/content/types';

/**
 * TripImportantNotes — IMPORTANT NOTES, and "Traveller Notes" (Phase 3.5C).
 *
 * A visa requirement, a fitness expectation, a weather warning, a local
 * etiquette tip — whatever `TripDetail.importantNotes` actually contains,
 * never invented ones. Editorial title/detail pairs, not a warning-box UI:
 * these are practical facts, not alerts about something going wrong.
 * `category` (optional — see the type's own comment in lib/content/types.ts)
 * shows as a small label when a note has one, using the same outline-badge
 * treatment as trip style signals elsewhere on this page — no new visual
 * language for it.
 */
export function TripImportantNotes({ notes }: { notes: TripImportantNote[] | undefined }) {
  if (!notes || notes.length === 0) return null;

  return (
    <Stack gap={3}>
      <Text style={{ fontWeight: 'var(--weight-subheading)' }}>Important to know</Text>
      <Stack gap={3}>
        {notes.map((note, index) => (
          <Stack gap={1} key={index}>
            <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-2)' }}>
              <Text variant="small" style={{ fontWeight: 'var(--weight-label)' }}>
                {note.title}
              </Text>
              {note.category ? (
                <Badge tone="outline">
                  {note.category[0]?.toUpperCase()}
                  {note.category.slice(1)}
                </Badge>
              ) : null}
            </div>
            <Text variant="small" tone="secondary">
              {note.detail}
            </Text>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
