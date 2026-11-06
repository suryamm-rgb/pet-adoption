import cron from "node-cron";
import { Booking, DailyUpdate, getSettings } from "../models/index.js";
import { notify } from "../services/notify.js";

const hours = (h) => new Date(Date.now() - h * 3_600_000);

export async function expireRequests() {
  const s = await getSettings();
  const stale = await Booking.find({ status: "REQUESTED", createdAt: { $lt: hours(s.requestExpiryHours) } });
  for (const b of stale) {
    const r = await Booking.updateOne({ _id: b._id, status: "REQUESTED" }, { status: "EXPIRED" });
    if (r.modifiedCount) await notify(b.ownerId, { type: "booking_expired", title: "Request expired", body: "The caretaker did not reply in time", link: "/caretakers" });
  }
  return stale.length;
}

export async function expireUnpaid() {
  const s = await getSettings();
  const stale = await Booking.find({ status: "ACCEPTED", acceptedAt: { $lt: hours(s.paymentDeadlineHours) } });
  for (const b of stale) {
    const r = await Booking.updateOne({ _id: b._id, status: "ACCEPTED" }, { status: "CANCELLED", cancelledBy: "system", cancelReason: "Payment deadline passed" });
    if (r.modifiedCount) await notify(b.ownerId, { type: "booking_cancelled", title: "Booking cancelled", body: "Payment was not made in time", link: "/caretakers" });
  }
  return stale.length;
}

export async function startStays() {
  const today = new Date(new Date().setUTCHours(23, 59, 59, 999));
  const due = await Booking.find({ status: "PAID", startDate: { $lte: today } });
  for (const b of due) {
    const r = await Booking.updateOne({ _id: b._id, status: "PAID" }, { status: "IN_CARE" });
    if (r.modifiedCount) await Promise.all([b.ownerId, b.caretakerId].map((u) => notify(u, { type: "stay_started", title: "Stay started", body: "Daily updates are now active", link: "/" })));
  }
  return due.length;
}

export async function updateReminder() {
  const dayStart = new Date(new Date().setUTCHours(0, 0, 0, 0));
  const active = await Booking.find({ status: "IN_CARE" });
  let sent = 0;
  for (const b of active) {
    if (!(await DailyUpdate.exists({ bookingId: b._id, createdAt: { $gte: dayStart } }))) {
      await notify(b.caretakerId, { type: "update_reminder", title: "Post today's update", body: "Your owner is waiting for a photo", link: `/caretaker/stays/${b._id}` });
      sent++;
    }
  }
  return sent;
}

export async function autoComplete() {
  const due = await Booking.find({ status: "IN_CARE", endDate: { $lt: hours(24) } });
  for (const b of due) {
    await Booking.updateOne({ _id: b._id, status: "IN_CARE" }, { status: "COMPLETED", completedAt: new Date(), payoutStatus: "pending" });
  }
  return due.length;
}

export async function tripReminders() {
  const from = new Date(Date.now() + 24 * 3_600_000);
  const to = new Date(Date.now() + 48 * 3_600_000);
  const soon = await Booking.find({ status: "PAID", startDate: { $gte: from, $lt: to } });
  await Promise.all(soon.flatMap((b) => [b.ownerId, b.caretakerId].map((u) => notify(u, { type: "reminder", title: "Stay starts tomorrow", body: "Get ready for the handover", link: "/" }))));
  return soon.length;
}

/** Payouts are admin-triggered in v1; this job just tells admins when some become eligible. */
export async function payoutDigest() {
  const s = await getSettings();
  return Booking.countDocuments({ status: "COMPLETED", payoutStatus: "pending", completedAt: { $lt: hours(s.disputeWindowHours) } });
}

const safe = (name, fn) => async () => {
  try {
    const n = await fn();
    if (n) console.log(`[job] ${name}: ${n}`);
  } catch (err) {
    console.error(`[job] ${name} failed`, err);
  }
};

export function startJobs() {
  cron.schedule("*/15 * * * *", safe("expireRequests", expireRequests));
  cron.schedule("*/15 * * * *", safe("expireUnpaid", expireUnpaid));
  cron.schedule("0 * * * *", safe("startStays", startStays));
  cron.schedule("0 18 * * *", safe("updateReminder", updateReminder));
  cron.schedule("0 * * * *", safe("autoComplete", autoComplete));
  cron.schedule("0 * * * *", safe("payoutDigest", payoutDigest));
  cron.schedule("0 9 * * *", safe("tripReminders", tripReminders));
}
