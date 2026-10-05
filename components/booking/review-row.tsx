import { Text } from '@/components/ui';

export function ReviewRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between" style={{ gap: 'var(--space-4)' }}>
      <Text variant="small" tone="muted">
        {label}
      </Text>
      <Text
        style={{
          fontWeight: emphasis ? 'var(--weight-heading)' : 'var(--weight-subheading)',
          fontSize: emphasis ? 'var(--text-lg)' : undefined,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </div>
  );
}
