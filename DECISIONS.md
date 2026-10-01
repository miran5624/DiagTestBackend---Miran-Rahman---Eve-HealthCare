- Skipped DB connection check in /health and tests due to Postgres authentication failures. Will need valid credentials to proceed with DB phases.

## Phase 02 Constraints
- CentreTest price lives here because the same test costs differently per centre.
- Booking amountPaise is a snapshot of price at booking time, unaffected by future price changes.
- WebhookEvent eventId is unique to ensure idempotency anchor for webhooks.
- Booking has partial unique constraint (raw SQL) to prevent one user holding multiple active bookings for same centre+test+time.
- Payment has integer paise to avoid float precision issues.

## Phase 04
Skipped because docs/phases/04-centrestests.md is empty.
