import { Schema, model, id, opts } from "./helpers.js";

/** A user flagging a review, listing, product, message or user for admin moderation. */
export const Report = model(
  "Report",
  new Schema(
    {
      reporterId: { ...id("User"), required: true },
      targetType: { type: String, enum: ["review", "listing", "product", "message", "user"], required: true },
      targetId: { type: String, required: true },
      reason: { type: String, enum: ["spam", "abuse", "fraud", "inappropriate", "other"], required: true },
      details: String,
      status: { type: String, enum: ["open", "actioned", "dismissed"], default: "open" },
      resolvedBy: id("User"),
      resolution: String,
    },
    opts,
  ),
);
