import { Stack, Text } from '@/components/ui';

/**
 * TripPackingList — THINGS TO CARRY.
 *
 * A real `<ul>`, not a div dressed up to look like a list — the checkmark
 * is decorative (`aria-hidden`) so a screen reader announces a plain list
 * of items, not a row of interactive checkboxes the traveller hasn't
 * actually ticked. Renders nothing when the departure has no packing list
 * yet, rather than a placeholder invented to fill the space.
 */
export function TripPackingList({ items }: { items: string[] | undefined }) {
  if (!items || items.length === 0) return null;

  return (
    <Stack gap={2}>
      <Text style={{ fontWeight: 'var(--weight-subheading)' }}>Things to carry</Text>
      <ul className="flex flex-col" style={{ gap: 'var(--space-1)' }}>
        {items.map((item) => (
          <li key={item}>
            <Text
              as="span"
              variant="small"
              tone="secondary"
              className="flex items-start"
              style={{ gap: 'var(--space-2)' }}
            >
              <span aria-hidden="true" style={{ color: 'var(--color-text-brand)' }}>
                ✓
              </span>
              <span>{item}</span>
            </Text>
          </li>
        ))}
      </ul>
    </Stack>
  );
}
