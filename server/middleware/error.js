import { isProd } from "../config/env.js";
import { captureError } from "../config/monitoring.js";

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: "Route not found" });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status ?? 500;
  let message = err.message;
  if (err.name === "ValidationError") status = 400;
  if (err.name === "CastError") { status = 400; message = "Invalid id"; }
  if (err.code === 11000) { status = 409; message = "Already exists"; }
  if (status >= 500) {
    console.error(err);
    captureError(err, { userId: req.user?._id, method: req.method, path: req.route?.path ?? req.path, source: "api" });
    if (isProd) message = "Server error";
  }
  res.status(status).json({ error: message, details: err.details });
}
