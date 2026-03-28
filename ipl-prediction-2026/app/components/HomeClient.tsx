"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Match } from "@/lib/supabase";
import { MatchCard } from "./MatchCard";
import { PredictionModal } from "./PredictionModal";

interface HomeClientProps {
  initialMatches: Match[];
}

export default function HomeClient({ initialMatches }: HomeClientProps) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    setUserId(storedUserId);

    // Auto-open the prediction modal if the user just signed up and had a match selected
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
    }
  }, [initialMatches]);

  const handlePredict = (match: Match) => {
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
      setIsModalOpen(false);
      router.push(`/results?match_id=${selectedMatch.id}&predicted=${encodeURIComponent(team)}`);
    } else {
      // If already predicted, take them to results instead of showing an error
      if (data.error?.toLowerCase().includes("already predicted")) {
        setIsModalOpen(false);
        router.push(`/results?match_id=${selectedMatch.id}&predicted=${encodeURIComponent(team)}`);
        return;
      }
      throw new Error(data.error || "Failed to create prediction");
    }
  };

  return (
    <>
      {initialMatches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-4xl mb-3">🏏</p>
          <p className="text-gray-600 font-semibold">No matches available yet</p>
          <p className="text-gray-400 text-sm mt-1">Check back soon!</p>
        </div>
      ) : (
        initialMatches.map((match) => (
          <MatchCard key={match.id} match={match} onPredict={handlePredict} />
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
