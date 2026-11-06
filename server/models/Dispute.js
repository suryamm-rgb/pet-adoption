import { Schema, model, id, opts } from "./helpers.js";

export const Dispute = model(
  "Dispute",
  new Schema(
    {
      bookingId: { ...id("Booking"), required: true },
      raisedBy: id("User"),
      reason: String,
      evidence: [String],
      status: { type: String, enum: ["open", "resolved"], default: "open" },
      adminDecision: String,
      amountToOwner: Number,
      amountToCaretaker: Number,
      resolvedBy: id("User"),
    },
    opts,
  ),
);
