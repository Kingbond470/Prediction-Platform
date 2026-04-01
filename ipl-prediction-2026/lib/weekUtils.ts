/**
 * IPL 2026 Week Utilities (IST-aware)
 *
 * IPL season runs ~10 weeks (League: 8 weeks + Playoffs: 2 weeks).
 * Weeks are Mon 00:00 → Sun 23:59 IST.
 * Week numbers are 1-indexed from IPL_SEASON_START.
 */

// IST = UTC+5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// First Monday of IPL 2026 season — adjust if schedule shifts
export const IPL_SEASON_START = new Date("2026-03-22T00:00:00+05:30");

/**
 * Convert a UTC Date to the equivalent IST Date object.
 */
export function toIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

/**
 * Get the ISO week start (Monday 00:00 IST) for a given date.
 */
function getWeekStartIST(date: Date): Date {
  const ist = toIST(date);
  const day = ist.getUTCDay(); // 0 = Sunday
  const daysFromMonday = (day + 6) % 7; // Monday = 0
  const mondayIST = new Date(ist);
  mondayIST.setUTCDate(ist.getUTCDate() - daysFromMonday);
  mondayIST.setUTCHours(0, 0, 0, 0);
  return mondayIST;
}

/**
 * Returns the IPL week number (1–10) for a given date.
 * Returns null if the date is outside the IPL season.
 */
export function getIPLWeekNumber(date: Date): number | null {
  const seasonStartIST = toIST(IPL_SEASON_START);
  // Normalise season start to its Monday 00:00 IST
  const seasonWeekStart = getWeekStartIST(IPL_SEASON_START);
  const matchWeekStart = getWeekStartIST(date);

  const diffMs = matchWeekStart.getTime() - seasonWeekStart.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

  if (diffWeeks < 0 || diffWeeks >= 10) return null;
  return diffWeeks + 1;
}

/**
 * Returns the current IPL week number based on now (IST).
 */
export function getCurrentWeekNumber(): number | null {
  return getIPLWeekNumber(new Date());
}

/**
 * Returns Mon 00:00 and Sun 23:59:59 IST for a given IPL week number.
 */
export function getWeekDateRange(weekNumber: number): {
  start: Date;
  end: Date;
} {
  const seasonWeekStart = getWeekStartIST(IPL_SEASON_START);
  const weekOffsetMs = (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000;

  // These are in "IST wall-clock" UTC representation
  const startIST = new Date(seasonWeekStart.getTime() + weekOffsetMs);
  const endIST = new Date(startIST.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000);

  // Convert back to real UTC for storage / comparison
  return {
    start: new Date(startIST.getTime() - IST_OFFSET_MS),
    end: new Date(endIST.getTime() - IST_OFFSET_MS),
  };
}

/**
 * Returns true if today (IST) is Monday, Tuesday, or Wednesday.
 * Used to decide whether to show the "Winners Announced" banner.
 */
export function isWinnerAnnouncementWindow(): boolean {
  const ist = toIST(new Date());
  const day = ist.getUTCDay(); // 0=Sun 1=Mon 2=Tue 3=Wed
  return day >= 1 && day <= 3;
}

/**
 * Human-readable label for a week number, e.g. "Week 3".
 */
export function weekLabel(weekNumber: number): string {
  return `Week ${weekNumber}`;
}
