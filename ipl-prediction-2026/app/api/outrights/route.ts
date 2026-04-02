import { NextResponse } from "next/server";
import { fetchIPLOutrights, OutrightTeam } from "@/app/lib/oddsApi";

export const dynamic = "force-dynamic";

// Fallback data when no API key — realistic-looking static odds
function getMockOutrights(): OutrightTeam[] {
  return [
    { team: "MI",   teamFullName: "Mumbai Indians",           probability: 18 },
    { team: "CSK",  teamFullName: "Chennai Super Kings",      probability: 16 },
    { team: "RCB",  teamFullName: "Royal Challengers Bengaluru", probability: 14 },
    { team: "KKR",  teamFullName: "Kolkata Knight Riders",    probability: 13 },
    { team: "GT",   teamFullName: "Gujarat Titans",           probability: 11 },
    { team: "SRH",  teamFullName: "Sunrisers Hyderabad",      probability: 10 },
    { team: "RR",   teamFullName: "Rajasthan Royals",         probability:  9 },
    { team: "DC",   teamFullName: "Delhi Capitals",           probability:  5 },
    { team: "PBKS", teamFullName: "Punjab Kings",             probability:  4 },
    { team: "LSG",  teamFullName: "Lucknow Super Giants",     probability:  0 },
  ];
}

export async function GET() {
  const hasOddsKey = !!(process.env.ODDS_API_KEY && process.env.ODDS_API_KEY !== "YOUR_KEY_HERE");

  if (!hasOddsKey) {
    return NextResponse.json({ success: true, teams: getMockOutrights(), source: "mock" });
  }

  try {
    const teams = await fetchIPLOutrights();
    if (teams.length === 0) {
      return NextResponse.json({ success: true, teams: getMockOutrights(), source: "mock" });
    }
    return NextResponse.json({ success: true, teams, source: "odds_api" });
  } catch (err) {
    console.warn("[/api/outrights] fetch failed, using mock:", err);
    return NextResponse.json({ success: true, teams: getMockOutrights(), source: "mock" });
  }
}
