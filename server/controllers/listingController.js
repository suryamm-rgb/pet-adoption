import { AdoptionRequest, Listing, Message } from "../models/index.js";
import * as svc from "../services/listingService.js";
import { getIo, notify } from "../services/notify.js";
import { badRequest, forbidden, notFound } from "../utils/http.js";

export const create = async (req, res) => res.status(201).json(await svc.createListing(req.user, req.body));
export const list = async (req, res) => res.json(await svc.listApproved(req.query));
export const get = async (req, res) => res.json(await svc.getListing(req.params.id));
export const mine = async (req, res) => res.json(await Listing.find({ sellerId: req.user._id }).sort({ createdAt: -1 }));
export const photos = async (req, res) => {
  const listing = await Listing.findOne({ _id: req.params.id, sellerId: req.user._id });
  if (!listing) throw notFound();
  listing.photos.push(...req.uploaded);
  await listing.save();
  res.json(listing);
};
export const request = async (req, res) => res.status(201).json(await svc.requestAdoption(req.user, req.params.id, req.body.message));
export const requestsForMyListings = async (req, res) => {
  const ids = await Listing.find({ sellerId: req.user._id }).distinct("_id");
  res.json(await AdoptionRequest.find({ listingId: { $in: ids } }).sort({ createdAt: -1 }).populate("adopterId", "name").populate("listingId", "title"));
};
export const myRequests = async (req, res) => res.json(await AdoptionRequest.find({ adopterId: req.user._id }).sort({ createdAt: -1 }).populate("listingId", "title status"));
export const updateRequest = async (req, res) => res.json(await svc.updateRequestStatus(req.user, req.params.id, req.body.status));
export const handover = async (req, res) => res.json(await svc.confirmHandover(req.user, req.params.id));

async function chatPartner(req) {
  const listing = await Listing.findById(req.params.id);
  if (!listing) throw notFound();
  const isSeller = listing.sellerId.equals(req.user._id);
  const other = isSeller ? req.query.with ?? req.body?.to : listing.sellerId;
  if (!other) throw badRequest("Specify the other user");
  return { listing, other };
}
export async function listMessages(req, res) {
  const { listing, other } = await chatPartner(req);
  res.json(await Message.find({ listingId: listing._id, $or: [{ senderId: req.user._id, receiverId: other }, { senderId: other, receiverId: req.user._id }] }).sort({ createdAt: 1 }));
}
export async function postMessage(req, res) {
  const { listing, other } = await chatPartner(req);
  if (String(other) === String(req.user._id)) throw forbidden();
  const message = await Message.create({ listingId: listing._id, senderId: req.user._id, receiverId: other, text: req.body.text });
  getIo()?.to(`user:${other}`).emit("message:new", message);
  await notify(other, { type: "message", title: `Message from ${req.user.name}`, body: message.text.slice(0, 80), link: `/listings/${listing._id}` });
  res.status(201).json(message);
}
