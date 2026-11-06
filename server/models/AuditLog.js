import { Schema, model, id, opts } from "./helpers.js";

export const AuditLog = model(
  "AuditLog",
  new Schema({ adminId: id("User"), action: String, target: String, meta: Schema.Types.Mixed }, opts),
);
