import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { TEAM_CONFIG } from "@/app/lib/teams";

const VALID_TEAMS = new Set(Object.keys(TEAM_CONFIG));

function isAuthorized(request: NextRequest): boolean {
  const secret = request.headers.get("x-admin-secret");
  const envSecret = process.env.ADMIN_SECRET;
  if (!envSecret || !secret) return false;
  try {
    return timingSafeEqual(Buffer.from(secret), Buffer.from(envSecret));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      match_number,
      team_1,
      team_2,
      venue,
      city,
      match_date,
      team_1_probability,
      team_2_probability,
      initial_count_team_1,
      initial_count_team_2,
    } = body;

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!match_number || !team_1 || !team_2 || !venue || !city || !match_date) {
      return NextResponse.json(
        { error: "match_number, team_1, team_2, venue, city and match_date are required" },
        { status: 400 }
      );
    }

    if (!VALID_TEAMS.has(team_1.toUpperCase()) || !VALID_TEAMS.has(team_2.toUpperCase())) {
      return NextResponse.json({ error: "Invalid team code" }, { status: 400 });
    }

    if (team_1.toUpperCase() === team_2.toUpperCase()) {
      return NextResponse.json({ error: "team_1 and team_2 must be different" }, { status: 400 });
    }

    const p1 = Number(team_1_probability ?? 50);
    const p2 = Number(team_2_probability ?? 50);
    if (p1 + p2 !== 100 || p1 < 1 || p2 < 1) {
      return NextResponse.json(
        { error: "team_1_probability + team_2_probability must equal 100" },
        { status: 400 }
      );
    }

    // ── Duplicate check ───────────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from("matches")
      .select("id")
      .eq("match_number", match_number)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Match #${match_number} already exists` },
        { status: 409 }
      );
    }

    // ── Insert ────────────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("matches")
      .insert({
        match_number: Number(match_number),
        team_1: team_1.toUpperCase(),
        team_2: team_2.toUpperCase(),
        venue: venue.trim(),
        city: city.trim(),
        match_date,
        status: "upcoming",
        team_1_probability: p1,
        team_2_probability: p2,
        initial_count_team_1: Number(initial_count_team_1 ?? 500),
        initial_count_team_2: Number(initial_count_team_2 ?? 500),
      })
      .select("id, match_number, team_1, team_2")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, match: data });
  } catch (err) {
    console.error("[admin/matches]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
