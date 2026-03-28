// ── The Odds API — IPL integration ──────────────────────────────────────────
// Docs: https://the-odds-api.com/liveapi/guides/v4/
// Sport key: cricket_ipl

export interface OddsMatch {
  oddsId: string;          // Odds API event ID
  team1: string;           // Our short code e.g. "RCB"
  team2: string;           // Our short code e.g. "SRH"
  team1FullName: string;   // As returned by Odds API
  team2FullName: string;
  matchDate: string;       // ISO string
  team1Probability: number; // 0–100, normalized
  team2Probability: number;
  bookmakerCount: number;
}

// Map Odds API full team names → our short codes
// Covers common spelling variations across bookmakers
const TEAM_NAME_MAP: Record<string, string> = {
  "chennai super kings":        "CSK",
  "mumbai indians":             "MI",
  "royal challengers bangalore": "RCB",
  "royal challengers bengaluru": "RCB",
  "kolkata knight riders":      "KKR",
  "delhi capitals":             "DC",
  "sunrisers hyderabad":        "SRH",
  "punjab kings":               "PBKS",
  "kings xi punjab":            "PBKS",
  "rajasthan royals":           "RR",
  "gujarat titans":             "GT",
  "lucknow super giants":       "LSG",
};

function toShortCode(fullName: string): string {
  const key = fullName.toLowerCase().trim();
  return TEAM_NAME_MAP[key] ?? fullName.toUpperCase().slice(0, 3);
}

// Convert decimal odds → implied probability (removes vig, sums to 100)
function decimalToProb(price: number): number {
  return price > 0 ? 1 / price : 0;
}

interface OddsApiEvent {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    markets: Array<{
      key: string;
      outcomes: Array<{ name: string; price: number }>;
    }>;
  }>;
}

export async function fetchIPLOdds(): Promise<OddsMatch[]> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey || apiKey === "YOUR_KEY_HERE") throw new Error("ODDS_API_KEY not configured");

  const url =
    `https://api.the-odds-api.com/v4/sports/cricket_ipl/odds/` +
    `?apiKey=${apiKey}&regions=uk&markets=h2h&oddsFormat=decimal`;

  const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Odds API ${res.status}: ${body}`);
  }

  const events: OddsApiEvent[] = await res.json();

  return events
    .filter((e) => e.bookmakers.length > 0)
    .map((event) => {
      // Aggregate raw probabilities across all bookmakers (consensus odds)
      let sumHome = 0;
      let sumAway = 0;
      let count = 0;

      for (const bm of event.bookmakers) {
        const h2h = bm.markets.find((m) => m.key === "h2h");
        if (!h2h) continue;
        const homeOutcome = h2h.outcomes.find(
          (o) => o.name === event.home_team
        );
        const awayOutcome = h2h.outcomes.find(
          (o) => o.name === event.away_team
        );
        if (!homeOutcome || !awayOutcome) continue;

        sumHome += decimalToProb(homeOutcome.price);
        sumAway += decimalToProb(awayOutcome.price);
        count++;
      }

      if (count === 0) return null;

      // Average across bookmakers
      const avgHome = sumHome / count;
      const avgAway = sumAway / count;
      const total = avgHome + avgAway;

      // Normalize (remove vig) → two values that sum to 100
      const team1Prob = Math.round((avgHome / total) * 100);
      const team2Prob = 100 - team1Prob;

      return {
        oddsId: event.id,
        team1: toShortCode(event.home_team),
        team2: toShortCode(event.away_team),
        team1FullName: event.home_team,
        team2FullName: event.away_team,
        matchDate: event.commence_time,
        team1Probability: team1Prob,
        team2Probability: team2Prob,
        bookmakerCount: count,
      } satisfies OddsMatch;
    })
    .filter((m): m is OddsMatch => m !== null)
    .sort(
      (a, b) =>
        new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    );
}
