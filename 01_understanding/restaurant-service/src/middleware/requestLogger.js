import { randomUUID } from "node:crypto";

const SERVICE_NAME = "restaurant-service"; // ← "order-service" in the other one

export function requestLogger(req, res, next) {
  // 1. reuse the ID if another service sent one, otherwise create a new one
  const requestId = req.headers["x-request-id"] || randomUUID();

  // 2. make it available to routes, and send it back to the caller
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  // 3. log when the response is finished
  const startTime = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(`[${SERVICE_NAME}] [${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  // 4. continue to the next middleware / route
  next();
}
