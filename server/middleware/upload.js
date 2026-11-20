import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { cloudinary, cloudinaryEnabled } from "../config/cloudinary.js";
import { badRequest, wrap } from "../utils/http.js";

/** Public files (photos): served by express.static at /uploads. */
export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
/** Private files (ID proofs, vaccination papers): never served statically, only through /api/files/private with an access check. */
export const PRIVATE_DIR = path.resolve(process.cwd(), "private-uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_DIR, { recursive: true });

export const PRIVATE_PREFIX = "/api/files/private/";
const ALLOWED = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };

const makeParser = (dir) =>
  multer({
    storage: cloudinaryEnabled
      ? multer.memoryStorage()
      : multer.diskStorage({ destination: dir, filename: (_req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]) }),
    limits: { fileSize: 5 * 1024 * 1024, files: 6 },
    fileFilter: (_req, file, cb) => (ALLOWED[file.mimetype] ? cb(null, true) : cb(badRequest("Only JPG, PNG, WEBP or PDF files are allowed"))),
  });
const publicParser = makeParser(UPLOAD_DIR);
const privateParser = makeParser(PRIVATE_DIR);

const toCloudinary = (file, isPrivate) =>
  new Promise((resolve, reject) =>
    cloudinary.uploader
      .upload_stream({ resource_type: "auto", folder: isPrivate ? "pet-platform-private" : "pet-platform", ...(isPrivate ? { type: "authenticated" } : {}) }, (err, r) => {
        if (err) return reject(err);
        // Private assets are never exposed by URL: we keep a key and sign a short-lived link on access.
        resolve(isPrivate ? `${PRIVATE_PREFIX}cld~${r.resource_type}~${r.public_id.replaceAll("/", "~")}` : r.secure_url);
      })
      .end(file.buffer),
  );

/** upload("files") sets req.uploaded = [url, ...]. Pass { private: true } for sensitive documents. */
export const upload = (field = "files", { private: isPrivate = false } = {}) => [
  (isPrivate ? privateParser : publicParser).array(field),
  wrap(async (req, _res, next) => {
    const files = req.files ?? [];
    req.uploaded = cloudinaryEnabled
      ? await Promise.all(files.map((f) => toCloudinary(f, isPrivate)))
      : files.map((f) => (isPrivate ? PRIVATE_PREFIX + f.filename : `/uploads/${f.filename}`));
    next();
  }),
];

/** Resolve a stored private key to a local path or a signed Cloudinary URL. */
export function resolvePrivate(key) {
  if (key.startsWith("cld~")) {
    const [, resourceType, ...rest] = key.split("~");
    if (!cloudinaryEnabled) return null;
    return { redirect: cloudinary.url(rest.join("/"), { resource_type: resourceType, type: "authenticated", sign_url: true, secure: true }) };
  }
  if (!/^[\w-]+\.(jpg|png|webp|pdf)$/.test(key)) return null;
  const file = path.join(PRIVATE_DIR, key);
  return fs.existsSync(file) ? { file } : null;
}
