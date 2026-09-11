# Wander With Stars V2 — Database Design

## 1. Database principles

- PostgreSQL via Supabase
- UUID primary keys are acceptable internally
- Human-friendly slugs are used in public URLs
- Foreign keys are explicit
- Constraints enforce business invariants where practical
- Index columns used for filtering, joining, sorting, and lookup
- Sensitive data is private by default
- Every protected table gets explicit RLS policies

## 2. Identity

### profiles
Represents application-level user profile linked to auth.users.

Suggested fields:
- id
- full_name
- username
- avatar_url
- bio
- city
- date_of_birth or age_band only if truly required
- phone if required by business flow
- privacy settings
- created_at
- updated_at

### roles
- id
- key
- name

### organization_members
Supports role membership and future multi-team operations.

## 3. Travel catalogue

### trips
A reusable travel product.

Suggested fields:
- id
- slug
- title
- destination
- country
- summary
- description
- status
- duration_days
- duration_nights
- base_price
- currency
- minimum_age / age_band where appropriate
- published_at
- created_at
- updated_at

### trip_departures
Specific scheduled batch/departure.

Fields:
- id
- trip_id
- start_date
- end_date
- capacity
- seats_reserved
- seats_confirmed
- status
- price_override
- meeting_point
- created_at
- updated_at

Trip-to-departure is a one-to-many relationship.

### trip_hosts
Trip/creator association.

### trip_itineraries
Fields include:
- trip_id
- day_number
- title
- narrative
- notes

### trip_locations
Locations used by itinerary/map.

### trip_activities
Activities per itinerary/trip.

### trip_media
Image/video metadata and storage paths.

### trip_inclusions
### trip_exclusions
### trip_faqs

## 4. Commerce

### bookings
Fields:
- id
- booking_reference
- user_id
- trip_departure_id
- status
- currency
- subtotal
- discount_amount
- total_amount
- amount_paid
- amount_due
- created_at
- updated_at

### booking_guests
Traveller-specific information associated with booking.

### payments
Fields:
- id
- booking_id
- provider
- provider_payment_id
- amount
- currency
- status
- payment_method
- idempotency_key
- metadata
- created_at
- updated_at

### payment_installments
For partial payment schedules.

### refunds
Tracks refund requests/results separately from original payments.

### coupons
Must have server-side eligibility and amount validation.

## 5. Reviews

### reviews
Link only to completed/eligible bookings. Include verification state.

### ratings
Either embedded on reviews or normalised if multi-aspect ratings are required.

## 6. Community

### communities
Typically one private community per departure, plus optional public/topic communities later.

### community_members
Fields:
- community_id
- user_id
- membership_status
- joined_at
- visibility settings

### community_posts
### community_comments
### community_messages

Messages should have moderation/reporting controls and retention policies.

### reports
### blocks

## 7. Personalisation

### travel_profiles
Traveller's derived/high-level travel identity.

### travel_preferences
Structured preferences such as budget, pace, social energy, trip style, interests.

### wishlists
User-to-trip/departure saved items.

### trip_recommendations
Can store generated recommendation snapshots with explanation metadata and timestamps.

## 8. CRM

### leads
Fields:
- id
- name
- contact
- source
- destination_interest
- travel_date
- status
- owner
- created_at
- updated_at

### lead_sources
### lead_activities

## 9. Operations

### notifications
### notification_preferences
### support_tickets
### audit_logs

Audit records should capture actor, action, resource, timestamp, and relevant metadata without leaking secrets.

## 10. AI

### ai_documents
Knowledge sources such as verified WWS policy/trip content.

### ai_chunks
Chunked content linked to a document.

### ai_embeddings
Vector representation where semantic retrieval is needed.

### ai_conversations
Store only what is necessary for user experience and debugging.

## 11. Important relationships

```text
profile
  |
  +-- bookings --> booking_guests
  |
  +-- communities --> community_members
  |
  +-- wishlist

trip
  |
  +-- trip_departures
        |
        +-- bookings
              |
              +-- payments
              +-- guests

trip_departure
  |
  +-- community
        |
        +-- members
```

## 12. State models

### Booking
DRAFT → PENDING_PAYMENT → CONFIRMED → PARTIALLY_PAID → BALANCE_DUE → COMPLETED

Alternate:
PENDING_PAYMENT → PAYMENT_FAILED
CONFIRMED → CANCELLED → REFUND_PENDING → REFUNDED

### Trip departure
DRAFT → PUBLISHED → BOOKING_OPEN → ALMOST_FULL → SOLD_OUT → IN_PROGRESS → COMPLETED

### Lead
NEW → CONTACTED → QUALIFIED → CONVERTED

Alternate → LOST

## 13. Indexing strategy

Consider indexes on:
- trip slug
- trip status
- destination
- departure start_date
- departure status
- booking user_id
- booking status
- booking_reference
- payment booking_id
- payment provider_payment_id
- community user_id + community_id
- lead status/source/owner

Add indexes based on observed query patterns rather than blindly indexing everything.

## 14. RLS design notes

Public read should be narrow and intentional. A public trip view should not reveal private operational data such as supplier costs, internal notes, customer lists, or payment records.

Traveller policies should generally be based on auth.uid() ownership or explicit community membership.

Admin access must be checked server-side and through database policy design rather than UI visibility.
