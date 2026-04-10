"use client";

import { useEffect, useState } from "react";

interface Props {
  userId?: string | null;
  matchId?: string | null;
}

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export default function NotificationBell({ userId, matchId }: Props) {
  const [permState, setPermState] = useState<PermissionState>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !vapidPublicKey) {
      setPermState("unsupported");
      return;
    }
    setPermState(Notification.permission as PermissionState);
    checkSubscription();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    } catch {
      // service worker not ready yet
    }
  }

  async function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }

  async function subscribe() {
    if (!userId || !vapidPublicKey) return;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermState(permission as PermissionState);
      if (permission !== "granted") return;

      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      const applicationServerKey = await urlBase64ToUint8Array(vapidPublicKey);
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), user_id: userId, match_id: matchId }),
      });

      setSubscribed(true);
    } catch (err) {
      console.error("[NotificationBell] subscribe error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: "DELETE" });
        await sub.unsubscribe();
        setSubscribed(false);
      }
    } catch (err) {
      console.error("[NotificationBell] unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }

  // Don't render on unsupported browsers or when user is not logged in
  if (permState === "unsupported" || !userId || !vapidPublicKey) return null;
  // Don't show a blocked bell — no action possible
  if (permState === "denied") return null;

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      title={subscribed ? "Turn off result notifications" : "Notify me when results are in"}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-smooth border"
      style={
        subscribed
          ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981" }
          : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF" }
      }
    >
      {loading ? (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : subscribed ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0M1 1l22 22"/>
        </svg>
      )}
      {subscribed ? "Notified" : "Notify me"}
    </button>
  );
}
