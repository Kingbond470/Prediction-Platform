/**
 * @jest-environment node
 *
 * Tests for POST /api/auth/send-otp, POST /api/auth/verify-otp (dev mode),
 * and POST /api/auth/register
 */

// ── Mock Supabase before any imports ──────────────────────────────────────
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
    },
  },
}));
// ──────────────────────────────────────────────────────────────────────────

import { POST as sendOtp }   from "@/app/api/auth/send-otp/route";
import { POST as verifyOtp } from "@/app/api/auth/verify-otp/route";
import { POST as register }  from "@/app/api/auth/register/route";
import { supabase }          from "@/lib/supabase";

const mockFrom   = supabase.from as jest.Mock;

function makeRequest(body: object) {
  return new Request("http://localhost:3000", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }) as unknown as import("next/server").NextRequest;
}

function makeFromChain({
  singleData = null as object | null,
  singleError = null as object | null,
  insertError = null as object | null,
} = {}) {
  return {
    select: jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: singleData, error: singleError }),
    insert: jest.fn().mockResolvedValue({ error: insertError }),
  };
}

// ── send-otp ─────────────────────────────────────────────────────────────
describe("POST /api/auth/send-otp (dev mode)", () => {
  it("returns success for a valid +91 phone (devOtp no longer in response)", async () => {
    const res  = await sendOtp(makeRequest({ phone: "+919876543210" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.dev).toBe(true);
    expect(json.devOtp).toBeUndefined(); // OTP is logged server-side only, never sent to client
  });

  it("rejects a non-+91 phone number", async () => {
    const res  = await sendOtp(makeRequest({ phone: "+12025551234" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/Invalid phone/i);
  });

  it("rejects when phone is missing from body", async () => {
    const res  = await sendOtp(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeDefined();
  });

  it("does not call supabase.auth in dev mode", async () => {
    await sendOtp(makeRequest({ phone: "+919876543210" }));
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
  });
});

// ── verify-otp ────────────────────────────────────────────────────────────
describe("POST /api/auth/verify-otp (dev mode)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("accepts OTP 123456 and creates a new user", async () => {
    const chain = makeFromChain({ singleError: { code: "PGRST116" } });
    mockFrom.mockReturnValue(chain);

    const res  = await verifyOtp(makeRequest({
      phone: "+919876543210", otp: "123456",
      name: "Cricket Fan", username: "cricketfan",
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user_id).toBeDefined();
    expect(json.dev).toBe(true);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ username: "cricketfan", phone: "+919876543210" })
    );
  });

  it("returns existing user ID without calling insert", async () => {
    const chain = makeFromChain({ singleData: { id: "existing-user-abc" } });
    mockFrom.mockReturnValue(chain);

    const res  = await verifyOtp(makeRequest({
      phone: "+919876543210", otp: "123456",
      name: "Fan", username: "fan",
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user_id).toBe("existing-user-abc");
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it("rejects a wrong OTP with a clear message mentioning 123456", async () => {
    const res  = await verifyOtp(makeRequest({
      phone: "+919876543210", otp: "000000",
      name: "Fan", username: "fan",
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/123456/);
  });

  it("does not call supabase.auth.verifyOtp in dev mode", async () => {
    const chain = makeFromChain({ singleError: { code: "PGRST116" } });
    mockFrom.mockReturnValue(chain);

    await verifyOtp(makeRequest({
      phone: "+919876543210", otp: "123456",
      name: "Fan", username: "fan",
    }));

    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
  });
});

// ── register ──────────────────────────────────────────────────────────────
describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Register route has a mock-mode early-return when Supabase URL is unset.
    // Set it so the route reaches actual Supabase calls.
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("creates a new user and returns user_id", async () => {
    // phone not found → no existing user; username not found → unique
    const chain = makeFromChain({ singleError: { code: "PGRST116" } });
    mockFrom.mockReturnValue(chain);

    const res  = await register(makeRequest({
      phone: "+919876543210", name: "Cricket Fan", username: "cricketfan99",
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user_id).toBeDefined();
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ username: "cricketfan99", name: "Cricket Fan" })
    );
  });

  it("saves city and favorite_team when provided", async () => {
    const chain = makeFromChain({ singleError: { code: "PGRST116" } });
    mockFrom.mockReturnValue(chain);

    await register(makeRequest({
      phone: "+919876543210", name: "Fan", username: "fanuser",
      city: "Mumbai", favorite_team: "MI",
    }));

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ city: "Mumbai", favorite_team: "MI" })
    );
  });

  it("returns existing user without inserting on duplicate phone", async () => {
    const chain = makeFromChain({ singleData: { id: "existing-id-123", username: "existinguser" } });
    mockFrom.mockReturnValue(chain);

    const res  = await register(makeRequest({
      phone: "+919876543210", name: "Fan", username: "existinguser",
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.user_id).toBe("existing-id-123");
    expect(json.existing).toBe(true);
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it("rejects missing required fields", async () => {
    const res  = await register(makeRequest({ phone: "+919876543210" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeDefined();
  });

  it("rejects invalid phone number", async () => {
    const res  = await register(makeRequest({
      phone: "+911234567890", name: "Fan", username: "fanuser",
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/Invalid Indian/i);
  });
});
