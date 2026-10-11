# ShowTime: New Basics (beyond Project 01)

In [01_understanding/basics.md](../01_understanding/basics.md) you learned the foundations:
services, REST calls, timeouts and 503 errors, request IDs, health checks, and Docker Compose.

This file covers **only the new things** ShowTime teaches, in simple language.
Each topic says **which phase** it shows up in. After finishing a phase, add your own notes under **📝 My notes**.

---

## Quick comparison

| Topic | Project 01 (Food Delivery) | Project 02 (ShowTime) |
|---|---|---|
| Services | 2 | 6 |
| Data storage | In-memory arrays (lost on restart) | **PostgreSQL**, one database per service |
| Entry point | Call each service directly | **API Gateway** (one front door) |
| Who is the user? | Anyone | **JWT authentication** |
| Communication | Sync REST only | Sync REST **+ async events (RabbitMQ)** |
| When something fails midway | Return 503 | **Saga**: undo earlier steps |
| Two users, same item | Not handled | **Redis lock** |
| Same request sent twice | Creates two orders | **Idempotency**: processed once |
| Input checks | Manual `if` checks | **Zod schemas** |
| Code structure | Routes do everything | **Layers**: route → service → repository |
| Tests | Manual curl | **Jest + Supertest** |
| Client | curl only | **React frontend** via the gateway |

---

## 1. Database per service (PostgreSQL) — *Phase 0, 1*

**What:** Each service gets its **own** database. No other service may connect to it.

**Why:** If Booking read Event's tables directly, a small change in Event's tables would break Booking. Owning the data keeps services independent, which is the golden rule from Project 01, now with a real database.

**Example:**
```
auth-service    → auth_db    (users)
event-service   → event_db   (events, seats)
booking-service → booking_db (bookings)
payment-service → payment_db (payments)
```
To keep things simple, we run **one Postgres container** with **four separate databases** inside it. It's still separate data, just one running program.

**New words:**
- **Migration**: an SQL file that creates or changes tables, kept in the code so every machine gets the same tables.
- **Seed data**: sample rows (events, seats) inserted so you have something to test with.
- **Volume**: a Docker storage area so data **survives container restarts**.

📝 My notes:

---

## 2. Layered code: route → service → repository — *Phase 1*

**What:** Split each service's code into three layers.

| Layer | Job | Knows about |
|---|---|---|
| **Route** | Read the request, validate it, send the response | HTTP only |
| **Service** | Business rules ("is the seat free?", "hash the password") | Logic only |
| **Repository** | Run SQL queries | Database only |

**Why:** In Project 01 the routes did everything. As services grow, that gets messy. With layers, you can change the database without touching business rules, and you can test the logic without HTTP.

📝 My notes:

---

## 3. Config validation (fail fast) — *Phase 1*

**What:** When a service starts, it checks that all required env vars exist (DB URL, JWT secret...). If one is missing, it **refuses to start** with a clear message.

**Why:** It's better to crash immediately with "JWT_SECRET is missing" than to fail strangely an hour later.

📝 My notes:

---

## 4. Input validation with Zod — *Phase 1 onwards*

**What:** Instead of writing many `if` checks, describe the expected shape once:
```js
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```
Zod checks the request and returns clear errors.

**Why:** It's shorter, consistent, and nothing invalid gets past the route.

📝 My notes:

---

## 5. Authentication with JWT — *Phase 1, 2*

**What:** After login, the Auth Service gives the user a **JWT (JSON Web Token)**, a signed "ID card" like `eyJhbGciOi...`. The user sends it with every request:
```
Authorization: Bearer <token>
```

**How it works:**
- The token contains data such as `{ userId, role }` plus a **signature** made with a secret key.
- Anyone holding the secret can **verify** the token wasn't faked, **without asking the Auth Service or the database**.
- That matters for microservices: no service has to call Auth on every request.

**Also new:**
- **bcrypt**: passwords are stored **hashed** (scrambled one-way), never as plain text.
- **Roles**: `user` vs `admin` (only admins create events).

📝 My notes:

---

## 6. API Gateway — *Phase 2*

**What:** One entry point (`:4000`) that sits in front of all services.

```
Client → Gateway :4000 ─┬─ /auth/*     → Auth Service
                        ├─ /events/*   → Event Service
                        ├─ /bookings/* → Booking Service
                        └─ /payments/* → Payment Service
```

**What it does:**
- **Routing**: sends each request to the right service.
- **Authentication**: verifies the JWT **once**, then passes the user's info to the service in headers (e.g. `x-user-id`).
- **Rate limiting**: e.g. at most 100 requests per minute per user, which blocks abuse.
- **Hiding internals**: clients never see the internal service addresses or `/internal/*` endpoints.

**Why:** Clients (web, mobile) only need **one URL**, and shared concerns live in one place.

📝 My notes:

---

## 7. Concurrency and distributed locking (Redis) — *Phase 4*

**The problem:** User A and User B click seat **A1** at the same moment. Both check "is A1 free?", both get "yes", and both book it. ❌

**The fix:** a **lock** in Redis, which is a very fast in-memory key-value store.
```
SET seat-lock:event1:A1 booking123 NX EX 300
```
- `NX` means "only set it if it does **not** exist yet." Redis guarantees only **one** request wins.
- `EX 300` makes the key **expire after 300 seconds** (5 min), so the hold releases itself if the user never pays.

The winner gets the seat; the other gets **409 Conflict**.

**New words:** race condition, lock, TTL (time to live).

📝 My notes:

---

## 8. Idempotency — *Phase 5*

**The problem:** The user double-clicks "Pay", or the network retries the request, and the card is charged **twice**. ❌

**The fix:** the client sends a unique **Idempotency-Key** header with the request:
```
POST /payments
Idempotency-Key: 7f3a-...
```
The Payment Service saves the key. If the same key arrives again, it **returns the first result instead of charging again**.

**Simple meaning:** *idempotent* = "doing it once or many times has the same effect."

📝 My notes:

---

## 9. Asynchronous messaging (RabbitMQ) — *Phase 6*

**What:** Services send **events** ("something happened") to a **message broker**. Interested services receive them later. The sender doesn't wait.

```
Payment ── "payment.succeeded" ──► [ RabbitMQ ] ──► Booking
Booking ── "booking.confirmed" ──► [ RabbitMQ ] ──► Notification
```

**Why it beats REST here:**
- Payment doesn't need to know **who** cares about a payment. It just announces it.
- If Notification is down, messages **wait in the queue**, so nothing is lost.
- Adding a new listener later (e.g. an Analytics Service) needs **no changes** to the sender.

**New words:**
| Word | Meaning |
|---|---|
| **Publisher** | The service that sends an event |
| **Consumer** | The service that receives it |
| **Exchange** | RabbitMQ's "post office" that decides which queues get a message |
| **Queue** | A mailbox where messages wait for a consumer |
| **Ack** | The consumer saying "done, you can delete it" |
| **Nack / retry** | "Failed, put it back or send it elsewhere" |

**Sync vs async: when to use which?**
- **Sync (REST):** you need the answer **now** to continue ("does this seat exist? what's the price?").
- **Async (events):** you're **announcing** something and others react in their own time ("payment done", "send email").

📝 My notes:

---

## 10. Saga pattern and compensation — *Phase 7*

**The problem:** Booking a ticket spans **three services** (Booking, Payment, Event). There is no single database transaction across services, so if step 3 fails, steps 1–2 are already done. How do you undo them?

**The fix:** a **Saga**, a chain of local steps where each step has an **undo** (a *compensating action*).

| Step | Action | If a later step fails → undo |
|---|---|---|
| 1 | Hold seats (Redis) | Release the locks |
| 2 | Create a PENDING booking | Mark it CANCELLED |
| 3 | Take payment | (failed, so nothing to undo) |
| 4 | Confirm booking, mark seats BOOKED | — |

We use the **choreography** style: there's no central boss, and each service reacts to events (`payment.failed` → Booking cancels and releases the seats).

**Also:** a **scheduled job** expires PENDING bookings after 5 minutes, which is a compensation triggered by time.

📝 My notes:

---

## 11. Eventual consistency — *Phase 6, 7*

**What:** For a short moment, services may **disagree**. For example, the payment has succeeded but the booking still says PENDING for about 100 ms until the event arrives.

**Why that's OK:** they **catch up** shortly after. This is the trade-off you make for independent services. The UI simply shows "Confirming…" for a moment.

📝 My notes:

---

## 12. Idempotent consumers — *Phase 8*

**The problem:** RabbitMQ may deliver the **same message twice** (e.g. after a crash before the ack). Without protection, the user gets two "ticket confirmed" emails.

**The fix:** every event has a unique `eventId`. The consumer remembers which IDs it has already handled and **skips repeats**.

This is the same idea as section 8 (Idempotency), applied to events instead of HTTP requests.

📝 My notes:

---

## 13. Automated testing — *Phase 9*

| Type | Tests | Tool |
|---|---|---|
| **Unit** | One function, e.g. "total = price × seats" | Jest |
| **Integration** | A real HTTP endpoint and database, e.g. `POST /auth/signup` | Jest + Supertest |
| **Mocking** | Fake other services so a test doesn't need them running | Jest mocks |

**Why:** with 6 services you can't curl everything by hand after every change.

📝 My notes:

---

## 14. Showcase and documentation — *Phase 10*

- **`.env.example`**: shows which settings are needed, without real secrets.
- **Postman collection**: ready-made requests for anyone to try.
- **Architecture diagram and README**: so someone can understand and run the project in minutes.

📝 My notes:

---

## 15. Frontend with microservices — *Phase 2 onwards*

**What:** A React app (built with Vite) grows alongside the backend. Each backend phase gets its own screens.

**Key rules:**
- The frontend calls **only the API Gateway** (`http://localhost:4000`). It doesn't know that 6 services exist behind it. That's exactly what the gateway is for.
- **CORS:** browsers block requests to a different origin (`:5173` → `:4000`) unless the server allows it. The gateway must say "requests from the frontend are allowed."
- **Storing the token:** after login, keep the JWT and send it as `Authorization: Bearer <token>` on every request.
- **Showing async results:** after paying, the booking isn't CONFIRMED instantly (eventual consistency). The UI shows "Confirming…" and **polls** (asks again every second or two) until the status changes.
- **Every screen needs three states:** loading, error, and success. Services can be slow or down.

📝 My notes:

---

## Learning checklist

Tick these off as you go:

- [ ] Explain why each service has its own database
- [ ] Write a migration and connect to Postgres from Node
- [ ] Explain the route → service → repository layers
- [ ] Validate input with Zod
- [ ] Hash a password and issue/verify a JWT
- [ ] Explain what an API Gateway does and why
- [ ] Prevent double booking with a Redis lock
- [ ] Explain and implement idempotency
- [ ] Publish and consume a RabbitMQ event
- [ ] Choose between sync and async communication
- [ ] Explain the Saga pattern and a compensating action
- [ ] Explain eventual consistency
- [ ] Make a consumer ignore duplicate events
- [ ] Write unit and integration tests
- [ ] Build React pages that talk only to the gateway
- [ ] Handle CORS, tokens and loading/error states in the UI
- [ ] Run the whole system with one command
