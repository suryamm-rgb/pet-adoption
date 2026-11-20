import { AuditLog, Booking, CaretakerProfile, Dispute, Listing, Payment, User, getSettings } from "../models/index.js";
import { resolveDispute } from "../services/bookingService.js";
import { notify } from "../services/notify.js";
import { payoutBooking } from "../services/paymentService.js";
import { notFound } from "../utils/http.js";

/** ?page=1&limit=50 (max 100). Clients know there is another page when a full page comes back. */
const paging = (req) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const page = Math.max(Number(req.query.page) || 1, 1);
  return { limit, skip: (page - 1) * limit };
};
const audit = (admin, action, target, meta) => AuditLog.create({ adminId: admin._id, action, target: String(target), meta });

export async function stats(_req, res) {
  const dayStart = new Date(new Date().setUTCHours(0, 0, 0, 0));
  const monthStart = new Date(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), 1);
  const [bookingsToday, activeStays, pendingVerifications, openDisputes, pendingListings, pendingPayouts, completed] = await Promise.all([
    Booking.countDocuments({ createdAt: { $gte: dayStart } }),
    Booking.countDocuments({ status: "IN_CARE" }),
    CaretakerProfile.countDocuments({ verificationStatus: "pending" }),
    Dispute.countDocuments({ status: "open" }),
    Listing.countDocuments({ status: "pending" }),
    Booking.countDocuments({ status: "COMPLETED", payoutStatus: "pending" }),
    Booking.find({ status: "COMPLETED", completedAt: { $gte: monthStart } }).select("ownerPays caretakerGets refundAmount"),
  ]);
  const revenueMonth = completed.reduce((s, b) => s + (b.ownerPays - b.refundAmount - b.caretakerGets), 0);
  res.json({ bookingsToday, activeStays, pendingVerifications, openDisputes, pendingListings, pendingPayouts, revenueMonth });
}

export async function verifications(req, res) {
  const status = req.query.status ?? "pending";
  const profiles = await CaretakerProfile.find({ verificationStatus: status }).sort({ updatedAt: 1 }).populate("userId", "name email phone city");
  res.json(profiles);
}

export async function verify(req, res) {
  const profile = await CaretakerProfile.findOne({ userId: req.params.id });
  if (!profile) throw notFound();
  const approve = req.body.decision === "approve";
  profile.verificationStatus = approve ? "approved" : "rejected";
  profile.rejectionReason = approve ? undefined : req.body.reason;
  await profile.save();
  await audit(req.user, `caretaker.${req.body.decision}`, req.params.id, { reason: req.body.reason });
  await notify(req.params.id, { type: "verification", title: approve ? "You are verified" : "Verification rejected", body: approve ? "You now appear in search" : req.body.reason, link: "/caretaker/profile" });
  res.json(profile);
}

export async function users(req, res) {
  const q = req.query.q ? new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
  res.json(await User.find(q ? { $or: [{ name: q }, { email: q }] } : {}).sort({ createdAt: -1 }).skip(paging(req).skip).limit(paging(req).limit));
}
export async function block(req, res) {
  const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: req.body.blocked }, { returnDocument: "after" });
  if (!user) throw notFound();
  await audit(req.user, req.body.blocked ? "user.block" : "user.unblock", user._id);
  res.json(user);
}

export const bookings = async (req, res) =>
  res.json(await Booking.find(req.query.status ? { status: req.query.status } : {}).sort({ createdAt: -1 }).skip(paging(req).skip).limit(paging(req).limit).populate("ownerId", "name").populate("caretakerId", "name").populate("petId", "name"));

export const disputes = async (req, res) =>
  res.json(await Dispute.find(req.query.status ? { status: req.query.status } : {}).sort({ createdAt: -1 }).populate("bookingId").populate("raisedBy", "name"));
export async function resolve(req, res) {
  const dispute = await resolveDispute(req.user, req.params.id, req.body);
  await audit(req.user, "dispute.resolve", dispute._id, req.body);
  res.json(dispute);
}

export const payments = async (req, res) => res.json(await Payment.find().sort({ createdAt: -1 }).skip(paging(req).skip).limit(paging(req).limit));
export async function payout(req, res) {
  const booking = await payoutBooking(req.user, req.params.bookingId, req.body);
  await audit(req.user, "payout", booking._id, { force: Boolean(req.body.force) });
  res.json(booking);
}
export async function pendingPayouts(_req, res) {
  const rows = await Booking.find({ status: "COMPLETED", payoutStatus: "pending" }).sort({ completedAt: 1 }).populate("caretakerId", "name").lean();
  const banks = await CaretakerProfile.find({ userId: { $in: rows.map((b) => b.caretakerId?._id) } }).select("userId bankDetails").lean();
  const byUser = new Map(banks.map((p) => [String(p.userId), p.bankDetails]));
  // Admin needs the bank details to make the manual transfer.
  res.json(rows.map((b) => ({ ...b, bankDetails: byUser.get(String(b.caretakerId?._id)) ?? null })));
}

export const getSettingsHandler = async (_req, res) => res.json(await getSettings());
export async function putSettings(req, res) {
  const settings = await getSettings();
  settings.set(req.body);
  await settings.save();
  await audit(req.user, "settings.update", "global", req.body);
  res.json(settings);
}

export const pendingListings = async (_req, res) => res.json(await Listing.find({ status: "pending" }).sort({ createdAt: 1 }).populate("sellerId", "name"));
export async function reviewListing(req, res) {
  const approve = req.params.action === "approve";
  const listing = await Listing.findOneAndUpdate({ _id: req.params.id, status: "pending" }, { status: approve ? "approved" : "rejected" }, { returnDocument: "after" });
  if (!listing) throw notFound();
  await audit(req.user, `listing.${req.params.action}`, listing._id);
  await notify(listing.sellerId, { type: "listing", title: `Listing ${approve ? "approved" : "rejected"}`, body: listing.title, link: "/seller" });
  res.json(listing);
}
export const auditLog = async (req, res) =>
  res.json(await AuditLog.find(req.query.action ? { action: new RegExp(`^${String(req.query.action).replace(/[^\w.]/g, "")}`) } : {}).sort({ createdAt: -1 }).skip(paging(req).skip).limit(paging(req).limit).populate("adminId", "name"));
