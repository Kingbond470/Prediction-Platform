"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getTeamConfig } from "@/app/lib/teams";
import { computeBadges, BadgeState } from "@/app/lib/badges";
import BadgeRow from "@/app/components/BadgeRow";
import InviteCard from "@/app/components/InviteCard";

interface LeaderboardEntry {
  id: string;
  username: string;
  total_points: number;
  total_predictions: number;
  total_correct: number;
  beat_ai_count?: number;
  win_percentage: number;
  rank: number;
  current_streak?: number;
  max_streak?: number;
}

export default function LeaderboardContent() {
  const router = useRouter();
  const [period, setPeriod] = useState<"alltime" | "weekly">("alltime");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const userId   = typeof window !== "undefined" ? localStorage.getItem("userId")   : null;
  const username = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  const favTeam  = typeof window !== "undefined" ? localStorage.getItem("favoriteTeam") : null;
  const teamCfg  = favTeam ? getTeamConfig(favTeam) : null;
  const [rankDelta, setRankDelta] = useState<number | null>(null);
  const [badges, setBadges] = useState<BadgeState[]>([]);
  const [toastBadge, setToastBadge] = useState<BadgeState | null>(null);

  const fetchLeaderboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (userId) params.set("user_id", userId);
      if (period === "weekly") params.set("period", "weekly");
      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      const d = await res.json();
      setLeaderboard(d.top_10 || []);
      setTotalPlayers(d.total_players || 0);
      setLastUpdated(new Date());
      setSecondsAgo(0);

      // Rank delta: compare new rank with last stored rank
      const newRank: LeaderboardEntry | null = d.user_rank || null;
      setUserRank(newRank);
      if (newRank && userId && period === "alltime") {
        const storageKey = `lastRank_${userId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const delta = Number(stored) - newRank.rank;
          setRankDelta(delta !== 0 ? delta : null);
        }
        localStorage.setItem(storageKey, String(newRank.rank));

        // Compute badges and fire toast for newly unlocked ones
        const computed = computeBadges(newRank);
        setBadges(computed);
        const seenKey = `seenBadges_${userId}`;
        const seen: string[] = JSON.parse(localStorage.getItem(seenKey) || "[]");
        const newlyUnlocked = computed.filter(
          (b) => b.unlocked && !seen.includes(b.id)
        );
        if (newlyUnlocked.length > 0) {
          setToastBadge(newlyUnlocked[0]);
          localStorage.setItem(
            seenKey,
            JSON.stringify([...seen, ...newlyUnlocked.map((b) => b.id)])
          );
          setTimeout(() => setToastBadge(null), 4000);
        }
      }
    } catch {
      // keep stale data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, period]);

  // Initial load
  useEffect(() => { fetchLeaderboard(false); }, [fetchLeaderboard]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchLeaderboard(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // "Updated X seconds ago" ticker
  useEffect(() => {
    if (!lastUpdated) return;
    const ticker = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 5_000);
    return () => clearInterval(ticker);
  }, [lastUpdated]);

  const updatedLabel = !lastUpdated
    ? ""
    : secondsAgo < 10
    ? "just now"
    : secondsAgo < 60
    ? `${secondsAgo}s ago`
    : `${Math.floor(secondsAgo / 60)}m ago`;

  // True if the current user is already visible in the top-50 list
  const userInList = !!leaderboard.find((u) => u.username === username);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
        <p className="text-gray-500 text-sm">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-5 animate-slide-up">
      {/* Badge unlock toast */}
      {toastBadge && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg animate-slide-up"
          style={{
            background: `${toastBadge.color}22`,
            border: `1px solid ${toastBadge.color}55`,
            color: toastBadge.color,
          }}
        >
          <span className="text-xl">{toastBadge.emoji}</span>
          <div>
            <p className="text-xs font-black uppercase tracking-widest">Badge Unlocked!</p>
            <p className="text-sm font-bold">{toastBadge.label}</p>
          </div>
        </div>
      )}

      {/* ── Back link (desktop — mobile uses bottom nav) ─────────── */}
      <a
        href="/"
        className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-smooth -mb-1"
      >
        ← Back to Matches
      </a>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="text-center">
        <div
          className="inline-flex w-16 h-16 rounded-2xl items-center justify-center text-3xl mb-4"
          style={{
            background: "linear-gradient(135deg, #F59E0B, #D97706)",
            boxShadow: "0 0 32px rgba(245,158,11,0.4)",
          }}
        >
          🏆
        </div>
        <h1 className="font-display font-black text-3xl text-white">IPL 2026 Leaderboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {totalPlayers > 0
            ? `${totalPlayers.toLocaleString("en-IN")} fans competing against the AI`
            : "Top fans competing against the AI"}
        </p>
      </div>

      {/* ── Your Standing card ──────────────────────────────────── */}
      {userRank ? (
        <div
          className="rounded-2xl p-4"
          style={{
            background: `linear-gradient(135deg, rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.15), rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.05))`,
            border: `1px solid rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.3)`,
          }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--tc,#EF4444)" }}>
            {teamCfg ? `${teamCfg.emoji} ` : ""}Your Standing
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex flex-col items-center shrink-0">
                <span className="font-display font-black text-4xl text-white">#{userRank.rank}</span>
                {rankDelta !== null && (
                  <span className={`text-[10px] font-black mt-0.5 ${rankDelta > 0 ? "text-green-400" : "text-red-400"}`}>
                    {rankDelta > 0 ? `↑ ${rankDelta}` : `↓ ${Math.abs(rankDelta)}`}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white truncate">{userRank.username}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  <span className="text-xs text-gray-400">{userRank.total_predictions} picks</span>
                  <span className="text-xs text-gray-400">{userRank.win_percentage}% accuracy</span>
                  {(userRank.beat_ai_count ?? 0) > 0 && (
                    <span className="text-xs text-blue-400 font-semibold">🤖 beat AI {userRank.beat_ai_count}×</span>
                  )}
                  {(userRank.current_streak ?? 0) >= 2 && (
                    <span className="text-xs text-orange-400 font-semibold">🔥 {userRank.current_streak} streak</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-black text-3xl text-gradient">{userRank.total_points.toLocaleString("en-IN")}</p>
              <p className="text-xs text-gray-500">points</p>
            </div>
          </div>
          {badges.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <BadgeRow badges={badges} />
            </div>
          )}
        </div>
      ) : null}

      {/* ── Invite card (logged-in users only) ───────────────────── */}
      {username && <InviteCard username={username} />}

      {!userRank && userId && (
        <div className="rounded-2xl glass p-4 text-center">
          <p className="text-gray-400 text-sm">Make your first prediction to appear on the leaderboard!</p>
          <button
            onClick={() => router.push("/")}
            className="mt-3 text-xs font-semibold px-4 py-2 rounded-lg transition-smooth"
            style={{ background: "rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.15)", color: "var(--tc,#EF4444)" }}
          >
            Browse Matches →
          </button>
        </div>
      )}

      {!userId && (
        <div
          className="rounded-2xl p-5 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.03))",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-white font-bold text-base mb-1">Join the Competition</p>
          <p className="text-gray-400 text-sm mb-4">
            Sign up free to make predictions, beat the AI, and climb the rankings.
          </p>
          <button
            onClick={() => router.push("/signup")}
            className="px-6 py-2.5 rounded-xl text-sm font-bold transition-smooth"
            style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.35)", color: "#EF4444" }}
          >
            Create Free Account →
          </button>
        </div>
      )}

      {/* ── Full rankings ────────────────────────────────────────── */}
      <div className="rounded-2xl glass p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            {(["alltime", "weekly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  period === p
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {p === "alltime" ? "🏆 All Time" : "📅 This Week"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {updatedLabel && (
              <span className="text-xs text-gray-600">Updated {updatedLabel}</span>
            )}
            <button
              onClick={() => fetchLeaderboard(true)}
              disabled={refreshing}
              className="text-xs text-gray-400 hover:text-white transition-smooth disabled:opacity-40"
              title="Refresh"
            >
              {refreshing ? (
                <span className="inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                "↻ Refresh"
              )}
            </button>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3 animate-float inline-block">{period === "weekly" ? "📅" : "🏆"}</div>
            <p className="text-white font-semibold mb-1">
              {period === "weekly" ? "No scored predictions this week yet" : "No rankings yet"}
            </p>
            <p className="text-gray-500 text-sm">
              {period === "weekly"
                ? "Rankings reset every Monday — check back after a match result is posted"
                : "Make your first prediction to appear here!"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((user, idx) => (
              <LeaderboardRow key={user.id} user={user} idx={idx} isMe={user.username === username} />
            ))}

            {/* Show user's row below separator if they're outside the top list */}
            {userRank && !userInList && (
              <>
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 border-t border-white/[0.06]" />
                  <span className="text-xs text-gray-600 font-bold">· · ·</span>
                  <div className="flex-1 border-t border-white/[0.06]" />
                </div>
                <LeaderboardRow user={userRank} idx={userRank.rank - 1} isMe={true} />
              </>
            )}

            {/* Ghost row for guests — "this could be you" */}
            {!userId && (
              <>
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 border-t border-white/[0.06]" />
                  <span className="text-xs text-gray-600 font-bold">· · ·</span>
                  <div className="flex-1 border-t border-white/[0.06]" />
                </div>
                <a
                  href="/signup"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/[0.04] active:scale-[0.98]"
                  style={{ border: "1px dashed rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.04)" }}
                >
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-gray-600 bg-white/[0.06] shrink-0">?</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-400">👤 You</p>
                    <p className="text-xs text-gray-600">Sign up to claim your spot →</p>
                  </div>
                  <span className="text-xs font-bold text-red-400 shrink-0">Join Free</span>
                </a>
              </>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => router.push("/")}
        className="w-full py-3 rounded-xl border border-white/[0.08] text-gray-400 hover:text-white hover:border-white/20 transition-smooth text-sm font-semibold"
      >
        ← Back to Matches
      </button>
    </div>
  );
}

// ── Shared row component ──────────────────────────────────────────────────────
function LeaderboardRow({
  user,
  idx,
  isMe,
}: {
  user: LeaderboardEntry;
  idx: number;
  isMe: boolean;
}) {
  const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;

  return (
    <div
      className="flex items-center justify-between p-3.5 rounded-xl transition-smooth border"
      style={{
        background: isMe
          ? `linear-gradient(135deg, rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.1), rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.04))`
          : "rgba(255,255,255,0.03)",
        borderColor: isMe
          ? `rgba(var(--tc-r,239),var(--tc-g,68),var(--tc-b,68),0.3)`
          : "rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-7 shrink-0 text-center ${medal ? "text-base" : "text-xs font-bold text-gray-500"}`}>
          {medal ?? `#${idx + 1}`}
        </span>
        <div className="min-w-0">
          <p
            className="font-semibold text-sm truncate"
            style={isMe ? { color: "var(--tc,#EF4444)" } : { color: "white" }}
          >
            {user.username}
            {isMe && <span className="text-xs text-gray-500 ml-1">(you)</span>}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">
              {user.total_correct}/{user.total_predictions} · {user.win_percentage}%
            </span>
            {(user.beat_ai_count ?? 0) > 0 && (
              <span className="text-xs text-blue-400/80 font-medium">🤖 {user.beat_ai_count}×</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-display font-black text-base text-white">
          {user.total_points.toLocaleString("en-IN")}
          <span className="text-xs text-gray-500 ml-0.5">pts</span>
        </p>
      </div>
    </div>
  );
}
