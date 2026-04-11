// POST /api/push/streak-alert
// Sends a "streak at risk" push to users who haven't predicted the given match
// and have a current_streak >= 2.
//
// Protected by CRON_SECRET. Call this ~2h before a match starts:
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//        -H "Content-Type: application/json" \
//        -d '{"match_id":"<uuid>"}' \
//        https://iplprediction2026.in/api/push/streak-alert

import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { sendStreakAtRiskPush } from "@/lib/sendPushNotifications";
import { timingSafeEqual } from "crypto";

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return !process.env.NEXT_PUBLIC_SUPABASE_URL;
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(cronSecret));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { match_id } = body as { match_id?: string };

  if (!match_id) {
    return NextResponse.json({ error: "match_id required" }, { status: 400 });
  }

  // Fetch match label
  const { data: match } = await supabase
    .from("matches")
    .select("team_1, team_2, status")
    .eq("id", match_id)
    .single();

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  if (match.status === "completed") {
    return NextResponse.json({ skipped: true, reason: "Match already completed" });
  }

  const label = `${match.team_1} vs ${match.team_2}`;
  const sent = await sendStreakAtRiskPush(match_id, label);

  return NextResponse.json({ success: true, sent });
}
