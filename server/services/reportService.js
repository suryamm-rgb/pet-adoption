import { AuditLog, Listing, Message, Product, Report, Review, User } from "../models/index.js";
import { conflict, notFound } from "../utils/http.js";
import { refreshRating } from "./reviewService.js";

const MODELS = { review: Review, listing: Listing, product: Product, message: Message, user: User };

export async function createReport(user, { targetType, targetId, reason, details }) {
  const target = await MODELS[targetType].findById(targetId);
  if (!target) throw notFound("Nothing to report");
  if (targetType === "user" && String(target._id) === String(user._id)) throw conflict("You cannot report yourself");
  const dup = await Report.exists({ reporterId: user._id, targetType, targetId, status: "open" });
  if (dup) throw conflict("You already reported this");
  return Report.create({ reporterId: user._id, targetType, targetId, reason, details });
}

/** Admin decision. "remove" hides or disables the content; "block_user" also blocks whoever posted it. */
export async function resolveReport(admin, reportId, { action, note }) {
  const report = await Report.findById(reportId);
  if (!report) throw notFound("Report not found");
  if (report.status !== "open") throw conflict("Already resolved");
  const { targetType: type, targetId: id } = report;

  if (action !== "dismiss") {
    if (type === "review") {
      const review = await Review.findByIdAndUpdate(id, { hidden: true }, { returnDocument: "after" });
      if (review) await refreshRating(review.toUserId);
    } else if (type === "listing") await Listing.updateOne({ _id: id }, { status: "rejected" });
    else if (type === "product") await Product.updateOne({ _id: id }, { isActive: false });
    else if (type === "message") await Message.updateOne({ _id: id }, { text: "[removed by moderator]", attachments: [] });
  }
  if (action === "block_user") {
    const target = await MODELS[type].findById(id).lean();
    const offender = type === "user" ? id : target?.fromUserId ?? target?.sellerId ?? target?.senderId;
    if (offender && !(await User.exists({ _id: offender, roles: "admin" }))) await User.updateOne({ _id: offender }, { isBlocked: true, $inc: { tokenVersion: 1 } });
  }
  report.status = action === "dismiss" ? "dismissed" : "actioned";
  report.resolvedBy = admin._id;
  report.resolution = note || action;
  await report.save();
  await AuditLog.create({ adminId: admin._id, action: `report.${action}`, target: String(report._id), meta: { type, targetId: id } });
  return report;
}
