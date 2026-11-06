import { Schema, model, id, opts } from "./helpers.js";

const messageSchema = new Schema(
  {
    bookingId: id("Booking"),
    listingId: id("Listing"),
    senderId: { ...id("User"), required: true },
    receiverId: id("User"),
    text: { type: String, required: true },
    attachments: [String],
    readAt: Date,
  },
  opts,
);
messageSchema.index({ bookingId: 1, createdAt: 1 });
export const Message = model("Message", messageSchema);
