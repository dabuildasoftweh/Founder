import { Idea, FounderProfile, TodoItem, opportunityScore } from "./supabase";

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
  const isLowRunway = (profile?.runway_months ?? 12) <= 3;
  const isLowRisk   = profile?.risk_tolerance === "low";

  const scored = ideas
    .filter(i => i.status === "active" || !i.status)
    .map(i => ({
      ...i,
      score: opportunityScore(i.upside, i.downside, i.effort),
    }))
    .sort((a, b) => {
      // Low runway: boost easy wins and asymmetric, punish high effort
      if (isLowRunway) {
        if (a.category === "easy_win" && b.category !== "easy_win") return -1;
        if (b.category === "easy_win" && a.category !== "easy_win") return 1;
      }
      // Filter out traps
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
  profile: FounderProfile | null
): string {
  const runway = profile?.runway_months ?? 12;
  const asymmetric = ideas.filter(i => i.category === "asymmetric");
  const traps      = ideas.filter(i => i.category === "trap");
  const easyWins   = ideas.filter(i => i.category === "easy_win");

  if (runway <= 2) {
    return `⚠️ Runway is critically low (${runway} months). Focus ONLY on revenue-generating activities. Deprioritise everything else.`;
  }
  if (traps.length > asymmetric.length) {
    return `You have ${traps.length} trap ideas eating your attention. These are high effort, low reward. Drop or delegate them.`;
  }
  if (asymmetric.length > 0) {
    return `You have ${asymmetric.length} asymmetric opportunity${asymmetric.length > 1 ? "s" : ""}. These have massive upside with low risk — they should be your primary focus.`;
  }
  if (easyWins.length > 0) {
    return `${easyWins.length} easy win${easyWins.length > 1 ? "s" : ""} available. Pick one up today to build momentum.`;
  }
  return "Log more ideas to unlock personalised advice.";
}
