'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { CONTENT_EDITOR_ROLES, DEPARTURE_EDITOR_ROLES } from '@/lib/admin/roles';
import { requireAdminRole } from '@/lib/admin/authorize';
import {
  addExclusion,
  addInclusion,
  addItineraryDay,
  createDeparture,
  createTrip,
  deleteDeparture,
  deleteExclusion,
  deleteInclusion,
  deleteItineraryDay,
  transitionTripStatus,
  updateDeparture,
  updateTripCore,
} from '@/lib/admin/repository';
import {
  departureInputSchema,
  itineraryDayInputSchema,
  listLabelInputSchema,
  statusTransitionInputSchema,
  tripCoreInputSchema,
} from '@/lib/admin/validation';
import type { ContentStatus } from '@/lib/content/ingest/types';

/**
 * Server Actions — the one write surface the admin UI submits to.
 *
 * Every action re-derives the caller's role from the request's own session
 * via `requireAdminRole` (never trusts anything the form/client claims —
 * docs/SECURITY.md §11) and re-validates the submission with the matching
 * `lib/admin/validation.ts` schema before it ever reaches
 * `lib/admin/repository.ts`. A validation or authorization failure throws;
 * Next.js surfaces that as the nearest error boundary — acceptable for this
 * phase's "functional, not polished" scope (see the Phase 4.3 report).
 */

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function createTripAction(formData: FormData): Promise<void> {
  await requireAdminRole(CONTENT_EDITOR_ROLES);
  const input = tripCoreInputSchema.parse({
    slug: formString(formData, 'slug'),
    title: formString(formData, 'title'),
    destination: formString(formData, 'destination'),
    country: formString(formData, 'country'),
    durationNights: formString(formData, 'durationNights'),
    tagline: formString(formData, 'tagline'),
    overview: formString(formData, 'overview'),
    hostId: formString(formData, 'hostId'),
  });
  const id = await createTrip(input);
  revalidatePath('/admin/trips');
  redirect(`/admin/trips/${id}`);
}

export async function updateTripCoreAction(tripId: string, formData: FormData): Promise<void> {
  await requireAdminRole(CONTENT_EDITOR_ROLES);
  const input = tripCoreInputSchema.parse({
    slug: formString(formData, 'slug'),
    title: formString(formData, 'title'),
    destination: formString(formData, 'destination'),
    country: formString(formData, 'country'),
    durationNights: formString(formData, 'durationNights'),
    tagline: formString(formData, 'tagline'),
    overview: formString(formData, 'overview'),
    hostId: formString(formData, 'hostId'),
  });
  await updateTripCore(tripId, input);
  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath('/admin/trips');
}

export async function transitionStatusAction(
  tripId: string,
  from: ContentStatus,
  formData: FormData,
): Promise<void> {
  const session = await requireAdminRole(['content_manager', 'admin', 'super_admin']);
  const { to } = statusTransitionInputSchema.parse({ to: formString(formData, 'to') });
  await transitionTripStatus(tripId, session.role, from, to);
  // Published/archived content is exposed to the public exclusively through
  // the existing public query layer (lib/content/queries.ts) reading the
  // same rows — nothing here writes to or bypasses that path.
  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath('/admin/trips');
  revalidatePath('/trips');
  revalidatePath('/trips/all');
}

export async function addItineraryDayAction(tripId: string, formData: FormData): Promise<void> {
  await requireAdminRole(CONTENT_EDITOR_ROLES);
  const input = itineraryDayInputSchema.parse({
    dayNumber: formString(formData, 'dayNumber'),
    title: formString(formData, 'title'),
    summary: formString(formData, 'summary'),
  });
  await addItineraryDay(tripId, input);
  revalidatePath(`/admin/trips/${tripId}`);
}

export async function deleteItineraryDayAction(tripId: string, dayId: string): Promise<void> {
  await requireAdminRole(CONTENT_EDITOR_ROLES);
  await deleteItineraryDay(dayId);
  revalidatePath(`/admin/trips/${tripId}`);
}

export async function addInclusionAction(tripId: string, formData: FormData): Promise<void> {
  await requireAdminRole(CONTENT_EDITOR_ROLES);
  const input = listLabelInputSchema.parse({ label: formString(formData, 'label') });
  await addInclusion(tripId, input);
  revalidatePath(`/admin/trips/${tripId}`);
}

export async function deleteInclusionAction(tripId: string, rowId: string): Promise<void> {
  await requireAdminRole(CONTENT_EDITOR_ROLES);
  await deleteInclusion(rowId);
  revalidatePath(`/admin/trips/${tripId}`);
}

export async function addExclusionAction(tripId: string, formData: FormData): Promise<void> {
  await requireAdminRole(CONTENT_EDITOR_ROLES);
  const input = listLabelInputSchema.parse({ label: formString(formData, 'label') });
  await addExclusion(tripId, input);
  revalidatePath(`/admin/trips/${tripId}`);
}

export async function deleteExclusionAction(tripId: string, rowId: string): Promise<void> {
  await requireAdminRole(CONTENT_EDITOR_ROLES);
  await deleteExclusion(rowId);
  revalidatePath(`/admin/trips/${tripId}`);
}

function departureFormInput(formData: FormData) {
  return departureInputSchema.parse({
    departureDate: formString(formData, 'departureDate'),
    returnDate: formString(formData, 'returnDate'),
    priceAmount: formString(formData, 'priceAmount') || undefined,
    priceCurrency: formString(formData, 'priceCurrency'),
    capacity: formString(formData, 'capacity') || undefined,
    status: formString(formData, 'status'),
  });
}

export async function createDepartureAction(tripId: string, formData: FormData): Promise<void> {
  await requireAdminRole(DEPARTURE_EDITOR_ROLES);
  await createDeparture(tripId, departureFormInput(formData));
  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath('/trips');
}

export async function updateDepartureAction(
  tripId: string,
  departureId: string,
  formData: FormData,
): Promise<void> {
  await requireAdminRole(DEPARTURE_EDITOR_ROLES);
  await updateDeparture(departureId, departureFormInput(formData));
  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath('/trips');
}

export async function deleteDepartureAction(tripId: string, departureId: string): Promise<void> {
  await requireAdminRole(DEPARTURE_EDITOR_ROLES);
  await deleteDeparture(departureId);
  revalidatePath(`/admin/trips/${tripId}`);
  revalidatePath('/trips');
}
