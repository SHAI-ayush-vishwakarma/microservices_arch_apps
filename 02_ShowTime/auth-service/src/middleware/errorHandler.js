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
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, data: null, error: err.message });
  }

  console.error(`[auth-service] [${req.requestId}] ${req.method} ${req.originalUrl} failed:`, err);
  res.status(500).json({ success: false, data: null, error: "Internal server error" });
}
