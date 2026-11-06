import { CaretakerProfile, Review } from "../models/index.js";
import { badRequest, conflict } from "../utils/http.js";
import { getBookingFor } from "./bookingService.js";

export async function createReview(user, bookingId, { rating, comment }) {
  const booking = await getBookingFor(user, bookingId);
  if (booking.status !== "COMPLETED") throw badRequest("You can review after the stay is completed");
  const isOwner = booking.ownerId.equals(user._id);
  if (!isOwner && !booking.caretakerId.equals(user._id)) throw badRequest("Only the parties can review");
  const toUserId = isOwner ? booking.caretakerId : booking.ownerId;
  try {
    const review = await Review.create({ bookingId, fromUserId: user._id, toUserId, rating, comment });
    if (isOwner) {
      const [agg] = await Review.aggregate([{ $match: { toUserId } }, { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } }]);
      await CaretakerProfile.updateOne({ userId: toUserId }, { ratingAvg: Math.round(agg.avg * 10) / 10, ratingCount: agg.n });
    }
    return review;
  } catch (err) {
    if (err.code === 11000) throw conflict("You already reviewed this booking");
    throw err;
  }
}
