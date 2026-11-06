import { Booking, CaretakerProfile, Dispute, Payment, Pet, User, getSettings } from "../models/index.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/http.js";
import { calcPricing, calcRefund, countDays } from "../utils/money.js";
import { notify } from "./notify.js";
import { refundPayment } from "./razorpayService.js";

const HOLDS_SLOT = ["ACCEPTED", "PAID", "IN_CARE"];
const startOfToday = () => new Date(new Date().setUTCHours(0, 0, 0, 0));

export async function getBookingFor(user, bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound("Booking not found");
  const uid = String(user._id);
  const isParty = [String(booking.ownerId), String(booking.caretakerId)].includes(uid);
  if (!isParty && !user.roles.includes("admin")) throw forbidden("Not your booking");
  return booking;
}

export async function hasCapacity(caretakerId, startDate, endDate, maxPets, excludeId) {
  const overlapping = await Booking.countDocuments({
    caretakerId,
    status: { $in: HOLDS_SLOT },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });
  return overlapping < maxPets;
}

export async function createBooking(owner, { caretakerId, petId, startDate, endDate }) {
  if (!owner.emailVerified) throw forbidden("Verify your email before booking");
  if (String(owner._id) === String(caretakerId)) throw badRequest("You cannot book yourself");
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start < startOfToday()) throw badRequest("Start date is in the past");
  if (end < start) throw badRequest("End date must be on or after the start date");

  const [pet, profile, settings] = await Promise.all([
    Pet.findOne({ _id: petId, ownerId: owner._id }),
    CaretakerProfile.findOne({ userId: caretakerId, verificationStatus: "approved" }),
    getSettings(),
  ]);
  if (!pet) throw notFound("Pet not found");
  if (!profile) throw notFound("Caretaker not available");
  if (!settings.allowedPetTypes.includes(pet.type)) throw badRequest(`${pet.type} is not supported`);
  if (profile.acceptedPetTypes.length && !profile.acceptedPetTypes.includes(pet.type)) {
    throw badRequest(`This caretaker does not accept ${pet.type}`);
  }
  if (!pet.vaccinationDocs.length) throw badRequest("Upload a vaccination certificate for this pet first");
  if (!(await hasCapacity(caretakerId, start, end, profile.maxPets))) throw conflict("Caretaker is fully booked for these dates");

  const days = countDays(start, end);
  const pricing = calcPricing({
    pricePerDay: profile.pricePerDay,
    days,
    feePercent: settings.platformFeePercent,
    commissionPercent: settings.caretakerCommissionPercent,
  });
  const booking = await Booking.create({
    ownerId: owner._id,
    caretakerId,
    petId: pet._id,
    startDate: start,
    endDate: end,
    days,
    pricePerDay: profile.pricePerDay,
    ...pricing,
  });
  await notify(caretakerId, { type: "booking_requested", title: "New booking request", body: `${owner.name} wants to book ${pet.name}`, link: "/caretaker/requests" });
  return booking;
}

export async function acceptBooking(caretaker, bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw notFound("Booking not found");
  if (String(booking.caretakerId) !== String(caretaker._id)) throw forbidden();
  const profile = await CaretakerProfile.findOne({ userId: caretaker._id, verificationStatus: "approved" });
  if (!profile) throw forbidden("Your profile is not approved yet");
  if (!(await hasCapacity(caretaker._id, booking.startDate, booking.endDate, profile.maxPets, booking._id))) {
    throw conflict("You are fully booked for these dates");
  }
  const pet = await Pet.findById(booking.petId).lean();
  const updated = await Booking.findOneAndUpdate(
    { _id: bookingId, status: "REQUESTED" },
    { status: "ACCEPTED", acceptedAt: new Date(), petSnapshot: pet },
    { returnDocument: "after" },
  );
  if (!updated) throw conflict("Booking is no longer pending");
  await notify(booking.ownerId, { type: "booking_accepted", title: "Booking accepted", body: "Pay now to confirm your booking", link: `/owner/bookings/${booking._id}` });
  return updated;
}

export async function rejectBooking(caretaker, bookingId) {
  const updated = await Booking.findOneAndUpdate(
    { _id: bookingId, caretakerId: caretaker._id, status: "REQUESTED" },
    { status: "REJECTED" },
    { returnDocument: "after" },
  );
  if (!updated) throw conflict("Booking cannot be rejected");
  await notify(updated.ownerId, { type: "booking_rejected", title: "Booking declined", body: "The caretaker could not take this booking", link: "/caretakers" });
  return updated;
}

/** Refund the captured payment (if any) and record it. Returns refunded paise. */
export async function refundBookingPayment(booking, amount) {
  if (amount <= 0) return 0;
  const payment = await Payment.findOne({ bookingId: booking._id, status: { $in: ["captured", "partially_refunded"] } });
  if (!payment) return 0;
  const already = payment.refunds.reduce((s, r) => s + r.amount, 0);
  const refundable = Math.min(amount, payment.amount - already);
  if (refundable <= 0) return 0;
  const refund = await refundPayment(payment.razorpayPaymentId, refundable);
  payment.refunds.push({ id: refund.id, amount: refundable });
  payment.status = already + refundable >= payment.amount ? "refunded" : "partially_refunded";
  await payment.save();
  return refundable;
}

export async function cancelBooking(user, bookingId, reason = "") {
  const booking = await getBookingFor(user, bookingId);
  const isAdmin = user.roles.includes("admin");
  const cancelledBy = isAdmin ? "admin" : String(booking.ownerId) === String(user._id) ? "owner" : "caretaker";
  if (!["REQUESTED", "ACCEPTED", "PAID"].includes(booking.status)) throw conflict("This booking can no longer be cancelled; raise a dispute instead");
  if (cancelledBy === "caretaker" && booking.status === "REQUESTED") throw badRequest("Use reject for pending requests");

  const settings = await getSettings();
  const wasPaid = booking.status === "PAID";
  const refund = wasPaid ? calcRefund({ booking, rules: settings.cancellationRules, cancelledBy: cancelledBy === "admin" ? "caretaker" : cancelledBy }) : 0;

  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, status: booking.status },
    { status: "CANCELLED", cancelledBy, cancelReason: reason },
    { returnDocument: "after" },
  );
  if (!updated) throw conflict("Booking changed, try again");
  if (wasPaid) updated.refundAmount = await refundBookingPayment(updated, refund);
  await updated.save();

  const other = cancelledBy === "owner" ? booking.caretakerId : booking.ownerId;
  await notify(other, { type: "booking_cancelled", title: "Booking cancelled", body: reason || `Cancelled by ${cancelledBy}`, link: "/" });
  return updated;
}

export async function completeBooking(owner, bookingId) {
  const updated = await Booking.findOneAndUpdate(
    { _id: bookingId, ownerId: owner._id, status: "IN_CARE" },
    { status: "COMPLETED", completedAt: new Date(), payoutStatus: "pending" },
    { returnDocument: "after" },
  );
  if (!updated) throw conflict("Only a booking in care can be completed by its owner");
  await notify(updated.caretakerId, { type: "stay_completed", title: "Stay completed", body: "Payout will be released after the dispute window", link: "/caretaker/earnings" });
  return updated;
}

export async function addInstruction(owner, bookingId, text) {
  const booking = await Booking.findOne({ _id: bookingId, ownerId: owner._id });
  if (!booking) throw notFound("Booking not found");
  if (!["PAID", "IN_CARE"].includes(booking.status)) throw conflict("Instructions can be added to paid or active bookings");
  booking.instructions.push({ text });
  await booking.save();
  await notify(booking.caretakerId, { type: "new_instruction", title: "New instruction", body: text.slice(0, 80), link: `/caretaker/stays/${booking._id}` });
  return booking;
}

export async function ackInstruction(caretaker, bookingId, instructionId) {
  const booking = await Booking.findOne({ _id: bookingId, caretakerId: caretaker._id });
  if (!booking) throw notFound("Booking not found");
  const item = booking.instructions.id(instructionId);
  if (!item) throw notFound("Instruction not found");
  item.acknowledged = true;
  await booking.save();
  return booking;
}

export async function raiseDispute(user, bookingId, { reason, evidence = [] }) {
  const booking = await getBookingFor(user, bookingId);
  if (user.roles.includes("admin") && !booking.ownerId.equals(user._id) && !booking.caretakerId.equals(user._id)) throw forbidden("Admins cannot raise disputes");
  const settings = await getSettings();
  const withinWindow =
    booking.status === "COMPLETED" &&
    booking.payoutStatus !== "paid" &&
    Date.now() - booking.completedAt.getTime() < settings.disputeWindowHours * 3_600_000;
  if (booking.status !== "IN_CARE" && !withinWindow) throw conflict("A dispute can only be raised during the stay or the dispute window");
  booking.status = "DISPUTED";
  booking.payoutStatus = "none";
  await booking.save();
  const dispute = await Dispute.create({ bookingId, raisedBy: user._id, reason, evidence });
  const admins = await User.find({ roles: "admin" }).select("_id");
  await Promise.all(admins.map((a) => notify(a._id, { type: "dispute_opened", title: "Dispute opened", body: reason.slice(0, 80), link: "/admin/disputes" })));
  return dispute;
}

/** decision: full_payout | partial | full_refund */
export async function resolveDispute(admin, disputeId, { decision, amountToOwner = 0, amountToCaretaker = 0, note = "" }) {
  const dispute = await Dispute.findOne({ _id: disputeId, status: "open" });
  if (!dispute) throw notFound("Open dispute not found");
  const booking = await Booking.findById(dispute.bookingId);

  let toOwner;
  let toCaretaker;
  if (decision === "full_refund") { toOwner = booking.ownerPays; toCaretaker = 0; }
  else if (decision === "full_payout") { toOwner = 0; toCaretaker = booking.caretakerGets; }
  else {
    toOwner = amountToOwner;
    toCaretaker = amountToCaretaker;
    if (toOwner + toCaretaker > booking.ownerPays) throw badRequest("Amounts exceed what the owner paid");
  }

  booking.refundAmount = await refundBookingPayment(booking, toOwner);
  booking.caretakerGets = toCaretaker;
  booking.status = toCaretaker > 0 ? "COMPLETED" : "REFUNDED";
  booking.completedAt = new Date();
  booking.payoutStatus = toCaretaker > 0 ? "pending" : "none";
  await booking.save();

  Object.assign(dispute, { status: "resolved", adminDecision: note || decision, amountToOwner: toOwner, amountToCaretaker: toCaretaker, resolvedBy: admin._id });
  await dispute.save();
  await Promise.all([booking.ownerId, booking.caretakerId].map((u) => notify(u, { type: "dispute_resolved", title: "Dispute resolved", body: note || decision, link: "/" })));
  return dispute;
}
