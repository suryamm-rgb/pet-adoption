import { Payment } from "../models/index.js";
import { refundBookingPayment, getBookingFor } from "../services/bookingService.js";
import * as pay from "../services/paymentService.js";
import { isMock, signPayment, verifyWebhookSignature } from "../services/razorpayService.js";
import { Booking } from "../models/index.js";
import { badRequest, notFound } from "../utils/http.js";

export const order = async (req, res) => res.status(201).json(await pay.createBookingOrder(req.user, req.body.bookingId));
export const verify = async (req, res) => res.json(await pay.verifyCheckout(req.user, req.body));
export const shopOrder = async (req, res) => res.status(201).json(await pay.createShopOrderPayment(req.user, req.params.id));
export const saleOrder = async (req, res) => res.status(201).json(await pay.createSalePayment(req.user, req.params.id));

export async function mine(req, res) {
  const ids = await Booking.find({ $or: [{ ownerId: req.user._id }, { caretakerId: req.user._id }] }).distinct("_id");
  res.json(await Payment.find({ bookingId: { $in: ids } }).sort({ createdAt: -1 }));
}

export async function webhook(req, res) {
  const raw = req.body.toString("utf8");
  if (!verifyWebhookSignature(raw, req.get("x-razorpay-signature"))) return res.status(400).json({ error: "Bad signature" });
  await pay.handleWebhook(JSON.parse(raw));
  res.json({ ok: true });
}

export async function refund(req, res) {
  const payment = await Payment.findById(req.params.id);
  if (!payment?.bookingId) throw notFound("Booking payment not found");
  const amount = Number(req.body.amount);
  if (!Number.isInteger(amount) || amount <= 0) throw badRequest("amount (paise) required");
  const booking = await getBookingFor(req.user, payment.bookingId);
  res.json({ refunded: await refundBookingPayment(booking, amount) });
}

/** Development only: stands in for the Razorpay checkout popup when no keys are configured. */
export async function mockComplete(req, res) {
  if (!isMock) throw notFound();
  const orderId = req.body.razorpayOrderId;
  const paymentId = "pay_mock_" + Date.now();
  res.json(await pay.verifyCheckout(req.user, { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signPayment(orderId, paymentId) }));
}
