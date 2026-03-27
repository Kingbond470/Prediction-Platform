import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { user_id, match_id, predicted_team } = await request.json();

    // Get match info
    const { data: match } = await supabase
      .from("matches")
      .select("*")
      .eq("id", match_id)
      .single();

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Check voting window
    const now = new Date();
    const voteEndTime = new Date(match.vote_end_time);

    if (now > voteEndTime) {
      return NextResponse.json(
        { error: "Voting window closed" },
        { status: 400 }
      );
    }

    // Check if user already predicted
    const { data: existingPrediction } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", user_id)
      .eq("match_id", match_id)
      .single();

    if (existingPrediction) {
      return NextResponse.json(
        { error: "You already predicted for this match" },
        { status: 400 }
      );
    }

    // AI prediction based on team probabilities
    const aiPredictedTeam =
      Math.random() > match.team_1_probability / 100
        ? match.team_1
        : match.team_2;

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
      return NextResponse.json(
        { error: "user_id required" },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
