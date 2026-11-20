import { Booking } from "../models/index.js";
import * as svc from "../services/caretakerService.js";
import { setupPayoutAccount } from "../services/paymentService.js";

export const search = async (req, res) => res.json(await svc.search(req.query));
export const get = async (req, res) => res.json(await svc.getPublic(req.params.id));
export const reviews = async (req, res) => res.json(await svc.listReviews(req.params.id));
export const mine = async (req, res) => res.json(await svc.myProfile(req.user));
export const update = async (req, res) => res.json(await svc.updateProfile(req.user, req.body));
export const earnings = async (req, res) => res.json(await svc.earnings(req.user));
export const submit = async (req, res) => res.json(await svc.submitForVerification(req.user));

export async function documents(req, res) {
  const kind = req.params.kind; // idProof | addressProof | photos
  const urls = req.uploaded;
  const patch = kind === "idProof" ? { idProofUrl: urls[0] } : kind === "addressProof" ? { addressProofUrl: urls[0] } : { photos: urls };
  res.json(await svc.saveDocuments(req.user, patch));
}

export async function requests(req, res) {
  const status = req.query.status;
  const filter = { caretakerId: req.user._id, ...(status ? { status: { $in: String(status).split(",") } } : {}) };
  res.json(await Booking.find(filter).sort({ createdAt: -1 }).populate("ownerId", "name").populate("petId", "name type breed"));
}
export const payoutAccount = async (req, res) => res.status(201).json(await setupPayoutAccount(req.user, req.body));
