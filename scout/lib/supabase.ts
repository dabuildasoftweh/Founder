import { createBrowserClient } from "@supabase/ssr";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(url, key);

// ── Types ─────────────────────────────────────────────────────────────────────
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
  // Reasoning engine fields
  leverage_type?: string;  // deep_work | building | content | sales | learning | marketing | admin
  hours?: number;          // actual hours spent
  related_idea_id?: string | null; // which idea this log is for
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

// ── Category logic ─────────────────────────────────────────────────────────────
export function categoriseIdea(upside: number, downside: number, effort: number): string {
  if (upside >= 8 && downside <= 3)  return "asymmetric";
  if (upside < 5  && effort > 7)     return "trap";
  if (upside >= 6 && effort <= 3)    return "easy_win";
  if (upside >= 7 && effort > 7)     return "grind";
  return "standard";
}

// ── Opportunity Score ─────────────────────────────────────────────────────────
// Formula: (upside*2 - downside - effort*0.5) / 1.75, clamped 1–10
// Upside is double-weighted; effort only half-penalised (reversible cost).
export function opportunityScore(upside: number, downside: number, effort: number): number {
  return Math.min(10, Math.max(1, Math.round((upside * 2 - downside - effort * 0.5) / 1.75)));
}

// ── Kelly Criterion — suggested weekly hours ───────────────────────────────────
// Estimates win probability p from upside/effort balance.
// Reward-to-risk ratio b = upside / max(1, downside).
// Quarter-Kelly (×0.25) for conservatism — avoids overcommitting.
// Returns hours/week out of a 40-hr week, capped at 35.
export function kellyHours(upside: number, downside: number, effort: number): number {
  const p   = Math.min(0.85, Math.max(0.1, (upside + (10 - effort)) / 20));
  const b   = upside / Math.max(1, downside);
  const raw = Math.max(0, (p * b - (1 - p)) / b) * 0.25;
  return Math.min(35, Math.round(raw * 40));
}

// ── Portfolio Health Score ─────────────────────────────────────────────────────
export type PortfolioHealth = {
  score: number;
  label: "Excellent" | "Good" | "Fair" | "Poor";
  grade: "A" | "B" | "C" | "D";
  asymmetricPct: number;
  trapPct: number;
  avgScore: number;
  issues: string[];
  strengths: string[];
};

export function portfolioHealth(ideas: Idea[]): PortfolioHealth {
  if (ideas.length === 0) {
    return {
      score: 0, label: "Poor", grade: "D",
      asymmetricPct: 0, trapPct: 0, avgScore: 0,
      issues: ["No ideas logged yet"], strengths: [],
    };
  }

  const n              = ideas.length;
  const asymmetricPct  = (ideas.filter(i => i.category === "asymmetric").length / n) * 100;
  const trapPct        = (ideas.filter(i => i.category === "trap").length / n) * 100;
  const avgScore       = ideas.reduce((s, i) => s + opportunityScore(i.upside, i.downside, i.effort), 0) / n;

  let score = 40;
  const issues:    string[] = [];
  const strengths: string[] = [];

  if (asymmetricPct >= 30) { score += 25; strengths.push("Strong asymmetric pipeline"); }
  else if (asymmetricPct >= 15) { score += 12; }
  else { issues.push(`Only ${asymmetricPct.toFixed(0)}% asymmetric — hunt for more big upside ideas`); }

  if (trapPct <= 10) {
    score += 20;
    if (trapPct === 0) strengths.push("Zero traps — clean portfolio");
  } else if (trapPct <= 20) { score += 8; }
  else { score -= 10; issues.push(`${trapPct.toFixed(0)}% traps burning your time — cut them now`); }

  if (avgScore >= 7) { score += 15; strengths.push(`High avg score (${avgScore.toFixed(1)}/10)`); }
  else if (avgScore >= 5.5) { score += 8; }
  else { issues.push(`Low avg score (${avgScore.toFixed(1)}/10) — replace weak ideas`); }

  score = Math.min(100, Math.max(0, score));
  const label: PortfolioHealth["label"] =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor";
  const grade: PortfolioHealth["grade"] =
    score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";

  return { score, label, grade, asymmetricPct, trapPct, avgScore, issues, strengths };
}
