import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase, Match } from "@/lib/supabase";
import { matchToSlug, findMatchBySlug } from "@/lib/matchSlug";
import { getTeamPlayers } from "@/app/lib/players";
import { getVenueInfo } from "@/app/lib/venues";
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

  const matchDateFormatted = new Date(match.match_date).toLocaleString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });

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
        name: `What time does ${match.team_1} vs ${match.team_2} IPL 2026 start?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${match.team_1} vs ${match.team_2} IPL 2026 Match #${match.match_number} starts at ${matchDateFormatted} IST at ${match.venue}, ${match.city}.`,
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
      {
        "@type": "Question",
        name: `What is the AI prediction for ${match.team_1} vs ${match.team_2}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `The AI model on IPL Prediction 2026 gives ${favourite} a ${favPct}% win probability and ${underdog} a ${100 - favPct}% chance for this match. The AI analyses team form, head-to-head records and venue conditions to generate its prediction.`,
        },
      },
      {
        "@type": "Question",
        name: `Is IPL Prediction 2026 free? Is it real money betting?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes, IPL Prediction 2026 is completely free. It is not a betting or gambling platform — no money is wagered or won. You earn points and compete on a leaderboard purely for cricket bragging rights.`,
        },
      },
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://iplprediction2026.in" },
      { "@type": "ListItem", position: 2, name: "Match Predictions", item: "https://iplprediction2026.in" },
      {
        "@type": "ListItem", position: 3,
        name: `${match.team_1} vs ${match.team_2}`,
        item: `https://iplprediction2026.in/predict/${params.slug}`,
      },
    ],
  };

  const players1 = getTeamPlayers(match.team_1);
  const players2 = getTeamPlayers(match.team_2);
  const venue    = getVenueInfo(match.venue);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <PredictContent match={match} />

      {/* ── Server-rendered SEO content ─────────────────────────────────────────
          Rendered in HTML on first load so Google indexes it without JS execution.
          Sits below the interactive client component intentionally.              */}

      {/* Venue Analysis */}
      {venue && (
        <div className="max-w-2xl mx-auto mt-5 glass rounded-2xl p-5 space-y-2">
          <h2 className="font-display font-bold text-white text-base">
            📍 {match.venue} — Pitch &amp; Conditions
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">{venue.pitchNote}</p>
          <p className="text-gray-400 text-sm leading-relaxed">{venue.conditionsNote}</p>
          <div className="flex gap-4 pt-1">
            <div className="text-center">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Capacity</p>
              <p className="text-sm font-bold text-white">{venue.capacity}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Avg 1st Innings</p>
              <p className="text-sm font-bold text-white">{venue.avgFirstInningsScore}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Pitch Type</p>
              <p className="text-sm font-bold text-white capitalize">{venue.pitchType}</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Players — server-rendered for reliable indexing */}
      {(players1 || players2) && (
        <div className="max-w-2xl mx-auto mt-5 glass rounded-2xl p-5">
          <h2 className="font-display font-bold text-white text-base mb-4">
            ⭐ Key Players to Watch — {match.team_1} vs {match.team_2}
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {([
              { team: match.team_1, players: players1 },
              { team: match.team_2, players: players2 },
            ] as const).map(({ team, players }) =>
              players ? (
                <div key={team}>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">{team}</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">🏏 Batting</p>
                      {players.bat.map((name) => (
                        <p key={name} className="text-xs text-gray-300 py-0.5">{name}</p>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase font-bold mb-1">🎯 Bowling</p>
                      {players.bowl.map((name) => (
                        <p key={name} className="text-xs text-gray-300 py-0.5">{name}</p>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null
            )}
          </div>
          {players1 && players2 && (
            <p className="text-gray-500 text-xs mt-4 leading-relaxed border-t border-white/[0.06] pt-3">
              Watch {players1.bat[0]} and {players1.bowl[0]} for {match.team_1} against
              {" "}{players2.bat[0]} and {players2.bowl[0]} for {match.team_2} in
              IPL 2026 Match #{match.match_number} at {match.venue}.
            </p>
          )}
        </div>
      )}

      {/* FAQ — always visible in DOM for FAQPage schema indexing */}
      <div className="max-w-2xl mx-auto mt-5 glass rounded-2xl p-5">
        <h2 className="font-display font-bold text-white text-base mb-4">
          {match.team_1} vs {match.team_2} — Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqSchema.mainEntity.map((item) => (
            <div key={item.name} className="border-b border-white/[0.06] pb-4 last:border-0 last:pb-0">
              <p className="text-sm font-semibold text-white mb-1">{item.name}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{item.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Internal links */}
      <div className="max-w-2xl mx-auto mt-5 flex flex-wrap gap-3 justify-center pb-4">
        <a href="/leaderboard" className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.07] hover:border-white/20">
          🏆 See Leaderboard
        </a>
        <a href="/about" className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.07] hover:border-white/20">
          ℹ️ How IPL Prediction Works
        </a>
        <a href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.07] hover:border-white/20">
          ← All Matches
        </a>
      </div>
    </>
  );
}
