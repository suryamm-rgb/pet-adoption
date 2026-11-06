import { Booking, Pet, PetUpdate } from "../models/index.js";
import { conflict, notFound } from "../utils/http.js";
import { notify } from "./notify.js";

const ACTIVE = ["REQUESTED", "ACCEPTED", "PAID", "IN_CARE"];
const LOCKED = ["ACCEPTED", "PAID", "IN_CARE"];
// Fields that may change during an active booking; each change becomes an instruction for the caretaker.
const CARE_FIELDS = ["allergies", "medications", "vetName", "vetPhone", "food", "routine", "sleepingPlace", "behaviourNotes", "goodWithKids", "goodWithPets", "emergencyContact", "backupContact"];

export async function getOwnedPet(owner, petId) {
  const pet = await Pet.findOne({ _id: petId, ownerId: owner._id });
  if (!pet) throw notFound("Pet not found");
  return pet;
}

export const createPet = (owner, data) => Pet.create({ ...data, ownerId: owner._id });

export async function updatePet(owner, petId, data) {
  const pet = await getOwnedPet(owner, petId);
  const active = await Booking.find({ petId, status: { $in: LOCKED } });
  const keys = Object.keys(data);

  if (active.length) {
    const blocked = keys.filter((k) => !CARE_FIELDS.includes(k));
    if (blocked.length) throw conflict(`These fields cannot change during an active booking: ${blocked.join(", ")}`);
  }

  const changes = {};
  for (const k of keys) {
    const before = pet.get(k);
    if (JSON.stringify(before) !== JSON.stringify(data[k])) changes[k] = { old: before, new: data[k] };
  }
  if (!Object.keys(changes).length) return pet;
  pet.set(data);
  await pet.save();

  await PetUpdate.create({ petId, changedBy: owner._id, changes, bookingId: active[0]?._id });
  for (const booking of active) {
    const text = `Updated ${Object.keys(changes).join(", ")} for ${pet.name}`;
    booking.instructions.push({ text });
    await booking.save();
    await notify(booking.caretakerId, { type: "new_instruction", title: "Pet instructions changed", body: text, link: `/caretaker/stays/${booking._id}` });
  }
  return pet;
}

export async function deletePet(owner, petId) {
  const pet = await getOwnedPet(owner, petId);
  if (await Booking.exists({ petId, status: { $in: ACTIVE } })) throw conflict("This pet has an active booking");
  await pet.deleteOne();
}

export async function addVaccination(owner, petId, urls) {
  const pet = await getOwnedPet(owner, petId);
  pet.vaccinationDocs.push(...urls);
  await pet.save();
  await PetUpdate.create({ petId, changedBy: owner._id, changes: { vaccinationDocs: { added: urls } } });
  return pet;
}
