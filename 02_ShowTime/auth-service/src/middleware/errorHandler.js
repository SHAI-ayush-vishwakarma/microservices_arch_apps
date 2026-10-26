const DB_UNAVAILABLE_CODES = ["ECONNREFUSED", "ETIMEDOUT", "57P03"]; // 57P03 = Postgres "starting up"

export class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, data: null, error: "Route not found" });
}

export function errorHandler(err, req, res, next) {
  // 1. Expected errors we threw ourselves (409, 401, 404...)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, data: null, error: err.message });
  }

  // 2. Database is down / starting → not our bug → 503
  if (DB_UNAVAILABLE_CODES.includes(err.code)) {
    console.error(`[auth-service] [${req.requestId}] Database unavailable: ${err.message}`);
    return res.status(503).json({ success: false, data: null, error: "Service temporarily unavailable, please try again later" });
  }

  // 3. Anything else is a real bug → 500
  console.error(`[auth-service] [${req.requestId}] ${req.method} ${req.originalUrl} failed:`, err);
  res.status(500).json({ success: false, data: null, error: "Internal server error" });
}
