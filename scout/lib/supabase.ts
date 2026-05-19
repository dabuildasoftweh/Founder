import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// ── Types ────────────────────────────────────────────────────────────────────
export type Idea = {
  id?: string;
  title: string;
  description?: string;
  upside: number;
  downside: number;
  effort: number;
  category?: string;
  status?: string;
  created_at?: string;
};

export type DailyLog = {
  id?: string;
  date?: string;
  output_type?: string;
  output_description?: string;
  output_quantity?: number;
  output_unit?: string;
  outcome_revenue?: number;
  outcome_followers?: number;
  outcome_leads?: number;
  notes?: string;
  created_at?: string;
};

export type Goal = {
  id?: string;
  title: string;
  category?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  deadline?: string;
  created_at?: string;
};

export type FounderProfile = {
  id?: string;
  name?: string;
  situation?: string;
  runway_months?: number;
  monthly_revenue_goal?: number;
  current_monthly_revenue?: number;
  risk_tolerance?: string;
  top_skills?: string[];
  constraints?: string;
};

export type DailyPlan = {
  id?: string;
  date?: string;
  morning_answers?: Record<string, string>;
  todo_items?: TodoItem[];
  created_at?: string;
};

export type TodoItem = {
  task: string;
  priority: "high" | "medium" | "low";
  idea_id?: string;
  estimated_time?: string;
  category?: string;
};

// ── Category logic ────────────────────────────────────────────────────────────
export function categoriseIdea(upside: number, downside: number, effort: number): string {
  if (upside >= 8 && downside <= 3)  return "asymmetric";
  if (upside < 5  && effort > 7)     return "trap";
  if (upside >= 6 && effort <= 3)    return "easy_win";
  if (upside >= 7 && effort > 7)     return "grind";
  return "standard";
}

export function opportunityScore(upside: number, downside: number, effort: number): number {
  return Math.min(10, Math.max(1, Math.round((upside * 2 - downside - effort * 0.5) / 1.75)));
}
