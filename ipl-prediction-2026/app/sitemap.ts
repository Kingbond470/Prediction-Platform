import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://iplprediction2026.in";
  return [
    { url: base,           lastModified: new Date(), changeFrequency: "hourly",  priority: 1 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/login`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/results`,lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
  ];
}
