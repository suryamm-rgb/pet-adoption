import { env } from "../config/env.js";
import { Booking, CaretakerProfile, Listing, Order, Payment, Product, getSettings } from "../models/index.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/http.js";
import { refundBookingPayment } from "./bookingService.js";
import { notify } from "./notify.js";
import { createLinkedAccount, createOrder, createTransfer, publicKeyId, verifyPaymentSignature } from "./razorpayService.js";

async function openPayment({ amount, receipt, type, ref }) {
  const existing = await Payment.findOne({ ...ref, status: "created" });
  if (existing) return existing;
  const order = await createOrder({ amount, receipt, notes: { type, ref: String(receipt) } });
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
      order.statusHistory.push({ status: "PLACED" });
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
    case "account.activated":
    case "account.instantly_activated":
    case "account.needs_clarification":
    case "account.rejected": {
      const acc = event.payload?.account?.entity;
      const status = event.event === "account.needs_clarification" ? "needs_clarification" : event.event === "account.rejected" ? "rejected" : "activated";
      if (acc?.id) await CaretakerProfile.updateOne({ razorpayLinkedAccountId: acc.id }, { payoutAccountStatus: status, payoutAccountNote: acc.notes?.reason ?? undefined });
      break;
    }
    default:
  }
}

/**
 * Pays the caretaker for a completed stay.
 * PAYOUT_MODE=manual: the admin transfers by bank and this records it.
 * PAYOUT_MODE=route: Razorpay moves the money to the caretaker's linked account. Pass { manual: true } to pay by bank anyway.
 * `admin` is null when the hourly job triggers it.
 */
export async function payoutBooking(admin, bookingId, { force = false, manual = false } = {}) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound("Booking not found");
  if (booking.status !== "COMPLETED" || booking.payoutStatus !== "pending") throw conflict("Booking has no pending payout");
  const settings = await getSettings();
  const releaseAt = booking.completedAt.getTime() + settings.disputeWindowHours * 3_600_000;
  if (!force && Date.now() < releaseAt) throw conflict("Dispute window still open");

  const useRoute = env.payoutMode === "route" && !manual;
  const profile = useRoute ? await CaretakerProfile.findOne({ userId: booking.caretakerId }) : null;
  if (useRoute && profile?.payoutAccountStatus !== "activated") {
    throw conflict("The caretaker has not finished payout setup. Ask them to complete it, or pay manually");
  }
  const payment = await Payment.findOne({ bookingId, status: { $in: ["captured", "partially_refunded"] } });
  if (useRoute && !payment?.razorpayPaymentId) throw conflict("No captured payment to pay out from");

  const claimed = await Booking.findOneAndUpdate({ _id: bookingId, payoutStatus: "pending" }, { payoutStatus: "paid" }, { returnDocument: "after" });
  if (!claimed) throw conflict("Payout already processed");

  let transferId = "manual_" + Date.now();
  if (useRoute) {
    try {
      const t = await createTransfer({ paymentId: payment.razorpayPaymentId, accountId: profile.razorpayLinkedAccountId, amount: booking.caretakerGets, notes: { bookingId: String(bookingId) } });
      transferId = t.id;
    } catch (err) {
      await Booking.updateOne({ _id: bookingId }, { payoutStatus: "pending" }); // nothing moved: allow a retry
      throw conflict(`Razorpay could not transfer the payout: ${err.error?.description ?? err.message}`);
    }
  }
  await Payment.updateOne({ bookingId, status: { $in: ["captured", "partially_refunded"] } }, { payout: { status: "paid", transferId, amount: booking.caretakerGets, at: new Date() } });
  await notify(booking.caretakerId, { type: "payout_released", title: "Payout released", body: `Rs ${(booking.caretakerGets / 100).toFixed(0)} is on its way${useRoute ? " to your bank account" : ""}`, link: "/caretaker/earnings" });
  return claimed;
}

/** Caretaker onboarding for automatic payouts (Razorpay Route). The PAN is passed to Razorpay and never stored here. */
export async function setupPayoutAccount(user, { pan, address }) {
  const profile = await CaretakerProfile.findOne({ userId: user._id });
  if (!profile) throw forbidden("You are not a caretaker");
  const bank = profile.bankDetails;
  if (!bank?.accountNumber || !bank?.ifsc || !bank?.accountName) throw badRequest("Save your bank account details first");
  if (!user.phone) throw badRequest("Add your phone number in Account settings first");
  if (profile.payoutAccountStatus === "activated") throw conflict("Your payout account is already active");
  try {
    const acc = await createLinkedAccount({ userId: user._id, name: user.name, email: user.email, phone: user.phone, pan, address, bank });
    profile.razorpayLinkedAccountId = acc.id;
    profile.payoutAccountStatus = acc.status;
    profile.payoutAccountNote = undefined;
    await profile.save();
    return profile;
  } catch (err) {
    throw badRequest(`Razorpay could not create the payout account: ${err.error?.description ?? err.message}`);
  }
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
