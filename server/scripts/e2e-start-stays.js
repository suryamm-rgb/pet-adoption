/** End-to-end tests only: runs the "stay starts" job now instead of waiting for the hourly schedule. Refuses non "-e2e" databases. */
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";
import { startStays } from "../jobs/index.js";

const conn = await connectDb();
if (!conn.name.endsWith("-e2e")) {
  console.error(`Refusing to run on "${conn.name}": only databases ending in -e2e are allowed.`);
  process.exit(1);
}
console.log(`stays started: ${await startStays()}`);
await mongoose.disconnect();
