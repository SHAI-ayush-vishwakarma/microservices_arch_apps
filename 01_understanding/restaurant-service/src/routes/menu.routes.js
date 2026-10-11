import { Router } from "express";
import { dishes } from "../data/menu.js";

const router = Router();

// Helper: find a dish's position in the array
const findDishIndex = (dishId) => dishes.findIndex((d) => d.id === dishId);

// GET /menu → all dishes
router.get("/", (req, res) => {
  res.json({ success: true, data: dishes, error: null });
});

// GET /menu/:dishId → one dish
router.get("/:dishId", (req, res) => {
  const index = findDishIndex(req.params.dishId);

  if (index === -1) {
    return res.status(404).json({ success: false, data: null, error: "Dish not found" });
  }

  res.json({ success: true, data: dishes[index], error: null });
});

// PATCH /menu/:dishId/availability → mark available/unavailable
router.patch("/:dishId/availability", (req, res) => {
  const { isAvailable } = req.body ?? {};

  if (typeof isAvailable !== "boolean") {
    return res.status(400).json({ success: false, data: null, error: "isAvailable must be true or false" });
  }

  const index = findDishIndex(req.params.dishId);
  if (index === -1) {
    return res.status(404).json({ success: false, data: null, error: "Dish not found" });
  }

  dishes[index] = { ...dishes[index], isAvailable };
  res.json({ success: true, data: dishes[index], error: null });
});

export default router;
