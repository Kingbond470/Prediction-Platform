import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase, Match } from "@/lib/supabase";
import { matchToSlug, findMatchBySlug } from "@/lib/matchSlug";
import PredictContent from "./PredictContent";

// ─── Data helpers ─────────────────────────────────────────────────────────────

async function getAllMatches(): Promise<Match[]> {
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

async function getMatch(slug: string): Promise<Match | null> {
  const matches = await getAllMatches();
  return findMatchBySlug(slug, matches);
}

// ─── Static params (pre-render all known match pages) ────────────────────────

export async function generateStaticParams() {
  const matches = await getAllMatches();
  return matches.map((m) => ({ slug: matchToSlug(m) }));
}

// ─── Per-match metadata ───────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const match = await getMatch(params.slug);

  if (!match) {
    return { title: "Match Not Found | IPL Prediction 2026" };
  }

  const matchDate = new Date(match.match_date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const favourite =
    match.team_1_probability >= match.team_2_probability
      ? match.team_1
      : match.team_2;
  const favPct = Math.max(match.team_1_probability, match.team_2_probability);

  const title = `${match.team_1} vs ${match.team_2} Prediction Today — Who Will Win IPL 2026?`;
  const description =
    `Free ${match.team_1} vs ${match.team_2} match prediction for IPL 2026. ` +
    `AI gives ${favourite} a ${favPct}% win probability. ` +
    `See community votes, beat the AI, and predict the winner. ` +
    `Match at ${match.venue} on ${matchDate}.`;

  return {
    title,
    description,
    keywords: [
      `${match.team_1} vs ${match.team_2} prediction today`,
      `${match.team_1} vs ${match.team_2} who will win`,
      `${match.team_1} vs ${match.team_2} IPL 2026`,
      `${match.team_1} vs ${match.team_2} match prediction`,
      `who will win ${match.team_1} vs ${match.team_2} today`,
      `${match.team_1} vs ${match.team_2} IPL today match winner`,
      `IPL match prediction with AI`,
      `beat AI cricket prediction`,
    ],
    openGraph: {
      title,
      description,
      url: `https://iplprediction2026.in/predict/${params.slug}`,
      images: [
        {
          url: `https://iplprediction2026.in/api/og?team1=${match.team_1}&team2=${match.team_2}&match=${match.match_number}&prob1=${match.team_1_probability}&prob2=${match.team_2_probability}&venue=${encodeURIComponent(match.venue)}`,
          width: 1200,
          height: 630,
          alt: `${match.team_1} vs ${match.team_2} IPL 2026 Prediction`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        `https://iplprediction2026.in/api/og?team1=${match.team_1}&team2=${match.team_2}&match=${match.match_number}&prob1=${match.team_1_probability}&prob2=${match.team_2_probability}&venue=${encodeURIComponent(match.venue)}`,
      ],
    },
    alternates: {
      canonical: `https://iplprediction2026.in/predict/${params.slug}`,
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PredictPage({
  params,
}: {
  params: { slug: string };
}) {
  const match = await getMatch(params.slug);
  if (!match) notFound();

  // SportsEvent structured data for this specific match
  const sportsEventSchema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${match.team_1} vs ${match.team_2} — IPL 2026 Match #${match.match_number}`,
    startDate: match.match_date,
    location: {
      "@type": "SportsActivityLocation",
      name: match.venue,
      address: { "@type": "PostalAddress", addressLocality: match.city, addressCountry: "IN" },
    },
    sport: "Cricket",
    organizer: { "@type": "Organization", name: "BCCI / IPL", url: "https://www.iplt20.com" },
    description: `IPL 2026 Match #${match.match_number}: ${match.team_1} vs ${match.team_2} at ${match.venue}, ${match.city}. Free fan prediction contest — beat the AI.`,
    url: `https://iplprediction2026.in/predict/${params.slug}`,
    competitor: [
      { "@type": "SportsTeam", name: match.team_1 },
      { "@type": "SportsTeam", name: match.team_2 },
    ],
  };

  const favourite =
    match.team_1_probability >= match.team_2_probability ? match.team_1 : match.team_2;
  const favPct = Math.max(match.team_1_probability, match.team_2_probability);
  const underdog =
    match.team_1_probability < match.team_2_probability ? match.team_1 : match.team_2;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Who will win ${match.team_1} vs ${match.team_2} IPL 2026?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Our AI model gives ${favourite} a ${favPct}% chance of winning IPL 2026 Match #${match.match_number} at ${match.venue}. However, cricket is unpredictable — ${underdog} can pull off an upset. Make your own prediction and beat the AI!`,
        },
      },
      {
        "@type": "Question",
        name: `Where is ${match.team_1} vs ${match.team_2} IPL 2026 being played?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `IPL 2026 Match #${match.match_number} between ${match.team_1} and ${match.team_2} is being played at ${match.venue}, ${match.city}.`,
        },
      },
      {
        "@type": "Question",
        name: `How can I predict ${match.team_1} vs ${match.team_2} and win points?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Sign up free on IPL Prediction 2026, pick your winner, and earn 1,000 points for a correct prediction. If you beat the AI's pick, you get an extra +500 bonus points. Pick the underdog and win for 1,500 points total!`,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PredictContent match={match} />
    </>
  );
}
