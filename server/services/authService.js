import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Booking, CaretakerProfile, Listing, User } from "../models/index.js";
import { isProd } from "../config/env.js";
import { resetPasswordMail, sendMail, verifyEmailMail, welcomeMail } from "./mailService.js";
import { badRequest, conflict, unauthorized } from "../utils/http.js";

const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
const autoVerify = !isProd && process.env.AUTO_VERIFY_EMAIL !== "false";

export const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  city: u.city,
  roles: u.roles,
  emailVerified: u.emailVerified,
  phoneVerified: u.phoneVerified,
  notifyPrefs: { email: true, push: true, whatsapp: false, ...(u.notifyPrefs?.toObject?.() ?? u.notifyPrefs) },
});

async function ensureCaretakerProfile(user) {
  await CaretakerProfile.updateOne({ userId: user._id }, { $setOnInsert: { userId: user._id, city: user.city } }, { upsert: true });
}

export async function register({ name, email, phone, password, role, city }) {
  if (await User.exists({ email })) throw conflict("Email already registered");
  const token = crypto.randomBytes(24).toString("hex");
  // Bootstrap: the very first account on an empty database becomes the admin.
  const isFirstUser = (await User.estimatedDocumentCount()) === 0;
  const roles = role === "caretaker" ? ["owner", "caretaker"] : ["owner"];
  if (isFirstUser) roles.push("admin");
  const user = await User.create({
    name,
    email,
    phone,
    city,
    roles,
    passwordHash: await bcrypt.hash(password, 12),
    emailVerified: autoVerify,
    emailVerifyToken: sha(token),
  });
  if (role === "caretaker") await ensureCaretakerProfile(user);
  if (autoVerify) welcomeMail(user);
  else verifyEmailMail(user, token);
  return { user, devVerifyToken: isProd || autoVerify ? undefined : token };
}

export async function resendVerification(user) {
  if (user.emailVerified) throw badRequest("Email is already verified");
  const token = crypto.randomBytes(24).toString("hex");
  await User.updateOne({ _id: user._id }, { emailVerifyToken: sha(token) });
  verifyEmailMail(user, token);
  return isProd ? undefined : token;
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select("+passwordHash");
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw unauthorized("Wrong email or password");
  if (user.isBlocked) throw unauthorized("This account is blocked");
  return user;
}

export async function verifyEmail(token) {
  const user = await User.findOneAndUpdate({ emailVerifyToken: sha(token) }, { emailVerified: true, $unset: { emailVerifyToken: 1 } }, { returnDocument: "after" });
  if (!user) throw badRequest("Invalid or used verification link");
  return user;
}

export async function forgotPassword(email) {
  const user = await User.findOne({ email });
  if (!user) return undefined; // do not reveal whether the email exists
  const token = crypto.randomBytes(24).toString("hex");
  user.resetToken = sha(token);
  user.resetExpires = new Date(Date.now() + 3_600_000);
  await user.save();
  resetPasswordMail(user, token);
  return isProd ? undefined : token;
}

export async function resetPassword(token, password) {
  const user = await User.findOne({ resetToken: sha(token), resetExpires: { $gt: new Date() } }).select("+resetToken");
  if (!user) throw badRequest("Reset link is invalid or expired");
  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetToken = undefined;
  user.resetExpires = undefined;
  await user.save();
  sendMail({ to: user.email, subject: "Your PawStay password was changed", intro: `Hi ${user.name}, your password was just changed. If this was not you, reset it immediately or contact support.` });
}

export async function updateProfile(user, { name, phone, city }) {
  if (name !== undefined) user.name = name;
  if (phone !== undefined) {
    const next = phone || undefined;
    if (next !== user.phone) {
      user.phoneVerified = false; // a new number has to be verified again
      user.notifyPrefs = { ...(user.notifyPrefs?.toObject?.() ?? user.notifyPrefs), whatsapp: false };
    }
    user.phone = next;
  }
  if (city !== undefined) user.city = city || undefined;
  await user.save();
  return user;
}

export async function changePassword(user, { currentPassword, newPassword }) {
  const full = await User.findById(user._id).select("+passwordHash");
  if (!(await bcrypt.compare(currentPassword, full.passwordHash))) throw unauthorized("Current password is wrong");
  if (currentPassword === newPassword) throw badRequest("Choose a different password");
  full.passwordHash = await bcrypt.hash(newPassword, 12);
  full.tokenVersion = (full.tokenVersion ?? 0) + 1; // signs out every other device
  await full.save();
  sendMail({ to: full.email, subject: "Your PawStay password was changed", intro: `Hi ${full.name}, your password was just changed. If this was not you, reset it immediately or contact support.` });
  return full;
}

export async function setPreferences(user, prefs) {
  if (prefs.whatsapp && !user.phoneVerified) throw badRequest("Verify your phone number before turning on WhatsApp alerts");
  const current = user.notifyPrefs?.toObject?.() ?? user.notifyPrefs ?? {};
  user.notifyPrefs = { ...current, ...prefs };
  await user.save();
  return user;
}

export async function logoutEverywhere(user) {
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
}

const OPEN = ["REQUESTED", "ACCEPTED", "PAID", "IN_CARE", "DISPUTED"];
/** Anonymises the account (bookings and payments must stay for accounting) after checking nothing is in flight. */
export async function deleteAccount(user, { password }) {
  const full = await User.findById(user._id).select("+passwordHash");
  if (!(await bcrypt.compare(password, full.passwordHash))) throw unauthorized("Password is wrong");
  if (await Booking.exists({ $or: [{ ownerId: user._id }, { caretakerId: user._id }], status: { $in: OPEN } })) {
    throw conflict("Finish or cancel your active bookings before deleting your account");
  }
  if (full.roles.includes("admin") && (await User.countDocuments({ roles: "admin", deletedAt: { $exists: false } })) <= 1) {
    throw conflict("You are the only admin. Make someone else admin first");
  }
  await Listing.updateMany({ sellerId: user._id, status: { $in: ["pending", "approved"] } }, { status: "closed" });
  await CaretakerProfile.updateOne({ userId: user._id }, { verificationStatus: "draft", bio: "", photos: [], bankDetails: undefined });
  Object.assign(full, {
    name: "Deleted user",
    email: `deleted-${full._id}@deleted.invalid`,
    phone: undefined,
    city: undefined,
    isBlocked: true,
    deletedAt: new Date(),
    tokenVersion: (full.tokenVersion ?? 0) + 1,
    passwordHash: await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 12),
  });
  await full.save();
}

export async function addRole(user, role) {
  if (!user.roles.includes(role)) {
    user.roles.push(role);
    await user.save();
  }
  if (role === "caretaker") await ensureCaretakerProfile(user);
  return user;
}
