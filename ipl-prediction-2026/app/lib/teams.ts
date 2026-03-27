export interface TeamConfig {
  color: string;      // Primary brand color
  bg: string;         // Background color
  emoji: string;      // Team mascot emoji
  short: string;      // Full short name
  gradient: string;   // CSS gradient string
  textColor: string;  // Text color on bg
}

export const TEAM_CONFIG: Record<string, TeamConfig> = {
  CSK: {
    color: "#F9CD1C",
    bg: "#1A1200",
    emoji: "🦁",
    short: "Chennai",
    gradient: "linear-gradient(135deg, #F9CD1C22, #F9CD1C08)",
    textColor: "#F9CD1C",
  },
  MI: {
    color: "#4FA3E0",
    bg: "#00152A",
    emoji: "⚓",
    short: "Mumbai",
    gradient: "linear-gradient(135deg, #005DA022, #005DA008)",
    textColor: "#60B4F0",
  },
  RCB: {
    color: "#FF4444",
    bg: "#1A0000",
    emoji: "🦅",
    short: "Bangalore",
    gradient: "linear-gradient(135deg, #EC1C2422, #EC1C2408)",
    textColor: "#FF6666",
  },
  KKR: {
    color: "#A78BFA",
    bg: "#0D0720",
    emoji: "⚡",
    short: "Kolkata",
    gradient: "linear-gradient(135deg, #3A225D22, #3A225D08)",
    textColor: "#A78BFA",
  },
  DC: {
    color: "#38BDF8",
    bg: "#001525",
    emoji: "🔵",
    short: "Delhi",
    gradient: "linear-gradient(135deg, #0078BC22, #0078BC08)",
    textColor: "#38BDF8",
  },
  SRH: {
    color: "#FF7A1A",
    bg: "#1A0800",
    emoji: "☀️",
    short: "Hyderabad",
    gradient: "linear-gradient(135deg, #FF660122, #FF660108)",
    textColor: "#FF7A1A",
  },
  PBKS: {
    color: "#FF4444",
    bg: "#1A0000",
    emoji: "🦁",
    short: "Punjab",
    gradient: "linear-gradient(135deg, #ED1B2422, #ED1B2408)",
    textColor: "#FF6666",
  },
  RR: {
    color: "#F472B6",
    bg: "#1A0012",
    emoji: "👑",
    short: "Rajasthan",
    gradient: "linear-gradient(135deg, #EF007822, #EF007808)",
    textColor: "#F472B6",
  },
  GT: {
    color: "#D4AF37",
    bg: "#0D0B00",
    emoji: "🏔️",
    short: "Gujarat",
    gradient: "linear-gradient(135deg, #D4AF3722, #D4AF3708)",
    textColor: "#D4AF37",
  },
  LSG: {
    color: "#93C5FD",
    bg: "#001525",
    emoji: "🦅",
    short: "Lucknow",
    gradient: "linear-gradient(135deg, #A0DDFF22, #A0DDFF08)",
    textColor: "#93C5FD",
  },
};

export function getTeamConfig(team: string): TeamConfig {
  const key = team.toUpperCase();
  return (
    TEAM_CONFIG[key] ?? {
      color: "#EF4444",
      bg: "#1A0000",
      emoji: "🏏",
      short: team,
      gradient: "linear-gradient(135deg, #EF444422, #EF444408)",
      textColor: "#EF4444",
    }
  );
}
