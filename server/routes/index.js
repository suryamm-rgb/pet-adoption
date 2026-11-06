import { Router } from "express";
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
import shop from "./shopRoutes.js";

const r = Router();
r.get("/health", (_req, res) => res.json({ ok: true }));
r.get("/settings/public", wrap(async (_req, res) => {
  const s = await getSettings();
  res.json({ platformFeePercent: s.platformFeePercent, cancellationRules: s.cancellationRules, allowedPetTypes: s.allowedPetTypes, paymentDeadlineHours: s.paymentDeadlineHours, disputeWindowHours: s.disputeWindowHours });
}));
r.use("/auth", auth);
r.use("/pets", pets);
r.use("/caretakers", caretakers);
r.use("/bookings", bookings);
r.use("/payments", payments);
r.use("/listings", listings);
r.use("/", shop);
r.use("/notifications", notifications);
r.use("/admin", admin);
export default r;
