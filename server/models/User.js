import { Schema, model, id, opts } from "./helpers.js";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    roles: { type: [String], enum: ["owner", "caretaker", "seller", "admin"], default: ["owner"] },
    city: String,
    location: {
      type: { type: String, enum: ["Point"], default: undefined },
      coordinates: { type: [Number], default: undefined },
    },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    resetToken: { type: String, select: false },
    resetExpires: { type: Date, select: false },
    phoneVerified: { type: Boolean, default: false },
    phoneOtpHash: { type: String, select: false },
    phoneOtpExpires: { type: Date, select: false },
    phoneOtpAttempts: { type: Number, default: 0, select: false },
    phoneOtpSentAt: { type: Date, select: false },
    googleId: { type: String, index: true, sparse: true },
    notifyPrefs: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false }, // opt-in, and only for a verified phone
    },
    isBlocked: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 }, // bump to sign the user out of every device
    deletedAt: Date,
  },
  opts,
);
userSchema.index({ location: "2dsphere" }, { sparse: true });
export const User = model("User", userSchema);
