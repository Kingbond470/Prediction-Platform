"use client";

import { Match } from "@/lib/supabase";
import { Card } from "./Card";
import { Button } from "./Button";

interface MatchCardProps {
  match: Match;
  onPredict: (match: Match) => void;
}

export function MatchCard({ match, onPredict }: MatchCardProps) {
  const votingOpen = new Date() < new Date(match.vote_end_time);

  return (
    <Card className="mb-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold">
          {match.team_1}{" "}
          <span className="text-gray-400">vs</span>{" "}
          {match.team_2}
        </h2>
        {!votingOpen && (
          <span className="text-sm font-semibold text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
            Voting Closed
          </span>
        )}
      </div>

      <div className="text-sm text-gray-600 mb-6">
        <p className="mb-1">📍 {match.venue}, {match.city}</p>
        <p className="mb-2">
          🕐 {new Date(match.match_date).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
        <div className="flex gap-4 mt-3">
          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
            {match.team_1}: {match.team_1_probability}%
          </span>
          <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold">
            {match.team_2}: {match.team_2_probability}%
          </span>
        </div>
      </div>

      {votingOpen ? (
        <Button onClick={() => onPredict(match)} size="lg" className="w-full">
          BEAT THE AI
        </Button>
      ) : (
        <div className="text-center py-4 bg-gray-100 rounded-lg">
          <p className="text-gray-600">Voting closed for this match</p>
        </div>
      )}
    </Card>
  );
}
