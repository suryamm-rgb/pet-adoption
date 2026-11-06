import { Schema, model, id, opts } from "./helpers.js";

const reviewSchema = new Schema(
  {
    bookingId: { ...id("Booking"), required: true },
    fromUserId: { ...id("User"), required: true },
    toUserId: { ...id("User"), required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String,
  },
  opts,
);
reviewSchema.index({ bookingId: 1, fromUserId: 1 }, { unique: true });
export const Review = model("Review", reviewSchema);
