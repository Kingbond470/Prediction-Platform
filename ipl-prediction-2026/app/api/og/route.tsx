import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Team colour map (keep in sync with app/lib/teams.ts — edge runtime can't import it)
const TEAM_COLORS: Record<string, string> = {
  CSK: "#F9CD1C", MI: "#004BA0", RCB: "#EC1C24", KKR: "#2E0854",
  DC: "#0078BC", SRH: "#F7600A", PBKS: "#ED1B24", RR: "#EA1A85",
  GT: "#1C1C52", LSG: "#A0DDFF",
};
function teamColor(name: string): string {
  return TEAM_COLORS[name?.toUpperCase()] ?? "#EF4444";
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const team1  = (searchParams.get("team1")  ?? "TEAM 1").toUpperCase();
  const team2  = (searchParams.get("team2")  ?? "TEAM 2").toUpperCase();
  const matchN = searchParams.get("match")   ?? "?";
  const prob1  = Number(searchParams.get("prob1") ?? 50);
  const prob2  = Number(searchParams.get("prob2") ?? 50);
  const venue  = searchParams.get("venue")   ?? "";

  const favTeam  = prob1 >= prob2 ? team1 : team2;
  const favPct   = Math.max(prob1, prob2);
  const c1 = teamColor(team1);
  const c2 = teamColor(team2);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px", height: "630px",
          background: "#07111F",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Background glow blobs */}
        <div style={{
          position: "absolute", top: "-80px", left: "-80px",
          width: "500px", height: "500px", borderRadius: "50%",
          background: `radial-gradient(circle, ${c1}30 0%, transparent 70%)`,
          display: "flex",
        }} />
        <div style={{
          position: "absolute", bottom: "-80px", right: "-80px",
          width: "500px", height: "500px", borderRadius: "50%",
          background: `radial-gradient(circle, ${c2}30 0%, transparent 70%)`,
          display: "flex",
        }} />

        {/* Top badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.35)",
          borderRadius: "100px", padding: "8px 20px",
          marginBottom: "28px",
        }}>
          <div style={{
            width: "10px", height: "10px", borderRadius: "50%",
            background: "#EF4444", display: "flex",
          }} />
          <span style={{
            color: "#EF4444", fontSize: "15px",
            fontWeight: "700", letterSpacing: "3px",
          }}>
            IPL 2026 · MATCH #{matchN}
          </span>
        </div>

        {/* Teams */}
        <div style={{
          display: "flex", alignItems: "center",
          gap: "32px", marginBottom: "20px",
        }}>
          <span style={{ color: c1, fontSize: "88px", fontWeight: "900", letterSpacing: "-2px" }}>
            {team1}
          </span>
          <span style={{ color: "#374151", fontSize: "44px", fontWeight: "300" }}>vs</span>
          <span style={{ color: c2, fontSize: "88px", fontWeight: "900", letterSpacing: "-2px" }}>
            {team2}
          </span>
        </div>

        {/* Venue */}
        {venue && (
          <div style={{ display: "flex", marginBottom: "24px" }}>
            <span style={{ color: "#6B7280", fontSize: "15px" }}>📍 {venue}</span>
          </div>
        )}

        {/* AI odds bar */}
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: "8px",
          width: "640px", marginBottom: "28px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <span style={{ color: "#9CA3AF", fontSize: "14px" }}>
              🤖 AI picks{" "}
              <span style={{ color: "#F59E0B", fontWeight: "700" }}>
                {favTeam} ({favPct}%)
              </span>
            </span>
            <span style={{ color: "#6B7280", fontSize: "13px" }}>bookmaker odds</span>
          </div>
          <div style={{
            width: "100%", height: "10px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "100px", display: "flex", overflow: "hidden",
          }}>
            <div style={{
              width: `${prob1}%`, height: "100%",
              background: c1,
              display: "flex",
            }} />
            <div style={{
              width: `${prob2}%`, height: "100%",
              background: c2,
              display: "flex",
            }} />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", width: "100%",
          }}>
            <span style={{ color: c1, fontSize: "16px", fontWeight: "700" }}>
              {team1} {prob1}%
            </span>
            <span style={{ color: c2, fontSize: "16px", fontWeight: "700" }}>
              {prob2}% {team2}
            </span>
          </div>
        </div>

        {/* CTA pill */}
        <div style={{
          display: "flex",
          background: "linear-gradient(135deg, #EF4444, #DC2626)",
          borderRadius: "14px", padding: "16px 40px",
          marginBottom: "28px",
          boxShadow: "0 0 40px rgba(239,68,68,0.4)",
        }}>
          <span style={{ color: "white", fontSize: "20px", fontWeight: "700" }}>
            🏏 Who will win? Predict free — Beat the AI
          </span>
        </div>

        {/* Domain */}
        <span style={{ color: "#374151", fontSize: "14px", letterSpacing: "1px" }}>
          iplprediction2026.in
        </span>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
