// ── Asymmetry Reasoning Engine ────────────────────────────────────────────────
// Every function here follows one principle: maximise exposure to upside,
// minimise exposure to ruin. No flat CRUD logic — this challenges your priorities
// with hard data.

import type { Idea, DailyLog, Goal, FounderProfile } from "./supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Signal = {
  id?: string;
  org_id?: string;
  user_id?: string;
  idea_id?: string;
  description: string;
  strength: number; // 1–10
  source?: "market" | "customer" | "competitor" | "internal";
  created_at?: string;
};

export type LeverageType =
  | "deep_work"
  | "building"
  | "content"
  | "sales"
  | "learning"
  | "marketing"
  | "admin";

export type RunwayMode = "survival" | "growth" | "scale";

export type StrategyAlert = {
  level: "red" | "amber";
  code: string;
  msg: string;
};

export type ZombieProject = {
  idea: Idea;
  hoursSpent: number;
  signalScore: number;
  snRatio: number;
};

export type TimeAllocationResult = {
  pct: number;
  isAlert: boolean;
  totalHours: number;
  lowHours: number;
};

export type ReasoningOutput = {
  strategyAlerts: StrategyAlert[];
  zombies: ZombieProject[];
  timeAllocation: TimeAllocationResult;
  runwayMode: RunwayMode;
  runwayLabel: { label: string; color: string; action: string };
  topRecommendation: string | null;
};

// ── Leverage multipliers ───────────────────────────────────────────────────────
// Deep Work is the highest-leverage activity. Admin is nearly zero.
export const LEVERAGE_MULTIPLIER: Record<string, number> = {
  deep_work: 3.0,
  building:  2.5,
  content:   2.0,
  sales:     2.0,
  learning:  1.5,
  marketing: 1.5,
  standard:  1.0,
  admin:     0.5,
};

export function leverageWeight(type: string): number {
  return LEVERAGE_MULTIPLIER[type] ?? 1.0;
}

// ── Core score formula ────────────────────────────────────────────────────────
// (Upside × 2) − (Downside × 1.5) − (Effort × 0.5)
// Raw range: −18 to +18. Normalized to 1–10 for display.
export function calculateAsymmetryScore(
  upside: number,
  downside: number,
  effort: number
): number {
  return upside * 2 - downside * 1.5 - effort * 0.5;
}

export function normalizedAsymmetryScore(
  upside: number,
  downside: number,
  effort: number
): number {
  const raw = calculateAsymmetryScore(upside, downside, effort);
  // raw in [-18, 18] → [1, 10]
  const n = ((raw + 18) / 36) * 9 + 1;
  return Math.min(10, Math.max(1, Math.round(n * 10) / 10));
}

// ── Signal-to-noise per idea ───────────────────────────────────────────────────
// = Σ(signal strength) / Σ(leverage-weighted hours)
// High S/N = market is responding. Low S/N = grinding with no signal.
export function signalToNoise(
  ideaId: string,
  logs: Array<{ related_idea_id?: string | null; hours?: number | null; output_type?: string | null }>,
  signals: Signal[]
): number {
  const ideaLogs    = logs.filter(l => l.related_idea_id === ideaId);
  const ideaSignals = signals.filter(s => s.idea_id === ideaId);

  const totalWeightedHours = ideaLogs.reduce((sum, l) => {
    const hrs  = l.hours ?? 1;
    const mult = leverageWeight(l.output_type ?? "standard");
    return sum + hrs * mult;
  }, 0);

  const totalSignal = ideaSignals.reduce((sum, s) => sum + (s.strength ?? 0), 0);

  if (totalWeightedHours === 0) return 0;
  return Math.round((totalSignal / totalWeightedHours) * 100) / 100;
}

// ── Zombie detector ────────────────────────────────────────────────────────────
// Zombie = 5+ hours logged, zero market signal. Absorbs bandwidth silently.
export function detectZombies(
  ideas: Idea[],
  logs: Array<{ related_idea_id?: string | null; hours?: number | null; output_type?: string | null }>,
  signals: Signal[]
): ZombieProject[] {
  return ideas
    .map(idea => {
      if (!idea.id) return null;
      const ideaLogs   = logs.filter(l => l.related_idea_id === idea.id);
      const hoursSpent = ideaLogs.reduce((s, l) => s + (l.hours ?? 0), 0);
      if (hoursSpent < 5) return null;

      const ideaSignals  = signals.filter(s => s.idea_id === idea.id);
      const signalScore  = ideaSignals.reduce((s, sig) => s + (sig.strength ?? 0), 0);
      const snRatio      = signalToNoise(idea.id, logs, signals);

      if (signalScore > 0) return null; // Has signal — not a zombie
      return { idea, hoursSpent, signalScore, snRatio };
    })
    .filter((z): z is ZombieProject => z !== null);
}

// ── 80% time-on-low-asymmetry alert ───────────────────────────────────────────
// If 80%+ of logged hours go to ideas with raw asymmetry score < 5,
// the system fires a persistent red alert.
export function timeOnLowAsymmetry(
  ideas: Idea[],
  logs: Array<{ related_idea_id?: string | null; hours?: number | null }>
): TimeAllocationResult {
  const totalHours = logs.reduce((s, l) => s + (l.hours ?? 0), 0);

  const lowAsymmetryIds = new Set(
    ideas
      .filter(i => calculateAsymmetryScore(i.upside, i.downside, i.effort) < 5)
      .map(i => i.id)
      .filter((id): id is string => !!id)
  );

  const lowHours = logs
    .filter(l => l.related_idea_id && lowAsymmetryIds.has(l.related_idea_id))
    .reduce((s, l) => s + (l.hours ?? 0), 0);

  const pct = totalHours > 0 ? (lowHours / totalHours) * 100 : 0;

  return { pct, isAlert: pct >= 80 && totalHours >= 5, totalHours, lowHours };
}

// ── Runway mode ────────────────────────────────────────────────────────────────
export function getRunwayMode(runwayMonths?: number | null): RunwayMode {
  if (!runwayMonths || runwayMonths <= 3) return "survival";
  if (runwayMonths <= 9) return "growth";
  return "scale";
}

export function getRunwayLabel(mode: RunwayMode): { label: string; color: string; action: string } {
  switch (mode) {
    case "survival": return { label: "Survival Mode", color: "#EF4444", action: "Revenue only. Kill everything that doesn't pay within 30 days." };
    case "growth":   return { label: "Growth Mode",   color: "#F59E0B", action: "Balance quick cash with one asymmetric long-term bet." };
    case "scale":    return { label: "Scale Mode",    color: "#10B981", action: "Optimise the engine. Hunt for maximum-asymmetry bets." };
  }
}

// ── Morning standup questions ──────────────────────────────────────────────────
// Dynamic: question 2 names the current top idea so the pre-mortem is specific.
export function getMorningQuestions(topIdeaTitle?: string | null): string[] {
  return [
    "What is the ONE task today that makes everything else irrelevant?",
    topIdeaTitle
      ? `Why will "${topIdeaTitle}" fail? Be brutally specific — what's the most likely killer?`
      : "What is the biggest single threat to your best idea right now?",
    "What's your energy level (1-10) and what does that tell you about what to work on?",
    "What are you doing out of habit that isn't moving the needle — and will you cut it today?",
    "What market signal (customer, competitor, data) did you notice this week?",
  ];
}

// ── Full reasoning engine ──────────────────────────────────────────────────────
export function runReasoningEngine(
  ideas: Idea[],
  logs: Array<DailyLog & { related_idea_id?: string | null; hours?: number | null; leverage_type?: string | null }>,
  signals: Signal[],
  goals: Goal[],
  profile: FounderProfile | null
): ReasoningOutput {
  const alerts: StrategyAlert[] = [];

  // 1. 80% time on low-asymmetry bets
  const timeAllocation = timeOnLowAsymmetry(ideas, logs);
  if (timeAllocation.isAlert) {
    alerts.push({
      level: "red",
      code: "TIME_ON_TRAPS",
      msg: `STRATEGY ALERT: ${timeAllocation.pct.toFixed(0)}% of your logged hours are on low-asymmetry ideas (score < 5). You are grinding inside the wrong box. Reassign your best hours to your top asymmetric bet now.`,
    });
  }

  // 2. Zombie projects
  const zombies = detectZombies(ideas, logs, signals);
  if (zombies.length > 0) {
    alerts.push({
      level: "red",
      code: "ZOMBIE_PROJECTS",
      msg: `ZOMBIE DETECTED: "${zombies.map(z => z.idea.title).join('", "')}" — ${zombies.reduce((s, z) => s + z.hoursSpent, 0).toFixed(0)} hours in, zero market signal. These projects are eating your bandwidth with no evidence of working. Kill or pause immediately.`,
    });
  }

  // 3. Traps dominate
  const trapCount = ideas.filter(i => i.category === "trap").length;
  const asymCount = ideas.filter(i => i.category === "asymmetric").length;
  if (trapCount > 0 && trapCount >= asymCount) {
    alerts.push({
      level: "red",
      code: "TRAPS_DOMINANT",
      msg: `${trapCount} trap${trapCount > 1 ? "s" : ""} in your portfolio equal or outnumber your asymmetric bets. Every hour on a trap is an hour not compounding on something that matters.`,
    });
  }

  // 4. No asymmetric ideas
  if (asymCount === 0 && ideas.length > 0) {
    alerts.push({
      level: "amber",
      code: "NO_ASYMMETRY",
      msg: `No asymmetric ideas in your portfolio. You're optimising inside a small box. Find a bet with 8+ upside and 3 or less downside — that's where fortunes are built.`,
    });
  }

  // 5. Runway alerts
  const runway = profile?.runway_months ?? 99;
  if (runway <= 2) {
    alerts.push({
      level: "red",
      code: "RUIN_RISK",
      msg: `RUIN RISK: ${runway} month${runway !== 1 ? "s" : ""} runway. Revenue-generating activities ONLY. Kill everything else — "Empire Building" is a luxury you cannot afford.`,
    });
  } else if (runway <= 4) {
    alerts.push({
      level: "amber",
      code: "LOW_RUNWAY",
      msg: `${runway} months runway. Auto-promoting "Quick Cash" tasks. Pause anything with a payoff horizon > 60 days.`,
    });
  }

  // 6. Goals critically behind
  const criticallyBehind = goals.filter(g => {
    if (!g.deadline) return false;
    const daysLeft = Math.max(0, (new Date(g.deadline + "T23:59:59").getTime() - Date.now()) / 86400000);
    const pct = ((g.current_value ?? 0) / Math.max(1, g.target_value ?? 1)) * 100;
    return pct < 40 && daysLeft < 30;
  });
  if (criticallyBehind.length > 0) {
    alerts.push({
      level: "amber",
      code: "GOALS_CRITICAL",
      msg: `${criticallyBehind.length} goal${criticallyBehind.length > 1 ? "s" : ""} below 40% with <30 days left. Sprint or reset — a goal you don't believe in is noise.`,
    });
  }

  // Top recommendation (runway-adjusted)
  const mode = getRunwayMode(runway);
  let topRecommendation: string | null = null;
  if (mode === "survival") {
    const quickCash = ideas.filter(i => i.category === "easy_win" || (i.upside >= 6 && i.effort <= 4));
    topRecommendation = quickCash.length > 0
      ? `Survival mode active. Focus exclusively on "${quickCash[0].title}" — fastest cash path.`
      : "Survival mode: add a Quick Cash idea now. Only revenue matters.";
  } else {
    const top = [...ideas]
      .sort((a, b) => calculateAsymmetryScore(b.upside, b.downside, b.effort) - calculateAsymmetryScore(a.upside, a.downside, a.effort))[0];
    topRecommendation = top
      ? `Highest asymmetry bet: "${top.title}" (score ${calculateAsymmetryScore(top.upside, top.downside, top.effort).toFixed(1)}) — put your deepest work hours here first.`
      : null;
  }

  return {
    strategyAlerts: alerts,
    zombies,
    timeAllocation,
    runwayMode: mode,
    runwayLabel: getRunwayLabel(mode),
    topRecommendation,
  };
}
