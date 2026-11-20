import crypto from "node:crypto";
import { User } from "../models/index.js";
import { badRequest, conflict } from "../utils/http.js";
import { toE164 } from "../utils/phone.js";
import { env, isProd } from "../config/env.js";
import { sendSms, smsEnabled } from "./smsService.js";

const TTL_MS = 10 * 60_000;
const COOLDOWN_MS = 60_000;
const MAX_ATTEMPTS = 5;
const hash = (userId, code) => crypto.createHash("sha256").update(`${userId}:${code}:${env.jwtSecret}`).digest("hex");

export async function sendOtp(user) {
  if (user.phoneVerified) throw badRequest("Your phone is already verified");
  const phone = toE164(user.phone);
  if (!phone) throw badRequest("Add a valid phone number in your account first");
  const full = await User.findById(user._id).select("+phoneOtpSentAt");
  if (full.phoneOtpSentAt && Date.now() - full.phoneOtpSentAt.getTime() < COOLDOWN_MS) {
    throw conflict("Please wait a minute before asking for another code");
  }
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await User.updateOne({ _id: user._id }, { phoneOtpHash: hash(user._id, code), phoneOtpExpires: new Date(Date.now() + TTL_MS), phoneOtpAttempts: 0, phoneOtpSentAt: new Date() });
  const sent = await sendSms(phone, `Your PawStay verification code is ${code}. It expires in 10 minutes. Do not share it.`);
  if (!sent) throw badRequest("Could not send the SMS. Try again later");
  // Without an SMS provider (development only) the code is returned so the flow can still be tested.
  return { sentTo: phone.replace(/\d(?=\d{3})/g, "•"), devCode: !isProd && !smsEnabled ? code : undefined };
}

export async function verifyOtp(user, code) {
  const full = await User.findById(user._id).select("+phoneOtpHash +phoneOtpExpires +phoneOtpAttempts");
  if (!full.phoneOtpHash || !full.phoneOtpExpires || full.phoneOtpExpires < new Date()) throw badRequest("The code has expired. Ask for a new one");
  if (full.phoneOtpAttempts >= MAX_ATTEMPTS) throw conflict("Too many wrong attempts. Ask for a new code");
  const a = Buffer.from(hash(user._id, code));
  const b = Buffer.from(full.phoneOtpHash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    await User.updateOne({ _id: user._id }, { $inc: { phoneOtpAttempts: 1 } });
    throw badRequest("That code is not right");
  }
  await User.updateOne({ _id: user._id }, { phoneVerified: true, $unset: { phoneOtpHash: 1, phoneOtpExpires: 1, phoneOtpSentAt: 1 }, phoneOtpAttempts: 0 });
  return true;
}
