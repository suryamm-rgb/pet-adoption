import { Schema, model, id, opts } from "./helpers.js";

const petSchema = new Schema(
  {
    ownerId: { ...id("User"), required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    breed: String,
    age: String,
    gender: String,
    weight: Number,
    photos: [String],
    vaccinationDocs: [String],
    allergies: String,
    medications: [{ name: String, dose: String, time: String }],
    vetName: String,
    vetPhone: String,
    food: { type: { type: String }, schedule: String },
    routine: String,
    sleepingPlace: String,
    behaviourNotes: String,
    goodWithKids: Boolean,
    goodWithPets: Boolean,
    emergencyContact: { name: String, phone: String },
    backupContact: { name: String, phone: String },
  },
  opts,
);
export const Pet = model("Pet", petSchema);
