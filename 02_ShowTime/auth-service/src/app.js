import express from "express";
import { pool } from "./db/pool.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import authRouter from "./routes/auth.routes.js";

const app = express();

app.use(requestLogger);
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "auth", database: "up" });
  } catch {
    res.status(503).json({ status: "degraded", service: "auth", database: "down" });
  }
});

app.use("/auth", authRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
