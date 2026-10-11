import { Router } from "express";
import { randomUUID } from "node:crypto";
import { orders } from "../data/orders.js";

import { getDish, RestaurantUnavailableError } from "../clients/restaurant.client.js";


const router = Router();

const ALLOWED_STATUSES = ["PLACED", "PREPARING", "DELIVERED", "CANCELLED"];

// POST /orders → place a new order
router.post("/", async (req, res) => {
  const dishId = req.body?.dishId;
  const quantity = req.body?.quantity;

  // 1. check the input
  if (!dishId) {
    return res.status(400).json({ success: false, data: null, error: "dishId is required" });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ success: false, data: null, error: "quantity must be a whole number ≥ 1" });
  }

  // 2. ask the Restaurant Service about this dish
  let dish;
  try {
    dish = await getDish(dishId, req.requestId);
  } catch (error) {
    if (error instanceof RestaurantUnavailableError) {
      return res.status(503).json({ success: false, data: null, error: "Restaurant service is unavailable, please try again later" });
    }
    throw error; // any other bug → goes to the 500 error handler in app.js
  }


  // 3. build the order using the REAL price
  const newOrder = {
    id: randomUUID(),
    dishId: dish.id,
    dishName: dish.name,
    quantity: quantity,
    totalPrice: dish.price * quantity,
    status: "PLACED",
    createdAt: new Date().toISOString(),
  };

  // 4. save it
  orders.push(newOrder);

  res.status(201).json({ success: true, data: newOrder, error: null });
});


// GET /orders → all orders
router.get("/", (req, res) => {
  res.json({ success: true, data: orders, error: null });
});

// GET /orders/:orderId → one order
router.get("/:orderId", (req, res) => {
  const order = orders.find((item) => item.id === req.params.orderId);

  if (!order) {
    return res.status(404).json({ success: false, data: null, error: "Order not found" });
  }

  res.json({ success: true, data: order, error: null });
});



// PATCH /orders/:orderId/status → change status
router.patch("/:orderId/status", (req, res) => {
  const status = req.body?.status;

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, data: null, error: `status must be one of ${ALLOWED_STATUSES.join(", ")}` });
  }

  const position = orders.findIndex((item) => item.id === req.params.orderId);
  if (position === -1) {
    return res.status(404).json({ success: false, data: null, error: "Order not found" });
  }

  const updatedOrder = { ...orders[position], status: status };
  orders[position] = updatedOrder;

  res.json({ success: true, data: updatedOrder, error: null });
});

export default router;
