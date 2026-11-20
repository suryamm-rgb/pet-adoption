import { CaretakerProfile, Review } from "../models/index.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/http.js";
import { notify } from "./notify.js";
import { getBookingFor } from "./bookingService.js";

/** Hidden (moderated) reviews do not count towards the caretaker's rating. */
export async function refreshRating(userId) {
  const [agg] = await Review.aggregate([{ $match: { toUserId: userId, hidden: { $ne: true } } }, { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } }]);
  await CaretakerProfile.updateOne({ userId }, { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg?.n ?? 0 });
}

export async function replyToReview(user, reviewId, text) {
  const review = await Review.findById(reviewId);
  if (!review || review.hidden) throw notFound("Review not found");
  if (!review.toUserId.equals(user._id)) throw forbidden("Only the reviewed person can reply");
  if (review.reply?.text) throw conflict("You already replied to this review");
  review.reply = { text, at: new Date() };
  await review.save();
  await notify(review.fromUserId, { type: "review_reply", title: "Reply to your review", body: text.slice(0, 80), link: "/owner/reviews" });
  return review;
}

export async function createReview(user, bookingId, { rating, comment }) {
  const booking = await getBookingFor(user, bookingId);
  if (booking.status !== "COMPLETED") throw badRequest("You can review after the stay is completed");
  const isOwner = booking.ownerId.equals(user._id);
  if (!isOwner && !booking.caretakerId.equals(user._id)) throw badRequest("Only the parties can review");
  const toUserId = isOwner ? booking.caretakerId : booking.ownerId;
  // Checked up front as well as by the unique index, which a brand-new database may not have built yet.
  if (await Review.exists({ bookingId, fromUserId: user._id })) throw conflict("You already reviewed this booking");
  try {
    const review = await Review.create({ bookingId, fromUserId: user._id, toUserId, rating, comment });
    if (isOwner) await refreshRating(toUserId);
    return review;
  } catch (err) {
    if (err.code === 11000) throw conflict("You already reviewed this booking");
    throw err;
  }
}
