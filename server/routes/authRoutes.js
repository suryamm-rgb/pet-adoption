import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as c from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { wrap } from "../utils/http.js";
import { auth as s } from "../utils/schemas.js";

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: process.env.NODE_ENV === "test" ? 1000 : 30, standardHeaders: true, legacyHeaders: false });
const r = Router();
r.post("/register", limiter, validate(s.register), wrap(c.register));
r.post("/login", limiter, validate(s.login), wrap(c.login));
r.post("/logout", c.logout);
r.get("/me", requireAuth, c.me);
r.post("/verify-email", validate(s.token), wrap(c.verifyEmail));
r.post("/forgot-password", limiter, validate(s.forgot), wrap(c.forgot));
r.post("/reset-password", limiter, validate(s.reset), wrap(c.reset));
r.post("/roles", requireAuth, validate(s.role), wrap(c.addRole));
export default r;
