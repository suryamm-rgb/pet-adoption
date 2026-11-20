import "dotenv/config";

const required = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing env var ${name}`);
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5001),
  mongoUri: required("MONGO_URI", "mongodb://127.0.0.1:27017/pet-platform"),
  jwtSecret: required("JWT_SECRET", process.env.NODE_ENV === "production" ? undefined : "dev-secret"),
  /** Comma separated list when the site is served from several origins (www and apex). The first one is used in emails. */
  clientUrls: (process.env.CLIENT_URL ?? "http://localhost:3000").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean),
  clientUrl: (process.env.CLIENT_URL ?? "http://localhost:3000").split(",")[0].trim().replace(/\/$/, ""),
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.MAIL_FROM ?? "PawStay <no-reply@pawstay.local>",
  },
  /** Twilio sends both SMS (phone verification codes) and WhatsApp alerts. Leave empty to turn them off. */
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    smsFrom: process.env.TWILIO_SMS_FROM ?? "", // a Twilio number, E.164
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM ?? "", // e.g. +14155238886 (sandbox) or your approved sender
  },
  push: {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    subject: process.env.VAPID_SUBJECT ?? "mailto:support@pawstay.local",
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  requirePhoneVerification: process.env.REQUIRE_PHONE_VERIFICATION === "true",
  /** "manual": admin transfers by bank. "route": automatic Razorpay Route transfers to caretakers' linked accounts. */
  payoutMode: process.env.PAYOUT_MODE === "route" ? "route" : "manual",
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  },
};
export const isProd = env.nodeEnv === "production";
if (isProd && (env.jwtSecret.length < 32 || /change-me|dev-secret/.test(env.jwtSecret))) {
  throw new Error("JWT_SECRET must be a random string of at least 32 characters in production (try: openssl rand -hex 32)");
}
if (isProd && env.mongoUri.includes("127.0.0.1")) console.warn("[config] MONGO_URI points at localhost in production");
