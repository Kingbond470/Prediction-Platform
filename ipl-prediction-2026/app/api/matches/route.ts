import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { fetchIPLOdds } from "@/app/lib/oddsApi";

// Never cache — matches update frequently (live odds, stale date refresh)
export const dynamic = "force-dynamic";

// ── Mock fallback (no Supabase + no Odds API) ─────────────────────────────────
function getMockMatches() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    { id: "mock-1", match_number: 1, team_1: "CSK", team_2: "RCB", venue: "MA Chidambaram Stadium", city: "Chennai", match_date: new Date(now + 2 * day).toISOString(), vote_start_time: new Date(now - 60 * 60 * 1000).toISOString(), vote_end_time: new Date(now + 2 * day - 30 * 60 * 1000).toISOString(), team_1_probability: 65, team_2_probability: 35, winner: null, status: "upcoming", initial_count_team_1: 7000, initial_count_team_2: 3000 },
    { id: "mock-2", match_number: 2, team_1: "MI",  team_2: "DC",  venue: "Arun Jaitley Stadium", city: "Delhi", match_date: new Date(now + 3 * day).toISOString(), vote_start_time: new Date(now - 60 * 60 * 1000).toISOString(), vote_end_time: new Date(now + 3 * day - 30 * 60 * 1000).toISOString(), team_1_probability: 60, team_2_probability: 40, winner: null, status: "upcoming", initial_count_team_1: 6500, initial_count_team_2: 3500 },
    { id: "mock-3", match_number: 3, team_1: "KKR", team_2: "SRH", venue: "Eden Gardens", city: "Kolkata", match_date: new Date(now + 4 * day).toISOString(), vote_start_time: new Date(now - 60 * 60 * 1000).toISOString(), vote_end_time: new Date(now + 4 * day - 30 * 60 * 1000).toISOString(), team_1_probability: 55, team_2_probability: 45, winner: null, status: "upcoming", initial_count_team_1: 5500, initial_count_team_2: 4500 },
  ];
}

// Venue map for home team
const TEAM_VENUE: Record<string, { venue: string; city: string }> = {
  CSK:  { venue: "MA Chidambaram Stadium",             city: "Chennai" },
  MI:   { venue: "Wankhede Stadium",                   city: "Mumbai" },
  RCB:  { venue: "M. Chinnaswamy Stadium",             city: "Bengaluru" },
  KKR:  { venue: "Eden Gardens",                       city: "Kolkata" },
  DC:   { venue: "Arun Jaitley Stadium",               city: "Delhi" },
  SRH:  { venue: "Rajiv Gandhi Intl. Stadium",         city: "Hyderabad" },
  PBKS: { venue: "Maharaja Yadavindra Singh Stadium",  city: "Mullanpur" },
  RR:   { venue: "Sawai Mansingh Stadium",             city: "Jaipur" },
  GT:   { venue: "Narendra Modi Stadium",              city: "Ahmedabad" },
  LSG:  { venue: "BRSABV Ekana Cricket Stadium",       city: "Lucknow" },
};

export async function GET() {
  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasOddsKey  = !!(process.env.ODDS_API_KEY && process.env.ODDS_API_KEY !== "YOUR_KEY_HERE");

  // ── Case 1: No Supabase — use Odds API or mock directly ───────────────────
  if (!hasSupabase) {
    if (hasOddsKey) {
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
              team_1: m.team1, team_2: m.team2,
              venue: loc.venue, city: loc.city,
              match_date: m.matchDate,
              vote_start_time: new Date(matchDate - 24 * 60 * 60 * 1000).toISOString(),
              vote_end_time:   new Date(matchDate - 30 * 60 * 1000).toISOString(),
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
        console.warn("Odds API failed (no Supabase), using mock:", err);
      }
    }
    return NextResponse.json({ success: true, matches: getMockMatches(), source: "mock" });
  }

  // ── Case 2: Supabase configured — sync Odds API into Supabase, serve from DB ─
  try {
    // Step 2a: If Odds API available, sync live matches into Supabase
    if (hasOddsKey) {
      try {
        const oddsMatches = await fetchIPLOdds();
        if (oddsMatches.length > 0) {
          await syncOddsMatchesToSupabase(oddsMatches);
        }
      } catch (err) {
        // Odds API sync failed — just serve existing Supabase data
        console.warn("Odds API sync failed, serving Supabase data:", err);
      }
    }

    // Step 2b: Fetch from Supabase (has proper UUIDs for predictions)
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

    // Step 2c: Refresh any individually stale seed matches that weren't replaced by Odds API
    let staleIdx = 0;
    const refreshed = await Promise.all(
      liveMatches.map(async (m) => {
        const isStale = new Date(m.match_date).getTime() < now;
        if (!isStale) return m;
        staleIdx++;
        const newMatchDate = new Date(now + staleIdx * day);
        const updated = {
          ...m,
          match_date:      newMatchDate.toISOString(),
          vote_start_time: new Date(now - 60 * 60 * 1000).toISOString(),
          vote_end_time:   new Date(newMatchDate.getTime() - 30 * 60 * 1000).toISOString(),
          status: "upcoming" as const,
          winner: null,
        };
        await supabase.from("matches").update({
          match_date:      updated.match_date,
          vote_start_time: updated.vote_start_time,
          vote_end_time:   updated.vote_end_time,
          status:          updated.status,
          winner:          updated.winner,
        }).eq("id", m.id);
        return updated;
      })
    );

    return NextResponse.json({ success: true, matches: refreshed, source: "supabase" });
  } catch (err) {
    console.error("GET /api/matches error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Sync Odds API matches → Supabase ─────────────────────────────────────────
// Strategy: for each Odds API match, find existing row by (team_1, team_2) in
// either order. If found → update probabilities + date. If not found → insert.
// This ensures Supabase UUIDs are stable for predictions.
async function syncOddsMatchesToSupabase(oddsMatches: Awaited<ReturnType<typeof fetchIPLOdds>>) {
  // Get max existing match_number so new inserts don't collide with seed data
  const { data: maxRow } = await supabase
    .from("matches")
    .select("match_number")
    .order("match_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const maxMatchNum = maxRow?.match_number ?? 0;
  let insertCount = 0;

  for (const [, m] of oddsMatches.entries()) {
    const matchDate   = new Date(m.matchDate);
    const voteStart   = new Date(matchDate.getTime() - 24 * 60 * 60 * 1000);
    const voteEnd     = new Date(matchDate.getTime() - 30 * 60 * 1000);
    const loc         = TEAM_VENUE[m.team1] ?? { venue: "TBD", city: "TBD" };
    const now         = new Date();
    const status      = now >= matchDate ? "live" : "upcoming";

    // Look for existing row — two separate queries avoid .single() PGRST116 on 0 rows
    const { data: fwd } = await supabase
      .from("matches").select("id")
      .eq("team_1", m.team1).eq("team_2", m.team2)
      .maybeSingle();
    const { data: rev } = await supabase
      .from("matches").select("id")
      .eq("team_1", m.team2).eq("team_2", m.team1)
      .maybeSingle();
    const existing = fwd || rev;

    if (existing) {
      // Update probabilities, date, and status from live Odds API
      const { error: updErr } = await supabase.from("matches").update({
        match_date:          matchDate.toISOString(),
        vote_start_time:     voteStart.toISOString(),
        vote_end_time:       voteEnd.toISOString(),
        team_1_probability:  m.team1Probability,
        team_2_probability:  m.team2Probability,
        status,
      }).eq("id", existing.id);
      if (updErr) console.error(`[sync] update ${m.team1}v${m.team2} error:`, updErr.message);
      else console.log(`[sync] updated ${m.team1} vs ${m.team2}`);
    } else {
      // Insert brand new match from Odds API
      insertCount++;
      const { error: insErr } = await supabase.from("matches").insert({
        match_number:        maxMatchNum + insertCount,
        team_1:              m.team1,
        team_2:              m.team2,
        venue:               loc.venue,
        city:                loc.city,
        match_date:          matchDate.toISOString(),
        vote_start_time:     voteStart.toISOString(),
        vote_end_time:       voteEnd.toISOString(),
        team_1_probability:  m.team1Probability,
        team_2_probability:  m.team2Probability,
        status,
        winner:              null,
        initial_count_team_1: 5000 + Math.floor(Math.random() * 5000),
        initial_count_team_2: 3000 + Math.floor(Math.random() * 4000),
      });
      if (insErr) console.error(`[sync] insert ${m.team1}v${m.team2} error:`, insErr.message);
      else console.log(`[sync] inserted ${m.team1} vs ${m.team2}`);
    }
  }
}
