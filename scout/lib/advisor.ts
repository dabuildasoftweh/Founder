import { Idea, FounderProfile, TodoItem, DailyLog, opportunityScore } from "./supabase";

export const MORNING_QUESTIONS = [
  "What's the ONE thing that would make today a win — and are you actually planning to do it?",
  "Are you avoiding your highest-upside task right now? If so, what's the real reason?",
  "What's your energy level today (1-10) and what does that mean for what you should focus on?",
  "Is there anything you're doing out of habit that isn't moving the needle on your goals?",
  "What's one thing you could say NO to today to protect your most important work?",
];

export function generateTodoFromIdeas(
  ideas: Idea[],
  profile: FounderProfile | null,
  morningAnswers: Record<string, string>
): TodoItem[] {
  const isLowRunway  = (profile?.runway_months ?? 12) <= 3;
  const energyAnswer = morningAnswers[2] ?? "";
  const isHighEnergy = /\b([89]|10)\b/.test(energyAnswer);

  const scored = ideas
    .filter(i => i.status === "active" || !i.status)
    .map(i => ({ ...i, score: opportunityScore(i.upside, i.downside, i.effort) }))
    .sort((a, b) => {
      if (isLowRunway) {
        if (a.category === "easy_win" && b.category !== "easy_win") return -1;
        if (b.category === "easy_win" && a.category !== "easy_win") return 1;
      }
      if (isHighEnergy) {
        if (a.category === "asymmetric" && b.category !== "asymmetric") return -1;
        if (b.category === "asymmetric" && a.category !== "asymmetric") return 1;
      }
      if (a.category === "trap") return 1;
      if (b.category === "trap") return -1;
      return b.score - a.score;
    })
    .slice(0, 5);

  return scored.map((idea, i) => ({
    task: `Work on: ${idea.title}`,
    priority: i === 0 ? "high" : i <= 2 ? "medium" : "low",
    idea_id: idea.id,
    estimated_time: idea.effort <= 3 ? "30–60 min" : idea.effort <= 6 ? "1–2 hrs" : "2–4 hrs",
    category: idea.category ?? "standard",
  }));
}

export function getAdvisorInsight(
  ideas: Idea[],
  profile: FounderProfile | null,
  logs?: DailyLog[]
): string {
  const runway     = profile?.runway_months ?? 12;
  const asymmetric = ideas.filter(i => i.category === "asymmetric");
  const traps      = ideas.filter(i => i.category === "trap");
  const easyWins   = ideas.filter(i => i.category === "easy_win");

  if (logs && logs.length >= 6) {
    const recent = logs.slice(0, 3).reduce((s, l) => s + (l.outcome_revenue ?? 0), 0);
    const prev   = logs.slice(3, 6).reduce((s, l) => s + (l.outcome_revenue ?? 0), 0);
    if (prev > 0 && recent > prev * 1.2)
      return `Revenue up ${Math.round((recent / prev - 1) * 100)}% vs last period. Double down on what's working.`;
    if (prev > 0 && recent < prev * 0.8)
      return `Revenue down ${Math.round((1 - recent / prev) * 100)}% vs last period. Audit your output types immediately.`;
  }

  if (runway <= 2)
    return `⚠️ Runway critically low (${runway} mo). Revenue-generating activities ONLY — everything else is a luxury right now.`;
  if (traps.length > asymmetric.length && traps.length > 2)
    return `${traps.length} traps in your portfolio. Every hour on a trap is an hour not on an asymmetric bet. Cut them.`;
  if (asymmetric.length > 0)
    return `${asymmetric.length} asymmetric opportunit${asymmetric.length > 1 ? "ies" : "y"} in your pipeline. Massive upside, low downside — these deserve your best hours.`;
  if (easyWins.length > 0)
    return `${easyWins.length} easy win${easyWins.length > 1 ? "s" : ""} ready to go. Build momentum — completed work compounds psychologically.`;
  return "Log more ideas to unlock personalised advice.";
}
