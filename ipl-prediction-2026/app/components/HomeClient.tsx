"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Match } from "@/lib/supabase";
import { MatchCard } from "./MatchCard";
import { ResultMatchCard } from "./ResultMatchCard";
import { PredictionModal } from "./PredictionModal";
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

    if (storedUserId) {
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
          const ids = new Set<string>(
            (d.predictions || []).map((p: { match_id: string }) => p.match_id)
          );
          setVotedMatchIds(ids);
        })
        .catch(() => {});
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

  return (
    <>
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
          <ResultMatchCard key={match.id} match={match} userId={userId} />
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
