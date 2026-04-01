import { MetadataRoute } from "next";
import { supabase, Match } from "@/lib/supabase";
import { matchToSlug } from "@/lib/matchSlug";

async function getMatches(): Promise<Match[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
    const { data } = await supabase
      .from("matches")
      .select("*")
      .order("match_number", { ascending: true })
      .limit(74);
    return (data as Match[]) ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://iplprediction2026.in";
  const matches = await getMatches();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base,              lastModified: new Date(), changeFrequency: "hourly",  priority: 1.0 },
    { url: `${base}/results`, lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
    { url: `${base}/signup`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/login`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // One indexed page per match — highest priority for upcoming matches
  const matchPages: MetadataRoute.Sitemap = matches.map((m) => ({
    url: `${base}/predict/${matchToSlug(m)}`,
    lastModified: new Date(m.match_date),
    changeFrequency:
      m.status === "upcoming" ? "hourly" :
      m.status === "live"     ? "always" : "weekly",
    priority:
      m.status === "upcoming" ? 0.9 :
      m.status === "live"     ? 1.0 : 0.6,
  }));

  return [...staticPages, ...matchPages];
}
