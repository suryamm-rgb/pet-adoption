import { Router } from "express";
import { env, isProd } from "../config/env.js";
import { smsEnabled, whatsappEnabled } from "../services/smsService.js";
import mongoose from "mongoose";
import { getSettings } from "../models/index.js";
import { wrap } from "../utils/http.js";
import admin from "./adminRoutes.js";
import auth from "./authRoutes.js";
import bookings from "./bookingRoutes.js";
import caretakers from "./caretakerRoutes.js";
import listings from "./listingRoutes.js";
import notifications from "./notificationRoutes.js";
import payments from "./paymentRoutes.js";
import pets from "./petRoutes.js";
import clientErrors from "./clientErrorRoutes.js";
import moderation from "./moderationRoutes.js";
import shop from "./shopRoutes.js";

import { requireAuth } from "../middleware/auth.js";
import { privateFile } from "../controllers/fileController.js";

const r = Router();
// Liveness plus a database check: orchestrators use this to restart or hold traffic.
r.get("/health", (_req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({ ok: db, db: db ? "up" : "down", uptime: Math.round(process.uptime()) });
});
r.get("/settings/public", wrap(async (_req, res) => {
  const s = await getSettings();
  res.json({ platformFeePercent: s.platformFeePercent, cancellationRules: s.cancellationRules, allowedPetTypes: s.allowedPetTypes, paymentDeadlineHours: s.paymentDeadlineHours, disputeWindowHours: s.disputeWindowHours,
    // lets the website show only the sign-in and alert options that are actually set up
    features: { googleClientId: env.googleClientId || null, pushPublicKey: env.push.publicKey || null, sms: smsEnabled || !isProd, whatsapp: whatsappEnabled, phoneVerificationRequired: env.requirePhoneVerification, payoutMode: env.payoutMode } });
}));
r.get("/files/private/:key", requireAuth, wrap(privateFile));
r.use("/auth", auth);
r.use("/pets", pets);
r.use("/caretakers", caretakers);
r.use("/bookings", bookings);
r.use("/payments", payments);
r.use("/listings", listings);
r.use("/", clientErrors);
r.use("/", moderation);
r.use("/", shop);
r.use("/notifications", notifications);
r.use("/admin", admin);
export default r;
