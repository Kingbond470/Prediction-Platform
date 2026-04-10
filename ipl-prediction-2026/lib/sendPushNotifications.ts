import webpush from "web-push";
import { supabase } from "./supabase";

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

/**
 * Sends a push notification to all subscribers for a given match.
 * Falls back gracefully if VAPID keys are not set or Supabase is unavailable.
 * Returns the number of notifications sent.
 */
export async function sendMatchResultPush(
  matchId: string,
  payload: PushPayload
): Promise<number> {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    console.warn("[push] VAPID keys not set — skipping push notifications");
    return 0;
  }
  // Set lazily — safe to call multiple times with the same values
  webpush.setVapidDetails("mailto:admin@iplprediction2026.in", vapidPublic, vapidPrivate);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return 0;
  }

  // Fetch all subscriptions for this match (or global subscriptions with no match_id)
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, subscription_json")
    .or(`match_id.eq.${matchId},match_id.is.null`);

  if (error || !subs || subs.length === 0) return 0;

  const message = JSON.stringify(payload);
  let sent = 0;
  const stale: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        const pushSub = JSON.parse(sub.subscription_json);
        await webpush.sendNotification(pushSub, message);
        sent++;
      } catch (err: unknown) {
        // 404/410 = subscription expired; clean up
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          stale.push(sub.endpoint);
        } else {
          console.error("[push] send error:", err);
        }
      }
    })
  );

  // Remove expired subscriptions in the background
  if (stale.length > 0) {
    void supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", stale);
  }

  return sent;
}
