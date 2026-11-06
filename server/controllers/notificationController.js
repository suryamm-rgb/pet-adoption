import { Notification } from "../models/index.js";

export const list = async (req, res) =>
  res.json({
    items: await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50),
    unread: await Notification.countDocuments({ userId: req.user._id, readAt: null }),
  });
export const readAll = async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, readAt: null }, { readAt: new Date() });
  res.json({ ok: true });
};
export const readOne = async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { readAt: new Date() });
  res.json({ ok: true });
};
