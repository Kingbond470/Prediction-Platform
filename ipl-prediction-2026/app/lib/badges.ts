// Achievement badge definitions — all computable from leaderboard API data.
// No new DB queries needed.

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  description: string;
  color: string;        // hex accent for unlocked state
}

export interface BadgeState extends Badge {
  unlocked: boolean;
}

export const BADGES: Badge[] = [
  {
    id: "first_blood",
    emoji: "🩸",
    label: "First Blood",
    description: "Get your first correct prediction",
    color: "#EF4444",
  },
  {
    id: "ai_slayer",
    emoji: "🤖",
    label: "AI Slayer",
    description: "Beat the AI 5 times",
    color: "#60A5FA",
  },
  {
    id: "on_fire",
    emoji: "🔥",
    label: "On Fire",
    description: "Hit a 5-match correct streak",
    color: "#F97316",
  },
  {
    id: "faithful_fan",
    emoji: "🏏",
    label: "Faithful Fan",
    description: "Make 10 predictions",
    color: "#10B981",
  },
  {
    id: "top_10",
    emoji: "🎯",
    label: "Top 10",
    description: "Reach the top 10 on the leaderboard",
    color: "#F59E0B",
  },
  {
    id: "point_scorer",
    emoji: "⭐",
    label: "Point Scorer",
    description: "Earn 5,000 points",
    color: "#A78BFA",
  },
];

interface UserStats {
  rank: number;
  total_correct: number;
  beat_ai_count?: number;
  current_streak?: number;
  max_streak?: number;
  total_predictions: number;
  total_points: number;
}

export function computeBadges(stats: UserStats): BadgeState[] {
  return BADGES.map((badge) => {
    let unlocked = false;
    switch (badge.id) {
      case "first_blood":    unlocked = stats.total_correct >= 1; break;
      case "ai_slayer":      unlocked = (stats.beat_ai_count ?? 0) >= 5; break;
      case "on_fire":        unlocked = Math.max(stats.current_streak ?? 0, stats.max_streak ?? 0) >= 5; break;
      case "faithful_fan":   unlocked = stats.total_predictions >= 10; break;
      case "top_10":         unlocked = stats.rank <= 10; break;
      case "point_scorer":   unlocked = stats.total_points >= 5000; break;
    }
    return { ...badge, unlocked };
  });
}
