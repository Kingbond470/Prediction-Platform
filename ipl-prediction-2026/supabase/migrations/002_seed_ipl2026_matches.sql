-- ============================================
-- IPL 2026 MATCH FIXTURES SEED
-- Run this in your Supabase SQL editor to populate matches.
-- All times are IST (UTC+5:30). Stored as UTC in the DB.
-- Afternoon matches: 15:30 IST = 10:00 UTC
-- Evening matches:   19:30 IST = 14:00 UTC
-- ============================================

-- Clear existing stale seed matches (from initial migration) before inserting real fixtures
TRUNCATE TABLE public.predictions CASCADE;
TRUNCATE TABLE public.matches CASCADE;

INSERT INTO public.matches (
  match_number, team_1, team_2, venue, city,
  match_date, vote_start_time, vote_end_time,
  team_1_probability, team_2_probability,
  status, winner,
  initial_count_team_1, initial_count_team_2
) VALUES

-- ── Week 1 ──────────────────────────────────────────────────────────────────
(1,  'KKR',  'RCB',  'Eden Gardens',                       'Kolkata',
  '2026-03-28 14:00:00+00', '2026-03-27 14:00:00+00', '2026-03-28 13:30:00+00',
  58.00, 42.00, 'completed', 'KKR', 104000, 62000),

(2,  'SRH',  'RR',   'Rajiv Gandhi Intl. Stadium',         'Hyderabad',
  '2026-03-29 14:00:00+00', '2026-03-28 14:00:00+00', '2026-03-29 13:30:00+00',
  52.00, 48.00, 'upcoming', NULL, 78000, 72000),

(3,  'CSK',  'MI',   'MA Chidambaram Stadium',             'Chennai',
  '2026-03-30 14:00:00+00', '2026-03-29 14:00:00+00', '2026-03-30 13:30:00+00',
  55.00, 45.00, 'upcoming', NULL, 98000, 88000),

(4,  'DC',   'PBKS', 'Arun Jaitley Stadium',               'Delhi',
  '2026-03-31 14:00:00+00', '2026-03-30 14:00:00+00', '2026-03-31 13:30:00+00',
  50.00, 50.00, 'upcoming', NULL, 70000, 70000),

(5,  'GT',   'LSG',  'Narendra Modi Stadium',              'Ahmedabad',
  '2026-04-01 14:00:00+00', '2026-03-31 14:00:00+00', '2026-04-01 13:30:00+00',
  54.00, 46.00, 'upcoming', NULL, 82000, 68000),

-- ── Week 2 ──────────────────────────────────────────────────────────────────
(6,  'MI',   'KKR',  'Wankhede Stadium',                   'Mumbai',
  '2026-04-03 14:00:00+00', '2026-04-02 14:00:00+00', '2026-04-03 13:30:00+00',
  52.00, 48.00, 'upcoming', NULL, 90000, 86000),

(7,  'RCB',  'CSK',  'M. Chinnaswamy Stadium',             'Bengaluru',
  '2026-04-04 14:00:00+00', '2026-04-03 14:00:00+00', '2026-04-04 13:30:00+00',
  48.00, 52.00, 'upcoming', NULL, 74000, 96000),

(8,  'RR',   'DC',   'Sawai Mansingh Stadium',             'Jaipur',
  '2026-04-05 14:00:00+00', '2026-04-04 14:00:00+00', '2026-04-05 13:30:00+00',
  56.00, 44.00, 'upcoming', NULL, 76000, 64000),

(9,  'SRH',  'GT',   'Rajiv Gandhi Intl. Stadium',         'Hyderabad',
  '2026-04-06 10:00:00+00', '2026-04-05 10:00:00+00', '2026-04-06 09:30:00+00',
  49.00, 51.00, 'upcoming', NULL, 72000, 78000),

(10, 'LSG',  'PBKS', 'BRSABV Ekana Cricket Stadium',       'Lucknow',
  '2026-04-06 14:00:00+00', '2026-04-05 14:00:00+00', '2026-04-06 13:30:00+00',
  53.00, 47.00, 'upcoming', NULL, 74000, 66000),

-- ── Week 3 ──────────────────────────────────────────────────────────────────
(11, 'KKR',  'CSK',  'Eden Gardens',                       'Kolkata',
  '2026-04-08 14:00:00+00', '2026-04-07 14:00:00+00', '2026-04-08 13:30:00+00',
  50.00, 50.00, 'upcoming', NULL, 96000, 94000),

(12, 'MI',   'SRH',  'Wankhede Stadium',                   'Mumbai',
  '2026-04-09 14:00:00+00', '2026-04-08 14:00:00+00', '2026-04-09 13:30:00+00',
  60.00, 40.00, 'upcoming', NULL, 88000, 58000),

(13, 'RCB',  'RR',   'M. Chinnaswamy Stadium',             'Bengaluru',
  '2026-04-10 14:00:00+00', '2026-04-09 14:00:00+00', '2026-04-10 13:30:00+00',
  51.00, 49.00, 'upcoming', NULL, 72000, 74000),

(14, 'GT',   'DC',   'Narendra Modi Stadium',              'Ahmedabad',
  '2026-04-11 14:00:00+00', '2026-04-10 14:00:00+00', '2026-04-11 13:30:00+00',
  55.00, 45.00, 'upcoming', NULL, 82000, 66000),

(15, 'PBKS', 'KKR',  'Maharaja Yadavindra Singh Stadium',  'Mullanpur',
  '2026-04-12 10:00:00+00', '2026-04-11 10:00:00+00', '2026-04-12 09:30:00+00',
  46.00, 54.00, 'upcoming', NULL, 62000, 90000),

(16, 'LSG',  'MI',   'BRSABV Ekana Cricket Stadium',       'Lucknow',
  '2026-04-12 14:00:00+00', '2026-04-11 14:00:00+00', '2026-04-12 13:30:00+00',
  44.00, 56.00, 'upcoming', NULL, 64000, 88000),

-- ── Week 4 ──────────────────────────────────────────────────────────────────
(17, 'CSK',  'GT',   'MA Chidambaram Stadium',             'Chennai',
  '2026-04-14 14:00:00+00', '2026-04-13 14:00:00+00', '2026-04-14 13:30:00+00',
  58.00, 42.00, 'upcoming', NULL, 94000, 72000),

(18, 'RR',   'SRH',  'Sawai Mansingh Stadium',             'Jaipur',
  '2026-04-15 14:00:00+00', '2026-04-14 14:00:00+00', '2026-04-15 13:30:00+00',
  53.00, 47.00, 'upcoming', NULL, 74000, 70000),

(19, 'DC',   'RCB',  'Arun Jaitley Stadium',               'Delhi',
  '2026-04-16 14:00:00+00', '2026-04-15 14:00:00+00', '2026-04-16 13:30:00+00',
  47.00, 53.00, 'upcoming', NULL, 66000, 76000),

(20, 'KKR',  'LSG',  'Eden Gardens',                       'Kolkata',
  '2026-04-17 14:00:00+00', '2026-04-16 14:00:00+00', '2026-04-17 13:30:00+00',
  57.00, 43.00, 'upcoming', NULL, 92000, 66000),

(21, 'MI',   'PBKS', 'Wankhede Stadium',                   'Mumbai',
  '2026-04-18 14:00:00+00', '2026-04-17 14:00:00+00', '2026-04-18 13:30:00+00',
  62.00, 38.00, 'upcoming', NULL, 90000, 58000),

-- ── Week 5 ──────────────────────────────────────────────────────────────────
(22, 'GT',   'RCB',  'Narendra Modi Stadium',              'Ahmedabad',
  '2026-04-20 14:00:00+00', '2026-04-19 14:00:00+00', '2026-04-20 13:30:00+00',
  52.00, 48.00, 'upcoming', NULL, 78000, 76000),

(23, 'SRH',  'CSK',  'Rajiv Gandhi Intl. Stadium',         'Hyderabad',
  '2026-04-21 14:00:00+00', '2026-04-20 14:00:00+00', '2026-04-21 13:30:00+00',
  45.00, 55.00, 'upcoming', NULL, 66000, 90000),

(24, 'PBKS', 'RR',   'Maharaja Yadavindra Singh Stadium',  'Mullanpur',
  '2026-04-22 14:00:00+00', '2026-04-21 14:00:00+00', '2026-04-22 13:30:00+00',
  50.00, 50.00, 'upcoming', NULL, 68000, 72000),

(25, 'LSG',  'DC',   'BRSABV Ekana Cricket Stadium',       'Lucknow',
  '2026-04-23 14:00:00+00', '2026-04-22 14:00:00+00', '2026-04-23 13:30:00+00',
  54.00, 46.00, 'upcoming', NULL, 72000, 64000),

(26, 'KKR',  'MI',   'Eden Gardens',                       'Kolkata',
  '2026-04-24 14:00:00+00', '2026-04-23 14:00:00+00', '2026-04-24 13:30:00+00',
  49.00, 51.00, 'upcoming', NULL, 90000, 92000),

-- ── Week 6 ──────────────────────────────────────────────────────────────────
(27, 'RCB',  'SRH',  'M. Chinnaswamy Stadium',             'Bengaluru',
  '2026-04-26 10:00:00+00', '2026-04-25 10:00:00+00', '2026-04-26 09:30:00+00',
  53.00, 47.00, 'upcoming', NULL, 76000, 70000),

(28, 'CSK',  'RR',   'MA Chidambaram Stadium',             'Chennai',
  '2026-04-26 14:00:00+00', '2026-04-25 14:00:00+00', '2026-04-26 13:30:00+00',
  60.00, 40.00, 'upcoming', NULL, 96000, 68000),

(29, 'DC',   'GT',   'Arun Jaitley Stadium',               'Delhi',
  '2026-04-27 14:00:00+00', '2026-04-26 14:00:00+00', '2026-04-27 13:30:00+00',
  48.00, 52.00, 'upcoming', NULL, 64000, 80000),

(30, 'PBKS', 'LSG',  'Maharaja Yadavindra Singh Stadium',  'Mullanpur',
  '2026-04-28 14:00:00+00', '2026-04-27 14:00:00+00', '2026-04-28 13:30:00+00',
  51.00, 49.00, 'upcoming', NULL, 66000, 70000);
