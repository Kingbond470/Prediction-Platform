import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_OTP = "123456";

/**
 * Dev-mode: derive a stable, valid UUID v4 from the phone number.
 * Uses a simple hash spread across the UUID byte positions.
 */
function devUserIdFromPhone(phone: string): string {
  // Two independent hashes for 128 bits of material
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

  // Format as a proper UUID v4 (variant bits set correctly)
  return [
    p(h1, 8),
    p(h1 >>> 8, 4),
    "4" + p(h2, 3),             // version = 4
    (8 | ((h2 >>> 4) & 3)).toString(16) + p(h2 >>> 8, 3), // variant = 10xx
    p(h1 ^ h2, 4) + p(h2 ^ h1, 8),
  ].join("-");
}

export async function POST(request: NextRequest) {
  try {
    const { phone, otp, name, username, city, favorite_team } = await request.json();

    // ── Dev bypass ──────────────────────────────────────────────────────────
    if (IS_DEV) {
      if (otp !== DEV_OTP) {
        return NextResponse.json(
          { error: `Invalid OTP. In dev mode use: ${DEV_OTP}` },
          { status: 400 }
        );
      }

      const userId = devUserIdFromPhone(phone);

      // Upsert user by phone — no Supabase Auth required
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
      }

      return NextResponse.json({
        success: true,
        user_id: existingUser?.id ?? userId,
        message: "Signup successful (dev mode)",
        dev: true,
      });
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
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      message: "Signup successful",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
