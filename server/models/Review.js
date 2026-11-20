import { Schema, model, id, opts } from "./helpers.js";

const reviewSchema = new Schema(
  {
    bookingId: { ...id("Booking"), required: true },
    fromUserId: { ...id("User"), required: true },
    toUserId: { ...id("User"), required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String,
    reply: { text: String, at: Date },
    hidden: { type: Boolean, default: false }, // set by an admin after a report
  },
  opts,
);
reviewSchema.index({ bookingId: 1, fromUserId: 1 }, { unique: true });
export const Review = model("Review", reviewSchema);
