import { notFound } from 'next/navigation';

import { requireAdminRole } from '@/lib/admin/authorize';
import { getTripForAdmin, listHostsForSelect } from '@/lib/admin/repository';
import { CONTENT_EDITOR_ROLES, DEPARTURE_EDITOR_ROLES } from '@/lib/admin/roles';
import { allowedNextStatuses } from '@/lib/admin/transitions';
import type { ContentStatus } from '@/lib/content/ingest/types';

import {
  addExclusionAction,
  addInclusionAction,
  addItineraryDayAction,
  createDepartureAction,
  deleteDepartureAction,
  deleteExclusionAction,
  deleteInclusionAction,
  deleteItineraryDayAction,
  transitionStatusAction,
  updateDepartureAction,
  updateTripCoreAction,
} from '../../../actions';
import { TripCoreFields } from '../../../_components/trip-core-fields';
import { DEPARTURE_STATUSES } from '@/lib/admin/validation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTripPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireAdminRole(['content_manager', 'admin', 'super_admin']);
  const [trip, hosts] = await Promise.all([getTripForAdmin(id), listHostsForSelect()]);
  if (!trip) notFound();

  const canEditContent = CONTENT_EDITOR_ROLES.includes(session.role);
  const canEditDepartures = DEPARTURE_EDITOR_ROLES.includes(session.role);
  const nextStatuses = allowedNextStatuses(session.role, trip.contentStatus);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-10)',
        maxWidth: '720px',
      }}
    >
      <header>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          /admin/trips/{trip.id}
        </p>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>{trip.title}</h1>
        <p style={{ fontSize: 'var(--text-sm)' }}>
          Status: <strong>{trip.contentStatus}</strong>
        </p>
      </header>

      <Section title="Lifecycle">
        {nextStatuses.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            No transitions available to your role from &quot;{trip.contentStatus}&quot;.
          </p>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {nextStatuses.map((to) => (
              <StatusTransitionForm key={to} tripId={trip.id} from={trip.contentStatus} to={to} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Trip details">
        {canEditContent ? (
          <form
            action={updateTripCoreAction.bind(null, trip.id)}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            <TripCoreFields hosts={hosts} defaultValues={trip} />
            <button type="submit" style={primaryButtonStyle}>
              Save
            </button>
          </form>
        ) : (
          <ReadOnlyNotice />
        )}
      </Section>

      <Section title="Itinerary">
        <ul
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            paddingLeft: 0,
          }}
        >
          {trip.itineraryDays.map((day) => (
            <li key={day.id} style={rowStyle}>
              <div>
                <strong>Day {day.dayNumber}:</strong> {day.title}
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  {day.summary}
                </p>
              </div>
              {canEditContent ? (
                <form action={deleteItineraryDayAction.bind(null, trip.id, day.id)}>
                  <DeleteButton />
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {canEditContent ? (
          <form
            action={addItineraryDayAction.bind(null, trip.id)}
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-4)',
              flexWrap: 'wrap',
            }}
          >
            <input
              name="dayNumber"
              type="number"
              min={1}
              placeholder="Day #"
              required
              style={smallInputStyle}
            />
            <input name="title" placeholder="Title" required style={inputStyle} />
            <input name="summary" placeholder="Summary" required style={inputStyle} />
            <button type="submit" style={secondaryButtonStyle}>
              Add day
            </button>
          </form>
        ) : null}
      </Section>

      <LabelListSection
        title="Inclusions"
        tripId={trip.id}
        items={trip.inclusions}
        canEdit={canEditContent}
        addAction={addInclusionAction}
        deleteAction={deleteInclusionAction}
      />

      <LabelListSection
        title="Exclusions"
        tripId={trip.id}
        items={trip.exclusions}
        canEdit={canEditContent}
        addAction={addExclusionAction}
        deleteAction={deleteExclusionAction}
      />

      <Section title="Departures">
        <ul
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            paddingLeft: 0,
          }}
        >
          {trip.departures.map((departure) => (
            <li key={departure.id} style={{ ...rowStyle, alignItems: 'flex-start' }}>
              {canEditDepartures ? (
                <form
                  action={updateDepartureAction.bind(null, trip.id, departure.id)}
                  style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', flex: 1 }}
                >
                  <input
                    name="departureDate"
                    type="date"
                    defaultValue={departure.departureDate}
                    required
                    style={smallInputStyle}
                  />
                  <input
                    name="returnDate"
                    type="date"
                    defaultValue={departure.returnDate ?? ''}
                    style={smallInputStyle}
                  />
                  <input
                    name="priceAmount"
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    defaultValue={departure.priceAmount ?? ''}
                    style={smallInputStyle}
                  />
                  <input
                    name="priceCurrency"
                    placeholder="Currency"
                    maxLength={3}
                    defaultValue={departure.priceCurrency ?? ''}
                    style={{ ...smallInputStyle, width: '80px' }}
                  />
                  <input
                    name="capacity"
                    type="number"
                    min={1}
                    placeholder="Capacity"
                    defaultValue={departure.capacity ?? ''}
                    style={{ ...smallInputStyle, width: '100px' }}
                  />
                  <select name="status" defaultValue={departure.status} style={smallInputStyle}>
                    {DEPARTURE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button type="submit" style={secondaryButtonStyle}>
                    Save
                  </button>
                </form>
              ) : (
                <span>
                  {departure.departureDate} — {departure.status}
                </span>
              )}
              {canEditDepartures ? (
                <form action={deleteDepartureAction.bind(null, trip.id, departure.id)}>
                  <DeleteButton />
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {canEditDepartures ? (
          <form
            action={createDepartureAction.bind(null, trip.id)}
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-4)',
              flexWrap: 'wrap',
            }}
          >
            <input name="departureDate" type="date" required style={smallInputStyle} />
            <input name="returnDate" type="date" style={smallInputStyle} />
            <input
              name="priceAmount"
              type="number"
              step="0.01"
              placeholder="Price"
              style={smallInputStyle}
            />
            <input
              name="priceCurrency"
              placeholder="Currency"
              maxLength={3}
              style={{ ...smallInputStyle, width: '80px' }}
            />
            <input
              name="capacity"
              type="number"
              min={1}
              placeholder="Capacity"
              style={{ ...smallInputStyle, width: '100px' }}
            />
            <select name="status" defaultValue="draft" style={smallInputStyle}>
              {DEPARTURE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button type="submit" style={secondaryButtonStyle}>
              Add departure
            </button>
          </form>
        ) : (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Your role ({session.role}) may view departures but not edit them — see docs/RBAC.md.
          </p>
        )}
      </Section>
    </div>
  );
}

function StatusTransitionForm({
  tripId,
  from,
  to,
}: {
  tripId: string;
  from: ContentStatus;
  to: ContentStatus;
}) {
  const action = transitionStatusAction.bind(null, tripId, from);
  return (
    <form action={action}>
      <input type="hidden" name="to" value={to} />
      <button type="submit" style={secondaryButtonStyle}>
        {LIFECYCLE_LABELS[to] ?? to}
      </button>
    </form>
  );
}

const LIFECYCLE_LABELS: Partial<Record<ContentStatus, string>> = {
  review: 'Submit for review',
  draft: 'Return to draft',
  approved: 'Approve',
  published: 'Publish',
  archived: 'Archive',
};

function LabelListSection({
  title,
  tripId,
  items,
  canEdit,
  addAction,
  deleteAction,
}: {
  title: string;
  tripId: string;
  items: { id: string; label: string }[];
  canEdit: boolean;
  addAction: (tripId: string, formData: FormData) => Promise<void>;
  deleteAction: (tripId: string, rowId: string) => Promise<void>;
}) {
  return (
    <Section title={title}>
      <ul
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingLeft: 0 }}
      >
        {items.map((item) => (
          <li key={item.id} style={rowStyle}>
            <span>{item.label}</span>
            {canEdit ? (
              <form action={deleteAction.bind(null, tripId, item.id)}>
                <DeleteButton />
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {canEdit ? (
        <form
          action={addAction.bind(null, tripId)}
          style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}
        >
          <input name="label" placeholder="New item" required style={inputStyle} />
          <button type="submit" style={secondaryButtonStyle}>
            Add
          </button>
        </form>
      ) : null}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-panel)',
        padding: 'var(--space-6)',
      }}
    >
      <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function DeleteButton() {
  return (
    <button type="submit" style={{ ...secondaryButtonStyle, color: '#b3261e' }}>
      Delete
    </button>
  );
}

function ReadOnlyNotice() {
  return (
    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
      Your role may view this trip but not edit its content.
    </p>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: 'var(--space-2) 0',
  borderBottom: '1px solid var(--color-border-subtle)',
};

const inputStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-border)',
  fontSize: 'var(--text-base)',
  fontFamily: 'inherit',
  flex: 1,
};

const smallInputStyle: React.CSSProperties = { ...inputStyle, flex: 'unset', width: '140px' };

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

const secondaryButtonStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
};
