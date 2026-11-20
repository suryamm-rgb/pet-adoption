import { Schema, model, id, opts } from "./helpers.js";

/** One browser (or phone) that allowed notifications for a user. A user can have several. */
export const PushSubscription = model(
  "PushSubscription",
  new Schema(
    {
      userId: { ...id("User"), required: true, index: true },
      endpoint: { type: String, required: true, unique: true },
      keys: { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
      userAgent: String,
    },
    opts,
  ),
);
