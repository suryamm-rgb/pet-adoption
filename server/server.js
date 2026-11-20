import http from "node:http";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { startJobs } from "./jobs/index.js";
import { initSockets } from "./sockets/index.js";
import { captureError, flushMonitoring, monitoringEnabled } from "./config/monitoring.js";
import { cloudinaryEnabled } from "./config/cloudinary.js";
import { razorpayMode } from "./config/razorpay.js";

await connectDb();
const server = http.createServer(createApp());
initSockets(server);
startJobs();

// Graceful shutdown so deploys do not drop in-flight requests.
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err);
  captureError(err, { source: "unhandledRejection" });
});
process.on("uncaughtException", async (err) => {
  console.error("[uncaughtException]", err);
  captureError(err, { source: "uncaughtException" });
  await flushMonitoring();
  process.exit(1); // let Docker/the host restart a process in an unknown state
});

server.listen(env.port, () => {
  console.log(`API on http://localhost:${env.port}  (payments: ${razorpayMode.toUpperCase()}, images: ${cloudinaryEnabled ? "Cloudinary" : "local disk"}, monitoring: ${monitoringEnabled ? "Sentry" : "off"})`);
});
