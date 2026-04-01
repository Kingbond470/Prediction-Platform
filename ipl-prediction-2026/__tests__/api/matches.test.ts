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

function makeChain(result: object, predictionRows: object[] = []) {
  const chain: Record<string, jest.Mock> = {
    select:  jest.fn().mockReturnThis(),
    order:   jest.fn().mockReturnThis(),
    limit:   jest.fn().mockResolvedValue(result),
    update:  jest.fn().mockReturnThis(),
    eq:      jest.fn().mockResolvedValue({ error: null }),
    // .in() used by the predictions count query for stale matches
    in:      jest.fn().mockResolvedValue({ data: predictionRows, error: null }),
  };
  // Make update().eq() work
  chain.update.mockReturnValue({ eq: chain.eq });
  return chain;
}

describe("GET /api/matches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns matches from Supabase when they have future dates", async () => {
    const chain = makeChain({ data: [MOCK_MATCH], error: null });
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.matches).toHaveLength(1);
    expect(json.matches[0].team_1).toBe("CSK");
  });

  it("returns mock data when NEXT_PUBLIC_SUPABASE_URL is not set", async () => {
    const original = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.matches.length).toBeGreaterThan(0);
    // Mock matches always have future dates
    expect(new Date(json.matches[0].match_date).getTime()).toBeGreaterThan(Date.now());

    process.env.NEXT_PUBLIC_SUPABASE_URL = original;
  });

  it("returns 500 when Supabase returns an error", async () => {
    const chain = makeChain({ data: null, error: { message: "DB connection failed" } });
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("DB connection failed");
  });

  it("auto-refreshes all-stale matches with future dates and persists to DB", async () => {
    const staleMatch = { ...MOCK_MATCH, match_date: PAST_DATE, status: "upcoming" };
    const chain = makeChain({ data: [staleMatch], error: null });
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // match_date was refreshed to the future
    expect(new Date(json.matches[0].match_date).getTime()).toBeGreaterThan(Date.now());
    // update was called on Supabase
    expect(chain.update).toHaveBeenCalled();
  });

  it("returns empty matches array when Supabase returns null data", async () => {
    // Simulate Supabase returning no rows but no error (after stale check)
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.matches).toEqual([]);
  });
});
