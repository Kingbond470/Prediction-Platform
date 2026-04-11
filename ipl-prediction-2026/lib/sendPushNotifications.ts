import webpush from "web-push";
import { supabase } from "./supabase";

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

/** Core: send a webpush notification to a list of subscription rows. */
async function sendToSubscriptions(
  subs: Array<{ endpoint: string; subscription_json: string }>,
  payload: PushPayload
): Promise<number> {
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
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) stale.push(sub.endpoint);
        else console.error("[push] send error:", err);
      }
    })
  );

  if (stale.length > 0) {
    void supabase.from("push_subscriptions").delete().in("endpoint", stale);
  }
  return sent;
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

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, subscription_json")
    .or(`match_id.eq.${matchId},match_id.is.null`);

  if (error || !subs || subs.length === 0) return 0;
  return sendToSubscriptions(subs, payload);
}

/**
 * Sends a "your streak is at risk" push to users who:
 *  - Have current_streak >= minStreak (default 2)
 *  - Have NOT yet predicted the given match
 *  - Have a push subscription on file
 *
 * Designed to be called ~2h before a match starts.
 * Returns the number of pushes sent.
 */
export async function sendStreakAtRiskPush(
  matchId: string,
  matchLabel: string,  // e.g. "CSK vs MI"
  minStreak = 2
): Promise<number> {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate || !process.env.NEXT_PUBLIC_SUPABASE_URL) return 0;

  webpush.setVapidDetails("mailto:admin@iplprediction2026.in", vapidPublic, vapidPrivate);

  // Users with a streak worth protecting
  const { data: streakUsers } = await supabase
    .from("users")
    .select("id")
    .gte("current_streak", minStreak);
  if (!streakUsers || streakUsers.length === 0) return 0;

  // Remove those who already predicted this match
  const streakIds = streakUsers.map((u) => u.id);
  const { data: alreadyPredicted } = await supabase
    .from("predictions")
    .select("user_id")
    .eq("match_id", matchId)
    .in("user_id", streakIds);

  const predictedSet = new Set((alreadyPredicted ?? []).map((p) => p.user_id));
  const atRiskIds = streakIds.filter((id) => !predictedSet.has(id));
  if (atRiskIds.length === 0) return 0;

  // Get their push subscriptions
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, subscription_json")
    .in("user_id", atRiskIds);
  if (!subs || subs.length === 0) return 0;

  return sendToSubscriptions(subs, {
    title: "🔥 Your streak is at risk!",
    body: `${matchLabel} is about to start — predict now to keep your streak alive.`,
    url: `/`,
    tag: `streak-risk-${matchId}`,
  });
}
