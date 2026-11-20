import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { captureError } from "../config/monitoring.js";
import { optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const limiter = rateLimit({ windowMs: 60_000, limit: process.env.NODE_ENV === "test" ? 1000 : 10, standardHeaders: true, legacyHeaders: false });
const body = z.object({
  message: z.string().max(500),
  stack: z.string().max(4000).optional(),
  url: z.string().max(300).optional(),
  source: z.enum(["boundary", "window", "promise"]).default("window"),
});

const r = Router();
/** Browser crashes land here so they show up next to server errors. Anonymous allowed, strictly rate limited. */
r.post("/client-errors", limiter, optionalAuth, validate(body), (req, res) => {
  const { message, stack, url, source } = req.body;
  console.error(`[client-error] ${source} ${url ?? ""} ${message}`);
  const err = new Error(message);
  err.stack = stack ?? err.stack;
  captureError(err, { userId: req.user?._id, path: url, source: `client:${source}` });
  res.status(204).end();
});
export default r;
