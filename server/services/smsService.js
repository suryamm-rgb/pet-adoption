import { env, isProd } from "../config/env.js";
import { toE164 } from "../utils/phone.js";

const isTest = env.nodeEnv === "test";
const { accountSid, authToken, smsFrom, whatsappFrom } = env.twilio;

export const smsEnabled = Boolean(accountSid && authToken && smsFrom);
export const whatsappEnabled = Boolean(accountSid && authToken && whatsappFrom);
/** Test mode collects messages here instead of calling Twilio. */
export const smsOutbox = [];

async function twilio(to, from, body) {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Never throws. Returns true when handed to the provider (or collected in test mode / logged in development). */
export async function sendSms(phone, body) {
  const to = toE164(phone);
  if (!to) return false;
  if (isTest) { smsOutbox.push({ channel: "sms", to, body }); return true; }
  if (!smsEnabled) {
    if (isProd) console.warn("[sms] not configured: message dropped");
    else console.log(`[sms:dev] to=${to} ${body}`);
    return !isProd;
  }
  try { await twilio(to, smsFrom, body); return true; } catch (err) { console.error(`[sms] failed: ${err.message}`); return false; }
}

export async function sendWhatsApp(phone, body) {
  const to = toE164(phone);
  if (!to) return false;
  if (isTest) { smsOutbox.push({ channel: "whatsapp", to, body }); return true; }
  if (!whatsappEnabled) return false; // WhatsApp is optional: silently skip when not configured
  try { await twilio(`whatsapp:${to}`, `whatsapp:${whatsappFrom}`, body); return true; } catch (err) { console.error(`[whatsapp] failed: ${err.message}`); return false; }
}
