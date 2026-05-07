import type { MetadataRoute } from "next";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://virtualtryon.dpdns.org"
).replace(/\/$/, "");

const publicRoutes = [
  "",
  "/blog",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/refund",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route || "/"}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
