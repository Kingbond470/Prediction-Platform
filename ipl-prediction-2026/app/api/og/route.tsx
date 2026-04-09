import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Team colour + emoji map (keep in sync with app/lib/teams.ts)
const TEAM_META: Record<string, { color: string; emoji: string }> = {
  CSK:  { color: "#F9CD1C", emoji: "🦁" },
  MI:   { color: "#4FA3E0", emoji: "⚓" },
  RCB:  { color: "#FF4444", emoji: "🦅" },
  KKR:  { color: "#A78BFA", emoji: "⚡" },
  DC:   { color: "#38BDF8", emoji: "🔵" },
  SRH:  { color: "#FF7A1A", emoji: "☀️" },
  PBKS: { color: "#FF4444", emoji: "🦁" },
  RR:   { color: "#F472B6", emoji: "👑" },
  GT:   { color: "#D4AF37", emoji: "🏔" },
  LSG:  { color: "#93C5FD", emoji: "🦅" },
};
function teamMeta(name: string) {
  return TEAM_META[name?.toUpperCase()] ?? { color: "#EF4444", emoji: "🏏" };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const type   = searchParams.get("type") ?? "match";
  const team1  = (searchParams.get("team1")  ?? "TEAM 1").toUpperCase();
  const team2  = (searchParams.get("team2")  ?? "TEAM 2").toUpperCase();
  const matchN = searchParams.get("match")   ?? "?";
  const prob1  = Number(searchParams.get("prob1") ?? 50);
  const prob2  = Number(searchParams.get("prob2") ?? 50);
  const venue  = searchParams.get("venue")   ?? "";
  // result-only params
  const pick   = (searchParams.get("pick") ?? "").toUpperCase();
  const won    = searchParams.get("won") === "true";
  const draw   = searchParams.get("draw") === "true";
  const pts    = searchParams.get("points") ?? "";

  const favTeam  = prob1 >= prob2 ? team1 : team2;
  const favPct   = Math.max(prob1, prob2);
  const m1 = teamMeta(team1);
  const m2 = teamMeta(team2);
  const pickMeta = teamMeta(pick || team1);
  const c1 = m1.color;
  const c2 = m2.color;

  const outcomeColor = won ? "#10B981" : draw ? "#818CF8" : "#9CA3AF";
  const outcomeLabel = won ? "I BEAT THE AI" : draw ? "WE BOTH CALLED IT" : "AI WON THIS ONE";

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
          <span style={{ color: "#EF4444", fontSize: "15px", fontWeight: "700", letterSpacing: "3px" }}>
            IPL 2026 · MATCH #{matchN}
          </span>
        </div>

        {type === "result" ? (
          /* ── RESULT CARD ─────────────────────────────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            {/* Outcome headline */}
            <div style={{ fontSize: "64px", fontWeight: "900", color: outcomeColor, letterSpacing: "-2px" }}>
              {outcomeLabel} 🤖
            </div>

            {/* Pick badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: "20px",
              background: `${pickMeta.color}18`,
              border: `2px solid ${pickMeta.color}50`,
              borderRadius: "20px", padding: "20px 40px",
            }}>
              <span style={{ fontSize: "52px" }}>{pickMeta.emoji}</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#9CA3AF", fontSize: "13px", fontWeight: "700", letterSpacing: "2px" }}>MY PICK</span>
                <span style={{ color: pickMeta.color, fontSize: "52px", fontWeight: "900", lineHeight: 1 }}>{pick}</span>
              </div>
              {pts && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginLeft: "24px" }}>
                  <span style={{ color: "#F59E0B", fontSize: "52px", fontWeight: "900", lineHeight: 1 }}>+{pts}</span>
                  <span style={{ color: "#9CA3AF", fontSize: "14px" }}>pts earned</span>
                </div>
              )}
            </div>

            <span style={{ color: "#4B5563", fontSize: "20px" }}>
              {team1} vs {team2}
            </span>
          </div>
        ) : (
          /* ── MATCH PREVIEW CARD ──────────────────────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Teams */}
            <div style={{ display: "flex", alignItems: "center", gap: "32px", marginBottom: "20px" }}>
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
              display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
              width: "640px", marginBottom: "28px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <span style={{ color: "#9CA3AF", fontSize: "14px" }}>
                  🤖 AI picks{" "}
                  <span style={{ color: "#F59E0B", fontWeight: "700" }}>{favTeam} ({favPct}%)</span>
                </span>
                <span style={{ color: "#6B7280", fontSize: "13px" }}>bookmaker odds</span>
              </div>
              <div style={{
                width: "100%", height: "10px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "100px", display: "flex", overflow: "hidden",
              }}>
                <div style={{ width: `${prob1}%`, height: "100%", background: c1, display: "flex" }} />
                <div style={{ width: `${prob2}%`, height: "100%", background: c2, display: "flex" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <span style={{ color: c1, fontSize: "16px", fontWeight: "700" }}>{team1} {prob1}%</span>
                <span style={{ color: c2, fontSize: "16px", fontWeight: "700" }}>{prob2}% {team2}</span>
              </div>
            </div>

            {/* CTA pill */}
            <div style={{
              display: "flex",
              background: "linear-gradient(135deg, #EF4444, #DC2626)",
              borderRadius: "14px", padding: "16px 40px",
              marginBottom: "28px",
            }}>
              <span style={{ color: "white", fontSize: "20px", fontWeight: "700" }}>
                🏏 Who will win? Predict free — Beat the AI
              </span>
            </div>
          </div>
        )}

        {/* Domain */}
        <span style={{ color: "#374151", fontSize: "14px", letterSpacing: "1px", position: "absolute", bottom: "24px" }}>
          iplprediction2026.in
        </span>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
