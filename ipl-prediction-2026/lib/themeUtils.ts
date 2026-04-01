import { TEAM_CONFIG } from "@/app/lib/teams";

/**
 * Parse a hex color (#RRGGBB or #RGB) into RGB components.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  if (full.length !== 6) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/**
 * Apply a team's color theme to the document root via CSS custom properties.
 *
 * Sets:
 *   --tc-r, --tc-g, --tc-b   → RGB components (use with rgba())
 *   --tc                     → full hex color
 *
 * Usage in inline styles:
 *   color: "var(--tc)"
 *   background: "rgba(var(--tc-r), var(--tc-g), var(--tc-b), 0.12)"
 *   boxShadow: "0 0 40px rgba(var(--tc-r), var(--tc-g), var(--tc-b), 0.3)"
 */
export function applyTeamTheme(teamCode: string): void {
  if (typeof document === "undefined") return;

  const cfg = TEAM_CONFIG[teamCode.toUpperCase()];
  const color = cfg?.color ?? "#EF4444"; // default red
  const rgb = hexToRgb(color);

  if (!rgb) return;

  const root = document.documentElement;
  root.style.setProperty("--tc", color);
  root.style.setProperty("--tc-r", String(rgb.r));
  root.style.setProperty("--tc-g", String(rgb.g));
  root.style.setProperty("--tc-b", String(rgb.b));
}

/**
 * Reset theme to the default red accent.
 */
export function resetTheme(): void {
  applyTeamTheme("default");
}

/**
 * Convenience: apply theme from localStorage on startup.
 */
export function applyStoredTheme(): void {
  if (typeof window === "undefined") return;
  const team = localStorage.getItem("favoriteTeam");
  if (team) applyTeamTheme(team);
}

// ─── CSS var shorthand helpers (for use in style props) ───────────────────────

/** Primary team color — hex */
export const TC = "var(--tc, #EF4444)";

/** rgba with custom opacity — e.g. tcRgba(0.12) */
export function tcRgba(opacity: number): string {
  return `rgba(var(--tc-r, 239), var(--tc-g, 68), var(--tc-b, 68), ${opacity})`;
}

/** Team-colored box shadow glow */
export function tcGlow(opacity = 0.3, spread = 40): string {
  return `0 0 ${spread}px rgba(var(--tc-r, 239), var(--tc-g, 68), var(--tc-b, 68), ${opacity})`;
}
