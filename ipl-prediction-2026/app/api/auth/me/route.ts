// GET /api/auth/me
// Returns the current user's id, username, and name by reading the uid httpOnly cookie.
// Client components call this on mount to hydrate localStorage when it's empty
// (e.g. after a device switch, browser data clear, or fresh tab).
// Returns 401 if no valid cookie session exists.

import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("uid")?.value;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Dev / no-Supabase mode — return a minimal mock session
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({
      success: true,
      user_id: userId,
      username: "devuser",
      name: "Dev User",
      favorite_team: null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, username, name, favorite_team")
    .eq("id", userId)
    .single();

  if (error || !user) {
    // Cookie exists but user row deleted — clear cookie
    const res = NextResponse.json({ error: "Session expired" }, { status: 401 });
    res.cookies.set("uid", "", { httpOnly: true, maxAge: 0, path: "/" });
    return res;
  }

  return NextResponse.json({
    success: true,
    user_id: user.id,
    username: user.username,
    name: user.name,
    favorite_team: user.favorite_team ?? null,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
