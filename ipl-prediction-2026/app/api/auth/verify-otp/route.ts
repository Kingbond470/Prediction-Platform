import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_OTP = "123456";

/** Look up referrer by username and award 500 pts to both parties. Fire-and-forget. */
async function applyReferralBonus(newUserId: string, referralCode: string) {
  try {
    const { data: referrer } = await supabase
      .from("users")
      .select("id")
      .eq("username", referralCode.trim().toLowerCase())
      .maybeSingle();
    if (!referrer || referrer.id === newUserId) return;
    await supabase
      .from("users")
      .update({ referred_by: referrer.id })
      .eq("id", newUserId);
    await supabase.rpc("award_referral_bonus", {
      referrer_id: referrer.id,
      referee_id: newUserId,
    });
  } catch {
    // non-fatal — don't block signup
  }
}

function setSessionCookie(res: NextResponse, userId: string): NextResponse {
  res.cookies.set("uid", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

/**
 * Dev-mode: derive a stable, valid UUID v4 from the phone number.
 */
function devUserIdFromPhone(phone: string): string {
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

export async function POST(request: NextRequest) {
  try {
    const { phone, otp, name, username, city, favorite_team, referral_code } = await request.json();

    // ── Dev bypass ──────────────────────────────────────────────────────────
    if (IS_DEV) {
      if (otp !== DEV_OTP) {
        return NextResponse.json(
          { error: `Invalid OTP. In dev mode use: ${DEV_OTP}` },
          { status: 400 }
        );
      }

      const userId = devUserIdFromPhone(phone);

      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("phone", phone)
        .single();

      if (!existingUser) {
        const { error: insertError } = await supabase.from("users").insert({
          id: userId,
          phone,
          name: name || username,
          username,
          ...(city ? { city } : {}),
          ...(favorite_team ? { favorite_team } : {}),
        });

        if (insertError && !insertError.message.includes("duplicate")) {
          return NextResponse.json(
            { error: insertError.message },
            { status: 400 }
          );
        }

        if (referral_code) await applyReferralBonus(userId, referral_code);
      }

      const finalUserId = existingUser?.id ?? userId;
      return setSessionCookie(
        NextResponse.json({
          success: true,
          user_id: finalUserId,
          message: "Signup successful (dev mode)",
          dev: true,
        }),
        finalUserId
      );
    }
    // ────────────────────────────────────────────────────────────────────────

    // Production: verify via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (!existingUser) {
      const { error: insertError } = await supabase.from("users").insert({
        id: userId,
        phone,
        name,
        username,
        ...(city ? { city } : {}),
        ...(favorite_team ? { favorite_team } : {}),
      });

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 400 }
        );
      }

      if (referral_code) await applyReferralBonus(userId, referral_code);
    }

    return setSessionCookie(
      NextResponse.json({
        success: true,
        user_id: userId,
        message: "Signup successful",
      }),
      userId
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
