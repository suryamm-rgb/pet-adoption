import { Booking, CaretakerProfile, Review, User } from "../models/index.js";
import { badRequest, forbidden, notFound } from "../utils/http.js";
import { hasCapacity } from "./bookingService.js";

const PUBLIC_FIELDS = "userId bio city pricePerDay maxPets acceptedPetTypes homeType hasGarden experienceYears photos ratingAvg ratingCount";

export function toPublic(profile, user) {
  return {
    id: profile.userId,
    name: user?.name,
    city: profile.city ?? user?.city,
    bio: profile.bio,
    pricePerDay: profile.pricePerDay,
    maxPets: profile.maxPets,
    acceptedPetTypes: profile.acceptedPetTypes,
    homeType: profile.homeType,
    hasGarden: profile.hasGarden,
    experienceYears: profile.experienceYears,
    photos: profile.photos,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    verified: profile.verificationStatus === "approved",
  };
}

export async function search({ city, from, to, petType, maxPrice, near }) {
  const filter = { verificationStatus: "approved" };
  if (city) filter.city = new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
  if (petType) filter.acceptedPetTypes = petType;
  if (maxPrice) filter.pricePerDay = { $lte: Number(maxPrice) };
  if (near) {
    const [lng, lat, km = 25] = near.split(",").map(Number);
    if ([lng, lat].some(Number.isNaN)) throw badRequest("near must be lng,lat[,km]");
    const ids = await User.find({ location: { $geoWithin: { $centerSphere: [[lng, lat], km / 6378.1] } } }).distinct("_id");
    filter.userId = { $in: ids };
  }
  let profiles = await CaretakerProfile.find(filter).select(PUBLIC_FIELDS).sort({ ratingAvg: -1 }).limit(60);
  if (from && to) {
    const start = new Date(from);
    const end = new Date(to);
    const free = await Promise.all(profiles.map((p) => hasCapacity(p.userId, start, end, p.maxPets)));
    profiles = profiles.filter((_, i) => free[i]);
  }
  const users = await User.find({ _id: { $in: profiles.map((p) => p.userId) } }).select("name city");
  const byId = new Map(users.map((u) => [String(u._id), u]));
  return profiles.map((p) => toPublic(p, byId.get(String(p.userId))));
}

export async function getPublic(userId) {
  const profile = await CaretakerProfile.findOne({ userId, verificationStatus: "approved" }).select(PUBLIC_FIELDS);
  if (!profile) throw notFound("Caretaker not found");
  return toPublic(profile, await User.findById(userId).select("name city"));
}

export async function myProfile(user) {
  const profile = await CaretakerProfile.findOne({ userId: user._id });
  if (!profile) throw forbidden("You are not a caretaker");
  return profile;
}

export async function updateProfile(user, data) {
  const profile = await myProfile(user);
  profile.set(data);
  await profile.save();
  return profile;
}

export async function saveDocuments(user, { idProofUrl, addressProofUrl, photos }) {
  const profile = await myProfile(user);
  if (idProofUrl) profile.idProofUrl = idProofUrl;
  if (addressProofUrl) profile.addressProofUrl = addressProofUrl;
  if (photos?.length) profile.photos.push(...photos);
  await profile.save();
  return profile;
}

export async function submitForVerification(user) {
  const profile = await myProfile(user);
  if (!profile.idProofUrl || !profile.addressProofUrl) throw badRequest("Upload ID proof and address proof first");
  if (!profile.pricePerDay) throw badRequest("Set your price per day first");
  profile.verificationStatus = "pending";
  profile.rejectionReason = undefined;
  await profile.save();
  return profile;
}

export async function listReviews(userId) {
  return Review.find({ toUserId: userId }).sort({ createdAt: -1 }).limit(50).populate("fromUserId", "name");
}

export async function earnings(user) {
  const rows = await Booking.find({ caretakerId: user._id, status: { $in: ["COMPLETED", "IN_CARE", "PAID"] } }).sort({ startDate: -1 });
  const sum = (f) => rows.filter(f).reduce((s, b) => s + b.caretakerGets, 0);
  return {
    paidOut: sum((b) => b.payoutStatus === "paid"),
    pending: sum((b) => b.status === "COMPLETED" && b.payoutStatus === "pending"),
    upcoming: sum((b) => ["PAID", "IN_CARE"].includes(b.status)),
    bookings: rows,
  };
}
