import Razorpay from "razorpay";
import { env, isProd } from "./env.js";

/** Mock mode (development, no keys) lets the whole payment flow run without a Razorpay account. */
export const isMock = !env.razorpay.keyId && !isProd;
export const MOCK_SECRET = "mock-secret";
if (isProd && (!env.razorpay.keyId || !env.razorpay.keySecret || !env.razorpay.webhookSecret)) {
  throw new Error("Production needs RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET");
}
if (!isMock && !isProd && !env.razorpay.keySecret) throw new Error("RAZORPAY_KEY_SECRET is missing while RAZORPAY_KEY_ID is set");
/** Test keys start with rzp_test_, live keys with rzp_live_. */
export const razorpayMode = isMock ? "mock" : env.razorpay.keyId.startsWith("rzp_live_") ? "live" : "test";
export const razorpay = isMock ? null : new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
