import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/owner", "/caretaker", "/seller", "/account", "/login", "/register", "/reset-password", "/verify-email"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
