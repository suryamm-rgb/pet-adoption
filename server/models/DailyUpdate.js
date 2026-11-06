import { Schema, model, id, opts } from "./helpers.js";

export const DailyUpdate = model(
  "DailyUpdate",
  new Schema({ bookingId: { ...id("Booking"), index: true }, caretakerId: id("User"), note: String, photos: [String] }, opts),
);
