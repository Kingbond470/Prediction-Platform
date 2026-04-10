import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// POST /api/push/subscribe
// Body: { subscription: PushSubscription, user_id: string, match_id?: string }
// Saves (or upserts) a browser push subscription so we can notify the user later.
export async function POST(request: NextRequest) {
  try {
    const { subscription, user_id, match_id } = await request.json();

    if (!subscription?.endpoint || !user_id) {
      return NextResponse.json({ error: "subscription and user_id required" }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      // Dev mode — just acknowledge; no DB to persist to
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id,
          match_id: match_id || null,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
          subscription_json: JSON.stringify(subscription),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("[push/subscribe]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[push/subscribe]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/push/subscribe?endpoint=<url>
// Removes a subscription (user turned off notifications)
export async function DELETE(request: NextRequest) {
  const endpoint = request.nextUrl.searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }

  return NextResponse.json({ success: true });
}
