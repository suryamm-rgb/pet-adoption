import { Schema, model, id, opts } from "./helpers.js";

/** A location check-in a caretaker shares on purpose (walk, vet visit) while the pet is in care. Never tracked in the background. */
export const CheckIn = model(
  "CheckIn",
  new Schema(
    {
      bookingId: { ...id("Booking"), required: true, index: true },
      caretakerId: { ...id("User"), required: true },
      kind: { type: String, enum: ["walk", "vet", "home", "other"], default: "walk" },
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
      accuracy: Number, // metres, as reported by the phone
      note: { type: String, maxlength: 200 },
    },
    opts,
  ),
);
