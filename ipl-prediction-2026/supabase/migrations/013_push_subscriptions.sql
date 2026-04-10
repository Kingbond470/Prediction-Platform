-- Web Push subscription storage
-- One row per browser subscription endpoint.
-- match_id is nullable — if set, only notify for that match; if null, notify for all matches.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id      UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL UNIQUE,
  p256dh        TEXT,
  auth          TEXT,
  subscription_json TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_match_id ON public.push_subscriptions(match_id);

-- Only the service role can read/write subscriptions (push endpoints are sensitive)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.push_subscriptions
  USING (false)
  WITH CHECK (false);
