import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone || !phone.startsWith("+91")) {
      return NextResponse.json(
        { error: "Invalid phone number. Must be +91XXXXXXXXXX" },
        { status: 400 }
      );
    }

    // Supabase Auth handles OTP sending
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent to your phone",
      session_id: data?.session?.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
