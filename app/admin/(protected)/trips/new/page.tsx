import { requireAdminRole } from '@/lib/admin/authorize';
import { listHostsForSelect } from '@/lib/admin/repository';
import { CONTENT_EDITOR_ROLES } from '@/lib/admin/roles';

import { createTripAction } from '../../../actions';
import { TripCoreFields } from '../../../_components/trip-core-fields';

export default async function NewTripPage() {
  await requireAdminRole(CONTENT_EDITOR_ROLES);
  const hosts = await listHostsForSelect();

  return (
    <div style={{ maxWidth: '640px' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
        New trip
      </h1>
      <form
        action={createTripAction}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <TripCoreFields hosts={hosts} />
        <button type="submit" style={primaryButtonStyle}>
          Create trip (draft)
        </button>
      </form>
    </div>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  padding: 'var(--space-3) var(--space-5)',
  borderRadius: 'var(--radius-control)',
  border: 'none',
  background: 'var(--color-surface-brand)',
  color: 'var(--color-text-on-brand)',
  fontWeight: 600,
  cursor: 'pointer',
};
