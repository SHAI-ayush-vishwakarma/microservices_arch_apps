# ShowTime — Build Plan

How we work: **I write the code**, Claude explains each step and reviews. Backend first; frontend only after the backend is tested.
Each phase ends with something **running and tested** before moving on.

---

## 1. Core Flows

### Flow A — Signup & Login
```
Client → Gateway → Auth Service → save user (hashed password) → return JWT
```

### Flow B — Browse
```
Client → Gateway → Event Service → list events / seat map (with seat status)
```

### Flow C — Book a ticket (the heart of the project)
```
1. Client → Gateway → Booking: POST /bookings { eventId, seatIds }
2. Booking → Event (REST): do these seats exist? price?
3. Booking → Redis: lock each seat for 5 min (SET NX EX) — fail if already locked
4. Booking → DB: save booking { status: PENDING }
5. Client → Gateway → Payment: POST /payments { bookingId } + Idempotency-Key
6. Payment → simulates result → publishes `payment.succeeded` or `payment.failed`
7. Booking listens:
      succeeded → booking CONFIRMED → mark seats BOOKED → publish `booking.confirmed`
      failed    → booking CANCELLED → release Redis locks  (compensation)
8. Notification listens to `booking.confirmed` → "send" ticket
9. Hold expires with no payment → booking EXPIRED → seats released
```

---

## 2. API Overview (all via Gateway `:4000`)

| Service | Method & Path | Auth | Purpose |
|---|---|---|---|
| Auth | `POST /auth/signup` | ❌ | Create account |
| Auth | `POST /auth/login` | ❌ | Get JWT |
| Auth | `GET /auth/me` | ✅ | Current user |
| Event | `GET /events` | ❌ | List events |
| Event | `GET /events/:id` | ❌ | Event details + seat map |
| Event | `POST /events` | ✅ admin | Create event with seats |
| Booking | `POST /bookings` | ✅ | Hold seats, create PENDING booking |
| Booking | `GET /bookings/me` | ✅ | My bookings |
| Booking | `GET /bookings/:id` | ✅ | One booking |
| Payment | `POST /payments` | ✅ | Pay for a booking (idempotent) |

Every service also has `GET /health`.
Internal-only endpoints (e.g., Event's `PATCH /internal/seats/book`) are **not** exposed through the gateway.

---

## 3. Data Model (one DB per service)

**auth_db.users**: `id, name, email (unique), password_hash, role (user|admin), created_at`

**event_db.events**: `id, title, venue, starts_at, price`
**event_db.seats**: `id, event_id, label (A1, A2…), status (AVAILABLE|BOOKED)`

**booking_db.bookings**: `id, user_id, event_id, seat_ids[], total_amount, status (PENDING|CONFIRMED|CANCELLED|EXPIRED), expires_at, created_at`

**payment_db.payments**: `id, booking_id, user_id, amount, status (SUCCEEDED|FAILED), idempotency_key (unique), created_at`

**Redis keys**: `seat-lock:{eventId}:{seatId} = bookingId` (TTL 300s)

---

## 4. Events (RabbitMQ)

| Event | Published by | Consumed by | Payload |
|---|---|---|---|
| `payment.succeeded` | Payment | Booking | `bookingId, paymentId, amount` |
| `payment.failed` | Payment | Booking | `bookingId, reason` |
| `booking.confirmed` | Booking | Notification | `bookingId, userId, eventId, seats` |
| `booking.cancelled` | Booking | Notification | `bookingId, userId, reason` |

Every event carries `eventId` (unique), `occurredAt`, and `requestId` — so consumers can **ignore duplicates** and logs stay traceable.

---

## 5. Standard Structure for Every Service

```
<name>-service/
├── src/
│   ├── index.js            # start server (+ connect DB / broker)
│   ├── app.js              # express app + middleware
│   ├── config.js           # read & validate env vars (fail fast)
│   ├── routes/             # HTTP endpoints only
│   ├── services/           # business logic
│   ├── repositories/       # DB queries only
│   ├── clients/            # calls to other services
│   ├── events/             # publish / consume RabbitMQ messages
│   ├── middleware/         # requestLogger, auth, errorHandler, validate
│   └── schemas/            # Zod validation schemas
├── migrations/             # SQL to create tables
├── tests/
├── .env.example
├── Dockerfile
└── package.json
```
**Layers:** route → service → repository. Routes never touch SQL; repositories never know about HTTP.

---

## 6. Phases

**The main focus is the backend.** Every phase follows the same three steps, in this order:

1. **🖥️ Build the backend:** APIs, database, Redis, events, whatever the phase needs.
2. **🧪 Test the backend:** curl or Postman (and automated tests). Every endpoint, including the failure cases, must work.
3. **🎨 Build the frontend page:** only after step 2 passes, build the screen that uses those APIs.

The frontend never drives the design. It only shows what the backend already does.

The frontend starts at Phase 2, once the API Gateway exists, because **the frontend only ever talks to the gateway** (`:4000`) and never to services directly.

| # | Phase | 🖥️ Backend | 🎨 Frontend | New concepts | Done when |
|---|---|---|---|---|---|
| **0** | Setup | Folders, `docker-compose.yml` with Postgres, Redis, RabbitMQ | — | Infra containers, volumes | `docker compose up` shows all 3 healthy |
| **1** | Auth Service | Signup, login, `/me`, users table | — | Postgres with `pg`, migrations, bcrypt, JWT, Zod, layered structure | Can sign up, log in, get a token (curl) |
| **2** | API Gateway + frontend setup | Proxy to Auth, JWT verification, rate limit, **CORS** | Vite + React app, routing, API helper, **Signup / Login pages**, store token, navbar with logged-in user | Gateway pattern, CORS, frontend ↔ gateway, auth state in the UI | Sign up and log in from the browser |
| **3** | Event Service | Events + seats CRUD, seed data | **Events list page**, **event details page with seat map** | Admin role check, 1-to-many tables, seed scripts, rendering server data | Browse events and see seats in the UI |
| **4** | Booking Service (hold) | `POST /bookings` with Redis seat locks | **Seat picker** (select seats → "Hold"), **5-min countdown timer**, "seat already taken" message | Redis `SET NX EX`, sync call to Event, concurrency | Two browsers picking the same seat → second sees an error |
| **5** | Payment Service | `POST /payments` with idempotency | **Checkout page** with "Pay" button (sends Idempotency-Key, button disabled while paying) | Idempotency keys, unique constraints, simulated failure | Double-clicking Pay → one payment |
| **6** | Wire it with RabbitMQ | Payment publishes, Booking consumes | **"Confirming…" status** that polls the booking until CONFIRMED | Pub/sub, exchanges & queues, `amqplib`, ack/nack, eventual consistency in the UI | Pay → UI flips to CONFIRMED automatically |
| **7** | Saga & compensation | Failed payment / expiry releases seats | **Failed / expired screens**, seats show as free again | Saga (choreography), compensating actions, scheduled expiry job | Failed payment → UI shows failure, seat is free |
| **8** | Notification Service | Consumes `booking.confirmed/cancelled` | **My Bookings page** (ticket list with status) | Consumer-only service, idempotent consumers | Ticket log appears; booking listed in UI |
| **9** | Testing | Unit + integration tests per service | Component tests for key pages | Jest, Supertest, mocking clients, Vitest + React Testing Library | `npm test` green, ≥80% coverage on core logic |
| **10** | Showcase polish | Final README, diagram, Postman collection, `.env.example` | Frontend in Docker Compose, loading/error states, basic styling | Documentation, demo script | Clone → `docker compose up` → full demo in the browser |
| **11** *(optional)* | Admin UI | — | **Admin page** to create events and seats | Role-based UI | Admin creates an event from the browser |
| **12** *(optional)* | gRPC | Booking → Event over gRPC | — | Protobuf, REST vs gRPC | Same flow over gRPC |

---

## 7. Ground Rules (we follow these everywhere)

1. **No shared database.** Need another service's data? Call its API or listen to its events.
2. **Config from env**, validated at startup — service refuses to start if something is missing.
3. **Every external call has a timeout**; dependency down → `503`.
4. **Consistent responses:** `{ success, data, error }`.
5. **Validate all input** with Zod at the route boundary.
6. **Request ID** passes through gateway → services → events.
7. **Never log secrets or passwords.**
8. **Small files, small functions**, immutable updates.
9. **Frontend talks only to the gateway** — never to a service directly, never to a database.

---

## 8. Out of Scope (for now)
Kubernetes, real payment gateway, real email provider (we log instead), service mesh, multiple regions. Good topics for a future `03` project.
