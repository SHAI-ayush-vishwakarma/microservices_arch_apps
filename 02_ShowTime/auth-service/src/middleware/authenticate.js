import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { AppError } from "./errorHandler.js";

export function authenticate(req, res, next) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new AppError(401, "Missing or invalid Authorization header"));
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
}
