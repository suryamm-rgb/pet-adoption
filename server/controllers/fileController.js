import { Booking, CaretakerProfile, Pet } from "../models/index.js";
import { PRIVATE_PREFIX, resolvePrivate } from "../middleware/upload.js";
import { forbidden, notFound } from "../utils/http.js";

const SEES_PET = ["REQUESTED", "ACCEPTED", "PAID", "IN_CARE", "COMPLETED", "DISPUTED"];

async function canView(user, url) {
  if (user.roles.includes("admin")) return true;
  if (await CaretakerProfile.exists({ userId: user._id, $or: [{ idProofUrl: url }, { addressProofUrl: url }] })) return true;
  const pet = await Pet.findOne({ vaccinationDocs: url }).select("ownerId");
  if (!pet) return false;
  if (pet.ownerId.equals(user._id)) return true;
  return Boolean(await Booking.exists({ petId: pet._id, caretakerId: user._id, status: { $in: SEES_PET } }));
}

export async function privateFile(req, res) {
  const key = req.params.key;
  if (!(await canView(req.user, PRIVATE_PREFIX + key))) throw forbidden("You cannot view this document");
  const found = resolvePrivate(key);
  if (!found) throw notFound("File not found");
  res.set("Cache-Control", "private, no-store");
  if (found.redirect) return res.redirect(found.redirect);
  res.sendFile(found.file);
}
