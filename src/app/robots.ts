import type { MetadataRoute } from "next";

/** The dashboard is private: no crawler may index any of it. There is no sitemap. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
