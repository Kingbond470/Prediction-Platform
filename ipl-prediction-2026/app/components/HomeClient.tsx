"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Match } from "@/lib/supabase";
import { MatchCard } from "./MatchCard";
import { ResultMatchCard } from "./ResultMatchCard";
import { PredictionModal } from "./PredictionModal";
import { getTeamConfig } from "@/app/lib/teams";
import posthog from "posthog-js";

interface HomeClientProps {
  initialMatches: Match[];
}

type Tab = "upcoming" | "live" | "results";

export default function HomeClient({ initialMatches }: HomeClientProps) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [votedMatchIds, setVotedMatchIds] = useState<Set<string>>(new Set());
  const [votedTeams, setVotedTeams] = useState<Map<string, string>>(new Map());
  const [showWelcome, setShowWelcome] = useState(false);
  const [favTeam, setFavTeam] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);

  const now = new Date();

  const liveMatches = initialMatches.filter(
    (m) => m.status === "live" || (m.status === "upcoming" && new Date(m.match_date) <= now)
  );
  const upcomingMatches = initialMatches.filter(
    (m) => m.status === "upcoming" && new Date(m.match_date) > now
  );
  const resultMatches = initialMatches.filter((m) => m.status === "completed");

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    setUserId(storedUserId);
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
          const streak = d.user_rank?.current_streak ?? 0;
          setCurrentStreak(streak);
        })
        .catch((err) => {
          // Log so it shows up in Vercel function logs; swallow so the page
          // still renders — the server rejects duplicate predictions anyway.
          console.error("[HomeClient] failed to fetch user predictions:", err);
        });
    }

    // Auto-select tab based on what has content
    if (liveMatches.length > 0) setActiveTab("live");
    else if (upcomingMatches.length > 0) setActiveTab("upcoming");
    else if (resultMatches.length > 0) setActiveTab("results");
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
      router.push("/signup");
      return;
    }
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  const handleVote = async (team: string) => {
    if (!userId || !selectedMatch) return;

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

  const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
    { key: "live",     label: "Live",     icon: "🔴", count: liveMatches.length },
    { key: "upcoming", label: "Upcoming", icon: "🏏", count: upcomingMatches.length },
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

      {/* Tab bar */}
      <div className="flex gap-2 mb-5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
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

      <PredictionModal
        isOpen={isModalOpen}
        match={selectedMatch}
        onClose={() => setIsModalOpen(false)}
        onVote={handleVote}
      />
    </>
  );
}
