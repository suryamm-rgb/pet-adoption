import { Booking, CaretakerProfile, DailyUpdate, Message, Review, User } from "../models/index.js";
import * as svc from "../services/bookingService.js";
import { streamInvoice } from "../services/invoiceService.js";
import { createReview } from "../services/reviewService.js";
import { getIo, notify } from "../services/notify.js";
import { badRequest, conflict, forbidden } from "../utils/http.js";

export const create = async (req, res) => res.status(201).json(await svc.createBooking(req.user, req.body));

export async function mine(req, res) {
  const as = req.query.as === "caretaker" ? "caretakerId" : "ownerId";
  res.json(
    await Booking.find({ [as]: req.user._id })
      .sort({ createdAt: -1 })
      .populate("ownerId", "name")
      .populate("caretakerId", "name")
      .populate("petId", "name type"),
  );
}

export async function get(req, res) {
  const booking = await svc.getBookingFor(req.user, req.params.id);
  await booking.populate([{ path: "ownerId", select: "name phone" }, { path: "caretakerId", select: "name phone" }, { path: "petId", select: "name type photos" }]);
  const out = booking.toObject();
  const confirmed = ["PAID", "IN_CARE", "COMPLETED", "DISPUTED"].includes(booking.status);
  if (!confirmed) {
    delete out.ownerId.phone;
    delete out.caretakerId.phone;
  } else {
    const profile = await CaretakerProfile.findOne({ userId: booking.caretakerId._id }).select("address");
    out.caretakerAddress = profile?.address; // address is revealed only after payment
  }
  res.json(out);
}

export const accept = async (req, res) => res.json(await svc.acceptBooking(req.user, req.params.id));
export const reject = async (req, res) => res.json(await svc.rejectBooking(req.user, req.params.id));
export const cancel = async (req, res) => res.json(await svc.cancelBooking(req.user, req.params.id, req.body.reason));
export const complete = async (req, res) => res.json(await svc.completeBooking(req.user, req.params.id));
export const addInstruction = async (req, res) => res.status(201).json(await svc.addInstruction(req.user, req.params.id, req.body.text));
export const ackInstruction = async (req, res) => res.json(await svc.ackInstruction(req.user, req.params.id, req.params.iid));
export const dispute = async (req, res) => res.status(201).json(await svc.raiseDispute(req.user, req.params.id, { reason: req.body.reason, evidence: req.uploaded ?? [] }));
export const review = async (req, res) => res.status(201).json(await createReview(req.user, req.params.id, req.body));

export async function postUpdate(req, res) {
  const booking = await svc.getBookingFor(req.user, req.params.id);
  if (!booking.caretakerId.equals(req.user._id)) throw forbidden("Only the caretaker can post updates");
  if (booking.status !== "IN_CARE") throw conflict("Updates can be posted while the pet is in care");
  const update = await DailyUpdate.create({ bookingId: booking._id, caretakerId: req.user._id, note: req.body.note, photos: req.uploaded ?? [] });
  await notify(booking.ownerId, { type: "daily_update", title: "New update", body: req.body.note.slice(0, 80), link: `/owner/bookings/${booking._id}` });
  getIo()?.to(`booking:${booking._id}`).emit("update:new", update);
  res.status(201).json(update);
}

export async function listUpdates(req, res) {
  const booking = await svc.getBookingFor(req.user, req.params.id);
  res.json(await DailyUpdate.find({ bookingId: booking._id }).sort({ createdAt: -1 }));
}

export async function listMessages(req, res) {
  const booking = await svc.getBookingFor(req.user, req.params.id);
  const messages = await Message.find({ bookingId: booking._id }).sort({ createdAt: 1 }).limit(500);
  await Message.updateMany({ bookingId: booking._id, receiverId: req.user._id, readAt: null }, { readAt: new Date() });
  res.json(messages);
}

export async function postMessage(req, res) {
  const booking = await svc.getBookingFor(req.user, req.params.id);
  const isOwner = booking.ownerId.equals(req.user._id);
  if (!isOwner && !booking.caretakerId.equals(req.user._id)) throw forbidden("Admins can read but not post in private chats");
  if (!["ACCEPTED", "PAID", "IN_CARE", "COMPLETED", "DISPUTED"].includes(booking.status)) throw conflict("Chat opens once the booking is accepted");
  const message = await Message.create({
    bookingId: booking._id,
    senderId: req.user._id,
    receiverId: isOwner ? booking.caretakerId : booking.ownerId,
    text: req.body.text,
  });
  getIo()?.to(`booking:${booking._id}`).emit("message:new", message);
  await notify(message.receiverId, { type: "message", title: `Message from ${req.user.name}`, body: message.text.slice(0, 80), link: isOwner ? `/caretaker/stays/${booking._id}` : `/owner/bookings/${booking._id}` });
  res.status(201).json(message);
}

export async function emergency(req, res) {
  const booking = await svc.getBookingFor(req.user, req.params.id);
  if (!booking.caretakerId.equals(req.user._id) || booking.status !== "IN_CARE") throw badRequest("Only the caretaker of an active stay can raise an emergency");
  const vet = booking.petSnapshot?.vetPhone ? `Vet: ${booking.petSnapshot.vetName ?? ""} ${booking.petSnapshot.vetPhone}` : "No vet contact on file";
  const admins = await User.find({ roles: "admin" }).select("_id");
  await Promise.all([booking.ownerId, ...admins.map((a) => a._id)].map((u) => notify(u, { type: "emergency", title: "Emergency raised", body: `${booking.petSnapshot?.name ?? "Pet"}: ${vet}`, link: `/owner/bookings/${booking._id}` })));
  res.json({ ok: true });
}

export async function invoice(req, res) {
  await streamInvoice(req.user, req.params.id, res);
}

export async function myReviews(req, res) {
  const [received, given] = await Promise.all([
    Review.find({ toUserId: req.user._id }).sort({ createdAt: -1 }).populate("fromUserId", "name"),
    Review.find({ fromUserId: req.user._id }).sort({ createdAt: -1 }).populate("toUserId", "name"),
  ]);
  res.json({ received, given });
}
