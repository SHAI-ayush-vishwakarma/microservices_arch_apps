# Microservices: The Basics (in simple language)

## 1. What is a Monolith?

A **monolith** is one big application. All features (users, orders, payments, emails) live in **one codebase**, run as **one process**, and usually share **one database**.

```
+------------------------------------------+
|              MONOLITH APP                |
|  Users | Orders | Payments | Emails      |
+------------------------------------------+
                    |
              [ One Database ]
```

**Good:** simple to start, easy to run locally, easy to debug.
**Bad (as it grows):** one bug can crash everything, every small change means redeploying the whole app, hard for many teams to work in parallel, and you can't scale just one part.

---

## 2. What is a Microservice?

A **microservice** is a **small, independent app that does ONE job well**.
A microservices architecture is many of these small apps working together.

```
 +---------------+      +----------------+      +-----------------+
 | User Service  |      | Order Service  |      | Payment Service |
 +---------------+      +----------------+      +-----------------+
        |                       |                        |
   [ Users DB ]            [ Orders DB ]           [ Payments DB ]
```

Think of a restaurant:
- The **chef** cooks, the **waiter** takes orders, the **cashier** handles money.
- Each person does one job and they **talk to each other**.
- If the cashier is on break, the chef can still cook.

That is microservices.

---

## 3. Golden Rules of a Microservice

| Rule | Meaning |
|------|---------|
| **Single responsibility** | One service = one business area (users, orders...). |
| **Owns its data** | Each service has its **own database**. Other services must NOT read it directly — they must ask the service via its API. |
| **Independently deployable** | You can update/restart one service without touching the others. |
| **Communicates over the network** | Services talk through HTTP APIs or messages, never by importing each other's code. |
| **Loosely coupled** | A change inside one service should not break others, as long as its API (contract) stays the same. |
| **Can fail alone** | If one service goes down, the others should handle it gracefully. |

---

## 4. How Do Microservices Communicate?

There are two main styles.

### A) Synchronous — "Call and wait" (HTTP / REST, gRPC)

Service A sends a request to Service B and **waits for the answer**. Like a phone call.

```
Order Service  --- GET /users/1 --->  User Service
Order Service  <-- {id:1, name:"Ayush"} ---
```

- **Use when:** you need the answer right now (e.g., "Does this user exist?").
- **Downside:** if B is slow or down, A is also stuck.

### B) Asynchronous — "Send and move on" (Message Queue / Events)

Service A drops a message into a **message broker** (RabbitMQ, Kafka, Redis) and moves on. Service B picks it up whenever it's ready. Like sending a WhatsApp message.

```
Order Service --"OrderCreated"--> [ Message Broker ] --> Email Service
                                                     --> Inventory Service
```

- **Use when:** the work can happen later (send email, update stats).
- **Benefit:** services don't need to be online at the same time; one event can reach many services.
- **Downside:** more moving parts, harder to debug.

> **Start with synchronous HTTP.** Add async messaging once the basics are clear.

---

## 5. Important Building Blocks (you'll meet these soon)

| Concept | Simple explanation |
|---------|--------------------|
| **API / Contract** | The "menu" a service offers: its endpoints, inputs, and outputs. Keep it stable. |
| **API Gateway** | A single front door for clients. The client calls the gateway; the gateway routes to the right service. |
| **Service Discovery** | How a service finds another's address. In Docker Compose you just use the service name (e.g., `http://user-service:8001`). |
| **Configuration / Env vars** | URLs, ports, and secrets come from environment variables, not hardcoded. |
| **Health check** | A `/health` endpoint that says "I'm alive" — used by Docker/Kubernetes. |
| **Timeouts & Retries** | Never wait forever on another service. Set a timeout; retry carefully. |
| **Circuit Breaker** | If a service keeps failing, stop calling it for a while instead of hammering it. |
| **Logging & Tracing** | Every request gets a **request/correlation ID** passed between services so you can follow it across logs. |
| **Containers (Docker)** | Each service is packaged in its own container so it runs the same everywhere. |
| **Docker Compose** | Runs multiple containers together on your laptop with one command. |

---

## 6. Typical Request Flow (putting it together)

```
Client
  |
  v
API Gateway  (optional at first)
  |
  v
Order Service --HTTP--> User Service   (check user exists)
  |
  v
Orders DB  (save order)
  |
  v
(later) publish "OrderCreated" event --> Notification Service
```

---

## 7. When NOT to use Microservices

- Small app or small team → a monolith is simpler and fine.
- You don't yet know the business boundaries well.
- You don't have basic DevOps (Docker, logging, monitoring) in place.

Microservices solve **organizational and scaling** problems — they add complexity. Use them when the benefits outweigh that cost. (Here, we're using them to **learn**.)

---

## 8. Quick Glossary

- **Service** – a small standalone app.
- **Endpoint** – a URL a service exposes (`GET /users/1`).
- **REST** – a common style of HTTP APIs using GET/POST/PUT/DELETE.
- **JSON** – the text format services use to exchange data.
- **Broker** – a middleman that stores and delivers messages (RabbitMQ, Kafka).
- **Event** – a message saying "something happened" (`OrderCreated`).
- **Container** – a lightweight box that packages an app with everything it needs.

---

## 9. Summary in 5 lines

1. A microservice = a small app doing **one job**, with **its own data**.
2. Services talk via **HTTP (sync)** or **messages/events (async)**.
3. Never share databases; share **APIs**.
4. Use **env vars, health checks, timeouts, and logs** from day one.
5. Use **Docker + Docker Compose** to run them all together.
