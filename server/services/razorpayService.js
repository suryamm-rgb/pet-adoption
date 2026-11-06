import crypto from "node:crypto";
import { env } from "../config/env.js";
import { MOCK_SECRET, isMock, razorpay } from "../config/razorpay.js";

const secret = () => (isMock ? MOCK_SECRET : env.razorpay.keySecret);
const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest("hex");
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export async function createOrder({ amount, receipt }) {
  if (isMock) return { id: "order_mock_" + crypto.randomBytes(6).toString("hex"), amount, currency: "INR" };
  return razorpay.orders.create({ amount, currency: "INR", receipt: String(receipt) });
}

export const signPayment = (orderId, paymentId) => hmac(secret(), `${orderId}|${paymentId}`);

export const verifyPaymentSignature = (orderId, paymentId, signature) =>
  safeEqual(signPayment(orderId, paymentId), signature ?? "");

export function verifyWebhookSignature(rawBody, signature) {
  const key = isMock ? MOCK_SECRET : env.razorpay.webhookSecret;
  return Boolean(key) && safeEqual(hmac(key, rawBody), signature ?? "");
}

export const signWebhook = (rawBody) => hmac(MOCK_SECRET, rawBody);

export async function refundPayment(paymentId, amount) {
  if (isMock) return { id: "rfnd_mock_" + crypto.randomBytes(5).toString("hex"), amount };
  return razorpay.payments.refund(paymentId, { amount });
}

export const publicKeyId = () => (isMock ? "rzp_mock" : env.razorpay.keyId);
export { isMock };
