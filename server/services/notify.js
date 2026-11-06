import { Notification } from "../models/index.js";

let io = null;
export const attachIo = (instance) => { io = instance; };
export const getIo = () => io;

/** In-app notification + realtime push. Email/SMS providers plug in here. */
export async function notify(userId, { type, title, body, link }) {
  if (!userId) return;
  const n = await Notification.create({ userId, type, title, body, link });
  io?.to(`user:${userId}`).emit("notification:new", n);
  if (process.env.NODE_ENV !== "test") console.log(`[notify] ${userId} ${type}: ${title}`);
  return n;
}

export const notifyMany = (userIds, payload) => Promise.all(userIds.map((u) => notify(u, payload)));
