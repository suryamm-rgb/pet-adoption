import * as webpush from "web-push";
import { env } from "../config/env.js";
import { PushSubscription } from "../models/index.js";

export const pushEnabled = Boolean(env.push.publicKey && env.push.privateKey);
if (pushEnabled) webpush.setVapidDetails(env.push.subject, env.push.publicKey, env.push.privateKey);

/** Swappable so tests never touch the network. */
let transport = (subscription, payload) => webpush.sendNotification(subscription, payload, { TTL: 60 * 60 });
export const setPushTransport = (fn) => { transport = fn; };

export async function saveSubscription(userId, { endpoint, keys }, userAgent) {
  return PushSubscription.findOneAndUpdate({ endpoint }, { userId, endpoint, keys, userAgent }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
}
export const removeSubscription = (userId, endpoint) => PushSubscription.deleteOne({ userId, endpoint });
export const countSubscriptions = (userId) => PushSubscription.countDocuments({ userId });

/** Never throws. Dead subscriptions (404/410) are removed so we stop retrying them. */
export async function sendPush(userId, { title, body, link }) {
  if (!pushEnabled && process.env.NODE_ENV !== "test") return 0;
  const subs = await PushSubscription.find({ userId });
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await transport({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title, body, link }));
      sent += 1;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) await PushSubscription.deleteOne({ _id: s._id });
      else console.error(`[push] failed: ${err.message}`);
    }
  }));
  return sent;
}
