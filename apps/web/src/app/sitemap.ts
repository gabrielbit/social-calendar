import type { MetadataRoute } from "next";
import { getSitemapOccurrences, getSitemapProfiles } from "@/lib/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const [profiles, occurrences] = await Promise.all([
    getSitemapProfiles(),
    getSitemapOccurrences(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/explorar`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
  ];

  const profileRoutes: MetadataRoute.Sitemap = profiles.map((p) => ({
    url: `${base}/a/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const eventRoutes: MetadataRoute.Sitemap = occurrences.map((o) => ({
    url: `${base}/e/${o.id}`,
    lastModified: new Date(o.starts_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...profileRoutes, ...eventRoutes];
}
