import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { CaretakerProfile, User } from "../models/index.js";
import { badRequest, unauthorized } from "../utils/http.js";

export const googleEnabled = Boolean(env.googleClientId);

/** Verifies a Google ID token and returns its claims. Swappable so tests never call Google. */
let verifier = async (credential) => {
  const ticket = await new OAuth2Client(env.googleClientId).verifyIdToken({ idToken: credential, audience: env.googleClientId });
  return ticket.getPayload();
};
export const setGoogleVerifier = (fn) => { verifier = fn; };

/** Signs in (or signs up) with a Google "credential" from Google Identity Services. */
export async function loginWithGoogle({ credential, role = "owner" }) {
  if (!googleEnabled && process.env.NODE_ENV !== "test") throw badRequest("Google sign-in is not set up");
  let claims;
  try {
    claims = await verifier(credential);
  } catch {
    throw unauthorized("Google sign-in failed. Please try again");
  }
  if (!claims?.sub || !claims.email || claims.email_verified !== true) throw unauthorized("Your Google email is not verified");

  const email = claims.email.toLowerCase();
  let user = await User.findOne({ $or: [{ googleId: claims.sub }, { email }] });
  let created = false;
  if (user) {
    if (user.isBlocked || user.deletedAt) throw unauthorized("This account is blocked");
    if (!user.googleId || !user.emailVerified) {
      user.googleId = claims.sub;
      user.emailVerified = true; // Google already verified this address
      await user.save();
    }
  } else {
    const isFirstUser = (await User.estimatedDocumentCount()) === 0;
    const roles = role === "caretaker" ? ["owner", "caretaker"] : ["owner"];
    if (isFirstUser) roles.push("admin");
    user = await User.create({
      name: claims.name || email.split("@")[0],
      email,
      roles,
      googleId: claims.sub,
      emailVerified: true,
      passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12), // unusable until they use "forgot password"
    });
    if (role === "caretaker") await CaretakerProfile.updateOne({ userId: user._id }, { $setOnInsert: { userId: user._id } }, { upsert: true });
    created = true;
  }
  return { user, created };
}
