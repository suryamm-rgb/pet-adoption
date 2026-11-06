import Razorpay from "razorpay";
import { env, isProd } from "./env.js";

/** Mock mode (development, no keys) lets the whole payment flow run without a Razorpay account. */
export const isMock = !env.razorpay.keyId && !isProd;
export const MOCK_SECRET = "mock-secret";
export const razorpay = isMock ? null : new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
