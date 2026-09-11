# Wander With Stars V2 — Product Requirements

## 1. Product vision

Wander With Stars (WWS) should evolve from a travel-company website into a social travel platform where people discover curated experiences, find compatible travellers, book trips, connect before departure, travel together, build memories, and return for future journeys.

### Product promise

> Don't just book a trip. Find your people, live the experience, and become part of the story.

## 2. Positioning

WWS is not a generic OTA, package catalogue, Instagram clone, or standalone AI chatbot. It is a social travel platform combining:

- Curated travel experiences
- Group travel commerce
- Creator-led trips
- Traveller identity
- Community
- Personalisation
- AI assistance

## 3. North-star journey

Discover → Understand → Match → Book → Meet your people → Prepare → Travel → Share → Review → Refer → Travel again

## 4. Primary users

### Solo Explorer
Wants to travel but may not have a ready-made group. Needs confidence, structure, and social connection.

### Social Traveller
Prioritises people, activities, events, nightlife, photography, and a lively group experience.

### First International Traveller
Needs high clarity around documents, payments, safety, itinerary, logistics, and support.

### Creator Traveller
Interested in creator-led travel, content, collaborations, audience experiences, and networking.

### WWS Operations Team
Needs trip, inventory, booking, customer, payment, community, lead, creator, and analytics operations.

## 5. Core product pillars

1. Discover
2. Match
3. Connect
4. Book
5. Prepare
6. Experience
7. Remember
8. Return

## 6. V2 public product

### Homepage
- Cinematic hero
- Primary CTA: Find My Trip
- Secondary CTA: Explore Trips
- Social proof using only verifiable metrics
- Upcoming experiences
- Travel personality matcher
- Who's going / group composition
- Creator experiences
- Why WWS
- Verified traveller stories
- Travel media/stories
- Final conversion CTA

### Explore
Users can filter by:
- Destination
- Month
- Budget
- Duration
- Travel style
- Trip type
- Departure city
- Age suitability
- Availability
- Creator

Sorting:
- Recommended
- Price low to high
- Soonest departure
- Most popular
- Almost full
- Newest

### Trip detail
Each trip should communicate:
- Visual story / gallery
- Destination
- Dates
- Duration
- Price
- Availability
- Host/creator
- Trip personality
- Who the trip is for
- Itinerary
- Map
- Inclusions
- Exclusions
- Host information
- Group composition
- Reviews
- FAQ
- Cancellation information
- Booking CTA

### Traveller dashboard
- Overview
- Upcoming trip
- Booking/payment progress
- Documents
- Checklist
- Community
- Wishlist
- Recommendations
- Travel passport
- Profile/preferences
- Notifications
- Support

### Community
Communities are trip-centric rather than a generic social network.
- Announcements
- Introductions
- Posts
- Comments
- Member list
- Itinerary
- Preparation
- Photos/media
- Moderation/reporting

## 7. Booking experience

Trip → Departure → Traveller count → Login/account → Traveller details → Add-ons/coupon → Server-verified pricing → Payment → Webhook verification → Confirmation

Do not trust client-supplied prices, availability, roles, or booking state.

## 8. Admin experience

Admin must manage:
- Trips
- Departures
- Inventory/capacity
- Bookings
- Customers
- Payments/refunds
- Leads
- Communities
- Reviews
- Creators
- Content
- Analytics
- Team
- Settings
- Audit logs

## 9. Creator experience — later phase

Creator portal:
- Profile
- Opportunities
- Applications
- Hosted trips
- Deliverables
- Content submissions
- Performance
- Earnings
- Messages

## 10. AI product

### AI Concierge
Answer verified questions from WWS trip/policy/FAQ data.

### AI Trip Matcher
Collect structured travel preferences and recommend suitable trips with explanations.

### AI Operations Copilot
Admin-only analytics and operational questions over authorised business data.

AI must never invent prices, availability, dates, policies, booking status, or legal/visa information.

## 11. Travel passport

Users can build a digital WWS travel history showing completed destinations, trips, badges, ratings, and memories.

## 12. Social matching

Use privacy-respecting aggregate signals first:
- Solo travellers
- First-time international travellers
- Age bands
- City distribution
- Optional interests

Individual profile visibility is opt-in.

## 13. Product metrics

Acquisition: visitors, source, trip views.

Activation: signup, profile completion, wishlist.

Conversion: enquiry, checkout start, payment success, booking.

Engagement: community activity, reviews, media.

Retention: repeat bookings, repeat visits, referrals.

Revenue: booking value, collected, outstanding, refunded.

## 14. North-star metric

Completed traveller experiences.

## 15. MVP scope

Public:
- Homepage
- Trip listing
- Trip detail
- About
- FAQ
- Contact

Account:
- Signup/login
- Profile

Commerce:
- Trip departures
- Availability
- Booking
- Payment
- Confirmation

Traveller:
- Upcoming trip
- Booking
- Payment status
- Documents

Admin:
- Trips
- Bookings
- Customers
- Payments

## 16. V2+ scope

V2:
- Community
- Travel passport
- Wishlist
- Reviews
- Trip matching
- Notifications
- Creator profiles
- Advanced admin

V2.5:
- AI Concierge
- AI Trip Matcher
- AI Operations Copilot

V3:
- Creator marketplace
- Advanced social graph
- Traveller matching
- Events
- Referral/loyalty
- Advanced recommendations

## 17. Non-goals for initial release

Do not initially build:
- Massive generic social feed
- Unrestricted stranger DMs
- Native mobile app
- Microservices
- Kubernetes
- Complex loyalty economy
- Dozens of AI agents
- Excessive decorative animation
