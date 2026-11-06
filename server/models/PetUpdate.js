import { Schema, model, id, opts } from "./helpers.js";

export const PetUpdate = model(
  "PetUpdate",
  new Schema({ petId: id("Pet"), changedBy: id("User"), bookingId: id("Booking"), changes: Schema.Types.Mixed }, opts),
);
