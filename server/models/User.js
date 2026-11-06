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
    isBlocked: { type: Boolean, default: false },
  },
  opts,
);
userSchema.index({ location: "2dsphere" }, { sparse: true });
export const User = model("User", userSchema);
