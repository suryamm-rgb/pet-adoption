import { Schema, model, id, opts } from "./helpers.js";

export const AdoptionRequest = model(
  "AdoptionRequest",
  new Schema(
    {
      listingId: { ...id("Listing"), required: true },
      adopterId: { ...id("User"), required: true },
      message: String,
      status: { type: String, enum: ["pending", "approved", "rejected", "completed"], default: "pending" },
    },
    opts,
  ),
);
