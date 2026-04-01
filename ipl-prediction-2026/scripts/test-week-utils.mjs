// Unit tests for weekUtils logic (pure JS, no TS needed)

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const IPL_SEASON_START = new Date("2026-03-22T00:00:00+05:30"); // Sunday Mar 22

function toIST(date) {
  return new Date(date.getTime() + IST_OFFSET_MS);
}
function getWeekStartIST(date) {
  const ist = toIST(date);
  const day = ist.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  const mondayIST = new Date(ist);
  mondayIST.setUTCDate(ist.getUTCDate() - daysFromMonday);
  mondayIST.setUTCHours(0, 0, 0, 0);
  return mondayIST;
}
function getIPLWeekNumber(date) {
  const seasonWeekStart = getWeekStartIST(IPL_SEASON_START);
  const matchWeekStart = getWeekStartIST(date);
  const diffMs = matchWeekStart.getTime() - seasonWeekStart.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  if (diffWeeks < 0 || diffWeeks >= 10) return null;
  return diffWeeks + 1;
}
function getWeekDateRange(weekNumber) {
  const seasonWeekStart = getWeekStartIST(IPL_SEASON_START);
  const weekOffsetMs = (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000;
  const startIST = new Date(seasonWeekStart.getTime() + weekOffsetMs);
  const endIST = new Date(startIST.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000);
  return {
    start: new Date(startIST.getTime() - IST_OFFSET_MS),
    end:   new Date(endIST.getTime()   - IST_OFFSET_MS),
  };
}
function isWinnerAnnouncementWindow() {
  const ist = toIST(new Date());
  const day = ist.getUTCDay();
  return day >= 1 && day <= 3;
}

// ─── Calendar reference ────────────────────────────────────────────────────
// Season start = Sun Mar 22. getWeekStartIST(Mar 22) = Mon Mar 16.
// Week 1 = Mar 16 (Mon) – Mar 22 (Sun)
// Week 2 = Mar 23 (Mon) – Mar 29 (Sun)
// Week 3 = Mar 30 (Mon) – Apr 05 (Sun)   ← today Apr 01 is here
// Week 4 = Apr 06 (Mon) – Apr 12 (Sun)
// Week 10= May 18 (Mon) – May 24 (Sun)
// Week 11= May 25+  → null (season over)

let passed = 0, failed = 0;
function assert(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) console.log(`   Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
  ok ? passed++ : failed++;
}

// ─── Week number tests ─────────────────────────────────────────────────────
assert("Mar 22 2026 (season start, Sun) = week 1",
  getIPLWeekNumber(new Date("2026-03-22T10:00:00+05:30")), 1);

assert("Mar 16 2026 (first day of week 1, Mon) = week 1",
  getIPLWeekNumber(new Date("2026-03-16T08:00:00+05:30")), 1);

assert("Mar 23 2026 (Mon, week 2 start) = week 2",
  getIPLWeekNumber(new Date("2026-03-23T00:30:00+05:30")), 2);

assert("Mar 29 2026 (Sun, week 2 end) = week 2",
  getIPLWeekNumber(new Date("2026-03-29T22:00:00+05:30")), 2);

assert("Mar 30 2026 (Mon, week 3 start) = week 3",
  getIPLWeekNumber(new Date("2026-03-30T00:30:00+05:30")), 3);

assert("Apr 01 2026 (today, Wed) = week 3",
  getIPLWeekNumber(new Date("2026-04-01T10:00:00+05:30")), 3);

assert("Apr 05 2026 (Sun, week 3 end) = week 3",
  getIPLWeekNumber(new Date("2026-04-05T23:00:00+05:30")), 3);

assert("Apr 06 2026 (Mon, week 4 start) = week 4",
  getIPLWeekNumber(new Date("2026-04-06T10:00:00+05:30")), 4);

assert("May 24 2026 (Sun, week 10 end) = week 10",
  getIPLWeekNumber(new Date("2026-05-24T20:00:00+05:30")), 10);

assert("May 25 2026 (Mon, week 11) = null (season over)",
  getIPLWeekNumber(new Date("2026-05-25T10:00:00+05:30")), null);

assert("Jan 01 2025 = null (before season)",
  getIPLWeekNumber(new Date("2025-01-01")), null);

// ─── Date range tests ──────────────────────────────────────────────────────
const w1 = getWeekDateRange(1);
const w1StartIST = new Date(w1.start.getTime() + IST_OFFSET_MS);
assert("Week 1 start = Mon Mar 16 IST",
  `${w1StartIST.getUTCFullYear()}-${String(w1StartIST.getUTCMonth()+1).padStart(2,'0')}-${String(w1StartIST.getUTCDate()).padStart(2,'0')}`,
  "2026-03-16");

const w2 = getWeekDateRange(2);
const w2StartIST = new Date(w2.start.getTime() + IST_OFFSET_MS);
assert("Week 2 start = Mon Mar 23 IST",
  w2StartIST.getUTCDate(), 23);

const w3 = getWeekDateRange(3);
const w3StartIST = new Date(w3.start.getTime() + IST_OFFSET_MS);
assert("Week 3 start = Mon Mar 30 IST",
  w3StartIST.getUTCDate(), 30);

// Apr 01 should be INSIDE week 3 range
const now = new Date("2026-04-01T10:00:00+05:30");
assert("Apr 01 is inside week 3 date range",
  now >= w3.start && now <= w3.end, true);

// Apr 01 should NOT be inside week 2 range
assert("Apr 01 is NOT inside week 2 date range",
  now >= w2.start && now <= w2.end, false);

// ─── Announcement window ───────────────────────────────────────────────────
// Today is Wed Apr 01 → should be true
const annWindow = isWinnerAnnouncementWindow();
console.log(`✅ isWinnerAnnouncementWindow() = ${annWindow} (today is Wed Apr 01 → expect true)`);
assert("Announcement window active today (Wed Apr 01)", annWindow, true);

console.log(`\n─────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
