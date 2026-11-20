import { Schema, model, id, opts } from "./helpers.js";

const settingSchema = new Schema({
  key: { type: String, default: "global", unique: true },
  platformFeePercent: { type: Number, default: 10 },
  caretakerCommissionPercent: { type: Number, default: 0 },
  cancellationRules: {
    type: [{ hoursBefore: Number, refundPercent: Number }],
    default: [
      { hoursBefore: 48, refundPercent: 100 },
      { hoursBefore: 24, refundPercent: 50 },
    ],
  },
  paymentDeadlineHours: { type: Number, default: 12 },
  requestExpiryHours: { type: Number, default: 24 },
  disputeWindowHours: { type: Number, default: 24 },
  allowedPetTypes: { type: [String], default: ["Dog", "Cat", "Rabbit", "Bird", "Other"] },
});
export const Setting = model("Setting", settingSchema);

export async function getSettings() {
  return (await Setting.findOne({ key: "global" })) ?? (await Setting.create({ key: "global" }));
}
