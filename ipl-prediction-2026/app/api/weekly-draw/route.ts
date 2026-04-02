import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentWeekNumber, getWeekDateRange } from "@/lib/weekUtils";
import { timingSafeEqual } from "crypto";

const WINNERS_PER_WEEK = 10;
const MIGRATION_ERROR_CODES = new Set(["42703", "42P01", "PGRST205", "PGRST204"]);

function isMigrationError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    MIGRATION_ERROR_CODES.has(String((err as { code: unknown }).code))
  );
}

/**
 * POST /api/weekly-draw
 *
 * Admin-only. Executes the random draw for the current (or specified) week.
 * Picks WINNERS_PER_WEEK random users from the pool of correct predictors.
 *
 * Headers: x-admin-secret: <ADMIN_SECRET env var>
 * Body (optional): { week_number: number }
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  const envSecret = process.env.ADMIN_SECRET;
  let authorized = false;
  try {
    authorized = !!secret && !!envSecret && timingSafeEqual(Buffer.from(secret), Buffer.from(envSecret));
  } catch { authorized = false; }
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { week_number?: number } = {};
  try {
    body = await req.json();
  } catch {
    // body is optional
  }

  const weekNumber = body.week_number ?? getCurrentWeekNumber();
  if (!weekNumber) {
    return NextResponse.json(
      { error: "IPL season not active and no week_number provided" },
      { status: 400 }
    );
  }

  try {
    // Guard: don't run twice for the same week (skip if table missing)
    try {
      const { data: existingDraw } = await supabase
        .from("weekly_draw_pool")
        .select("draw_status")
        .eq("week_number", weekNumber)
        .single();

      if (existingDraw?.draw_status === "completed") {
        return NextResponse.json(
          { error: `Draw for week ${weekNumber} already completed` },
          { status: 409 }
        );
      }

      await supabase.from("weekly_draw_pool").upsert(
        { week_number: weekNumber, draw_status: "in_progress", updated_at: new Date().toISOString() },
        { onConflict: "week_number" }
      );
    } catch (tableErr) {
      if (!isMigrationError(tableErr)) throw tableErr;
      // Tables not yet created — proceed without state tracking
    }

    const { start, end } = getWeekDateRange(weekNumber);

    // Fetch correct predictors this week by date range (works pre-migration)
    const { data: correctPredictions, error: fetchError } = await supabase
      .from("predictions")
      .select("user_id, users(username)")
      .eq("is_correct", true)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (fetchError) throw fetchError;

    // Deduplicate by user_id
    const seenUserIds = new Set<string>();
    const pool: Array<{ user_id: string; username: string }> = [];
    for (const row of correctPredictions ?? []) {
      if (!seenUserIds.has(row.user_id)) {
        seenUserIds.add(row.user_id);
        const username =
          (row.users as unknown as { username: string } | null)?.username ?? "unknown";
        pool.push({ user_id: row.user_id, username });
      }
    }

    if (pool.length === 0) {
      try {
        await supabase.from("weekly_draw_pool").upsert(
          { week_number: weekNumber, draw_status: "pending", total_correct_predictors: 0 },
          { onConflict: "week_number" }
        );
      } catch (tableErr) {
        if (!isMigrationError(tableErr)) throw tableErr;
      }
      return NextResponse.json({
        success: false,
        message: "No eligible predictors found for this week",
        weekNumber,
      });
    }

    // Fisher-Yates shuffle, pick first WINNERS_PER_WEEK
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const winners = pool.slice(0, Math.min(WINNERS_PER_WEEK, pool.length));

    const now = new Date().toISOString();

    // Insert winners (skip if table missing)
    try {
      const winnerRows = winners.map((w) => ({
        user_id: w.user_id,
        username: w.username,
        week_number: weekNumber,
        announced_at: now,
      }));
      const { error: insertError } = await supabase
        .from("weekly_voucher_winners")
        .insert(winnerRows);
      if (insertError) throw insertError;
    } catch (tableErr) {
      if (!isMigrationError(tableErr)) throw tableErr;
    }

    // Mark draw complete (skip if table missing)
    try {
      await supabase.from("weekly_draw_pool").upsert(
        {
          week_number: weekNumber,
          draw_status: "completed",
          total_correct_predictors: pool.length,
          draw_executed_at: now,
          updated_at: now,
        },
        { onConflict: "week_number" }
      );
    } catch (tableErr) {
      if (!isMigrationError(tableErr)) throw tableErr;
    }

    return NextResponse.json({
      success: true,
      weekNumber,
      totalPool: pool.length,
      winnersSelected: winners.length,
      winners: winners.map((w) => w.username),
    });
  } catch (err) {
    console.error("[weekly-draw] error:", err);
    try {
      await supabase.from("weekly_draw_pool").upsert(
        { week_number: weekNumber, draw_status: "pending" },
        { onConflict: "week_number" }
      );
    } catch {
      // ignore
    }
    return NextResponse.json(
      { success: false, error: "Draw failed" },
      { status: 500 }
    );
  }
}
