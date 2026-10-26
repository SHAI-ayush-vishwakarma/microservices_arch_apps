import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { stripUserHeaders, requireAuth } from "./middleware/auth.js";
import { generalLimiter, loginLimiter } from "./middleware/rateLimiters.js";
import { createServiceProxy } from "./proxy/createServiceProxy.js";

const app = express();

// 1. Every request: ID + logging, CORS, strip spoofed headers, general rate limit
app.use(requestLogger);
app.use(cors({ origin: config.CORS_ORIGIN, exposedHeaders: ["x-request-id"] }));
app.use(stripUserHeaders);
app.use(generalLimiter);

// 2. Gateway's own health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

// 3. Route-specific rules (run BEFORE the proxy)
app.use("/auth/login", loginLimiter);
app.use("/auth/me", requireAuth);

// 4. Proxies — one line per service
app.use(createServiceProxy({ name: "Auth service", target: config.AUTH_SERVICE_URL, pathFilter: "/auth" }));

// 5. Nothing matched
app.use((req, res) => {
  res.status(404).json({ success: false, data: null, error: "Route not found" });
});

export default app;
