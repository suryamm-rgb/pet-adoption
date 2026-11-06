import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as c from "../controllers/paymentController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { wrap } from "../utils/http.js";
import { payment } from "../utils/schemas.js";

const limiter = rateLimit({ windowMs: 60 * 1000, limit: process.env.NODE_ENV === "test" ? 1000 : 20 });
const r = Router();
r.use(requireAuth);
r.post("/order", limiter, validate(payment.order), wrap(c.order));
r.post("/verify", limiter, validate(payment.verify), wrap(c.verify));
r.post("/shop/:id", limiter, wrap(c.shopOrder));
r.post("/sale/:id", limiter, wrap(c.saleOrder));
r.post("/mock-complete", limiter, wrap(c.mockComplete));
r.get("/mine", wrap(c.mine));
r.post("/:id/refund", requireRole("admin"), wrap(c.refund));
export default r;
