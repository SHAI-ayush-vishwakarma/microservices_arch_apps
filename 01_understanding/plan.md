# Food Delivery — Microservices Learning Plan (Node.js)

## Goal
Learn three things:
1. How to build a microservice.
2. How two services talk to each other over an API.
3. The basic features every service should have.

Keep it basic: no real database, no auth, no frontend.

---

## REST or gRPC? → **REST**

| | REST (HTTP + JSON) | gRPC (HTTP/2 + Protobuf) |
|---|---|---|
| Learning curve | Very easy | Needs `.proto` files + codegen |
| Testing | Browser, curl, Postman | Needs special tools |
| Readable data | Yes (JSON) | No (binary) |
| Speed | Good enough | Faster |
| Best for | Public APIs, learning, most apps | High-traffic internal service-to-service calls |

**Decision:** use REST now. gRPC can be an optional later phase so you can compare the two side by side.

---

## Tech stack
- **Node.js 20+** with **Express** for the web server
- **Built-in `fetch`** (Node 18+) for calling the other service, so no extra library is needed
- **dotenv** for environment variables
- **In-memory arrays** as the "database"
- **Docker + Docker Compose** to run both services together
- **nodemon** (dev only) for auto-restart

---

## Architecture
```
            ┌──────────────────────────┐
  client ─► │ Restaurant Service :3001 │   owns: menu (dishes)
            └────────────▲─────────────┘
                         │ REST: GET /menu/:dishId
            ┌────────────┴─────────────┐
  client ─► │ Order Service      :3002 │   owns: orders
            └──────────────────────────┘
```
Rules we'll follow:
- Each service keeps its **own data**. The Order Service never touches the menu array directly.
- The Order Service finds the Restaurant Service through an **env var** (`RESTAURANT_SERVICE_URL`).

---

## Service 1 — Restaurant Service (port 3001)
**Job:** manage the menu.

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/health` | `{ status: "ok", service: "restaurant" }` |
| GET | `/menu` | List all dishes |
| GET | `/menu/:dishId` | One dish (404 if not found) |
| PATCH | `/menu/:dishId/availability` | Mark a dish available or unavailable |

Dish shape:
```json
{ "id": "d1", "name": "Margherita Pizza", "price": 299, "isAvailable": true }
```

## Service 2 — Order Service (port 3002)
**Job:** take and track orders.

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/health` | `{ status: "ok", service: "order" }` |
| POST | `/orders` | Body `{ dishId, quantity }` → place an order |
| GET | `/orders` | List orders |
| GET | `/orders/:orderId` | One order |
| PATCH | `/orders/:orderId/status` | `PLACED → PREPARING → DELIVERED` / `CANCELLED` |

**`POST /orders` flow (the core lesson):**
```
1. Validate body (dishId present, quantity is a positive integer)    → 400 if bad
2. Call Restaurant: GET {RESTAURANT_SERVICE_URL}/menu/{dishId}  (timeout 3s)
     404               → reply 404 "Dish not found"
     isAvailable=false → reply 409 "Dish unavailable"
     timeout/down      → reply 503 "Restaurant service unavailable"
3. totalPrice = dish.price * quantity
4. Save order { id, dishId, dishName, quantity, totalPrice, status: "PLACED", createdAt }
5. Reply 201 with the order
```

## Common basics in BOTH services
- `/health` endpoint
- Port and URLs read from `.env`, never hardcoded
- Consistent JSON responses: `{ success, data, error }`
- Error-handling middleware (no crashes, no stack traces sent to the client)
- Simple request logging (method, path, status, time)
- A `x-request-id` header passed from Order to Restaurant so you can trace one request across both logs

---

## Folder structure
```
Microservice_Arch_Apps/
├── 01_understanding/ (basics.md, plan.md)
├── restaurant-service/
│   ├── src/
│   │   ├── index.js          # start server
│   │   ├── app.js            # express app + middleware
│   │   ├── routes/menu.routes.js
│   │   └── data/menu.js      # in-memory dishes
│   ├── .env
│   ├── package.json
│   └── Dockerfile
├── order-service/
│   ├── src/
│   │   ├── index.js
│   │   ├── app.js
│   │   ├── routes/order.routes.js
│   │   ├── clients/restaurant.client.js   # ALL calls to restaurant live here
│   │   └── data/orders.js
│   ├── .env
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

---

## Phases (you code, I guide and review)

| # | Phase | You'll learn | Done when |
|---|---|---|---|
| 0 | Setup: check Node/Docker, create folders, `npm init` | Project skeleton | `node -v` ≥ 20 |
| 1 | Restaurant Service: health + menu endpoints | Anatomy of one service | `curl localhost:3001/menu` works |
| 2 | Order Service: health + orders (no inter-service call yet; price hardcoded) | Independent service, own data | Can create/list orders |
| 3 | Restaurant client in Order Service | **Service-to-service REST call** | Order uses the real price from Restaurant |
| 4 | Failure handling: timeout, 404/409/503, stop Restaurant and test | Resilience basics | Order Service doesn't crash when Restaurant is down |
| 5 | Logging + request ID propagation | Tracing across services | The same ID appears in both logs |
| 6 | Dockerfiles + docker-compose | Containers, service discovery by name (`http://restaurant-service:3001`) | `docker compose up` runs both |
| 7 *(optional)* | Replace the Order→Restaurant call with gRPC | REST vs gRPC compared | Same flow over gRPC |

**Out of scope for now:** a real database, auth, an API gateway, message queues (a good "understanding_02" topic).
