import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

// Type definitions
export interface User {
  id: string;
  phone: string;
  name: string;
  username: string;
  total_points: number;
  total_predictions: number;
  total_correct: number;
  current_rank: number;
}

export interface Match {
  id: string;
  match_number: number;
  team_1: string;
  team_2: string;
  venue: string;
  city: string;
  match_date: string;
  vote_start_time: string;
  vote_end_time: string;
  team_1_probability: number;
  team_2_probability: number;
  winner: string | null;
  status: "upcoming" | "live" | "completed";
  initial_count_team_1: number;
  initial_count_team_2: number;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  predicted_team: string;
  ai_predicted_team: string;
  is_correct: boolean | null;
  is_correct_vs_ai: boolean | null;
  points_earned: number;
  bonus_points: number;
}
