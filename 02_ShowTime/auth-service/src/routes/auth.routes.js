import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { signupSchema, loginSchema } from "../schemas/auth.schemas.js";
import * as authService from "../services/auth.service.js";

const router = Router();

router.post("/signup", validate(signupSchema), async (req, res) => {
  const user = await authService.signup(req.body);
  res.status(201).json({ success: true, data: user, error: null });
});

router.post("/login", validate(loginSchema), async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ success: true, data: result, error: null });
});

router.get("/me", authenticate, async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  res.json({ success: true, data: user, error: null });
});

export default router;
