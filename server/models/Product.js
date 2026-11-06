import { Schema, model, id, opts } from "./helpers.js";

export const Product = model(
  "Product",
  new Schema(
    {
      sellerId: id("User"),
      name: { type: String, required: true },
      category: String,
      price: { type: Number, required: true },
      stock: { type: Number, default: 0 },
      images: [String],
      description: String,
      isActive: { type: Boolean, default: true },
    },
    opts,
  ),
);
