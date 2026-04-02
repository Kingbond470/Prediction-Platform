import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { scoreMatch } from "@/lib/scoreMatch";

// Constant-time secret check — prevents timing side-channel brute force
function isAuthorized(request: NextRequest): boolean {
  const secret = request.headers.get("x-admin-secret");
  const envSecret = process.env.ADMIN_SECRET;
  if (!envSecret || !secret) return false;
  try {
    return timingSafeEqual(Buffer.from(secret), Buffer.from(envSecret));
  } catch {
    return false; // buffers differ in length → not equal
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { match_id, winner } = await request.json();

    if (!match_id || !winner) {
      return NextResponse.json({ error: "match_id and winner are required" }, { status: 400 });
    }

    // Validate match exists and winner is valid before scoring
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, team_1, team_2, status")
      .eq("id", match_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if (match.status === "completed") {
      return NextResponse.json(
        { error: "Match is already completed. Results have already been scored." },
        { status: 409 }
      );
    }
    if (winner !== match.team_1 && winner !== match.team_2) {
      return NextResponse.json(
        { error: `Winner must be "${match.team_1}" or "${match.team_2}"` },
        { status: 400 }
      );
    }

    const scored = await scoreMatch(match_id, winner);

    return NextResponse.json({
      success: true,
      match_id,
      winner,
      scored,
      message: scored === 0
        ? "Match completed. No predictions to score."
        : `Scored ${scored} predictions. Leaderboard updated.`,
    });
  } catch (err) {
    console.error("[admin/result]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
