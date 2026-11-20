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

export async function createOrder({ amount, receipt, notes = {} }) {
  if (isMock) return { id: "order_mock_" + crypto.randomBytes(6).toString("hex"), amount, currency: "INR" };
  return razorpay.orders.create({ amount, currency: "INR", receipt: String(receipt), notes });
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

/**
 * Razorpay Route: a "linked account" is the caretaker's own account inside our Razorpay account, so money can be
 * transferred to their bank automatically. NOTE: the live calls below follow Razorpay's Route documentation but could not be
 * exercised without a Route-enabled account. Try them on test keys first. Mock mode (development) simulates everything.
 */
export async function createLinkedAccount({ userId, name, email, phone, pan, address, bank }) {
  if (isMock) return { id: "acc_mock_" + crypto.randomBytes(5).toString("hex"), status: "activated" };
  const account = await razorpay.accounts.create({
    email,
    phone: phone.replace(/^\+91/, ""),
    type: "route",
    reference_id: String(userId),
    legal_business_name: name,
    business_type: "individual",
    contact_name: name,
    profile: {
      category: process.env.RAZORPAY_ROUTE_CATEGORY ?? "services",
      subcategory: process.env.RAZORPAY_ROUTE_SUBCATEGORY ?? "professional_services",
      addresses: { registered: { street1: address.street, street2: address.street2 ?? "-", city: address.city, state: address.state, postal_code: address.postalCode, country: "IN" } },
    },
    legal_info: { pan },
  });
  await razorpay.stakeholders.create(account.id, { name, email, kyc: { pan } });
  const product = await razorpay.products.requestProductConfiguration(account.id, { product_name: "route", tnc_accepted: true });
  const configured = await razorpay.products.edit(account.id, product.id, {
    settlements: { account_number: bank.accountNumber, ifsc_code: bank.ifsc, beneficiary_name: bank.accountName },
    tnc_accepted: true,
  });
  return { id: account.id, status: configured.activation_status === "activated" ? "activated" : "created" };
}

/** Moves the caretaker's share from a captured payment to their linked account. */
export async function createTransfer({ paymentId, accountId, amount, notes = {} }) {
  if (isMock) return { id: "trf_mock_" + crypto.randomBytes(5).toString("hex"), amount };
  const res = await razorpay.payments.transfer(paymentId, { transfers: [{ account: accountId, amount, currency: "INR", notes }] });
  return { id: res.items?.[0]?.id ?? res.id, amount };
}
