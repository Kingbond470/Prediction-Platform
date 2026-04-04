-- ─────────────────────────────────────────────────────────────────────────────
-- 010_daily_trivia.sql
-- Daily Cricket Trivia — one question per day, +100 pts for correct answer
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trivia_questions (
  id         SERIAL PRIMARY KEY,
  question   TEXT    NOT NULL,
  option_a   TEXT    NOT NULL,
  option_b   TEXT    NOT NULL,
  option_c   TEXT    NOT NULL,
  option_d   TEXT    NOT NULL,
  correct    CHAR(1) NOT NULL CHECK (correct IN ('a','b','c','d')),
  category   TEXT    NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One answer per user per calendar day (UTC)
CREATE TABLE IF NOT EXISTS trivia_answers (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id  INT     NOT NULL REFERENCES trivia_questions(id),
  selected     CHAR(1) NOT NULL CHECK (selected IN ('a','b','c','d')),
  is_correct   BOOLEAN NOT NULL,
  answered_at  DATE    NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, answered_at)
);

CREATE INDEX IF NOT EXISTS idx_trivia_answers_user_date ON trivia_answers(user_id, answered_at);

-- ── Trivia points on users ────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS trivia_points INT NOT NULL DEFAULT 0;

-- Atomic increment function (called from API)
CREATE OR REPLACE FUNCTION increment_trivia_points(uid UUID, pts INT)
RETURNS VOID LANGUAGE sql AS $$
  UPDATE users SET trivia_points = trivia_points + pts WHERE id = uid;
$$;

-- ── 25 seed questions ─────────────────────────────────────────────────────────
INSERT INTO trivia_questions (question, option_a, option_b, option_c, option_d, correct, category) VALUES

('Who has scored the most runs in IPL history?',
 'Rohit Sharma', 'Suresh Raina', 'Virat Kohli', 'David Warner', 'c', 'records'),

('Which team won the inaugural IPL season in 2008?',
 'Chennai Super Kings', 'Mumbai Indians', 'Kings XI Punjab', 'Rajasthan Royals', 'd', 'history'),

('What is the highest individual score in a single IPL innings?',
 '158* by Brendon McCullum', '167 by Adam Gilchrist', '175* by Chris Gayle', '163* by Murali Vijay', 'c', 'records'),

('How many IPL titles has CSK won (as of IPL 2024)?',
 '3', '4', '5', '6', 'c', 'history'),

('Who has taken the most wickets in IPL history (as of 2024)?',
 'Lasith Malinga', 'Amit Mishra', 'Dwayne Bravo', 'Yuzvendra Chahal', 'd', 'records'),

('Who scored the first century in the very first IPL match in 2008?',
 'Sourav Ganguly', 'Virat Kohli', 'Brendon McCullum', 'Adam Gilchrist', 'c', 'history'),

('How many overseas players can an IPL team field in a single match?',
 '3', '4', '5', '6', 'b', 'rules'),

('How many overs form the powerplay in an IPL innings?',
 '4', '5', '6', '8', 'c', 'rules'),

('Which player is nicknamed "Universe Boss"?',
 'MS Dhoni', 'Andre Russell', 'Virat Kohli', 'Chris Gayle', 'd', 'general'),

('Which ground is the home of Chennai Super Kings?',
 'Wankhede Stadium', 'MA Chidambaram Stadium', 'Eden Gardens', 'Chinnaswamy Stadium', 'b', 'general'),

('Who captained Rajasthan Royals to victory in the inaugural IPL 2008?',
 'Rahul Dravid', 'MS Dhoni', 'Shane Warne', 'Sourav Ganguly', 'c', 'history'),

('What is the maximum number of overs a single bowler can bowl in an IPL match?',
 '3', '4', '5', '6', 'b', 'rules'),

('How many teams compete in the IPL (from 2022 onwards)?',
 '8', '9', '10', '12', 'c', 'general'),

('Who won IPL 2024?',
 'Rajasthan Royals', 'Sunrisers Hyderabad', 'Chennai Super Kings', 'Kolkata Knight Riders', 'd', 'history'),

('Which IPL team plays their home matches at Eden Gardens, Kolkata?',
 'Sunrisers Hyderabad', 'Punjab Kings', 'Gujarat Titans', 'Kolkata Knight Riders', 'd', 'general'),

('Which team plays at the Wankhede Stadium in Mumbai?',
 'Delhi Capitals', 'Mumbai Indians', 'Rajasthan Royals', 'Lucknow Super Giants', 'b', 'general'),

('Who won the IPL Purple Cap (most wickets) in IPL 2023?',
 'Rashid Khan', 'Yuzvendra Chahal', 'Jasprit Bumrah', 'Mohammed Shami', 'd', 'history'),

('Who won the IPL Orange Cap (most runs) in IPL 2023?',
 'Virat Kohli', 'Faf du Plessis', 'Ruturaj Gaikwad', 'Shubman Gill', 'd', 'history'),

('What does "DLS" stand for in cricket?',
 'Dynamic Limit System', 'Duckworth–Lewis–Stern', 'Delayed Live Score', 'Ducks–Lbw–Stumpings', 'b', 'rules'),

('Which IPL team is nicknamed the "Yellow Army"?',
 'Gujarat Titans', 'Sunrisers Hyderabad', 'Chennai Super Kings', 'Mumbai Indians', 'c', 'general'),

('Which player is affectionately called "Thala" by CSK fans?',
 'Suresh Raina', 'Ravindra Jadeja', 'Ambati Rayudu', 'MS Dhoni', 'd', 'general'),

('In T20 cricket, a "free hit" is awarded after which type of delivery?',
 'A wide', 'A no-ball', 'A bouncer', 'A full toss', 'b', 'rules'),

('Which team has never won the IPL title despite reaching multiple finals?',
 'Kolkata Knight Riders', 'Sunrisers Hyderabad', 'Royal Challengers Bengaluru', 'Delhi Capitals', 'c', 'history'),

('How many balls are there in a complete T20 over?',
 '4', '5', '6', '8', 'c', 'rules'),

('Which player holds the record for most sixes in IPL history?',
 'Rohit Sharma', 'MS Dhoni', 'AB de Villiers', 'Chris Gayle', 'd', 'records');
