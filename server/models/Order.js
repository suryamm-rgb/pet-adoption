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
      statusHistory: [{ status: String, at: { type: Date, default: Date.now }, _id: false }], // powers the tracking timeline
      shipment: { courier: String, trackingNumber: String, shippedAt: Date },
      cancelledAt: Date,
      cancelReason: String,
      refundAmount: { type: Number, default: 0 },
    },
    opts,
  ),
);
