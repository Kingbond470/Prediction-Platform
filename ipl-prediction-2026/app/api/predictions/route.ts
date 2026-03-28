import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// In-memory store for mock predictions (when Supabase not available)
const mockPredictions: Map<string, { predicted_team: string; ai_predicted_team: string }> = new Map();

// Mock match data — mirrors the fallback in /api/matches
function getMockMatch(matchId: string) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const mocks: Record<string, object> = {
    "mock-1": { id: "mock-1", match_number: 1, team_1: "CSK", team_2: "RCB", match_date: new Date(now + 2 * day).toISOString(), team_1_probability: 65, team_2_probability: 35, status: "upcoming", initial_count_team_1: 7000, initial_count_team_2: 3000 },
    "mock-2": { id: "mock-2", match_number: 2, team_1: "MI",  team_2: "DC",  match_date: new Date(now + 3 * day).toISOString(), team_1_probability: 60, team_2_probability: 40, status: "upcoming", initial_count_team_1: 6500, initial_count_team_2: 3500 },
    "mock-3": { id: "mock-3", match_number: 3, team_1: "KKR", team_2: "SRH", match_date: new Date(now + 4 * day).toISOString(), team_1_probability: 55, team_2_probability: 45, status: "upcoming", initial_count_team_1: 5500, initial_count_team_2: 4500 },
  };
  return mocks[matchId] ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, match_id, predicted_team } = await request.json();

    if (!user_id || !match_id || !predicted_team) {
      return NextResponse.json({ error: "user_id, match_id and predicted_team are required" }, { status: 400 });
    }

    // ── Try Supabase first ────────────────────────────────────────────────────
    let match = null;
    const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (hasSupabase) {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .eq("id", match_id)
        .single();
      match = data;
    }

    // ── Fall back to mock data (mock-1/2/3 or odds API IDs not yet synced) ──
    if (!match) {
      match = getMockMatch(match_id);
    }

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Voting is open while the match is "upcoming" and hasn't kicked off yet.
    // (vote_end_time in the DB may be stale; we rely on match_date as source of truth)
    const now = new Date();
    const matchStartTime = new Date(match.match_date);

    if (match.status !== "upcoming" || now >= matchStartTime) {
      return NextResponse.json(
        { error: "Voting is closed for this match" },
        { status: 400 }
      );
    }

    // AI prediction based on team probabilities
    const aiPredictedTeam =
      Math.random() > match.team_1_probability / 100
        ? match.team_1
        : match.team_2;

    const mockKey = `${user_id}::${match_id}`;

    // ── Mock mode (no Supabase or match not in DB) ────────────────────────────
    if (!hasSupabase || match.id?.startsWith("mock-")) {
      if (mockPredictions.has(mockKey)) {
        return NextResponse.json(
          { error: "You already predicted for this match" },
          { status: 400 }
        );
      }
      mockPredictions.set(mockKey, { predicted_team, ai_predicted_team: aiPredictedTeam });

      const team1Count = match.initial_count_team_1 + 1;
      const team2Count = match.initial_count_team_2;
      const total = team1Count + team2Count;
      return NextResponse.json({
        success: true,
        prediction: { id: `mock-pred-${Date.now()}`, user_id, match_id, predicted_team, ai_predicted_team: aiPredictedTeam },
        updated_counts: {
          team_1_count: team1Count,
          team_2_count: team2Count,
          team_1_percentage: ((team1Count / total) * 100).toFixed(1),
          team_2_percentage: ((team2Count / total) * 100).toFixed(1),
        },
      });
    }

    // ── Supabase mode ─────────────────────────────────────────────────────────
    // Check if user already predicted
    const { data: existingPrediction } = await supabase
      .from("predictions")
      .select("id")
      .eq("user_id", user_id)
      .eq("match_id", match_id)
      .single();

    if (existingPrediction) {
      return NextResponse.json(
        { error: "You already predicted for this match" },
        { status: 400 }
      );
    }

    // Create prediction
    const { data: prediction, error } = await supabase
      .from("predictions")
      .insert({
        user_id,
        match_id,
        predicted_team,
        ai_predicted_team: aiPredictedTeam,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get updated counts
    const { count: team1RealCount } = await supabase
      .from("predictions")
      .select("*", { count: "exact", head: true })
      .eq("match_id", match_id)
      .eq("predicted_team", match.team_1);

    const { count: team2RealCount } = await supabase
      .from("predictions")
      .select("*", { count: "exact", head: true })
      .eq("match_id", match_id)
      .eq("predicted_team", match.team_2);

    const team1Count = match.initial_count_team_1 + (team1RealCount || 0);
    const team2Count = match.initial_count_team_2 + (team2RealCount || 0);
    const total = team1Count + team2Count;

    return NextResponse.json({
      success: true,
      prediction,
      updated_counts: {
        team_1_count: team1Count,
        team_2_count: team2Count,
        team_1_percentage: ((team1Count / total) * 100).toFixed(1),
        team_2_percentage: ((team2Count / total) * 100).toFixed(1),
      },
    });
  } catch (error) {
    console.error("Error creating prediction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Return in-memory mock predictions for this user
      const userPreds = Array.from(mockPredictions.entries())
        .filter(([key]) => key.startsWith(`${userId}::`))
        .map(([key, val]) => ({
          id: `mock-${key}`,
          user_id: userId,
          match_id: key.split("::")[1],
          ...val,
        }));
      return NextResponse.json({ success: true, predictions: userPreds });
    }

    const { data: predictions } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      success: true,
      predictions: predictions || [],
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
