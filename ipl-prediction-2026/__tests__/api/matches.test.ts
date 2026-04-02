/**
 * @jest-environment node
 *
 * Tests for GET /api/matches
 */

// ── Mock Supabase before any imports ──────────────────────────────────────
jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));
// ──────────────────────────────────────────────────────────────────────────

import { GET } from "@/app/api/matches/route";
import { supabase } from "@/lib/supabase";

const mockFrom = supabase.from as jest.Mock;

// Ensure Supabase URL is set so the route doesn't short-circuit to mock data
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
});
afterAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
});

const FUTURE_DATE = new Date(Date.now() + 2 * 86_400_000).toISOString();
const PAST_DATE   = new Date(Date.now() - 1 * 86_400_000).toISOString();

const MOCK_MATCH = {
  id: "match-1",
  match_number: 1,
  team_1: "CSK",
  team_2: "RCB",
  venue: "MA Chidambaram Stadium",
  city: "Chennai",
  match_date: FUTURE_DATE,
  vote_start_time: new Date(Date.now() - 3_600_000).toISOString(),
  vote_end_time:   new Date(Date.now() + 2 * 86_400_000 - 1_800_000).toISOString(),
  team_1_probability: 65,
  team_2_probability: 35,
  winner: null,
  status: "upcoming",
  initial_count_team_1: 7000,
  initial_count_team_2: 3000,
};

/**
 * Route now makes 3 supabase.from() calls:
 *   1. matches — upcoming/live  (.select.in.order.limit)
 *   2. matches — completed      (.select.eq.order.limit)
 *   3. predictions              (.select.in)  ← only when stale matches exist
 *
 * We route each call by table name via mockImplementation.
 */
function setupMocks({
  upcomingData = [] as object[],
  completedData = [] as object[],
  predictionData = [] as object[],
  upcomingError = null as object | null,
} = {}) {
  // Chain for matches queries (supports both .in() and .eq() filters)
  const matchChain: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    in:     jest.fn().mockReturnThis(),   // filter by status array
    eq:     jest.fn().mockReturnThis(),   // filter by status = "completed"
    order:  jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    limit:  jest.fn(),                    // resolves differently per call
  };
  matchChain.update.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

  // First limit() call → upcoming/live; second → completed
  let limitCallCount = 0;
  matchChain.limit.mockImplementation(() => {
    limitCallCount++;
    if (limitCallCount === 1) {
      return Promise.resolve({ data: upcomingData, error: upcomingError });
    }
    return Promise.resolve({ data: completedData, error: null });
  });

  // Chain for predictions table (.select.in resolves immediately)
  const predChain = {
    select: jest.fn().mockReturnThis(),
    in:     jest.fn().mockResolvedValue({ data: predictionData, error: null }),
  };

  mockFrom.mockImplementation((table: string) =>
    table === "predictions" ? predChain : matchChain
  );

  return { matchChain, predChain };
}

describe("GET /api/matches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns matches from Supabase when they have future dates", async () => {
    setupMocks({ upcomingData: [MOCK_MATCH] });

    const res  = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.matches).toHaveLength(1);
    expect(json.matches[0].team_1).toBe("CSK");
  });

  it("includes completed matches from the separate completed query", async () => {
    const completedMatch = { ...MOCK_MATCH, id: "match-2", status: "completed", winner: "CSK" };
    setupMocks({ upcomingData: [MOCK_MATCH], completedData: [completedMatch] });

    const res  = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.matches).toHaveLength(2);
    // upcoming first, then completed
    expect(json.matches[0].status).toBe("upcoming");
    expect(json.matches[1].status).toBe("completed");
  });

  it("returns mock data when NEXT_PUBLIC_SUPABASE_URL is not set", async () => {
    const original = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res  = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.matches.length).toBeGreaterThan(0);
    expect(new Date(json.matches[0].match_date).getTime()).toBeGreaterThan(Date.now());

    process.env.NEXT_PUBLIC_SUPABASE_URL = original;
  });

  it("returns 500 when Supabase returns an error on the upcoming query", async () => {
    setupMocks({ upcomingError: { message: "DB connection failed" } });

    const res  = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("DB connection failed");
  });

  it("marks stale upcoming matches as live (never pushes dates forward)", async () => {
    const staleMatch = { ...MOCK_MATCH, match_date: PAST_DATE, status: "upcoming" };
    const { matchChain } = setupMocks({
      upcomingData: [staleMatch],
      predictionData: [],
    });

    const res  = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    // Date must NOT be pushed forward — match stays at its real date
    expect(new Date(json.matches[0].match_date).getTime()).toBe(new Date(PAST_DATE).getTime());
    // Status must be flipped to "live"
    expect(json.matches[0].status).toBe("live");
    expect(matchChain.update).toHaveBeenCalled();
  });

  it("marks stale matches with predictions as live instead of resetting date", async () => {
    const staleMatch = { ...MOCK_MATCH, match_date: PAST_DATE, status: "upcoming" };
    const { matchChain } = setupMocks({
      upcomingData: [staleMatch],
      predictionData: [{ match_id: "match-1" }],  // has a prediction
    });

    const res  = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.matches[0].status).toBe("live");
    // update called with status: "live", not a new date
    expect(matchChain.update).toHaveBeenCalledWith({ status: "live" });
  });

  it("returns empty matches array when both queries return no rows", async () => {
    setupMocks({ upcomingData: [], completedData: [] });

    const res  = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.matches).toEqual([]);
  });
});
