import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { cloudinary, cloudinaryEnabled } from "../config/cloudinary.js";
import { badRequest, wrap } from "../utils/http.js";

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };

const parser = multer({
  storage: cloudinaryEnabled
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]),
      }),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(badRequest("Only JPG, PNG, WEBP or PDF files are allowed")),
});

const toCloudinary = (file) =>
  new Promise((resolve, reject) =>
    cloudinary.uploader.upload_stream({ resource_type: "auto", folder: "pet-platform" }, (err, r) => (err ? reject(err) : resolve(r.secure_url))).end(file.buffer),
  );

/** upload.array("files") then sets req.uploaded = [url, ...] (Cloudinary URL or local /uploads path). */
export const upload = (field = "files") => [
  parser.array(field),
  wrap(async (req, _res, next) => {
    const files = req.files ?? [];
    req.uploaded = cloudinaryEnabled ? await Promise.all(files.map(toCloudinary)) : files.map((f) => `/uploads/${f.filename}`);
    next();
  }),
];
