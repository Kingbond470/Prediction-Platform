/**
 * Migration runner — applies pending Supabase migrations via the Management API.
 * Usage: SUPABASE_ACCESS_TOKEN=<your-pat> node scripts/migrate.mjs
 *
 * Get your PAT at: https://supabase.com/dashboard/account/tokens
 */

const PROJECT_REF = "yurwlitcxfssyskwkeho";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error(
    "Error: SUPABASE_ACCESS_TOKEN is required.\n" +
    "Get your Personal Access Token at: https://supabase.com/dashboard/account/tokens\n" +
    "Then run: SUPABASE_ACCESS_TOKEN=<token> node scripts/migrate.mjs"
  );
  process.exit(1);
}

const sql = `
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS odds_api_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_matches_odds_api_id ON public.matches(odds_api_id);
`;

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
);

const data = await res.json();

if (!res.ok) {
  console.error("Migration failed:", JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log("Migration applied successfully:", JSON.stringify(data, null, 2));
