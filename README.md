<div align="center"> 
  <h1>EVE Healthcare: Diagnostic Booking Service</h1>
  <p>Backend service for diagnostic test bookings, simulated payments and idempotent payment webhooks.</p>
</div> 

## Table of Contents
- [Requirements Coverage](#requirements-coverage)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Database Design](#database-design)
- [Booking State Machine](#booking-state-machine)
- [Payment and Webhook Flow](#payment-and-webhook-flow)
- [Edge Cases Handled](#edge-cases-handled)
- [Testing](#testing)
- [Assumptions](#assumptions)
- [Roadmap](#roadmap)
- [Project Structure](#project-structure)

## Requirements Coverage

### Core
- [x] Authentication: signup, login, JWT, request validation
- [x] Diagnostic centres and tests: name, location, tests offered, price per centre
- [x] Booking system: user, test, centre, appointment time, amount, status
- [x] Booking states: PENDING, CONFIRMED, FAILED, CANCELLED
- [x] Simulated payment: POST /payments resolves to SUCCESS or FAILED and updates the booking
- [x] Payment webhook: POST /payments/webhook with idempotent processing
- [x] Edge cases: invalid requests, repeated webhooks, invalid booking IDs, failed payments, unauthorized access

### Bonus
- [x] Pagination
- [x] Unit and integration tests
- [x] GitHub Actions CI
- [ ] Docker and docker-compose
- [ ] Swagger / OpenAPI
- [ ] Redis caching
- [ ] Celery / background jobs
- [ ] Structured logging
- [ ] Rate limiting
- [ ] Webhook retry handling

### Submission
- [x] README with setup, endpoints, schema design, assumptions and improvements
- [x] package.json with dependencies
- [x] Source code and tests
- [ ] Dockerfile and docker-compose.yml (not included)

## Architecture

```mermaid
flowchart LR
    Client([Client])
    Provider([Payment Provider])
    
    subgraph API [Express API]
        direction TB
        MW[Middleware<br/>JWT auth, Zod validation, error handler]
        R[Routes]
        C[Controllers]
        S[Services<br/>business rules and state machine]
    end
    
    Repo[Repositories<br/>Prisma]
    DB[(PostgreSQL)]
    
    Client -->|REST + JWT| MW
    Provider -->|webhook| MW
    API --> Repo
    Repo --> DB
```
Requests flow through a strict layering: routes declare endpoints, controllers translate HTTP, services hold all business rules, repositories are the only layer that talks to Prisma.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Language | TypeScript (strict) | Compile-time safety across layers |
| Framework | Express | Minimal, easy to reason about |
| ORM | Prisma | Typed queries, migrations, raw SQL escape hatch for row locks |
| Database | PostgreSQL | Row-level locking, partial and unique indexes, transactions |
| Validation | Zod | One schema per request, consistent error shape |
| Testing | Vitest, Supertest | Fast runner, real HTTP-level integration tests |
| Tooling | ESLint, Prettier, GitHub Actions | Consistent style and automated checks |

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (local, or a hosted instance such as Supabase)

### 1. Install
```bash
git clone <repo-url>
cd evehealthcare
npm install
```

### 2. Configure environment
Create `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/evehealthcare"
JWT_SECRET="replace-with-a-long-random-string"
JWT_EXPIRES_IN="24h"
WEBHOOK_SECRET="replace-with-another-random-string"
PORT=3000
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing key for access tokens |
| `JWT_EXPIRES_IN` | Token lifetime, for example 24h |
| `WEBHOOK_SECRET` | Shared secret for the payment webhook |
| `PORT` | API port |

### 3. Migrate and seed
```bash
cd backend
npx prisma migrate deploy
npm run db:seed
cd ..
```
The seed creates sample centres and tests plus an admin account (`admin@example.com` / `password123`). Local development only.

### 4. Run
```bash
npm run dev
```

| Service | URL |
|---------|-----|
| API | `http://localhost:3000` |
| Frontend (optional demo UI) | `http://localhost:5173` |

### 5. Test
```bash
cd backend
npm run test
```

## API Reference

Protected routes need `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | None | Register a user |
| POST | `/api/auth/login` | None | Log in and receive a JWT |
| GET | `/api/centres` | None | List centres. Filters: city, testId. Paginated |
| GET | `/api/centres/:id` | None | Centre details with tests and prices |
| GET | `/api/tests` | None | List tests. Search: q. Paginated |
| POST | `/api/centres` | Admin | Create a centre |
| POST | `/api/centres/:id/tests` | Admin | Add a test and price to a centre |
| POST | `/api/bookings` | User | Create a booking (starts as PENDING) |
| GET | `/api/bookings` | User | List own bookings |
| GET | `/api/bookings/:id` | User | Get own booking |
| POST | `/api/bookings/:id/cancel` | User | Cancel a PENDING booking |
| POST | `/api/payments` | User | Simulated payment. Supports Idempotency-Key |
| GET | `/api/payments/:id` | User | Payment status |
| POST | `/api/payments/webhook` | Provider | Idempotent payment-status webhook |

### Examples

<details>
<summary><b>Sign up and log in</b></summary>

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@example.com","password":"Passw0rd123","name":"Patient One"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@example.com","password":"Passw0rd123"}'
```
</details>

<details>
<summary><b>Browse centres</b></summary>

```bash
curl "http://localhost:3000/api/centres?city=Kolkata&page=1&limit=10"
```
</details>

<details>
<summary><b>Create a booking</b></summary>

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"centreId":"<CENTRE_ID>","testId":"<TEST_ID>","appointmentAt":"2026-10-15T10:00:00Z"}'
```
The amount is read from the centre's price on the server. Any amount sent by the client is ignored.
</details>

<details>
<summary><b>Pay for a booking (simulated)</b></summary>

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Idempotency-Key: unique-request-id-123" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"<BOOKING_ID>","simulate":"SUCCESS"}'
```
</details>

### Error format
Every error uses one shape:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": []
  }
}
```

## Database Design

```mermaid
erDiagram
    USER ||--o{ BOOKING : makes
    DIAGNOSTIC_CENTRE ||--o{ CENTRE_TEST : offers
    DIAGNOSTIC_TEST ||--o{ CENTRE_TEST : "offered as"
    DIAGNOSTIC_CENTRE ||--o{ BOOKING : hosts
    DIAGNOSTIC_TEST ||--o{ BOOKING : "booked for"
    BOOKING ||--o{ PAYMENT : "paid by"

    USER {
        uuid id PK
        string email UK
        string passwordHash
        string name
        enum role "USER | ADMIN"
    }
    DIAGNOSTIC_CENTRE {
        uuid id PK
        string name
        string city
        string address
    }
    DIAGNOSTIC_TEST {
        uuid id PK
        string name UK
        string description
    }
    CENTRE_TEST {
        uuid centreId FK
        uuid testId FK
        int pricePaise
        boolean isActive
    }
    BOOKING {
        uuid id PK
        uuid userId FK
        uuid centreId FK
        uuid testId FK
        datetime appointmentAt
        int amountPaise
        enum status "PENDING | CONFIRMED | FAILED | CANCELLED"
    }
    PAYMENT {
        uuid id PK
        uuid bookingId FK
        int amountPaise
        enum status "PENDING | SUCCESS | FAILED"
        string providerReference UK
        string idempotencyKey
    }
```

### Key design decisions

| Decision | Reason |
|----------|--------|
| Money stored as integer paise | Avoids floating-point rounding errors |
| Price lives on CentreTest | The same test costs different amounts at different centres |
| Booking.amountPaise is a snapshot | Later price changes never alter existing bookings |
| Unique (centreId, testId) on CentreTest | One price per test per centre |
| Unique (userId, idempotencyKey) on Payment | Replayed payment requests return the original result |
| Unique eventId for webhook events | Anchor for webhook idempotency |
| providerReference unique | Links provider events to exactly one payment |
| Role enum on User | Admin-only centre and test management |

## Booking State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: booking created
    PENDING --> CONFIRMED: payment SUCCESS
    PENDING --> FAILED: payment FAILED
    PENDING --> CANCELLED: user cancels
    CONFIRMED --> [*]
    FAILED --> [*]
    CANCELLED --> [*]
```
Illegal transitions, such as paying for a cancelled booking, return 409 Conflict. A booking that reached FAILED or CANCELLED never changes again, so a late webhook cannot revive it.

## Payment and Webhook Flow

### Simulated payment

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant API as API
    participant DB as PostgreSQL

    U->>API: POST /payments {bookingId} + Idempotency-Key
    API->>DB: BEGIN
    API->>DB: SELECT booking FOR UPDATE
    alt booking not owned or missing
        API-->>U: 404
    else booking not PENDING
        API-->>U: 409
    else replayed Idempotency-Key
        API-->>U: original payment response
    else
        API->>DB: insert Payment (amount from booking)
        API->>DB: set Payment and Booking status
        API->>DB: COMMIT
        API-->>U: 200 SUCCESS or FAILED
    end
```
The row lock means two simultaneous payment calls for one booking are processed one after the other, so a booking cannot be charged twice.

### Idempotent webhook

```mermaid
flowchart TD
    A([POST /payments/webhook]) --> B{Body valid?}
    B -- no --> X1[400]
    B -- yes --> C[(Insert event with unique eventId)]
    C --> D{eventId already stored?}
    D -- yes --> E[Return 200, change nothing]
    D -- no --> F{Payment found by providerReference?}
    F -- no --> X2[404]
    F -- yes --> G{Booking transition legal?}
    G -- no --> H[Leave state unchanged, return 200]
    G -- yes --> I[Update Payment and Booking in one transaction]
    I --> J([200 OK])
```
Delivering the same event any number of times, sequentially or concurrently, produces exactly one state change. The unique eventId constraint decides the winner at the database level, not in application code.

## Edge Cases Handled

| Scenario | Behaviour |
|----------|-----------|
| Invalid or missing request fields | 400 with Zod error details |
| Duplicate signup email | 409 Conflict |
| Missing, malformed or expired JWT | 401 Unauthorized |
| Non-admin calls admin endpoint | 403 Forbidden |
| Booking ID that does not exist or is not yours | 404 (existence is not leaked) |
| Malformed UUID | Rejected by validation |
| Client-supplied price | Ignored; server uses the stored price |
| Pay for a non-PENDING booking | 409 Conflict |
| Payment fails | Payment FAILED, booking FAILED |
| Same payment request repeated | Same Idempotency-Key returns the original response |
| Two concurrent payments for one booking | Serialised by a row lock; one wins |
| Webhook delivered multiple times | One state change, remaining deliveries no-op |
| Webhook for an unknown payment | 404, no state touched |

## Testing
```bash
cd backend
npm run test
```
The suite is a mix of integration tests (Supertest against a real PostgreSQL database) and unit tests (state machine transitions). Covered areas:
- [x] Signup and login, including invalid credentials
- [x] Token validation
- [x] Centre and test listing, filtering and pagination
- [x] Admin versus user permissions
- [x] Booking creation, ownership and cancellation
- [x] Payment success and failure paths
- [x] Payment idempotency and concurrency
- [x] Webhook idempotency, repeated delivery and conflicting events

CI runs lint, type checks and tests on every push through GitHub Actions.

## Assumptions
- Currency is stored in paise. All amounts are integers.
- Failed and cancelled bookings are final. A user who wants to retry creates a new booking.
- Single timezone. Appointment times are ISO 8601 in UTC.
- No real payment gateway. Outcome is simulated; the optional `simulate` field makes it deterministic for tests.
- No refunds. Out of scope for this exercise.
- Catalogue management is admin-only. Regular users read data and manage their own bookings.
- One centre per booking, one test per booking.

## Roadmap
- [ ] Docker and docker-compose for one-command setup
- [ ] Swagger / OpenAPI documentation at `/api/docs`
- [ ] Redis caching for `GET /centres` and `GET /tests`
- [ ] Queue-based webhook processing (BullMQ) to acknowledge fast and process asynchronously
- [ ] Webhook retry with backoff and a dead-letter store
- [ ] Rate limiting on auth and payment endpoints
- [ ] Structured logging with request IDs
- [ ] Soft deletes for tests and centres so historical bookings stay intact
- [ ] Refresh tokens
- [ ] Slot capacity management per centre

## Project Structure
```text
.
├── backend/
│   ├── prisma/              # schema, migrations, seed
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── middlewares/
│   │   ├── schemas/         # Zod validation
│   │   └── errors/
│   └── tests/
├── frontend/                # optional demo UI
├── .github/workflows/       # CI
└── README.md
```
