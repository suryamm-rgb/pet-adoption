import { Schema, model, id, opts } from "./helpers.js";

const paymentSchema = new Schema(
  {
    bookingId: id("Booking"),
    orderId: id("Order"),
    listingId: id("Listing"),
    type: { type: String, enum: ["booking", "shop", "adoption", "sale"], default: "booking" },
    razorpayOrderId: { type: String, index: { unique: true, sparse: true } },
    razorpayPaymentId: { type: String, index: { unique: true, sparse: true } },
    razorpaySignature: String,
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "captured", "failed", "refunded", "partially_refunded"], default: "created" },
    refunds: [{ id: String, amount: Number, at: { type: Date, default: Date.now } }],
    payout: { status: String, transferId: String, amount: Number, at: Date },
  },
  opts,
);
export const Payment = model("Payment", paymentSchema);
