import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as c from "../controllers/moderationController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { wrap } from "../utils/http.js";
import { moderation as s } from "../utils/schemas.js";

const limiter = rateLimit({ windowMs: 60 * 1000, limit: process.env.NODE_ENV === "test" ? 1000 : 10 });
const r = Router();
r.use(requireAuth);
r.post("/reports", limiter, validate(s.report), wrap(c.report));
r.post("/reviews/:id/reply", validate(s.reply), wrap(c.reply));
export default r;
