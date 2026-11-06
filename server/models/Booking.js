import { Schema, model, id, opts } from "./helpers.js";

export const BOOKING_STATUSES = [
  "REQUESTED", "ACCEPTED", "PAID", "IN_CARE", "COMPLETED",
  "REJECTED", "EXPIRED", "CANCELLED", "DISPUTED", "REFUNDED",
];

const bookingSchema = new Schema(
  {
    ownerId: { ...id("User"), required: true },
    caretakerId: { ...id("User"), required: true },
    petId: { ...id("Pet"), required: true },
    petSnapshot: Schema.Types.Mixed,
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: Number,
    pricePerDay: Number,
    careAmount: Number,
    platformFee: Number,
    ownerPays: Number,
    caretakerGets: Number,
    status: { type: String, enum: BOOKING_STATUSES, default: "REQUESTED" },
    cancelledBy: String,
    cancelReason: String,
    refundAmount: { type: Number, default: 0 },
    acceptedAt: Date,
    completedAt: Date,
    payoutStatus: { type: String, enum: ["none", "pending", "paid"], default: "none" },
    instructions: [{ text: String, at: { type: Date, default: Date.now }, acknowledged: { type: Boolean, default: false } }],
  },
  opts,
);
bookingSchema.index({ caretakerId: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ ownerId: 1, status: 1 });
export const Booking = model("Booking", bookingSchema);
