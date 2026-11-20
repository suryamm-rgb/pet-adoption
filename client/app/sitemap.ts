import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const pages: [string, number][] = [["/", 1], ["/caretakers", 0.9], ["/adopt", 0.8], ["/pets-for-sale", 0.8], ["/shop", 0.7], ["/legal/terms", 0.3], ["/legal/privacy", 0.3], ["/legal/refunds", 0.3], ["/legal/care-agreement", 0.3]];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map(([path, priority]) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly", priority }));
}
