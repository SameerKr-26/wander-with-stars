import Link from 'next/link';

import { requireAdminRole } from '@/lib/admin/authorize';
import { listTripsForAdmin } from '@/lib/admin/repository';

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--color-text-muted)',
  review: 'var(--color-text-brand)',
  approved: 'var(--wws-teal-deep, var(--color-text-brand-strong))',
  published: '#1a7f37',
  archived: 'var(--color-text-muted)',
};

export default async function AdminTripsPage() {
  // Any of the three admin roles may at least VIEW every trip — writing is
  // gated per-action in app/admin/actions.ts (content vs. departure roles).
  await requireAdminRole(['content_manager', 'admin', 'super_admin']);
  const trips = await listTripsForAdmin();

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-6)',
        }}
      >
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>Trips</h1>
        <Link
          href="/admin/trips/new"
          style={{
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-control)',
            background: 'var(--color-surface-brand)',
            color: 'var(--color-text-on-brand)',
            fontWeight: 600,
          }}
        >
          New trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No trips yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
              <th style={cellStyle}>Title</th>
              <th style={cellStyle}>Slug</th>
              <th style={cellStyle}>Destination</th>
              <th style={cellStyle}>Status</th>
              <th style={cellStyle}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip) => (
              <tr key={trip.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <td style={cellStyle}>
                  <Link
                    href={`/admin/trips/${trip.id}`}
                    style={{ color: 'var(--color-text-brand)' }}
                  >
                    {trip.title}
                  </Link>
                </td>
                <td style={cellStyle}>{trip.slug}</td>
                <td style={cellStyle}>{trip.destination}</td>
                <td style={cellStyle}>
                  <span
                    style={{
                      color: STATUS_COLORS[trip.contentStatus] ?? undefined,
                      fontWeight: 600,
                    }}
                  >
                    {trip.contentStatus}
                  </span>
                </td>
                <td style={cellStyle}>{new Date(trip.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const cellStyle: React.CSSProperties = { padding: 'var(--space-3) var(--space-2)' };
