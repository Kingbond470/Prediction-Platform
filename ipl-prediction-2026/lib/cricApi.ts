// ── CricAPI v1 — IPL match scores & results ──────────────────────────────────
// Docs: https://cricapi.com/
// Endpoint used: /v1/currentMatches (live + recently completed)

const BASE_URL = "https://api.cricapi.com/v1";

// Map CricAPI full team names → our short codes
const TEAM_NAME_MAP: Record<string, string> = {
  "chennai super kings":         "CSK",
  "mumbai indians":              "MI",
  "royal challengers bangalore": "RCB",
  "royal challengers bengaluru": "RCB",
  "kolkata knight riders":       "KKR",
  "delhi capitals":              "DC",
  "sunrisers hyderabad":         "SRH",
  "punjab kings":                "PBKS",
  "kings xi punjab":             "PBKS",
  "rajasthan royals":            "RR",
  "gujarat titans":              "GT",
  "lucknow super giants":        "LSG",
};

function toShortCode(name: string): string {
  const key = name.toLowerCase().trim();
  return TEAM_NAME_MAP[key] ?? name.toUpperCase().slice(0, 3);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CricScore {
  r?: number;  // runs
  w?: number;  // wickets
  o?: number;  // overs
  inning: string;
}

export interface CricMatch {
  id: string;
  name: string;
  status: string;     // e.g. "CSK won by 5 wickets"
  matchType: string;  // "t20"
  venue: string;
  date: string;
  dateTimeGMT: string;
  teams: string[];
  teamInfo?: Array<{ name: string; shortname: string; img: string }>;
  score?: CricScore[];
  series_id?: string;
  matchStarted: boolean;
  matchEnded: boolean;
}

interface CricApiResponse {
  apikey: string;
  data: CricMatch[];
  status: string;
  info: { hitsToday: number; hitsUsed: number; hitsLimit: number };
}

// ── Parsed result ─────────────────────────────────────────────────────────────

export interface ParsedCricMatch {
  cricId: string;
  team1: string;       // short code
  team2: string;
  name: string;        // "CSK vs RCB, Match 5"
  status: string;      // raw status string from CricAPI
  venue: string;
  dateTimeGMT: string;
  matchStarted: boolean;
  matchEnded: boolean;
  winner: string | null;   // short code if ended and winner parseable, else null
  score: CricScore[];
}

/**
 * Extracts the winning team short code from a CricAPI status string.
 * Status examples:
 *   "Chennai Super Kings won by 5 wickets"
 *   "Mumbai Indians won by 23 runs"
 *   "Match tied"
 *   "No result"
 */
export function parseWinnerFromStatus(status: string, team1: string, team2: string): string | null {
  if (!status) return null;
  const lower = status.toLowerCase();

  // Check each team name variant
  for (const [fullName, code] of Object.entries(TEAM_NAME_MAP)) {
    if (lower.includes(fullName) && lower.includes("won")) {
      return code;
    }
  }

  // Fallback: check short codes directly in status (some APIs use short names)
  const upperStatus = status.toUpperCase();
  if (upperStatus.includes(team1) && lower.includes("won")) return team1;
  if (upperStatus.includes(team2) && lower.includes("won")) return team2;

  return null;
}

// ── Fetch functions ────────────────────────────────────────────────────────────

/**
 * Fetch all current (live + recent) IPL matches from CricAPI.
 * Filters to T20 matches in the IPL series only.
 */
export async function fetchCricApiMatches(): Promise<ParsedCricMatch[]> {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) throw new Error("CRICAPI_KEY not set");

  const res = await fetch(`${BASE_URL}/currentMatches?apikey=${apiKey}&offset=0`, {
    next: { revalidate: 60 }, // cache for 60 seconds
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CricAPI ${res.status}: ${body}`);
  }

  const json: CricApiResponse = await res.json();
  if (json.status !== "success" || !Array.isArray(json.data)) {
    throw new Error(`CricAPI unexpected response: ${json.status}`);
  }

  return json.data
    .filter((m) => {
      const name = m.name.toLowerCase();
      // Keep only IPL T20 matches
      return m.matchType === "t20" && (name.includes("ipl") || name.includes("indian premier league") || isIPLTeams(m.teams));
    })
    .map((m): ParsedCricMatch => {
      const [rawTeam1, rawTeam2] = m.teams ?? ["TBD", "TBD"];
      const team1 = toShortCode(rawTeam1);
      const team2 = toShortCode(rawTeam2);
      return {
        cricId: m.id,
        team1,
        team2,
        name: m.name,
        status: m.status,
        venue: m.venue,
        dateTimeGMT: m.dateTimeGMT,
        matchStarted: m.matchStarted,
        matchEnded: m.matchEnded,
        winner: m.matchEnded ? parseWinnerFromStatus(m.status, team1, team2) : null,
        score: m.score ?? [],
      };
    });
}

/** Quick check: does the teams array contain known IPL teams? */
function isIPLTeams(teams: string[]): boolean {
  if (!teams) return false;
  return teams.some((t) => TEAM_NAME_MAP[t.toLowerCase().trim()] !== undefined);
}

/**
 * Fetch only completed IPL matches (matchEnded = true) with a clear winner.
 */
export async function fetchCompletedIPLMatches() {
  const all = await fetchCricApiMatches();
  return all.filter((m) => m.matchEnded && m.winner !== null);
}
