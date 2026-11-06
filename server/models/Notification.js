import { Schema, model, id, opts } from "./helpers.js";

export const Notification = model(
  "Notification",
  new Schema({ userId: { ...id("User"), index: true }, type: String, title: String, body: String, link: String, readAt: Date }, opts),
);
