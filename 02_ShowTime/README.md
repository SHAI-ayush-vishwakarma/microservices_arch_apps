# 🎟️ ShowTime — Event Ticket Booking Platform

A microservices-based ticket booking platform (think BookMyShow), built with **Node.js** to learn real-world microservices architecture.

Users can sign up, browse events, pick seats, pay, and receive a ticket confirmation. Under the hood, six independent services work together through **REST APIs** and **asynchronous events**.

---

## The Idea

```
Browse events  →  Pick seats  →  Seats held for 5 min  →  Pay  →  Booking confirmed  →  Ticket sent
                                        │                    │
                                        └── timeout ─────────┴── payment fails → seats released
```

The happy path is simple. The interesting part is everything that can go wrong:

| Real-world problem | How ShowTime solves it |
|---|---|
| Two users pick the **same seat** at the same time | Seat hold with a **Redis lock** — first one wins |
| User picks seats but **never pays** | Hold **expires** after 5 minutes, seats are released |
| **Payment fails** after seats were held | **Saga pattern** — booking is cancelled, seats released |
| User **double-clicks** "Pay" | **Idempotency keys** — charged only once |
| Sending email is **slow** | Done **asynchronously** via RabbitMQ — booking doesn't wait |
| One service goes **down** | Timeouts, clear `503` errors, others keep running |

---

## Architecture

```
                         ┌──────────────┐
  React frontend ──►  │ API Gateway  │   routing · JWT check · rate limit
                         └──────┬───────┘
          ┌──────────────┬──────┴───────┬───────────────┐
          ▼              ▼              ▼               ▼
   ┌────────────┐ ┌────────────┐ ┌─────────────┐ ┌─────────────┐
   │   Auth     │ │   Event    │ │   Booking   │ │   Payment   │
   │  Service   │ │  Service   │ │   Service   │ │   Service   │
   └─────┬──────┘ └─────┬──────┘ └──┬───────┬──┘ └──────┬──────┘
     [Postgres]     [Postgres]  [Postgres] [Redis]  [Postgres]
                                    │                    │
                                    ▼                    ▼
                              ┌───────────────────────────────┐
                              │           RabbitMQ            │
                              └───────────────┬───────────────┘
                                              ▼
                                   ┌──────────────────────┐
                                   │ Notification Service │  (no API — only listens)
                                   └──────────────────────┘
```

### Services

| Service | Port | Responsibility | Owns |
|---|---|---|---|
| **API Gateway** | 4000 | Single entry point, routes requests, verifies JWT, rate limiting | — |
| **Auth Service** | 4001 | Signup, login, password hashing, issues JWT | `users` DB |
| **Event Service** | 4002 | Events, venues, seat maps | `events` DB |
| **Booking Service** | 4003 | Hold seats, create / confirm / cancel bookings | `bookings` DB + Redis |
| **Payment Service** | 4004 | Simulated payments (random success/failure) | `payments` DB |
| **Notification Service** | — | Listens to events, sends ticket confirmation (email/log) | — |

---

## Tech Stack

| Purpose | Tool |
|---|---|
| Runtime / framework | Node.js 22, Express 5 |
| Database (one per service) | PostgreSQL |
| Locks & caching | Redis |
| Async messaging | RabbitMQ |
| Validation | Zod |
| Auth | JWT, bcrypt |
| Testing | Jest, Supertest |
| Containers | Docker, Docker Compose |
| Frontend | React (Vite), React Router |

---

## What I Will Learn

### Architecture
- **Decomposing by business capability** — deciding service boundaries
- **Database per service** — each service owns its data; no shared DB
- **API Gateway pattern** — one front door for all clients

### Communication
- **Synchronous** REST calls between services (with timeouts)
- **Asynchronous** event-driven messaging with RabbitMQ (publish/subscribe)
- When to choose sync vs async

### Data & Consistency
- **Saga pattern** — keeping data consistent across services without a shared transaction
- **Compensating actions** — undoing earlier steps when a later step fails
- **Distributed locking** with Redis (seat holds with expiry)
- **Idempotency** — safe retries, no double booking or double charging
- **Eventual consistency** — accepting that services catch up a moment later

### Security
- **JWT authentication** across services
- Password hashing with bcrypt
- Input validation at every service boundary
- Rate limiting at the gateway
- Secrets via environment variables

### Reliability & Operations
- Health checks, timeouts, graceful failure (`503`)
- Request ID propagation for **tracing across services**
- Structured logging
- Running the whole system with **Docker Compose**

### Frontend
- Building a React UI **side by side** with the backend, phase by phase
- Talking to microservices **only through the API Gateway**
- Handling auth tokens, CORS, loading/error states
- Showing **eventual consistency** in the UI ("Confirming…" → "Confirmed")

### Quality
- Unit & integration tests per service
- Documenting APIs and architecture

---

## Project Structure

```
02_ShowTime/
├── README.md
├── plan.md
├── basics.md
├── docker-compose.yml
├── api-gateway/
├── auth-service/
├── event-service/
├── booking-service/
├── payment-service/
├── notification-service/
└── frontend/              # React app (talks only to the gateway)
```

## Status

🚧 In progress — see [plan.md](plan.md) for the phase-by-phase build plan and [basics.md](basics.md) for the concepts explained.
