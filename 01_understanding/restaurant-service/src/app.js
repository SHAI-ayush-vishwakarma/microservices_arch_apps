import express from "express";
import menuRouter from "./routes/menu.routes.js";
import { requestLogger } from "./middleware/requestLogger.js";

const app = express();

app.use(requestLogger); 
// 1. Parse JSON request bodies into req.body
app.use(express.json());

// 2. Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "restaurant" });
});

// 3. Feature routes
app.use("/menu", menuRouter);

// 4. Unknown route → 404
app.use((req, res) => {
  res.status(404).json({ success: false, data: null, error: "Route not found" });
});

// 5. Error handler (4 args = Express knows it's for errors)
app.use((err, req, res, next) => {
  console.error(`[restaurant-service] [${req.requestId}] ${req.method} ${req.originalUrl} failed:`, err);
  res.status(500).json({ success: false, data: null, error: "Internal server error" });
});


export default app;
