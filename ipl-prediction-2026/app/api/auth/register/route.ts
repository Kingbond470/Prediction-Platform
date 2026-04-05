import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { TEAM_CONFIG } from "@/app/lib/teams";

const VALID_TEAMS = new Set(Object.keys(TEAM_CONFIG));

// ── Simple in-memory rate limiter (5 attempts / IP / 60s) ────────────────────
const rateLimitMap = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const window = 60_000; // 1 minute
  const max = 5;
  const hits = (rateLimitMap.get(ip) ?? []).filter((t) => now - t < window);
  hits.push(now);
  rateLimitMap.set(ip, hits);
  return hits.length > max;
}

// ── Session cookie helper ─────────────────────────────────────────────────────
function setSessionCookie(res: NextResponse, userId: string): NextResponse {
  res.cookies.set("uid", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

// ── Server-side validation ────────────────────────────────────────────────────
function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return "Phone must be 10 digits";
  if (!/^[6-9]/.test(digits)) return "Invalid Indian mobile number";
  return null;
}

function validateUsername(username: string): string | null {
  if (!username || username.length < 3) return "Username must be at least 3 characters";
  if (username.length > 20) return "Username max 20 characters";
  if (!/^[a-z0-9_]+$/.test(username)) return "Username: letters, numbers, underscores only";
  if (/^_|_$/.test(username)) return "Username cannot start or end with underscore";
  return null;
}

function validateFirstName(name: string): string | null {
  if (!name || name.trim().length < 2) return "First name must be at least 2 characters";
  if (name.trim().length > 30) return "First name max 30 characters";
  if (!/^[a-zA-Z\s]+$/.test(name)) return "First name: letters only";
  return null;
}

/**
 * Derive a stable UUID v4 from a phone number (no Supabase Auth needed).
 */
function stableUuidFromPhone(phone: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < phone.length; i++) {
    const c = phone.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x9e3779b9);
    h2 = Math.imul(h2 ^ c, 0x6c62272e);
  }
  h1 ^= h1 >>> 16; h1 = Math.imul(h1, 0x85ebca6b);
  h2 ^= h2 >>> 13; h2 = Math.imul(h2, 0xc2b2ae35);
  h1 = (h1 ^ h2) >>> 0;
  h2 = (h2 ^ h1) >>> 0;

  const p = (n: number, len: number) =>
    (n >>> 0).toString(16).padStart(len, "0").slice(0, len);

  return [
    p(h1, 8),
    p(h1 >>> 8, 4),
    "4" + p(h2, 3),
    (8 | ((h2 >>> 4) & 3)).toString(16) + p(h2 >>> 8, 3),
    p(h1 ^ h2, 4) + p(h2 ^ h1, 8),
  ].join("-");
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { phone, name, username, city, favorite_team, referral_code } = body as {
      phone: string;
      name: string;
      username: string;
      city?: string | null;
      favorite_team?: string | null;
      referral_code?: string | null;
    };

    // ── Validate inputs ───────────────────────────────────────────────────────
    if (!phone || !name || !username) {
      return NextResponse.json(
        { error: "phone, name and username are required" },
        { status: 400 }
      );
    }

    const rawPhone = phone.replace(/^\+91/, "");
    const phoneErr    = validatePhone(rawPhone);
    const usernameErr = validateUsername(username);
    const nameErr     = validateFirstName(name);

    if (phoneErr)    return NextResponse.json({ error: phoneErr },    { status: 400 });
    if (nameErr)     return NextResponse.json({ error: nameErr },     { status: 400 });
    if (usernameErr) return NextResponse.json({ error: usernameErr }, { status: 400 });

    // Validate favorite_team if provided
    if (favorite_team && !VALID_TEAMS.has(favorite_team.toUpperCase())) {
      return NextResponse.json({ error: "Invalid team selection" }, { status: 400 });
    }

    const normalizedPhone = `+91${rawPhone}`;
    const normalizedTeam = favorite_team ? favorite_team.toUpperCase() : null;
    const userId = stableUuidFromPhone(normalizedPhone);

    // ── No Supabase configured → mock mode ────────────────────────────────────
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return setSessionCookie(
        NextResponse.json({
          success: true,
          user_id: userId,
          message: "Registered (mock mode — no Supabase configured)",
          mock: true,
        }),
        userId
      );
    }

    // ── Check if phone already registered ────────────────────────────────────
    const { data: existingByPhone } = await supabase
      .from("users")
      .select("id, username")
      .eq("phone", normalizedPhone)
      .maybeSingle();           // returns null (not PGRST116 error) when 0 rows

    if (existingByPhone) {
      // Return existing user so they can continue seamlessly
      return setSessionCookie(
        NextResponse.json({
          success: true,
          user_id: existingByPhone.id,
          message: "Welcome back!",
          existing: true,
        }),
        existingByPhone.id
      );
    }

    // ── Check username uniqueness ─────────────────────────────────────────────
    const { data: existingByUsername } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.trim())
      .maybeSingle();           // returns null (not PGRST116 error) when 0 rows

    if (existingByUsername) {
      return NextResponse.json(
        { error: "Username is already taken. Please choose another." },
        { status: 409 }
      );
    }

    // ── Create new user ───────────────────────────────────────────────────────
    const { error: insertError } = await supabase.from("users").insert({
      id: userId,
      phone: normalizedPhone,
      name: name.trim(),
      username: username.trim(),
      ...(city ? { city: city.trim() } : {}),
      ...(normalizedTeam ? { favorite_team: normalizedTeam } : {}),
    });

    if (insertError) {
      // Handle race condition on duplicate username
      if (insertError.message.includes("username")) {
        return NextResponse.json(
          { error: "Username is already taken. Please choose another." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Award referral bonus to both parties (fire-and-forget)
    if (referral_code) {
      try {
        const { data: referrer } = await supabase
          .from("users")
          .select("id")
          .eq("username", referral_code.trim().toLowerCase())
          .maybeSingle();
        if (referrer && referrer.id !== userId) {
          await supabase.from("users").update({ referred_by: referrer.id }).eq("id", userId);
          await supabase.rpc("award_referral_bonus", { referrer_id: referrer.id, referee_id: userId });
        }
      } catch { /* non-fatal */ }
    }

    return setSessionCookie(
      NextResponse.json({
        success: true,
        user_id: userId,
        message: "Account created successfully!",
      }),
      userId
    );
  } catch (err) {
    console.error("[/api/auth/register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
