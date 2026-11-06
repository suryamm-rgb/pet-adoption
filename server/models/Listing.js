import { Schema, model, id, opts } from "./helpers.js";

export const Listing = model(
  "Listing",
  new Schema(
    {
      sellerId: { ...id("User"), required: true },
      buyerId: id("User"),
      petId: id("Pet"),
      title: String,
      petType: String,
      mode: { type: String, enum: ["adopt", "sell"], required: true },
      price: { type: Number, default: 0 },
      description: String,
      documents: [String],
      photos: [String],
      city: String,
      status: { type: String, enum: ["pending", "approved", "rejected", "reserved", "closed"], default: "pending" },
    },
    opts,
  ),
);
