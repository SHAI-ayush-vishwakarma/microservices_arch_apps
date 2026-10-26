import { rateLimit } from "express-rate-limit";

const ONE_MINUTE_MS = 60 * 1000;

function tooManyRequests(req, res) {
  res.status(429).json({ success: false, data: null, error: "Too many requests, please try again later" });
}

export const generalLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: tooManyRequests,
});

export const loginLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: tooManyRequests,
});
