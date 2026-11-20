import nodemailer from "nodemailer";
import { env, isProd } from "../config/env.js";

const isTest = env.nodeEnv === "test";
const smtpConfigured = Boolean(env.smtp.host);

/** Test mode collects mail here so tests can read links without a network. */
export const outbox = [];

const transport = smtpConfigured
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      pool: true,
    })
  : nodemailer.createTransport({ jsonTransport: true });

if (!smtpConfigured && isProd) console.warn("[mail] SMTP_HOST is not set: emails will NOT be delivered in production");

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const absUrl = (path = "/") => (path.startsWith("http") ? path : `${env.clientUrl}${path}`);

/** Shared branded layout. Inline styles only: email clients ignore stylesheets. */
export function layout({ title, intro, body = "", cta, footnote }) {
  const button = cta
    ? `<p style="margin:24px 0"><a href="${esc(cta.url)}" style="background:#c2570c;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;display:inline-block">${esc(cta.label)}</a></p>
       <p style="font-size:12px;color:#75675a;margin:0">Button not working? Paste this link into your browser:<br><a href="${esc(cta.url)}" style="color:#c2570c;word-break:break-all">${esc(cta.url)}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#faf5ed;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2d2118">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #ecdfcc;border-radius:12px">
<tr><td style="padding:20px 28px;border-bottom:1px solid #ecdfcc;font-size:18px;font-weight:700;color:#c2570c">🐾 PawStay</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:20px">${esc(title)}</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#4a3b2e">${esc(intro)}</p>
${body}${button}
${footnote ? `<p style="margin:24px 0 0;font-size:12px;color:#75675a">${esc(footnote)}</p>` : ""}
</td></tr></table>
<p style="font-size:12px;color:#a8998a;margin:16px 0 0">© ${new Date().getFullYear()} PawStay. You are receiving this because you have an account with us.</p>
</td></tr></table></body></html>`;
  const text = [title, "", intro, cta ? `\n${cta.label}: ${cta.url}` : "", footnote ? `\n${footnote}` : ""].join("\n");
  return { html, text };
}

/** Never throws: a mail outage must not break signup, payments or bookings. Returns true when handed to the transport. */
export async function sendMail({ to, subject, ...content }) {
  if (!to) return false;
  const { html, text } = content.html ? content : layout({ title: subject, ...content });
  if (isTest) {
    outbox.push({ to, subject, html, text });
    return true;
  }
  try {
    await transport.sendMail({ from: env.smtp.from, to, subject, html, text });
    if (!smtpConfigured) console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}`);
    return true;
  } catch (err) {
    console.error(`[mail] failed to send "${subject}" to ${to}: ${err.message}`);
    return false;
  }
}

export const verifyEmailMail = (user, token) =>
  sendMail({
    to: user.email,
    subject: "Verify your email for PawStay",
    intro: `Hi ${user.name}, welcome to PawStay. Please confirm your email address to start booking trusted caretakers.`,
    cta: { label: "Verify email", url: absUrl(`/verify-email?token=${token}`) },
    footnote: "If you did not create this account, you can ignore this email.",
  });

export const resetPasswordMail = (user, token) =>
  sendMail({
    to: user.email,
    subject: "Reset your PawStay password",
    intro: `Hi ${user.name}, we received a request to reset your password. This link works for 1 hour.`,
    cta: { label: "Choose a new password", url: absUrl(`/reset-password?token=${token}`) },
    footnote: "If you did not request this, your password is unchanged and you can ignore this email.",
  });

export const welcomeMail = (user) =>
  sendMail({
    to: user.email,
    subject: "Welcome to PawStay",
    intro: `Hi ${user.name}, your account is ready. Find verified caretakers, book a stay and get daily photo updates while you are away.`,
    cta: { label: "Get started", url: absUrl("/") },
  });
