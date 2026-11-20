/**
 * Moves files saved on local disk to Cloudinary and rewrites the database to point at them.
 *
 *   pnpm migrate:uploads -- --dry-run     show what would move, changes nothing
 *   pnpm migrate:uploads                  do it
 *
 * Needs CLOUDINARY_* in .env. Safe to re-run: records already pointing at Cloudinary are skipped.
 * Local files are NOT deleted, so you can check the site first and remove the folders yourself.
 * Back up the database before the real run.
 */
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { cloudinary, cloudinaryEnabled } from "../config/cloudinary.js";
import { connectDb } from "../config/db.js";
import { PRIVATE_DIR, PRIVATE_PREFIX, UPLOAD_DIR } from "../middleware/upload.js";

const dry = process.argv.includes("--dry-run");
if (!cloudinaryEnabled) {
  console.error("Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env first.");
  process.exit(1);
}

const cache = new Map(); // old value -> new value, so a file used twice uploads once
let uploaded = 0;
let missing = 0;

async function moveValue(value) {
  if (cache.has(value)) return cache.get(value);
  const isPrivate = value.startsWith(PRIVATE_PREFIX) && !value.slice(PRIVATE_PREFIX.length).startsWith("cld~");
  const isPublic = value.startsWith("/uploads/");
  if (!isPrivate && !isPublic) return value;

  const file = path.join(isPrivate ? PRIVATE_DIR : UPLOAD_DIR, path.basename(value));
  if (!fs.existsSync(file)) {
    missing += 1;
    console.warn(`  missing on disk, left unchanged: ${value}`);
    return value;
  }
  if (dry) {
    console.log(`  would upload ${value}${isPrivate ? " (private)" : ""}`);
    return value;
  }
  const r = await cloudinary.uploader.upload(file, {
    resource_type: "auto",
    folder: isPrivate ? "pet-platform-private" : "pet-platform",
    ...(isPrivate ? { type: "authenticated" } : {}),
  });
  uploaded += 1;
  const next = isPrivate ? `${PRIVATE_PREFIX}cld~${r.resource_type}~${r.public_id.replaceAll("/", "~")}` : r.secure_url;
  cache.set(value, next);
  return next;
}

/** Returns a copy with every local file path replaced, plus whether anything changed. */
async function walk(node) {
  if (typeof node === "string") {
    const next = await moveValue(node);
    return [next, next !== node];
  }
  if (Array.isArray(node)) {
    let changed = false;
    const out = [];
    for (const item of node) {
      const [v, c] = await walk(item);
      out.push(v);
      changed ||= c;
    }
    return [out, changed];
  }
  if (node && typeof node === "object" && node.constructor === Object) {
    let changed = false;
    const out = {};
    for (const [k, item] of Object.entries(node)) {
      const [v, c] = await walk(item);
      out[k] = v;
      changed ||= c;
    }
    return [out, changed];
  }
  return [node, false];
}

await connectDb();
const collections = await mongoose.connection.db.listCollections().toArray();
for (const { name } of collections) {
  if (name.startsWith("system.")) continue;
  const col = mongoose.connection.db.collection(name);
  let touched = 0;
  for await (const doc of col.find({})) {
    const set = {};
    for (const [key, value] of Object.entries(doc)) {
      if (key === "_id") continue;
      const [next, changed] = await walk(value);
      if (changed) set[key] = next;
    }
    if (Object.keys(set).length && !dry) await col.updateOne({ _id: doc._id }, { $set: set });
    if (Object.keys(set).length) touched += 1;
  }
  if (touched) console.log(`${name}: ${touched} document(s) updated`);
}
console.log(dry ? "Dry run finished. Nothing was changed." : `Done. Uploaded ${uploaded} file(s), ${missing} missing on disk.`);
await mongoose.disconnect();
