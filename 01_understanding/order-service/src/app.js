import express from "express";
import orderRouter from "./routes/order.routes.js";
import { requestLogger } from "./middleware/requestLogger.js";

const app = express();

app.use(requestLogger); 
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "order" });
});

app.use("/orders", orderRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, data: null, error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(`[order-service] [${req.requestId}] ${req.method} ${req.originalUrl} failed:`, err);
  res.status(500).json({ success: false, data: null, error: "Internal server error" });
});

export default app;
