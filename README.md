# Microservices Architecture — Learning Projects

Learning microservices with Node.js, step by step.

| # | Project | What it covers |
|---|---|---|
| 01 | [01_understanding](01_understanding/) | Food delivery demo: 2 services, REST communication, timeouts & 503s, request-ID tracing, Docker Compose |
| 02 | [02_ShowTime](02_ShowTime/) | Event ticket booking platform: 6 services, API Gateway, JWT, Postgres, Redis locks, RabbitMQ, Saga pattern, React frontend |

Each project has a `basics.md` (concepts in simple language) and a `plan.md` (phase-by-phase build plan).

## Run project 01
```bash
cd 01_understanding
docker compose up --build
```
