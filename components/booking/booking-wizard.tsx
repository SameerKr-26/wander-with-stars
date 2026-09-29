'use client';

import { useState } from 'react';

import { submitBookingAction } from '@/app/booking/[departureId]/actions';
import { Button, Field, GlassPanel, Input, Section, Select, Stack, Text } from '@/components/ui';
import type { BookableDepartureSummary } from '@/lib/booking/repository';
import { formatBookingDate, formatBookingPrice } from '@/lib/booking/format';
import { formatDuration } from '@/lib/content/format';

/**
 * BookingWizard — Phase 4.6.
 *
 * A single client component owning all four steps (contact → participants
 * → review → result) as plain `useState`, not four separate routes — the
 * one thing that must never happen is losing the selected departure
 * between steps, and keeping everything in one component's closure makes
 * that structurally impossible rather than something careful prop-passing
 * has to get right across a route boundary. `departureId` (the
 * `trip_departure_id` the page itself resolved from the URL) is threaded
 * through unchanged to the final submission — never re-derived from
 * `summary` (which is display-only) or any other client-visible state.
 *
 * `summary` is for DISPLAY ONLY. Every field a traveller sees here
 * (price, dates, availability) is re-read and re-validated authoritatively
 * a second time, server-side, inside `submitBookingAction` →
 * `create_pending_booking` — this component never sends price/availability
 * back to the server as something to trust; it only ever sends
 * `departureId`, contact details and participant names.
 *
 * CONTROL-world visual language throughout: plain `Field`/`Input`/`Select`,
 * no cinematic imagery, no motion beyond ordinary focus/hover states —
 * deliberately unlike the public trip pages this flow is entered from.
 */

type Step = 'contact' | 'participants' | 'review' | 'result';

interface ContactState {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  participantCount: number;
}

interface BookingWizardProps {
  departureId: string;
  summary: BookableDepartureSummary;
}

export function BookingWizard({ departureId, summary }: BookingWizardProps) {
  const [step, setStep] = useState<Step>('contact');
  const [contact, setContact] = useState<ContactState>({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    participantCount: 1,
  });
  const [participantNames, setParticipantNames] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof submitBookingAction>> | null>(
    null,
  );
  // One idempotency key per review session, generated once and reused on
  // every retry of the same submission — see lib/booking/validation.ts's
  // own comment for the full contract (scope: this one booking attempt;
  // lifetime: until success or the traveller starts over).
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const maxParticipants = Math.min(summary.seatsLeft ?? 10, 10);

  function handleContactSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const names = Array.from(
      { length: contact.participantCount },
      (_, i) => participantNames[i] ?? (i === 0 ? contact.contactName : ''),
    );
    setParticipantNames(names);
    setStep('participants');
  }

  function handleParticipantsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (participantNames.some((n) => n.trim().length === 0)) return;
    setStep('review');
  }

  async function handleConfirm() {
    setSubmitting(true);
    setSubmitError(null);

    const outcome = await submitBookingAction({
      tripDepartureId: departureId,
      idempotencyKey,
      contactName: contact.contactName,
      contactEmail: contact.contactEmail,
      contactPhone: contact.contactPhone || undefined,
      participants: participantNames.map((fullName, i) => ({ fullName, isLead: i === 0 })),
    });

    setSubmitting(false);
    if (!outcome.ok) {
      setSubmitError(outcome.errorMessage ?? 'Something went wrong. Please try again.');
      return;
    }
    setResult(outcome);
    setStep('result');
  }

  return (
    <Section spacing="default">
      <div
        className="mx-auto w-full"
        style={{ maxWidth: '640px', paddingInline: 'var(--container-gutter)' }}
      >
        <Stack gap={6}>
          <BookingSummaryCard summary={summary} />

          {step === 'contact' ? (
            <ContactStep
              value={contact}
              maxParticipants={maxParticipants}
              onChange={setContact}
              onSubmit={handleContactSubmit}
            />
          ) : null}

          {step === 'participants' ? (
            <ParticipantsStep
              names={participantNames}
              leadContactName={contact.contactName}
              onChange={setParticipantNames}
              onBack={() => setStep('contact')}
              onSubmit={handleParticipantsSubmit}
            />
          ) : null}

          {step === 'review' ? (
            <ReviewStep
              summary={summary}
              contact={contact}
              participantNames={participantNames}
              submitting={submitting}
              error={submitError}
              onBack={() => setStep('participants')}
              onConfirm={handleConfirm}
            />
          ) : null}

          {step === 'result' && result ? <ResultStep result={result} /> : null}
        </Stack>
      </div>
    </Section>
  );
}

function BookingSummaryCard({ summary }: { summary: BookableDepartureSummary }) {
  return (
    <GlassPanel variant="tinted" radius="panel" style={{ padding: 'var(--space-6)' }}>
      <Stack gap={2}>
        <Text variant="label" tone="brand" uppercase>
          {summary.destination}
        </Text>
        <Text as="h1" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-heading)' }}>
          {summary.tripTitle}
        </Text>
        <div className="flex flex-wrap" style={{ gap: 'var(--space-5)' }}>
          <SummaryFact label="Departs" value={formatBookingDate(summary.departureDate)} />
          <SummaryFact label="Duration" value={formatDuration(summary.durationNights)} />
          <SummaryFact
            label="Price"
            value={`${formatBookingPrice(summary.priceAmount, summary.priceCurrency)} / person`}
          />
        </div>
      </Stack>
    </GlassPanel>
  );
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={1}>
      <Text variant="meta" tone="muted" uppercase>
        {label}
      </Text>
      <Text style={{ fontWeight: 'var(--weight-subheading)' }}>{value}</Text>
    </Stack>
  );
}

function ContactStep({
  value,
  maxParticipants,
  onChange,
  onSubmit,
}: {
  value: ContactState;
  maxParticipants: number;
  onChange: (next: ContactState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <Stack gap={5}>
        <Text style={{ fontWeight: 'var(--weight-subheading)', fontSize: 'var(--text-lg)' }}>
          Your details
        </Text>
        <Field label="Full name" required>
          <Input
            required
            value={value.contactName}
            onChange={(e) => onChange({ ...value, contactName: e.target.value })}
          />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            required
            value={value.contactEmail}
            onChange={(e) => onChange({ ...value, contactEmail: e.target.value })}
          />
        </Field>
        <Field label="Phone" description="Optional.">
          <Input
            type="tel"
            value={value.contactPhone}
            onChange={(e) => onChange({ ...value, contactPhone: e.target.value })}
          />
        </Field>
        <Field label="Number of travellers" required>
          <Select
            required
            value={value.participantCount}
            onChange={(e) => onChange({ ...value, participantCount: Number(e.target.value) })}
          >
            {Array.from({ length: maxParticipants }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit">Continue</Button>
      </Stack>
    </form>
  );
}

function ParticipantsStep({
  names,
  leadContactName,
  onChange,
  onBack,
  onSubmit,
}: {
  names: string[];
  leadContactName: string;
  onChange: (names: string[]) => void;
  onBack: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <Stack gap={5}>
        <Text style={{ fontWeight: 'var(--weight-subheading)', fontSize: 'var(--text-lg)' }}>
          Who&apos;s travelling?
        </Text>
        {names.map((name, i) => (
          <Field
            key={i}
            label={i === 0 ? 'Traveller 1 (lead)' : `Traveller ${i + 1}`}
            {...(i === 0
              ? {
                  description: `Defaults to ${leadContactName || 'your name'} — edit if different.`,
                }
              : {})}
            required
          >
            <Input
              required
              value={name}
              onChange={(e) => {
                const next = [...names];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
          </Field>
        ))}
        <div className="flex" style={{ gap: 'var(--space-3)' }}>
          <Button type="button" variant="secondary" onClick={onBack}>
            Back
          </Button>
          <Button type="submit">Continue</Button>
        </div>
      </Stack>
    </form>
  );
}

function ReviewStep({
  summary,
  contact,
  participantNames,
  submitting,
  error,
  onBack,
  onConfirm,
}: {
  summary: BookableDepartureSummary;
  contact: ContactState;
  participantNames: string[];
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const total = summary.priceAmount * participantNames.length;
  return (
    <Stack gap={5}>
      <Text style={{ fontWeight: 'var(--weight-subheading)', fontSize: 'var(--text-lg)' }}>
        Review your booking
      </Text>

      <Stack gap={3}>
        <ReviewRow label="Trip" value={`${summary.tripTitle} — ${summary.destination}`} />
        <ReviewRow label="Departs" value={formatBookingDate(summary.departureDate)} />
        {summary.returnDate ? (
          <ReviewRow label="Returns" value={formatBookingDate(summary.returnDate)} />
        ) : null}
        <ReviewRow label="Duration" value={formatDuration(summary.durationNights)} />
        <ReviewRow label="Contact" value={`${contact.contactName} · ${contact.contactEmail}`} />
        <ReviewRow label="Travellers" value={participantNames.join(', ')} />
        <ReviewRow
          label="Price"
          value={`${formatBookingPrice(summary.priceAmount, summary.priceCurrency)} / person × ${participantNames.length}`}
        />
        <ReviewRow
          label="Total"
          value={formatBookingPrice(total, summary.priceCurrency)}
          emphasis
        />
      </Stack>

      <Text variant="small" tone="secondary">
        This reserves your spot as a pending booking. Payment and final confirmation are a later
        step — no charge happens now.
      </Text>

      {error ? (
        <Text
          role="alert"
          variant="small"
          style={{ color: 'var(--wws-charcoal)', fontWeight: 600 }}
        >
          {error}
        </Text>
      ) : null}

      <div className="flex" style={{ gap: 'var(--space-3)' }}>
        <Button type="button" variant="secondary" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button type="button" onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Reserving…' : 'Reserve this departure'}
        </Button>
      </div>
    </Stack>
  );
}

function ReviewRow({
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

function ResultStep({ result }: { result: Awaited<ReturnType<typeof submitBookingAction>> }) {
  if (!result.ok || !result.booking) {
    return (
      <GlassPanel variant="tinted" radius="panel" style={{ padding: 'var(--space-6)' }}>
        <Text role="alert">{result.errorMessage}</Text>
      </GlassPanel>
    );
  }

  const { booking } = result;
  return (
    <GlassPanel variant="tinted" radius="panel" style={{ padding: 'var(--space-6)' }}>
      <Stack gap={4}>
        <Stack gap={1}>
          <Text variant="label" tone="brand" uppercase>
            Booking reference
          </Text>
          <Text style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-heading)' }}>
            {booking.reference}
          </Text>
        </Stack>
        <Stack gap={2}>
          <ReviewRow
            label="Trip"
            value={`${booking.snapshotTripTitle} — ${booking.snapshotDestination}`}
          />
          <ReviewRow label="Departs" value={formatBookingDate(booking.snapshotDepartureDate)} />
          <ReviewRow label="Travellers" value={String(booking.participantCount)} />
          <ReviewRow
            label="Status"
            value={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            emphasis
          />
        </Stack>
        <Text variant="small" tone="secondary">
          Your spot is reserved and pending. This is not yet a confirmed booking — payment and final
          confirmation are a separate, later step. We&apos;ll be in touch about what happens next.
        </Text>
      </Stack>
    </GlassPanel>
  );
}
