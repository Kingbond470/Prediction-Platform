"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Match } from "@/lib/supabase";
import { MatchCard } from "./MatchCard";
import { ResultMatchCard } from "./ResultMatchCard";
import { PredictionModal } from "./PredictionModal";
import DailyTrivia from "./DailyTrivia";
import RivalCard from "./RivalCard";
import WeeklyRecap from "./WeeklyRecap";
import { getTeamConfig, TEAM_CONFIG } from "@/app/lib/teams";
import posthog from "posthog-js";

interface HomeClientProps {
  initialMatches: Match[];
}

type Tab = "upcoming" | "live" | "results";

export default function HomeClient({ initialMatches }: HomeClientProps) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("userId") : null
  );
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [votedMatchIds, setVotedMatchIds] = useState<Set<string>>(new Set());
  const [votedTeams, setVotedTeams] = useState<Map<string, string>>(new Map());
  const [showWelcome, setShowWelcome] = useState(false);
  const [favTeam, setFavTeam] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [userRankData, setUserRankData] = useState<null | { id: string; rank: number; username: string; total_points: number; win_percentage: number; total_predictions: number; total_correct: number; beat_ai_count?: number; current_streak?: number }>(null);
  const [rival, setRival] = useState<null | { id: string; rank: number; username: string; total_points: number; win_percentage: number; total_predictions: number; total_correct: number; beat_ai_count?: number }>(null);
  const [weeklyStats, setWeeklyStats] = useState<null | { predictions: number; correct: number; wrong: number; points: number; beat_ai: number; accuracy: number; week_start: string }>(null);

  const now = new Date();

  const liveMatches = initialMatches.filter(
    (m) => m.status === "live" || (m.status === "upcoming" && new Date(m.match_date) <= now)
  );
  const upcomingMatches = initialMatches.filter(
    (m) => m.status === "upcoming" && new Date(m.match_date) > now
  );
  const resultMatches = initialMatches.filter((m) => m.status === "completed");

  useEffect(() => {
    let storedUserId = localStorage.getItem("userId");

    // If localStorage is empty, the uid cookie may still be valid (e.g. after a
    // browser-data clear or a new tab). Hydrate localStorage from the server.
    if (!storedUserId) {
      fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.success && d.user_id) {
            localStorage.setItem("userId",    d.user_id);
            localStorage.setItem("username",  d.username ?? "");
            localStorage.setItem("firstName", d.name ?? "");
            if (d.favorite_team) localStorage.setItem("favoriteTeam", d.favorite_team);
            setUserId(d.user_id);
            setUsername(d.username);
            setFavTeam(d.favorite_team ?? null);
          }
        })
        .catch(() => {/* no-op */});
      return; // remaining setup runs again once state updates trigger re-render
    }

    setUserId(storedUserId);
    setUsername(localStorage.getItem("username"));
    setFavTeam(localStorage.getItem("favoriteTeam"));

    if (storedUserId) {
      // Show welcome banner once after signup
      if (localStorage.getItem("newSignup") === "1") {
        setShowWelcome(true);
        localStorage.removeItem("newSignup");
      }

      const pendingMatchId = localStorage.getItem("selectedMatchId");
      if (pendingMatchId) {
        const match = initialMatches.find((m) => m.id === pendingMatchId);
        if (match) {
          localStorage.removeItem("selectedMatchId");
          localStorage.removeItem("selectedMatchTeams");
          setSelectedMatch(match);
          setIsModalOpen(true);
        }
      }

      fetch(`/api/predictions?user_id=${storedUserId}`)
        .then((r) => r.json())
        .then((d) => {
          const preds: { match_id: string; predicted_team: string }[] = d.predictions || [];
          setVotedMatchIds(new Set(preds.map((p) => p.match_id)));
          setVotedTeams(new Map(preds.map((p) => [p.match_id, p.predicted_team])));
        })

      fetch(`/api/leaderboard?user_id=${storedUserId}`)
        .then((r) => r.json())
        .then((d) => {
          setCurrentStreak(d.user_rank?.current_streak ?? 0);
          if (d.user_rank) setUserRankData(d.user_rank);
          if (d.rival) setRival(d.rival);
          if (d.weekly_stats) {
            setWeeklyStats(d.weekly_stats);
            // Persist so Monday shows last week's recap
            localStorage.setItem(`weeklyStats_${storedUserId}`, JSON.stringify(d.weekly_stats));
          } else {
            // No scored predictions this week — check if today is Mon and show last week
            const isMonday = new Date().getDay() === 1;
            if (isMonday) {
              const saved = localStorage.getItem(`weeklyStats_${storedUserId}`);
              if (saved) {
                try { setWeeklyStats({ ...JSON.parse(saved), _isLastWeek: true }); } catch { /* ignore */ }
              }
            }
          }
        })
        .catch((err) => {
          console.error("[HomeClient] failed to fetch leaderboard:", err);
        });
    }

    // Default always shows upcoming; no auto-jump so the primary action surface is consistent
  }, [initialMatches]);

  const handlePredict = (match: Match) => {
    posthog.capture("beat_ai_clicked", {
      match_id: match.id,
      match_number: match.match_number,
      team_1: match.team_1,
      team_2: match.team_2,
      logged_in: !!userId,
    });
    if (!userId) {
      localStorage.setItem("selectedMatchId", match.id);
      localStorage.setItem("selectedMatchTeams", `${match.team_1} vs ${match.team_2}`);
      router.push("/signup");
      return;
    }
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  const handleVote = async (team: string) => {
    if (!selectedMatch) return;
    if (!userId) {
      // Session expired or stale modal — redirect to signup
      localStorage.setItem("selectedMatchId", selectedMatch.id);
      router.push("/signup");
      return;
    }

    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        match_id: selectedMatch.id,
        predicted_team: team,
      }),
    });

    const data = await res.json();

    if (data.success) {
      posthog.capture("prediction_submitted", {
        match_id: selectedMatch.id,
        match_number: selectedMatch.match_number,
        predicted_team: team,
        ai_favourite: selectedMatch.team_1_probability >= 50 ? selectedMatch.team_1 : selectedMatch.team_2,
        picked_underdog: (team === selectedMatch.team_1 && selectedMatch.team_1_probability < 50) ||
                         (team === selectedMatch.team_2 && selectedMatch.team_2_probability < 50),
      });
      setVotedMatchIds((prev) => new Set(prev).add(selectedMatch.id));
      setIsModalOpen(false);
      router.push(`/results?match_id=${selectedMatch.id}&predicted=${encodeURIComponent(team)}`);
    } else {
      if (data.error?.toLowerCase().includes("already predicted")) {
        setVotedMatchIds((prev) => new Set(prev).add(selectedMatch.id));
        setIsModalOpen(false);
        router.push(`/results?match_id=${selectedMatch.id}&predicted=${encodeURIComponent(team)}`);
        return;
      }
      throw new Error(data.error || "Failed to create prediction");
    }
  };

  const tabs: { key: Tab; label: string; icon: string; count: number; pulse?: boolean }[] = [
    { key: "upcoming", label: "Upcoming", icon: "🏏", count: upcomingMatches.length },
    { key: "live",     label: "Live",     icon: "🔴", count: liveMatches.length, pulse: liveMatches.length > 0 },
    { key: "results",  label: "Results",  icon: "📊", count: resultMatches.length },
  ];

  const activeMatches =
    activeTab === "live" ? liveMatches :
    activeTab === "upcoming" ? upcomingMatches :
    resultMatches;

  // Streak-at-risk: user has a streak + there's an unpredicted match closing within 6 hours
  const streakAtRiskMatch = currentStreak >= 2
    ? upcomingMatches.find((m) => {
        const minsLeft = (new Date(m.match_date).getTime() - Date.now()) / 60_000;
        return minsLeft > 0 && minsLeft < 360 && !votedMatchIds.has(m.id);
      }) ?? null
    : null;

  const favTeamCfg = favTeam ? getTeamConfig(favTeam) : null;
  const favTeamNextMatch = favTeam
    ? upcomingMatches.find(
        (m) => (m.team_1 === favTeam || m.team_2 === favTeam) && !votedMatchIds.has(m.id)
      ) ?? null
    : null;

  return (
    <>
      {/* Welcome banner — shown once after signup */}
      {showWelcome && (
        <div className="mb-4 px-4 py-3.5 rounded-2xl flex items-center justify-between gap-3 border border-green-500/25"
          style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))" }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-white font-bold text-sm">You&apos;re in! Pick a match below and beat the AI.</p>
              <p className="text-green-400 text-xs mt-0.5">Correct pick = 1,000 pts · Underdog win = 1,500 pts · Beat AI = +500 bonus</p>
            </div>
          </div>
          <button onClick={() => setShowWelcome(false)} className="text-gray-500 hover:text-white transition-smooth shrink-0 text-lg">✕</button>
        </div>
      )}

      {/* Guest value-prop banner — hidden once logged in */}
      {!userId && (
        <div
          className="mb-5 rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.03))",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="font-display font-black text-white text-xl leading-tight mb-1">
                Can <span className="text-gradient">You</span> Beat the AI?
              </p>
              <p className="text-gray-400 text-sm">Free fan prediction · No money · Pure cricket.</p>
            </div>
            <span className="text-3xl shrink-0">🏆</span>
          </div>
          <ul className="space-y-1.5 mb-4 text-sm text-gray-300">
            <li className="flex items-center gap-2"><span className="text-green-400 font-bold">✓</span> Pick today&apos;s match winner</li>
            <li className="flex items-center gap-2"><span className="text-green-400 font-bold">✓</span> Beat the AI for +500 bonus pts</li>
            <li className="flex items-center gap-2"><span className="text-green-400 font-bold">✓</span> Climb the leaderboard with 10,000+ fans</li>
          </ul>
          <a
            href="/signup"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.4)" }}
          >
            🏏 Join Free — Takes 30 Seconds →
          </a>
        </div>
      )}

      {/* Streak-at-risk banner */}
      {streakAtRiskMatch && (
        <button
          onClick={() => handlePredict(streakAtRiskMatch)}
          className="w-full text-left mb-4 px-4 py-3.5 rounded-2xl flex items-center justify-between gap-3 border border-red-500/40 animate-pulse-slow"
          style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.14), rgba(239,68,68,0.05))" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl shrink-0">🔥</span>
            <div>
              <p className="text-white font-bold text-sm">
                Your {currentStreak}-match streak is at risk!
              </p>
              <p className="text-red-400 text-xs mt-0.5">
                Predict {streakAtRiskMatch.team_1} vs {streakAtRiskMatch.team_2} before it&apos;s too late →
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full shrink-0 bg-red-500 text-white">
            Predict Now
          </span>
        </button>
      )}

      {/* Favourite team next match — personalised nudge */}
      {favTeamCfg && favTeamNextMatch && activeTab === "upcoming" && (
        <button
          onClick={() => handlePredict(favTeamNextMatch)}
          className="w-full text-left mb-4 p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${favTeamCfg.color}18, ${favTeamCfg.color}06)`,
            border: `1px solid ${favTeamCfg.color}35`,
          }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: favTeamCfg.color }}>
            {favTeamCfg.emoji} Your team&apos;s next match
          </p>
          <p className="font-display font-black text-white text-lg leading-tight">
            {favTeamNextMatch.team_1}{" "}
            <span className="text-gray-500 font-normal text-base">vs</span>{" "}
            {favTeamNextMatch.team_2}
          </p>
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-xs text-gray-400">
              📍 {favTeamNextMatch.city} ·{" "}
              {new Date(favTeamNextMatch.match_date).toLocaleString("en-IN", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </span>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full shrink-0"
              style={{ background: favTeamCfg.color, color: "#000" }}
            >
              Predict Now →
            </span>
          </div>
        </button>
      )}

      {/* Browse by Team strip */}
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Browse by Team</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {Object.entries(TEAM_CONFIG).map(([key, cfg]) => (
            <a
              key={key}
              href={`/teams/${key.toLowerCase()}`}
              className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:-translate-y-0.5"
              style={{
                background: favTeam === key ? `${cfg.color}22` : "rgba(255,255,255,0.05)",
                border: `1px solid ${favTeam === key ? cfg.color + "50" : "rgba(255,255,255,0.08)"}`,
                color: favTeam === key ? cfg.color : "#6B7280",
              }}
            >
              <span>{cfg.emoji}</span>
              <span>{key}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.pulse && activeTab !== tab.key
              ? <span className="live-dot" />
              : <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`hidden sm:inline text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key
                    ? "bg-red-500/30 text-red-300"
                    : "bg-white/[0.06] text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeMatches.length === 0 ? (
        <div className="text-center py-12 glass rounded-2xl">
          <p className="text-4xl mb-3">
            {activeTab === "live" ? "📺" : activeTab === "upcoming" ? "🏏" : "📊"}
          </p>
          <p className="text-gray-400 font-semibold">
            {activeTab === "live" ? "No live matches right now" :
             activeTab === "upcoming" ? "No upcoming matches yet" :
             "No results yet — check back after matches complete"}
          </p>
        </div>
      ) : activeTab === "results" ? (
        resultMatches.map((match) => (
          <ResultMatchCard key={match.id} match={match} userId={userId} userPredictedTeam={votedTeams.get(match.id) ?? null} />
        ))
      ) : (
        activeMatches.map((match) => (
          <MatchCard key={match.id} match={match} onPredict={handlePredict} alreadyVoted={votedMatchIds.has(match.id)} />
        ))
      )}

      {/* ── Secondary engagement — below match list so predictions stay first ── */}
      {userRankData && rival && (
        <RivalCard userRank={userRankData} rival={rival} />
      )}
      {weeklyStats && weeklyStats.predictions > 0 && (
        <WeeklyRecap
          stats={weeklyStats}
          username={username}
          isLastWeek={(weeklyStats as { _isLastWeek?: boolean })._isLastWeek === true}
        />
      )}
      <DailyTrivia userId={userId} />

      <PredictionModal
        isOpen={isModalOpen}
        match={selectedMatch}
        onClose={() => setIsModalOpen(false)}
        onVote={handleVote}
      />
    </>
  );
}
