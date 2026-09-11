# Tests

Test tooling is installed with the milestone that first needs it, not up front.

- `unit/` — pure logic (pricing, state machines, validation)
- `integration/` — route handlers, RLS policies, webhooks
- `e2e/` — critical flows listed in docs/ARCHITECTURE.md §12
