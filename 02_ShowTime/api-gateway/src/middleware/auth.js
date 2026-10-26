import jwt from "jsonwebtoken";
import { config } from "../config.js";

const USER_HEADERS = ["x-user-id", "x-user-email", "x-user-role"];

// 1. Never trust user headers coming from outside
export function stripUserHeaders(req, res, next) {
  for (const header of USER_HEADERS) {
    delete req.headers[header];
  }
  next();
}

// 2. Protected routes: token must be valid
export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, data: null, error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    res.status(401).json({ success: false, data: null, error: "Invalid or expired token" });
  }
}
