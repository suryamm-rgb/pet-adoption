import { Schema, model, id, opts } from "./helpers.js";

export const Order = model(
  "Order",
  new Schema(
    {
      userId: { ...id("User"), required: true },
      items: [{ productId: id("Product"), name: String, qty: Number, price: Number }],
      total: Number,
      address: String,
      status: { type: String, enum: ["PENDING_PAYMENT", "PLACED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"], default: "PENDING_PAYMENT" },
      paymentId: id("Payment"),
    },
    opts,
  ),
);
