import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { fetchIPLOdds } from "@/app/lib/oddsApi";

// Fallback mock data when Supabase is not configured
function getMockMatches() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    {
      id: "mock-1",
      match_number: 1,
      team_1: "CSK",
      team_2: "RCB",
      venue: "MA Chidambaram Stadium",
      city: "Chennai",
      match_date: new Date(now + 2 * day).toISOString(),
      vote_start_time: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      vote_end_time: new Date(now + 2 * day - 30 * 60 * 1000).toISOString(),
      team_1_probability: 65,
      team_2_probability: 35,
      winner: null,
      status: "upcoming",
      initial_count_team_1: 7000,
      initial_count_team_2: 3000,
    },
    {
      id: "mock-2",
      match_number: 2,
      team_1: "MI",
      team_2: "DC",
      venue: "Arun Jaitley Stadium",
      city: "Delhi",
      match_date: new Date(now + 3 * day).toISOString(),
      vote_start_time: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      vote_end_time: new Date(now + 3 * day - 30 * 60 * 1000).toISOString(),
      team_1_probability: 60,
      team_2_probability: 40,
      winner: null,
      status: "upcoming",
      initial_count_team_1: 6500,
      initial_count_team_2: 3500,
    },
    {
      id: "mock-3",
      match_number: 3,
      team_1: "KKR",
      team_2: "SRH",
      venue: "Eden Gardens",
      city: "Kolkata",
      match_date: new Date(now + 4 * day).toISOString(),
      vote_start_time: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      vote_end_time: new Date(now + 4 * day - 30 * 60 * 1000).toISOString(),
      team_1_probability: 55,
      team_2_probability: 45,
      winner: null,
      status: "upcoming",
      initial_count_team_1: 5500,
      initial_count_team_2: 4500,
    },
  ];
}

// Venue lookup for Odds API matches (no venue in odds data)
const TEAM_VENUE: Record<string, { venue: string; city: string }> = {
  CSK:  { venue: "MA Chidambaram Stadium",            city: "Chennai" },
  MI:   { venue: "Wankhede Stadium",                  city: "Mumbai" },
  RCB:  { venue: "M. Chinnaswamy Stadium",            city: "Bengaluru" },
  KKR:  { venue: "Eden Gardens",                      city: "Kolkata" },
  DC:   { venue: "Arun Jaitley Stadium",              city: "Delhi" },
  SRH:  { venue: "Rajiv Gandhi Intl. Stadium",        city: "Hyderabad" },
  PBKS: { venue: "Maharaja Yadavindra Singh Stadium", city: "Mullanpur" },
  RR:   { venue: "Sawai Mansingh Stadium",            city: "Jaipur" },
  GT:   { venue: "Narendra Modi Stadium",             city: "Ahmedabad" },
  LSG:  { venue: "BRSABV Ekana Cricket Stadium",      city: "Lucknow" },
};

export async function GET() {
  // ── Priority 1: Live odds from The Odds API ────────────────────────────────
  if (process.env.ODDS_API_KEY) {
    try {
      const oddsMatches = await fetchIPLOdds();
      if (oddsMatches.length > 0) {
        const now = Date.now();
        const matches = oddsMatches.map((m, i) => {
          const matchDate = new Date(m.matchDate).getTime();
          const loc = TEAM_VENUE[m.team1] ?? { venue: "TBD", city: "TBD" };
          return {
            id: m.oddsId,
            match_number: i + 1,
            team_1: m.team1,
            team_2: m.team2,
            venue: loc.venue,
            city: loc.city,
            match_date: m.matchDate,
            vote_start_time: new Date(matchDate - 24 * 60 * 60 * 1000).toISOString(),
            vote_end_time: new Date(matchDate - 30 * 60 * 1000).toISOString(),
            team_1_probability: m.team1Probability,
            team_2_probability: m.team2Probability,
            winner: null,
            status: now >= matchDate ? "live" : "upcoming",
            initial_count_team_1: 5000 + Math.floor(Math.random() * 5000),
            initial_count_team_2: 3000 + Math.floor(Math.random() * 4000),
          };
        });
        return NextResponse.json({ success: true, matches, source: "odds_api" });
      }
    } catch (err) {
      // Odds API failed — fall through to Supabase / mock
      console.warn("Odds API fetch failed, falling back:", err);
    }
  }

  // ── Priority 2: Supabase ───────────────────────────────────────────────────
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ success: true, matches: getMockMatches(), source: "mock" });
  }

  try {
    const { data: matches, error } = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const liveMatches = matches || [];

    // Refresh any individual stale matches (past match_date = seed data)
    // Assign them future dates spaced 1 day apart starting from tomorrow
    let staleIdx = 0;
    const refreshed = await Promise.all(
      liveMatches.map(async (m) => {
        const isStale = new Date(m.match_date).getTime() < now;
        if (!isStale) return m;

        staleIdx++;
        const newMatchDate = new Date(now + staleIdx * day);
        const updated = {
          ...m,
          match_date: newMatchDate.toISOString(),
          vote_start_time: new Date(now - 60 * 60 * 1000).toISOString(),
          vote_end_time: new Date(newMatchDate.getTime() - 30 * 60 * 1000).toISOString(),
          status: "upcoming" as const,
          winner: null,
        };
        await supabase
          .from("matches")
          .update({
            match_date: updated.match_date,
            vote_start_time: updated.vote_start_time,
            vote_end_time: updated.vote_end_time,
            status: updated.status,
            winner: updated.winner,
          })
          .eq("id", m.id);
        return updated;
      })
    );

    return NextResponse.json({ success: true, matches: refreshed });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
