import { Schema, model, id, opts } from "./helpers.js";

const caretakerProfileSchema = new Schema(
  {
    userId: { ...id("User"), unique: true, required: true },
    bio: String,
    city: String,
    pricePerDay: { type: Number, default: 0 },
    maxPets: { type: Number, default: 1 },
    acceptedPetTypes: [String],
    homeType: String,
    hasGarden: Boolean,
    experienceYears: Number,
    photos: [String],
    idProofUrl: String,
    addressProofUrl: String,
    address: String,
    verificationStatus: { type: String, enum: ["draft", "pending", "approved", "rejected"], default: "draft" },
    rejectionReason: String,
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    bankDetails: { accountName: String, accountNumber: String, ifsc: String },
    razorpayLinkedAccountId: String,
  },
  opts,
);
export const CaretakerProfile = model("CaretakerProfile", caretakerProfileSchema);
