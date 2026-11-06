import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { CaretakerProfile, User } from "../models/index.js";
import { isProd } from "../config/env.js";
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
  if (!autoVerify) console.log(`[email] verify link for ${email}: /verify-email?token=${token}`);
  return { user, devVerifyToken: isProd || autoVerify ? undefined : token };
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
  console.log(`[email] reset link for ${email}: /reset-password?token=${token}`);
  return isProd ? undefined : token;
}

export async function resetPassword(token, password) {
  const user = await User.findOne({ resetToken: sha(token), resetExpires: { $gt: new Date() } }).select("+resetToken");
  if (!user) throw badRequest("Reset link is invalid or expired");
  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetToken = undefined;
  user.resetExpires = undefined;
  await user.save();
}

export async function addRole(user, role) {
  if (!user.roles.includes(role)) {
    user.roles.push(role);
    await user.save();
  }
  if (role === "caretaker") await ensureCaretakerProfile(user);
  return user;
}
