import { Match } from "@/lib/supabase";

/**
 * Convert a Match to a URL slug.
 * Format: "rcb-vs-mi-match-12"
 */
export function matchToSlug(match: Pick<Match, "team_1" | "team_2" | "match_number">): string {
  return `${match.team_1.toLowerCase()}-vs-${match.team_2.toLowerCase()}-match-${match.match_number}`;
}

/**
 * Parse a slug back to team names and match number.
 * Returns null if the slug format is invalid.
 */
export function parseMatchSlug(slug: string): { team1: string; team2: string; matchNumber: number } | null {
  // rcb-vs-mi-match-12
  const match = slug.match(/^([a-z]+)-vs-([a-z]+)-match-(\d+)$/);
  if (!match) return null;
  return {
    team1: match[1].toUpperCase(),
    team2: match[2].toUpperCase(),
    matchNumber: parseInt(match[3], 10),
  };
}

/**
 * Find a match from a list by its slug.
 * Matches by match_number (most reliable) with team name fallback.
 */
export function findMatchBySlug(slug: string, matches: Match[]): Match | null {
  const parsed = parseMatchSlug(slug);
  if (!parsed) return null;

  // Primary: match by number
  const byNumber = matches.find((m) => m.match_number === parsed.matchNumber);
  if (byNumber) return byNumber;

  // Fallback: match by team names
  return (
    matches.find(
      (m) =>
        m.team_1.toUpperCase() === parsed.team1 &&
        m.team_2.toUpperCase() === parsed.team2
    ) ?? null
  );
}
