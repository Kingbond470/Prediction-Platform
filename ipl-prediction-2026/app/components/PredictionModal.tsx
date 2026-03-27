"use client";

import { useState } from "react";
import { Match } from "@/lib/supabase";
import { Button } from "./Button";

interface PredictionModalProps {
  isOpen: boolean;
  match: Match | null;
  onClose: () => void;
  onVote: (team: string) => Promise<void>;
}

export function PredictionModal({
  isOpen,
  match,
  onClose,
  onVote,
}: PredictionModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  if (!isOpen || !match) return null;

  const handleVote = async (team: string) => {
    setLoading(true);
    try {
      await onVote(team);
      setSelectedTeam(null);
    } catch (error) {
      console.error("Vote failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 max-w-md w-11/12 z-50 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">YOUR PREDICTION</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600 transition-smooth"
          >
            ✕
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Pick a winner — then see if you can beat the AI!
        </p>

        {/* Team Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[match.team_1, match.team_2].map((team) => (
            <button
              key={team}
              onClick={() => setSelectedTeam(team)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedTeam === team
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 hover:border-red-400"
              }`}
            >
              <div className="text-lg font-bold">{team}</div>
              <div className="text-xs text-gray-500 mt-1">
                AI odds:{" "}
                {team === match.team_1
                  ? match.team_1_probability
                  : match.team_2_probability}
                %
              </div>
            </button>
          ))}
        </div>

        {/* Match Info */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6 text-sm">
          <p className="text-gray-600 mb-1">📍 {match.venue}, {match.city}</p>
          <p className="text-gray-600">
            🕐{" "}
            {new Date(match.match_date).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => selectedTeam && handleVote(selectedTeam)}
            disabled={!selectedTeam || loading}
            className="flex-1"
          >
            {loading ? "Submitting..." : "PREDICT"}
          </Button>
        </div>
      </div>
    </>
  );
}
