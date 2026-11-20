import { v2 as cloudinary } from "cloudinary";

export const cloudinaryEnabled = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}
if (process.env.NODE_ENV === "production" && !cloudinaryEnabled) {
  console.warn("[storage] Cloudinary is not configured: uploads are saved on local disk. Mount volumes or set CLOUDINARY_* before going live");
}
export { cloudinary };
