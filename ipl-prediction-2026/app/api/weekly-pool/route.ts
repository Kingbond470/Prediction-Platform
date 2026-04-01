import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentWeekNumber, getWeekDateRange } from "@/lib/weekUtils";

// Postgres error codes we handle gracefully (migration not yet applied)
// Postgres + PostgREST error codes for missing schema objects (pre-migration)
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
 * GET /api/weekly-pool?user_id=xxx
 *
 * Returns the current week's pool stats + whether the requesting user
 * has at least one correct prediction this week (making them eligible).
 * Works both before and after migration 004 is applied.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");

  const weekNumber = getCurrentWeekNumber();

  if (!weekNumber) {
    return NextResponse.json({
      success: true,
      weekNumber: null,
      totalCorrectPredictors: 0,
      userIsEligible: false,
      drawStatus: "pending",
      message: "IPL season not active",
    });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({
      success: true,
      weekNumber,
      totalCorrectPredictors: 1247,
      userIsEligible: !!userId,
      drawStatus: "pending",
      isMock: true,
    });
  }

  try {
    const { start, end } = getWeekDateRange(weekNumber);

    // Query by date range only (works before AND after migration 004)
    // week_number column filter is skipped until migration is applied
    const { data: poolData, error: poolError } = await supabase
      .from("predictions")
      .select("user_id")
      .eq("is_correct", true)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (poolError) throw poolError;

    const uniqueUsers = new Set((poolData ?? []).map((r) => r.user_id));
    const totalCorrectPredictors = uniqueUsers.size;
    const userIsEligible = userId ? uniqueUsers.has(userId) : false;

    // Attempt to read/update weekly_draw_pool — silently skip if table missing
    let drawStatus: string = "pending";
    try {
      const { data: drawPool } = await supabase
        .from("weekly_draw_pool")
        .select("draw_status")
        .eq("week_number", weekNumber)
        .single();

      if (drawPool?.draw_status) drawStatus = drawPool.draw_status;

      await supabase.from("weekly_draw_pool").upsert(
        {
          week_number: weekNumber,
          total_correct_predictors: totalCorrectPredictors,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "week_number" }
      );
    } catch (tableErr) {
      if (!isMigrationError(tableErr)) throw tableErr;
      // Table not yet created — fine, just use default "pending"
    }

    return NextResponse.json({
      success: true,
      weekNumber,
      totalCorrectPredictors,
      userIsEligible,
      drawStatus,
    });
  } catch (err) {
    console.error("[weekly-pool] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pool data" },
      { status: 500 }
    );
  }
}
