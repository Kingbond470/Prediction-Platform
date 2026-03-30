import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const rawPhone = phone.replace(/\D/g, "").replace(/^91/, "");
    if (rawPhone.length !== 10 || !/^[6-9]/.test(rawPhone)) {
      return NextResponse.json({ error: "Invalid Indian mobile number" }, { status: 400 });
    }

    const normalizedPhone = `+91${rawPhone}`;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({
        success: true,
        user_id: "mock-user-id",
        username: "mockuser",
        name: "Mock User",
        mock: true,
      });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, name")
      .eq("phone", normalizedPhone)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "No account found with this number. Please sign up first." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user_id: user.id,
      username: user.username,
      name: user.name,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
