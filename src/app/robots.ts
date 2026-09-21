import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";

// Public pages (landing, shops, products, legal) stay indexable; private spaces do not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/onboarding", "/api/", "/auth/", "/reset-password"] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
