/** Empties the end-to-end test database. Refuses to touch any database whose name does not end in "-e2e". */
import mongoose from "mongoose";
import { connectDb } from "../config/db.js";

const conn = await connectDb();
if (!conn.name.endsWith("-e2e")) {
  console.error(`Refusing to drop "${conn.name}": only databases ending in -e2e may be reset.`);
  process.exit(1);
}
await conn.dropDatabase();
console.log(`Reset ${conn.name}`);
await mongoose.disconnect();
