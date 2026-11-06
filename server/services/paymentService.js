import { Booking, Listing, Order, Payment, Product, getSettings } from "../models/index.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/http.js";
import { refundBookingPayment } from "./bookingService.js";
import { notify } from "./notify.js";
import { createOrder, publicKeyId, verifyPaymentSignature } from "./razorpayService.js";

async function openPayment({ amount, receipt, type, ref }) {
  const existing = await Payment.findOne({ ...ref, status: "created" });
  if (existing) return existing;
  const order = await createOrder({ amount, receipt });
  return Payment.create({ ...ref, type, amount, razorpayOrderId: order.id });
}

const checkoutPayload = (payment) => ({
  paymentId: payment._id,
  razorpayOrderId: payment.razorpayOrderId,
  amount: payment.amount,
  currency: payment.currency,
  keyId: publicKeyId(),
});

export async function createBookingOrder(owner, bookingId) {
  const booking = await Booking.findOne({ _id: bookingId, ownerId: owner._id });
  if (!booking) throw notFound("Booking not found");
  if (booking.status !== "ACCEPTED") throw conflict("Only an accepted booking can be paid");
  const payment = await openPayment({ amount: booking.ownerPays, receipt: booking._id, type: "booking", ref: { bookingId: booking._id } });
  return checkoutPayload(payment);
}

export async function createShopOrderPayment(user, orderId) {
  const order = await Order.findOne({ _id: orderId, userId: user._id });
  if (!order) throw notFound("Order not found");
  if (order.status !== "PENDING_PAYMENT") throw conflict("Order already paid or cancelled");
  const payment = await openPayment({ amount: order.total, receipt: order._id, type: "shop", ref: { orderId: order._id } });
  order.paymentId = payment._id;
  await order.save();
  return checkoutPayload(payment);
}

/** Idempotent: safe to call from both the browser verify call and the webhook. */
export async function markCaptured(payment, razorpayPaymentId, razorpaySignature) {
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: ["created", "failed"] } },
    { status: "captured", razorpayPaymentId, ...(razorpaySignature ? { razorpaySignature } : {}) },
    { returnDocument: "after" },
  );
  if (!claimed) return Payment.findById(payment._id); // already processed

  if (claimed.type === "booking") {
    const booking = await Booking.findOneAndUpdate({ _id: claimed.bookingId, status: "ACCEPTED" }, { status: "PAID" }, { returnDocument: "after" });
    if (booking) {
      await Promise.all([
        notify(booking.ownerId, { type: "payment_success", title: "Payment received", body: "Your booking is confirmed", link: `/owner/bookings/${booking._id}` }),
        notify(booking.caretakerId, { type: "payment_success", title: "Booking paid", body: "The owner has paid for the stay", link: `/caretaker/stays/${booking._id}` }),
      ]);
    } else {
      // Booking was cancelled/expired while the owner was paying: give the money back.
      const stale = await Booking.findById(claimed.bookingId);
      if (stale) await refundBookingPayment(stale, claimed.amount);
    }
  } else if (claimed.type === "shop") {
    const order = await Order.findById(claimed.orderId);
    if (order && order.status === "PENDING_PAYMENT") {
      order.status = "PLACED";
      await order.save();
      await Promise.all(order.items.map((i) => Product.updateOne({ _id: i.productId }, { $inc: { stock: -i.qty } })));
      await notify(order.userId, { type: "order_placed", title: "Order placed", body: `Order total paid`, link: "/shop/orders" });
    }
  } else if (claimed.type === "sale") {
    await Listing.updateOne({ _id: claimed.listingId, status: "approved" }, { status: "reserved" });
  }
  return claimed;
}

export async function verifyCheckout(user, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  if (!payment) throw notFound("Payment not found");
  await assertPayer(user, payment);
  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) throw badRequest("Invalid payment signature");
  return markCaptured(payment, razorpay_payment_id, razorpay_signature);
}

async function assertPayer(user, payment) {
  if (payment.bookingId) {
    const b = await Booking.findById(payment.bookingId);
    if (!b || !b.ownerId.equals(user._id)) throw forbidden();
  } else if (payment.orderId) {
    const o = await Order.findById(payment.orderId);
    if (!o || !o.userId.equals(user._id)) throw forbidden();
  }
}

/** Razorpay webhook: the source of truth. */
export async function handleWebhook(event) {
  const entity = event.payload?.payment?.entity;
  switch (event.event) {
    case "payment.captured": {
      const payment = await Payment.findOne({ razorpayOrderId: entity.order_id });
      if (payment) await markCaptured(payment, entity.id);
      break;
    }
    case "payment.failed": {
      await Payment.updateOne({ razorpayOrderId: entity.order_id, status: "created" }, { status: "failed" });
      break;
    }
    case "refund.processed": {
      const refund = event.payload?.refund?.entity;
      const payment = await Payment.findOne({ razorpayPaymentId: refund?.payment_id });
      if (payment && !payment.refunds.some((r) => r.id === refund.id)) {
        payment.refunds.push({ id: refund.id, amount: refund.amount });
        const total = payment.refunds.reduce((s, r) => s + r.amount, 0);
        payment.status = total >= payment.amount ? "refunded" : "partially_refunded";
        await payment.save();
      }
      break;
    }
    default:
  }
}

/** Admin-triggered payout (manual bank transfer in v1). */
export async function payoutBooking(admin, bookingId, { force = false } = {}) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound("Booking not found");
  if (booking.status !== "COMPLETED" || booking.payoutStatus !== "pending") throw conflict("Booking has no pending payout");
  const settings = await getSettings();
  const releaseAt = booking.completedAt.getTime() + settings.disputeWindowHours * 3_600_000;
  if (!force && Date.now() < releaseAt) throw conflict("Dispute window still open");
  const claimed = await Booking.findOneAndUpdate({ _id: bookingId, payoutStatus: "pending" }, { payoutStatus: "paid" }, { returnDocument: "after" });
  if (!claimed) throw conflict("Payout already processed");
  await Payment.updateOne(
    { bookingId, status: { $in: ["captured", "partially_refunded"] } },
    { payout: { status: "paid", transferId: "manual_" + Date.now(), amount: booking.caretakerGets, at: new Date() } },
  );
  await notify(booking.caretakerId, { type: "payout_released", title: "Payout released", body: `Rs ${(booking.caretakerGets / 100).toFixed(0)} is on its way`, link: "/caretaker/earnings" });
  return claimed;
}

export async function createSalePayment(buyer, listingId) {
  const listing = await Listing.findOne({ _id: listingId, mode: "sell", status: "approved" });
  if (!listing) throw notFound("Listing not available");
  if (listing.sellerId.equals(buyer._id)) throw badRequest("You cannot buy your own listing");
  listing.buyerId = buyer._id;
  await listing.save();
  const payment = await openPayment({ amount: listing.price, receipt: listing._id, type: "sale", ref: { listingId: listing._id } });
  return checkoutPayload(payment);
}
