import { AdoptionRequest, Listing, Pet } from "../models/index.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/http.js";
import { notify } from "./notify.js";

export const createListing = (seller, data) => Listing.create({ ...data, sellerId: seller._id, status: "pending" });

export function listApproved({ mode, city, petType }) {
  const filter = { status: "approved" };
  if (mode) filter.mode = mode;
  if (city) filter.city = new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
  if (petType) filter.petType = petType;
  return Listing.find(filter).sort({ createdAt: -1 }).limit(60);
}

export async function getListing(id) {
  const listing = await Listing.findOne({ _id: id, status: { $in: ["approved", "reserved"] } });
  if (!listing) throw notFound("Listing not found");
  return listing;
}

export async function requestAdoption(user, listingId, message) {
  const listing = await Listing.findOne({ _id: listingId, mode: "adopt", status: "approved" });
  if (!listing) throw notFound("Listing not available");
  if (listing.sellerId.equals(user._id)) throw badRequest("This is your own listing");
  if (await AdoptionRequest.exists({ listingId, adopterId: user._id, status: { $in: ["pending", "approved"] } })) throw conflict("You already requested this pet");
  const request = await AdoptionRequest.create({ listingId, adopterId: user._id, message });
  await notify(listing.sellerId, { type: "adoption_request", title: "New adoption request", body: message?.slice(0, 80), link: "/seller/requests" });
  return request;
}

export async function updateRequestStatus(user, requestId, status) {
  const request = await AdoptionRequest.findById(requestId);
  if (!request) throw notFound("Request not found");
  const listing = await Listing.findById(request.listingId);
  if (!listing.sellerId.equals(user._id) && !user.roles.includes("admin")) throw forbidden();
  const allowed = { pending: ["approved", "rejected"], approved: ["completed", "rejected"] };
  if (!allowed[request.status]?.includes(status)) throw conflict(`Cannot move from ${request.status} to ${status}`);
  request.status = status;
  await request.save();
  if (status === "approved") await Listing.updateOne({ _id: listing._id }, { status: "reserved" });
  if (status === "rejected" && listing.status === "reserved") await Listing.updateOne({ _id: listing._id }, { status: "approved" });
  if (status === "completed") {
    await Listing.updateOne({ _id: listing._id }, { status: "closed" });
    if (listing.petId) await Pet.updateOne({ _id: listing.petId }, { ownerId: request.adopterId });
  }
  await notify(request.adopterId, { type: "adoption_update", title: `Adoption request ${status}`, body: listing.title ?? "", link: "/adopt" });
  return request;
}

export async function confirmHandover(buyer, listingId) {
  const listing = await Listing.findOneAndUpdate({ _id: listingId, buyerId: buyer._id, status: "reserved", mode: "sell" }, { status: "closed" }, { returnDocument: "after" });
  if (!listing) throw conflict("Nothing to confirm");
  await notify(listing.sellerId, { type: "sale_complete", title: "Sale completed", body: listing.title ?? "", link: "/seller" });
  return listing;
}
