import { Notification, User } from "../models/index.js";
import { absUrl, sendMail } from "./mailService.js";
import { sendPush } from "./pushService.js";
import { sendWhatsApp } from "./smsService.js";

let io = null;
export const attachIo = (instance) => { io = instance; };
export const getIo = () => io;

/** Email: only events a user should hear about even when logged out. Chat, daily updates, check-ins stay out of the inbox. */
const EMAIL_TYPES = new Set([
  "booking_requested", "booking_accepted", "booking_rejected", "booking_cancelled", "booking_expired",
  "payment_success", "payout_released", "stay_started", "stay_completed", "reminder",
  "dispute_opened", "dispute_resolved", "emergency", "verification", "listing",
  "adoption_request", "adoption_update", "sale_complete", "order_placed", "order_packed", "order_shipped", "order_delivered", "order_cancelled",
]);
/** WhatsApp (opt-in): the moments people actually want on their phone. */
const WHATSAPP_TYPES = new Set([
  "booking_requested", "booking_accepted", "booking_rejected", "payment_success", "stay_started", "daily_update", "checkin", "emergency", "stay_completed", "order_shipped", "payout_released",
]);

async function deliverExternally(userId, { type, title, body, link }) {
  const u = await User.findById(userId).select("name email phone phoneVerified notifyPrefs").lean();
  if (!u) return;
  const prefs = { email: true, push: true, whatsapp: false, ...u.notifyPrefs };
  const jobs = [];
  if (prefs.email && EMAIL_TYPES.has(type)) jobs.push(sendMail({ to: u.email, subject: title, intro: body || title, cta: link ? { label: "Open PawStay", url: absUrl(link) } : undefined }));
  if (prefs.push) jobs.push(sendPush(userId, { title, body, link }));
  if (prefs.whatsapp && u.phoneVerified && u.phone && WHATSAPP_TYPES.has(type)) {
    jobs.push(sendWhatsApp(u.phone, `PawStay: ${title}${body ? `\n${body}` : ""}${link ? `\n${absUrl(link)}` : ""}`));
  }
  await Promise.allSettled(jobs);
}

/** In-app notification + realtime socket event, then email / push / WhatsApp according to the user's preferences. */
export async function notify(userId, { type, title, body, link }) {
  if (!userId) return;
  const n = await Notification.create({ userId, type, title, body, link });
  io?.to(`user:${userId}`).emit("notification:new", n);
  deliverExternally(userId, { type, title, body, link }).catch((err) => console.error(`[notify] delivery failed: ${err.message}`));
  if (process.env.NODE_ENV !== "test") console.log(`[notify] ${userId} ${type}: ${title}`);
  return n;
}

export const notifyMany = (userIds, payload) => Promise.all(userIds.map((u) => notify(u, payload)));
