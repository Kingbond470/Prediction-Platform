import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_OTP = "123456";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone || !phone.startsWith("+91")) {
      return NextResponse.json(
        { error: "Invalid phone number. Must be +91XXXXXXXXXX" },
        { status: 400 }
      );
    }

    // ── Dev bypass ──────────────────────────────────────────────────────────
    // In non-production environments, skip Supabase phone auth entirely.
    // The UI will show a hint to use OTP "123456".
    if (IS_DEV) {
      return NextResponse.json({
        success: true,
        message: "OTP sent to your phone",
        dev: true,
        devOtp: DEV_OTP,
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    const { data, error } = await supabase.auth.signInWithOtp({ phone });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent to your phone",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
