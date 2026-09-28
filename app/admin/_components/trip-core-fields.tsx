/**
 * Trip core-field inputs, shared by the "new trip" and "edit trip" forms —
 * server-renderable (no client state needed; each form is a plain
 * `<form action={...}>` Server Action submission), so this is a regular
 * Server Component, not a Client Component.
 */
export interface TripCoreFieldsProps {
  hosts: { id: string; name: string }[];
  defaultValues?: {
    slug: string;
    title: string;
    destination: string;
    country: string;
    durationNights: number;
    tagline: string | null;
    overview: string;
    hostId: string | null;
  };
}

export function TripCoreFields({ hosts, defaultValues }: TripCoreFieldsProps) {
  return (
    <>
      <Field label="Slug" name="slug" defaultValue={defaultValues?.slug} required />
      <Field label="Title" name="title" defaultValue={defaultValues?.title} required />
      <Field
        label="Destination"
        name="destination"
        defaultValue={defaultValues?.destination}
        required
      />
      <Field label="Country" name="country" defaultValue={defaultValues?.country} required />
      <Field
        label="Duration (nights)"
        name="durationNights"
        type="number"
        min={0}
        defaultValue={defaultValues?.durationNights}
        required
      />
      <Field
        label="Tagline (optional)"
        name="tagline"
        defaultValue={defaultValues?.tagline ?? ''}
      />
      <label style={labelStyle}>
        <span style={spanStyle}>Overview</span>
        <textarea
          name="overview"
          defaultValue={defaultValues?.overview}
          required
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </label>
      <label style={labelStyle}>
        <span style={spanStyle}>Host (optional)</span>
        <select name="hostId" defaultValue={defaultValues?.hostId ?? ''} style={inputStyle}>
          <option value="">— none —</option>
          {hosts.map((host) => (
            <option key={host.id} value={host.id}>
              {host.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | undefined;
  required?: boolean;
  min?: number;
}) {
  return (
    <label style={labelStyle}>
      <span style={spanStyle}>{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        min={min}
        style={inputStyle}
      />
    </label>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-1)',
};
const spanStyle: React.CSSProperties = { fontSize: 'var(--text-sm)', fontWeight: 600 };
const inputStyle: React.CSSProperties = {
  padding: 'var(--space-3)',
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-border)',
  fontSize: 'var(--text-base)',
  fontFamily: 'inherit',
};
