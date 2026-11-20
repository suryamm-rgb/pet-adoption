import { Order, Product } from "../models/index.js";
import * as shop from "../services/shopService.js";
import { notFound } from "../utils/http.js";

export const products = async (req, res) => {
  const filter = { isActive: true, ...(req.query.category ? { category: req.query.category } : {}) };
  res.json(await Product.find(filter).sort({ createdAt: -1 }).limit(100));
};
export const product = async (req, res) => {
  const p = await Product.findOne({ _id: req.params.id, isActive: true });
  if (!p) throw notFound();
  res.json(p);
};
export const createProduct = async (req, res) => res.status(201).json(await Product.create({ ...req.body, sellerId: req.user._id }));
export const updateProduct = async (req, res) => {
  const filter = req.user.roles.includes("admin") ? { _id: req.params.id } : { _id: req.params.id, sellerId: req.user._id };
  const p = await Product.findOneAndUpdate(filter, req.body, { returnDocument: "after" });
  if (!p) throw notFound();
  res.json(p);
};
export const productImages = async (req, res) => {
  const p = await Product.findOne({ _id: req.params.id, sellerId: req.user._id });
  if (!p) throw notFound();
  p.images.push(...req.uploaded);
  await p.save();
  res.json(p);
};
export const cart = async (req, res) => res.json(await shop.priceCart(req.body.items));
export const createOrder = async (req, res) => res.status(201).json(await shop.createOrder(req.user, req.body));
export const myOrders = async (req, res) => res.json(await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }));
export const updateStatus = async (req, res) => res.json(await shop.advanceOrder(req.user, req.params.id, req.body.status, req.body));
export const cancelOrder = async (req, res) => res.json(await shop.cancelOrder(req.user, req.params.id, req.body.reason));
export const sellerOrders = async (req, res) => {
  const ids = await Product.find({ sellerId: req.user._id }).distinct("_id");
  res.json(await Order.find({ "items.productId": { $in: ids }, status: { $ne: "PENDING_PAYMENT" } }).sort({ createdAt: -1 }).limit(200).populate("userId", "name"));
};
export const allOrders = async (_req, res) => res.json(await Order.find().sort({ createdAt: -1 }).limit(200).populate("userId", "name"));
