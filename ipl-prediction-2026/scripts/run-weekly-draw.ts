/**
 * Weekly Draw Runner — run manually every Sunday night after the last match.
 *
 * Usage:
 *   npx ts-node scripts/run-weekly-draw.ts
 *   npx ts-node scripts/run-weekly-draw.ts --week 3   (override week number)
 *
 * Requires:
 *   ADMIN_SECRET env var (same value as in Vercel/production)
 *   NEXT_PUBLIC_SITE_URL env var (or defaults to http://localhost:3000)
 *
 * Set these in .env.local or export them in your shell before running.
 */

// Load .env.local
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!ADMIN_SECRET) {
  console.error("❌  ADMIN_SECRET is not set. Add it to .env.local.");
  process.exit(1);
}

// Parse optional --week flag
const weekArg = process.argv.find((a) => a.startsWith("--week="));
const weekOverride = weekArg ? parseInt(weekArg.split("=")[1], 10) : undefined;

async function runDraw() {
  const body: Record<string, unknown> = {};
  if (weekOverride) body.week_number = weekOverride;

  console.log(`\n🎟️  Running weekly draw${weekOverride ? ` for week ${weekOverride}` : ""}…`);
  console.log(`   Endpoint: ${SITE_URL}/api/weekly-draw`);

  const res = await fetch(`${SITE_URL}/api/weekly-draw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": ADMIN_SECRET!,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    console.error("\n❌  Draw failed:");
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`\n✅  Draw complete — Week ${data.weekNumber}`);
  console.log(`   Pool size : ${data.totalPool.toLocaleString("en-IN")} correct predictors`);
  console.log(`   Winners   : ${data.winnersSelected}`);
  console.log("\n🏆  Winner usernames (DM these for vouchers):\n");
  (data.winners as string[]).forEach((username, i) => {
    console.log(`   ${i + 1}. @${username}`);
  });
  console.log(
    "\n📋  Next steps (ops checklist):",
    "\n   [ ] Buy 10 × ₹100 Swiggy/Zomato gift cards",
    "\n   [ ] DM voucher codes to winners via platform + WhatsApp",
    "\n   [ ] Generate winner announcement graphic (Canva template)",
    "\n   [ ] Post on Instagram + X by Monday 9AM IST",
    "\n   [ ] Winners will show on platform automatically (Mon–Wed)\n"
  );
}

runDraw().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
