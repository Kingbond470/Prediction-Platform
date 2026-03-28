import { NextResponse } from "next/server";
import { fetchIPLOdds } from "@/app/lib/oddsApi";
import { supabase } from "@/lib/supabase";

// Venue lookup — filled for known IPL home grounds
// Odds API doesn't provide venue; we infer from home team
const TEAM_VENUE: Record<string, { venue: string; city: string }> = {
  CSK:  { venue: "MA Chidambaram Stadium",   city: "Chennai" },
  MI:   { venue: "Wankhede Stadium",          city: "Mumbai" },
  RCB:  { venue: "M. Chinnaswamy Stadium",    city: "Bengaluru" },
  KKR:  { venue: "Eden Gardens",              city: "Kolkata" },
  DC:   { venue: "Arun Jaitley Stadium",      city: "Delhi" },
  SRH:  { venue: "Rajiv Gandhi Intl. Stadium",city: "Hyderabad" },
  PBKS: { venue: "Maharaja Yadavindra Singh Stadium", city: "Mullanpur" },
  RR:   { venue: "Sawai Mansingh Stadium",    city: "Jaipur" },
  GT:   { venue: "Narendra Modi Stadium",     city: "Ahmedabad" },
  LSG:  { venue: "BRSABV Ekana Cricket Stadium", city: "Lucknow" },
};

export async function GET() {
  if (!process.env.ODDS_API_KEY || process.env.ODDS_API_KEY === "YOUR_KEY_HERE") {
    return NextResponse.json(
      { error: "ODDS_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const oddsMatches = await fetchIPLOdds();

    if (oddsMatches.length === 0) {
      return NextResponse.json({ success: true, matches: [], synced: 0 });
    }

    // Upsert each match into Supabase
    const now = new Date();
    const upsertRows = oddsMatches.map((m, i) => {
      const matchDate = new Date(m.matchDate);
      const voteStart = new Date(matchDate.getTime() - 24 * 60 * 60 * 1000); // 24h before
      const voteEnd   = new Date(matchDate.getTime() - 30 * 60 * 1000);      // 30min before

      const location = TEAM_VENUE[m.team1] ?? { venue: "TBD", city: "TBD" };

      return {
        odds_api_id: m.oddsId,
        match_number: i + 1,
        team_1: m.team1,
        team_2: m.team2,
        venue: location.venue,
        city: location.city,
        match_date: matchDate.toISOString(),
        vote_start_time: voteStart.toISOString(),
        vote_end_time: voteEnd.toISOString(),
        team_1_probability: m.team1Probability,
        team_2_probability: m.team2Probability,
        status: now >= matchDate ? "live" : "upcoming",
        winner: null,
        initial_count_team_1: 5000 + Math.floor(Math.random() * 5000),
        initial_count_team_2: 3000 + Math.floor(Math.random() * 4000),
      };
    });

    // Try to upsert using odds_api_id as unique key
    // Falls back to returning raw odds if Supabase isn't set up
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { error } = await supabase
        .from("matches")
        .upsert(upsertRows, { onConflict: "odds_api_id", ignoreDuplicates: false });

      if (error) {
        // odds_api_id column might not exist yet — return raw data anyway
        console.warn("Supabase upsert warning:", error.message);
      }
    }

    return NextResponse.json({
      success: true,
      matches: oddsMatches,
      synced: oddsMatches.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
