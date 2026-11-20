import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import * as payments from "./controllers/paymentController.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { sanitize } from "./middleware/sanitize.js";
import { UPLOAD_DIR } from "./middleware/upload.js";
import routes from "./routes/index.js";
import { wrap } from "./utils/http.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.clientUrls, credentials: true }));
  app.use(rateLimit({ windowMs: 60_000, limit: env.nodeEnv === "test" ? 10_000 : 300 }));

  // The webhook needs the raw body for signature verification, so it is mounted before express.json().
  app.post("/api/webhooks/razorpay", express.raw({ type: "*/*" }), wrap(payments.webhook));

  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(sanitize);
  // Uploaded files are public-by-URL with unguessable names; use Cloudinary signed URLs in production for ID documents.
  app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d", index: false }));
  app.use("/api", routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
