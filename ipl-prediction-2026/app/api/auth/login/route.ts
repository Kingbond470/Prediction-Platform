import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
  try {
    const { phone, username } = await request.json();

    if (!phone || !username) {
      return NextResponse.json({ error: "Phone number and username are required" }, { status: 400 });
    }

    const rawPhone = phone.replace(/\D/g, "").replace(/^91/, "");
    if (rawPhone.length !== 10 || !/^[6-9]/.test(rawPhone)) {
      return NextResponse.json({ error: "Invalid Indian mobile number" }, { status: 400 });
    }

    const normalizedPhone = `+91${rawPhone}`;
    const normalizedUsername = username.trim().toLowerCase();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return setSessionCookie(
        NextResponse.json({
          success: true,
          user_id: "mock-user-id",
          username: normalizedUsername,
          name: "Mock User",
          mock: true,
        }),
        "mock-user-id"
      );
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, name, city, favorite_team")
      .eq("phone", normalizedPhone)
      .eq("username", normalizedUsername)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Phone number and username don't match. Please check your details." },
        { status: 401 }
      );
    }

    return setSessionCookie(
      NextResponse.json({
        success: true,
        user_id: user.id,
        username: user.username,
        name: user.name,
        city: user.city ?? null,
        favorite_team: user.favorite_team ?? null,
      }),
      user.id
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
