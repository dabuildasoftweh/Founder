"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase, categoriseIdea, opportunityScore, kellyHours, portfolioHealth } from "@/lib/supabase";
import { generateTodoFromIdeas, getAdvisorInsight } from "@/lib/advisor";
import { getSession, getOrg, getMembers, getActivity, logActivity, inviteMember, createOrg, signOut } from "@/lib/auth";
import { runReasoningEngine, getMorningQuestions, calculateAsymmetryScore, normalizedAsymmetryScore, signalToNoise, leverageWeight, LEVERAGE_MULTIPLIER } from "@/lib/reasoning";
import type { Signal } from "@/lib/reasoning";
import type { Idea, DailyLog, Goal, FounderProfile, TodoItem } from "@/lib/supabase";
import type { OrgRow, Member } from "@/lib/auth";

// v0 JARVIS layout components
import { Sidebar, NavItem } from "@/components/scout/sidebar";
import { TopBar } from "@/components/scout/top-bar";
import { NorthStarRing } from "@/components/scout/north-star-ring";
import { MetricsGrid } from "@/components/scout/metric-pod";
import { MorningBrief } from "@/components/scout/morning-brief";
import { TaskList } from "@/components/scout/task-list";
import { GamificationBar } from "@/components/scout/gamification-bar";
import { IdeaCapture } from "@/components/scout/idea-capture";
import { DecisionsPanel } from "@/components/scout/decisions-panel";
import { OpportunitiesList } from "@/components/scout/opportunities-list";
import { IntelFeed } from "@/components/scout/intel-feed";
import { MomentumIndicator } from "@/components/scout/momentum-indicator";
import { CalendarView } from "@/components/scout/calendar-view";
import { TodoView } from "@/components/scout/todo-view";
import { IdeasView } from "@/components/scout/ideas-view";
import { DecisionsView } from "@/components/scout/decisions-view";
import { DeepAnalysisView } from "@/components/scout/deep-analysis-view";
import { BusinessesView } from "@/components/scout/businesses-view";
import { AIAssistant } from "@/components/scout/ai-assistant";
import { QuickTools } from "@/components/scout/quick-tools";
import { SettingsView } from "@/components/scout/settings-view";

// ── Mock data fallbacks (used until real data loads) ──────────────────────────
const MOCK_ACHIEVEMENTS = [
  { id: 1, icon: "trophy", title: "First £50K Month", unlocked: true },
  { id: 2, icon: "flame", title: "7-Day Streak", unlocked: true },
  { id: 3, icon: "target", title: "Goal Set", unlocked: true },
  { id: 4, icon: "radio", title: "Data Connected", unlocked: true },
  { id: 5, icon: "rocket", title: "First Launch", unlocked: true },
];
const MOCK_MILESTONES = [
  { id: 1, title: "First Brand Deal", unlocked: false },
  { id: 2, title: "10K Personal Brand Followers", unlocked: false },
  { id: 3, title: "£25K Month", unlocked: false },
  { id: 4, title: "Personal Brand Live", unlocked: false },
  { id: 5, title: "Africa Content Series", unlocked: false },
  { id: 6, title: "New Product Launched", unlocked: false },
  { id: 7, title: "First £50K Month", unlocked: true },
  { id: 8, title: "7-Day Streak", unlocked: true },
  { id: 9, title: "Data Connected", unlocked: true },
];
const MOCK_CALENDAR_EVENTS = [
  { id: 1, title: "Weekly Planning", date: "2026-05-18", time: "09:00", duration: 60, category: "work" },
  { id: 2, title: "YouTube Filming", date: "2026-05-19", time: "10:00", duration: 180, category: "content" },
  { id: 3, title: "Gym", date: "2026-05-20", time: "07:00", duration: 60, category: "personal" },
  { id: 4, title: "Q2 Financial Review", date: "2026-05-22", time: "10:00", duration: 120, category: "work", urgent: true },
  { id: 8, title: "Africa Trip", date: "2026-07-22", time: "00:00", duration: 0, category: "milestone", isCountdown: true },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}
function calcVelocity(goal: Goal) {
  const now = new Date();
  const deadline = goal.deadline ? new Date(goal.deadline + "T23:59:59") : null;
  const created = new Date(goal.created_at ?? now);
  const daysElapsed = Math.max(1, daysBetween(created, now));
  const daysRemaining = deadline ? Math.max(0, daysBetween(now, deadline)) : null;
  const totalDays = deadline ? Math.max(1, daysBetween(created, deadline)) : null;
  const current = goal.current_value ?? 0;
  const target = Math.max(1, goal.target_value ?? 1);
  const pct = Math.min(100, (current / target) * 100);
  const expectedPct = totalDays ? Math.min(100, (daysElapsed / totalDays) * 100) : null;
  const delta = expectedPct !== null ? pct - expectedPct : null;
  const avgPerDay = current / daysElapsed;
  const requiredPerDay = daysRemaining && daysRemaining > 0 ? (target - current) / daysRemaining : null;
  return { pct, expectedPct, delta, avgPerDay, requiredPerDay, daysRemaining, daysElapsed };
}
function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function App() {
  const router = useRouter();

  // ── Auth & org ──
  const [authUser, setAuthUser] = useState<{ id: string; email?: string } | null>(null);
  const [org, setOrg] = useState<OrgRow | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activity, setActivity] = useState<Record<string, unknown>[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteDone, setInviteDone] = useState(false);

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [profile, setProfile] = useState<FounderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [ideaForm, setIdeaForm] = useState({ title: "", description: "", upside: 5, downside: 5, effort: 5 });
  const [ideaSaving, setIdeaSaving] = useState(false);
  const [logForm, setLogForm] = useState({ output_type: "content", output_description: "", output_quantity: 1, output_unit: "hours", outcome_revenue: 0, outcome_followers: 0, notes: "", leverage_type: "content", hours: 1, related_idea_id: "" });
  const [logSaving, setLogSaving] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: "", category: "revenue", target_value: 0, current_value: 0, unit: "£", deadline: "" });
  const [goalSaving, setGoalSaving] = useState(false);
  const [profileForm, setProfileForm] = useState<FounderProfile>({ name: "", situation: "", runway_months: 6, monthly_revenue_goal: 5000, current_monthly_revenue: 0, risk_tolerance: "medium", top_skills: [], constraints: "" });
  const [profileSaving, setProfileSaving] = useState(false);

  const [morningAnswers, setMorningAnswers] = useState<Record<string, string>>({});
  const [todayTodos, setTodayTodos] = useState<TodoItem[]>([]);
  const [todoGenerated, setTodoGenerated] = useState(false);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [checkedTodos, setCheckedTodos] = useState<Set<number>>(new Set());

  // ── Advisor chat ──
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Memory layer ──
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<Array<{ date: string; summary: string; key_decisions: unknown[]; momentum: string }>>([]);
  const [openCommitments, setOpenCommitments] = useState<Array<Record<string, unknown>>>([]);

  // ── Info dump ──
  const [dumpText, setDumpText] = useState("");
  const [dumpEnergy, setDumpEnergy] = useState(7);
  const [dumpClarity, setDumpClarity] = useState(7);
  const [dumpProcessing, setDumpProcessing] = useState(false);
  const [dumpExtractions, setDumpExtractions] = useState<Record<string, unknown>[]>([]);
  const [dumpMeta, setDumpMeta] = useState<{ dominant_theme?: string; mental_state_note?: string; do_summary?: string; dont_summary?: string } | null>(null);
  const [savedDumps, setSavedDumps] = useState<Record<string, unknown>[]>([]);
  const [worksItems, setWorksItems] = useState<Record<string, unknown>[]>([]);
  const [doesntItems, setDoesntItems] = useState<Record<string, unknown>[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [signalForm, setSignalForm] = useState({ description: "", strength: 7, source: "market" as Signal["source"], idea_id: "" });
  const [signalSaving, setSignalSaving] = useState(false);
  const [platformData, setPlatformData] = useState<Record<string, unknown>[]>([]);

  // ── v0 JARVIS UI state ──
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState<NavItem>("dashboard");
  const [showAssistant, setShowAssistant] = useState(false);
  const [showQuickTools, setShowQuickTools] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────
  const load = useCallback(async (uid: string, orgId: string) => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const [iR, lR, gR, pR, planR, dumpR, worksR, doesntR, sigR, platR] = await Promise.all([
      supabase.from("ideas").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("daily_logs").select("*").eq("org_id", orgId).order("date", { ascending: false }).limit(60),
      supabase.from("goals").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("founder_profile").select("*").eq("user_id", uid).limit(1).maybeSingle(),
      supabase.from("daily_plans").select("*").eq("user_id", uid).eq("date", today).maybeSingle(),
      supabase.from("info_dumps").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
      supabase.from("extracted_items").select("*").eq("user_id", uid).eq("filed_as", "works").order("created_at", { ascending: false }),
      supabase.from("extracted_items").select("*").eq("user_id", uid).eq("filed_as", "doesnt_work").order("created_at", { ascending: false }),
      supabase.from("signals").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
      supabase.from("platform_latest").select("*").eq("org_id", orgId),
    ]);
    if (iR.data) setIdeas(iR.data);
    if (lR.data) setLogs(lR.data);
    if (gR.data) setGoals(gR.data);
    if (pR.data) { setProfile(pR.data); setProfileForm(pR.data); }
    if (planR.data) {
      if (planR.data.morning_answers) setMorningAnswers(planR.data.morning_answers);
      if (planR.data.todo_items) { setTodayTodos(planR.data.todo_items); setTodoGenerated(true); }
    }
    if (dumpR.data) setSavedDumps(dumpR.data);
    if (worksR.data) setWorksItems(worksR.data);
    if (doesntR.data) setDoesntItems(doesntR.data);
    if (sigR.data) setSignals(sigR.data as Signal[]);
    if (platR.data) setPlatformData(platR.data as Record<string, unknown>[]);
    setLoading(false);
  }, []);

  const loadSessionHistory = useCallback(async (orgId: string) => {
    try {
      const res = await fetch(`/api/advisor/session?org_id=${orgId}&limit=5`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.sessions) setSessionHistory(data.sessions);
      if (data.openCommitments) setOpenCommitments(data.openCommitments);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    setMounted(true);
    getSession().then(async session => {
      if (!session) { router.push("/login"); return; }
      setAuthUser(session.user);
      let currentOrg = await getOrg(session.user.id);
      if (!currentOrg) currentOrg = await createOrg("My Workspace", session.user.id);
      if (currentOrg) {
        setOrg(currentOrg);
        const [m, a] = await Promise.all([getMembers(currentOrg.id), getActivity(currentOrg.id)]);
        setMembers(m);
        setActivity(a);
        load(session.user.id, currentOrg.id);
        loadSessionHistory(currentOrg.id);
      }
    });
  }, [router, load, loadSessionHistory]);

  // ── Session unload ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const endSession = () => {
      const blob = new Blob([JSON.stringify({ sessionId })], { type: "application/json" });
      navigator.sendBeacon("/api/advisor/summarize", blob);
    };
    window.addEventListener("beforeunload", endSession);
    return () => window.removeEventListener("beforeunload", endSession);
  }, [sessionId]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const saveIdea = async () => {
    if (!ideaForm.title.trim() || !authUser || !org) return;
    setIdeaSaving(true);
    const category = categoriseIdea(ideaForm.upside, ideaForm.downside, ideaForm.effort);
    const score = opportunityScore(ideaForm.upside, ideaForm.downside, ideaForm.effort);
    await supabase.from("ideas").insert({ ...ideaForm, category, user_id: authUser.id, org_id: org.id });
    await logActivity(org.id, authUser.id, "idea_added", "idea", { title: ideaForm.title, score, category });
    setIdeaForm({ title: "", description: "", upside: 5, downside: 5, effort: 5 });
    await load(authUser.id, org.id); setIdeaSaving(false);
  };

  const saveLog = async () => {
    if (!authUser || !org) return;
    setLogSaving(true);
    const date = new Date().toISOString().split("T")[0];
    const logPayload = { ...logForm, date, user_id: authUser.id, org_id: org.id, related_idea_id: logForm.related_idea_id || null };
    await supabase.from("daily_logs").insert(logPayload);
    if (logForm.outcome_revenue > 0) {
      await logActivity(org.id, authUser.id, "revenue_logged", "log", { amount: logForm.outcome_revenue });
      const revGoals = goals.filter(g => g.category === "revenue");
      await Promise.all(revGoals.map(g =>
        supabase.from("goals").update({ current_value: (g.current_value ?? 0) + logForm.outcome_revenue }).eq("id", g.id!)
      ));
    }
    if (logForm.outcome_followers > 0) {
      await logActivity(org.id, authUser.id, "followers_logged", "log", { amount: logForm.outcome_followers });
      const audGoals = goals.filter(g => g.category === "audience");
      await Promise.all(audGoals.map(g =>
        supabase.from("goals").update({ current_value: (g.current_value ?? 0) + logForm.outcome_followers }).eq("id", g.id!)
      ));
    }
    setLogForm({ output_type: "content", output_description: "", output_quantity: 1, output_unit: "hours", outcome_revenue: 0, outcome_followers: 0, notes: "", leverage_type: "content", hours: 1, related_idea_id: "" });
    await load(authUser.id, org.id); setLogSaving(false);
  };

  const saveGoal = async () => {
    if (!goalForm.title.trim() || !authUser || !org) return;
    setGoalSaving(true);
    await supabase.from("goals").insert({ ...goalForm, user_id: authUser.id, org_id: org.id });
    await logActivity(org.id, authUser.id, "goal_added", "goal", { title: goalForm.title, target: goalForm.target_value });
    setGoalForm({ title: "", category: "revenue", target_value: 0, current_value: 0, unit: "£", deadline: "" });
    await load(authUser.id, org.id); setGoalSaving(false);
  };

  const updateGoalProgress = async (id: string, value: number) => {
    await supabase.from("goals").update({ current_value: value }).eq("id", id);
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current_value: value } : g));
  };

  const deleteIdea = async (id: string) => {
    await supabase.from("ideas").delete().eq("id", id);
    setIdeas(prev => prev.filter(i => i.id !== id));
  };

  const saveSignal = async () => {
    if (!signalForm.description.trim() || !authUser || !org) return;
    setSignalSaving(true);
    const payload: Signal = { ...signalForm, user_id: authUser.id, org_id: org.id, idea_id: signalForm.idea_id || undefined };
    await supabase.from("signals").insert(payload);
    setSignalForm({ description: "", strength: 7, source: "market", idea_id: "" });
    await load(authUser.id, org.id);
    setSignalSaving(false);
  };

  const saveProfile = async () => {
    if (!authUser) return;
    setProfileSaving(true);
    if (profile?.id) {
      await supabase.from("founder_profile").update({ ...profileForm }).eq("id", profile.id);
    } else {
      const { data } = await supabase.from("founder_profile").insert({ ...profileForm, user_id: authUser.id }).select().single();
      if (data) setProfile(data);
    }
    if (org) await load(authUser.id, org.id); setProfileSaving(false);
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !org) return;
    setInviteSending(true);
    await inviteMember(org.id, inviteEmail);
    setInviteEmail(""); setInviteDone(true); setInviteSending(false);
    setTimeout(() => setInviteDone(false), 4000);
  };

  const processDump = async () => {
    if (!dumpText.trim() || !authUser) return;
    setDumpProcessing(true);
    try {
      const res = await fetch("/api/extract-dump", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: dumpText, energy: dumpEnergy, clarity: dumpClarity }) });
      const data = await res.json();
      setDumpExtractions(data.items ?? []);
      setDumpMeta({ dominant_theme: data.dominant_theme, mental_state_note: data.mental_state_note, do_summary: data.do_summary, dont_summary: data.dont_summary });
      await supabase.from("info_dumps").insert({ user_id: authUser.id, org_id: org?.id, raw_text: dumpText, mental_state_energy: dumpEnergy, mental_state_clarity: dumpClarity, dominant_theme: data.dominant_theme, mental_state_note: data.mental_state_note });
    } catch { /* silent */ }
    setDumpProcessing(false);
  };

  const fileItem = async (item: Record<string, unknown>, filedAs: "works" | "doesnt_work") => {
    if (!authUser) return;
    await supabase.from("extracted_items").insert({ ...item, user_id: authUser.id, filed_as: filedAs });
    setDumpExtractions(prev => prev.filter(i => i !== item));
    if (filedAs === "works") setWorksItems(prev => [{ ...item, filed_as: "works" }, ...prev]);
    if (filedAs === "doesnt_work") setDoesntItems(prev => [{ ...item, filed_as: "doesnt_work" }, ...prev]);
  };

  const saveItemToLab = async (item: Record<string, unknown>) => {
    if (!authUser || !org) return;
    const upside = (item.upside as number) ?? 5;
    const downside = (item.downside as number) ?? 5;
    const effort = (item.effort as number) ?? 5;
    const category = categoriseIdea(upside, downside, effort);
    await supabase.from("ideas").insert({ title: item.content, upside, downside, effort, category, user_id: authUser.id, org_id: org.id });
    await load(authUser.id, org.id);
  };

  const generateTodo = async () => {
    setAdvisorLoading(true);
    let todos = generateTodoFromIdeas(ideas, profile, morningAnswers);
    if (todos.length === 0) {
      const win = morningAnswers[0]?.trim();
      const avoiding = morningAnswers[1]?.trim();
      todos = [
        win ? { task: win, priority: "high", estimated_time: "2–4 hrs", category: "asymmetric" } : null,
        avoiding ? { task: avoiding, priority: "high", estimated_time: "1–2 hrs", category: "standard" } : null,
        { task: "Add your ideas to Idea Lab so tomorrow's plan is fully ranked", priority: "medium", estimated_time: "15 min", category: "standard" },
      ].filter(Boolean) as typeof todos;
    }
    const today = new Date().toISOString().split("T")[0];
    const ex = await supabase.from("daily_plans").select("id").eq("date", today).maybeSingle();
    if (ex.data?.id) {
      await supabase.from("daily_plans").update({ morning_answers: morningAnswers, todo_items: todos }).eq("id", ex.data.id);
    } else {
      await supabase.from("daily_plans").insert({ date: today, morning_answers: morningAnswers, todo_items: todos });
    }
    setTodayTodos(todos); setTodoGenerated(true); setAdvisorLoading(false);
  };

  // ── Chat send (real streaming API) ───────────────────────────────────────
  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMsg = { role: "user" as const, content: text };
    const next = [...chatMessages, userMsg];
    setChatMessages(next);
    setChatInput("");
    setChatLoading(true);

    const platformContext = platformData.reduce((acc, row) => {
      acc[row.platform as string] = {
        subscribers: row.subscribers, followers: row.followers,
        views_7d: row.views_7d, watch_min_7d: row.watch_min_7d,
        revenue_7d: row.revenue_7d, revenue_30d: row.revenue_30d,
        orders_30d: row.orders_30d, updated_at: row.updated_at,
        data_source: "first_party_api",
      };
      return acc;
    }, {} as Record<string, unknown>);

    const context = {
      profile, goals: goals.slice(0, 10),
      ideas: ideas.slice(0, 15).map(i => ({ ...i, score: opportunityScore(i.upside, i.downside, i.effort), asymmetryScore: calculateAsymmetryScore(i.upside, i.downside, i.effort) })),
      recentLogs: logs.slice(0, 7),
      portfolioHealth: portfolioHealth(ideas),
      libraryContext: worksItems.slice(0, 5).map(i => i.content).join("; ") || undefined,
      signals: signals.slice(0, 10),
      reasoning: {
        alerts: reasoning.strategyAlerts.map(a => a.msg),
        zombies: reasoning.zombies.map(z => ({ title: z.idea.title, hoursSpent: z.hoursSpent })),
        timeAllocation: reasoning.timeAllocation,
        runwayMode: reasoning.runwayMode,
      },
      platforms: Object.keys(platformContext).length > 0 ? platformContext : undefined,
      dataGrounding: {
        note: "Values under 'platforms' are Tier 1 verified data from authenticated APIs. All other values are self-reported.",
        connectedPlatforms: Object.keys(platformContext),
      },
      memory: sessionHistory.length > 0 ? {
        previousSessions: sessionHistory.map(s => ({ date: s.date, summary: s.summary, momentum: s.momentum, key_decisions: s.key_decisions })),
        openCommitments: openCommitments.slice(0, 10),
        note: "You have memory of past sessions. Reference past decisions and commitments naturally when relevant.",
      } : undefined,
    };

    let activeSessionId = sessionId;
    if (!activeSessionId && org) {
      try {
        const sRes = await fetch("/api/advisor/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId: org.id, messages: next }) });
        const sData = await sRes.json();
        if (sData.sessionId) { activeSessionId = sData.sessionId; setSessionId(sData.sessionId); }
      } catch { /* non-fatal */ }
    }

    try {
      const res = await fetch("/api/advisor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, context }) });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      setChatMessages(m => [...m, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        setChatMessages(m => { const copy = [...m]; copy[copy.length - 1] = { role: "assistant", content: full }; return copy; });
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      if (activeSessionId) {
        const finalMessages = [...next, { role: "assistant" as const, content: full }];
        fetch("/api/advisor/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: activeSessionId, messages: finalMessages }) }).catch(() => {});
      }
    } catch {
      setChatMessages(m => [...m, { role: "assistant", content: "Connection error. Check your API key in settings." }]);
    }
    setChatLoading(false);
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const health = portfolioHealth(ideas);
  const insight = getAdvisorInsight(ideas, profile, logs);
  const reasoning = runReasoningEngine(ideas, logs, signals, goals, profile);
  const topIdea = ideas.length > 0 ? [...ideas].sort((a, b) => calculateAsymmetryScore(b.upside, b.downside, b.effort) - calculateAsymmetryScore(a.upside, a.downside, a.effort))[0] : null;
  const MORNING_QS = getMorningQuestions(topIdea?.title);
  const allAnswered = MORNING_QS.every((_, i) => morningAnswers[i]?.trim());
  const totalRevenue = logs.reduce((s, l) => s + (l.outcome_revenue ?? 0), 0);
  const totalFollowers = logs.reduce((s, l) => s + (l.outcome_followers ?? 0), 0);

  // ── Data adapters: real data → v0 component props ─────────────────────────

  // North star from primary revenue goal
  const primaryGoal = goals.find(g => g.category === "revenue");
  const northStar = {
    current: primaryGoal?.current_value ?? 4500,
    target: primaryGoal?.target_value ?? 100000,
    currency: primaryGoal?.unit ?? "£",
    secondaryTarget: 1000000,
    secondaryLabel: "12-Month: £1M cash",
    velocityMonths: primaryGoal ? Math.ceil((primaryGoal.target_value ?? 100000) / Math.max(1, (primaryGoal.current_value ?? 0))) : 8,
  };

  // Metrics from platform data — fill with any real data we have
  const metrics = platformData.length > 0 ? platformData.flatMap((p, i) => {
    const plat = p.platform as string;
    const pods = [];
    if (plat === "shopify") {
      pods.push({ id: `${plat}-revenue`, platform: "Shopify Revenue", icon: "shopping-bag", value: Number(p.revenue_30d ?? 0), prefix: "£", delta: Number(p.revenue_7d ?? 0), deltaLabel: "7 days", trend: [0, 0, 0, 0, 0, 0, Number(p.revenue_30d ?? 0)], color: "#96BF48" });
    }
    if (plat === "youtube") {
      pods.push({ id: `${plat}-subs`, platform: "YouTube Subs", icon: "youtube", value: Number(p.subscribers ?? 65800), delta: Number(p.new_subs_7d ?? 0), deltaLabel: "7 days", trend: [0, 0, 0, 0, 0, 0, Number(p.subscribers ?? 65800)], color: "#FF0000" });
      pods.push({ id: `${plat}-views`, platform: "YouTube Views", icon: "eye", value: Number(p.views_7d ?? 0), delta: 0, deltaLabel: "7 days", trend: [0, 0, 0, 0, 0, 0, Number(p.views_7d ?? 0)], color: "#FF0000" });
    }
    if (plat === "instagram") {
      pods.push({ id: `${plat}-followers`, platform: "Instagram", icon: "instagram", value: Number(p.followers ?? 33800), delta: Number(p.new_followers_7d ?? 0), deltaLabel: "7 days", trend: [0, 0, 0, 0, 0, 0, Number(p.followers ?? 33800)], color: "#E1306C" });
    }
    return pods;
  }) : [
    // Fallback mock metrics when no platform data connected
    { id: "shopify-revenue", platform: "Shopify Revenue", icon: "shopping-bag", value: 12847, prefix: "£", delta: 420, deltaLabel: "vs yesterday", trend: [8200, 9100, 10400, 11200, 11800, 12400, 12847], color: "#96BF48" },
    { id: "youtube-subs", platform: "YouTube Subs", icon: "youtube", value: 65800, delta: 1240, deltaLabel: "7 days", trend: [62000, 63200, 63800, 64100, 64900, 65400, 65800], color: "#FF0000" },
    { id: "instagram-followers", platform: "Instagram", icon: "instagram", value: 33800, delta: 890, deltaLabel: "7 days", trend: [31200, 31800, 32200, 32600, 33000, 33400, 33800], color: "#E1306C" },
    { id: "all-time-revenue", platform: "All-Time Revenue", icon: "wallet", value: totalRevenue || 284000, prefix: "£", label: "All time", color: "#7C3AED" },
  ];

  // Morning brief from real todos + reasoning alerts
  const generatedAt = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const morningBrief = {
    generatedAt,
    nonNegotiables: todayTodos.slice(0, 3).map((t, i) => ({ id: i, text: t.task, done: checkedTodos.has(i) })).concat(
      todayTodos.length === 0 ? [{ id: 0, text: "Generate today's plan in the To-Do tab", done: false }] : []
    ),
    watchList: reasoning.strategyAlerts.slice(0, 3).map((a, i) => ({
      id: i,
      text: a.msg,
      status: (a.level === "red" ? "DOWN" : a.level === "amber" ? "NEEDS ACTION" : "UP") as "UP" | "DOWN" | "NEEDS ACTION",
    })).concat(reasoning.strategyAlerts.length === 0 ? [{ id: 0, text: "No critical alerts today", status: "UP" as const }] : []),
    overnight: platformData.length > 0
      ? platformData.slice(0, 4).map(p => ({
          platform: String(p.platform),
          delta: p.revenue_7d ? `+£${Number(p.revenue_7d).toLocaleString()}` : p.views_7d ? `+${Number(p.views_7d).toLocaleString()} views` : "No data",
          positive: true,
        }))
      : [
          { platform: "Shopify", delta: "+£420", positive: true },
          { platform: "YouTube", delta: "+340 views", positive: true },
          { platform: "Instagram", delta: "+89 followers", positive: true },
        ],
  };

  // Tasks from real todos
  const tasks = todayTodos.map((t, i) => ({
    id: i,
    text: t.task,
    kellyScore: 0.7,
    timeEstimate: t.estimated_time ?? "1h",
    category: t.category === "asymmetric" ? "Business" : t.category === "easy_win" ? "Business" : t.category === "grind" ? "Content" : "System",
    done: checkedTodos.has(i),
    xp: t.priority === "high" ? 80 : t.priority === "medium" ? 50 : 30,
    northStarImpact: t.priority === "high" ? 0.8 : 0.3,
    group: "Today",
  }));

  // Opportunities from real ideas (asymmetric + easy_win)
  const opportunities = ideas.filter(i => ["asymmetric", "easy_win"].includes(i.category ?? "")).slice(0, 5).map(i => ({
    id: parseInt(i.id ?? "0") || Math.random(),
    title: i.title,
    category: i.category === "asymmetric" ? "ASYMMETRIC" : "EASY WIN",
    probability: Math.round(opportunityScore(i.upside, i.downside, i.effort) * 10),
    upside: i.upside * 5000,
    kellyScore: parseFloat((opportunityScore(i.upside, i.downside, i.effort) / 10).toFixed(2)),
  }));

  // Idea capture from real ideas
  const ideaCapItems = ideas.slice(0, 10).map((i, idx) => ({
    id: idx + 1,
    text: i.title,
    upside: i.upside,
    downside: i.downside,
    effort: i.effort,
    category: (i.category === "asymmetric" ? "ASYMMETRIC" : i.category === "easy_win" ? "EASY WIN" : i.category === "grind" ? "GRIND" : i.category === "trap" ? "TRAP" : "STANDARD") as string,
  }));

  // Intel feed from signals + activity
  const intelItems = [
    ...signals.slice(0, 5).map((s, i) => ({
      id: i,
      type: s.source === "market" ? "metric" : "pattern",
      text: s.description,
      time: "recent",
      category: s.source === "market" ? "growth" : "insight",
    })),
    ...reasoning.zombies.slice(0, 2).map((z, i) => ({
      id: 100 + i,
      type: "zombie",
      text: `${z.idea.title}: ${z.hoursSpent}h spent, no progress`,
      time: "flagged",
      category: "warning",
    })),
    ...reasoning.strategyAlerts.slice(0, 2).map((a, i) => ({
      id: 200 + i,
      type: "reminder",
      text: a.msg,
      time: "today",
      category: "commitment",
    })),
  ].slice(0, 8).concat(
    signals.length === 0 && reasoning.zombies.length === 0 ? [
      { id: 999, type: "metric", text: "Connect platforms in Data tab for live intel", time: "setup", category: "system" },
    ] : []
  );

  // Momentum from reasoning/goals
  const recentRevenueLogs = logs.slice(0, 7);
  const recentRevTotal = recentRevenueLogs.reduce((s, l) => s + (l.outcome_revenue ?? 0), 0);
  const olderRevTotal = logs.slice(7, 14).reduce((s, l) => s + (l.outcome_revenue ?? 0), 0);
  const momentum: "UP" | "NEUTRAL" | "DOWN" = reasoning.runwayMode ? "DOWN" : recentRevTotal >= olderRevTotal ? "UP" : "NEUTRAL";

  // Situation report
  const openDecisionCount = ideas.filter(i => !i.category || i.category === "standard").length;
  const situationReport = `Momentum: ${momentum} — ${ideas.filter(i => i.category === "asymmetric").length} asymmetric bets active`;

  // Businesses view data
  const shopifyPlatform = platformData.find(p => p.platform === "shopify");
  const businessesData = [
    {
      id: 1, name: "BRICK WHIPS", status: "ACTIVE" as const,
      monthlyRevenue: Number(shopifyPlatform?.revenue_30d ?? primaryGoal?.current_value ?? 10000),
      monthlyProfit: Math.round(Number(shopifyPlatform?.revenue_30d ?? 10000) * 0.5),
      margin: 50, trend: (momentum === "UP" ? "up" : "down") as "up" | "down" | "neutral", trendPercent: 12,
      contributionTarget: 80, currentContribution: 85,
      issues: reasoning.strategyAlerts.slice(0, 2).map(a => a.msg),
      opportunities: ideas.filter(i => i.category === "easy_win").slice(0, 2).map(i => i.title),
    },
    {
      id: 2, name: "PERSONAL BRAND", status: "BUILDING" as const,
      monthlyRevenue: 0, monthlyProfit: 0, margin: 0,
      trend: "neutral" as const, trendPercent: 0, contributionTarget: 20, currentContribution: 0,
      issues: [], opportunities: ["Brand deals pipeline", "Course launch potential"],
    },
  ];

  // Deep analysis from platform data
  const deepAnalysisItems = platformData.length > 0 ? platformData.map(p => ({
    id: String(p.platform),
    name: String(p.platform).charAt(0).toUpperCase() + String(p.platform).slice(1),
    source: `${p.platform} API`,
    lastPulled: String(p.updated_at ?? ""),
    confidence: "Tier 1: Verified API",
    rawData: { revenue_30d: Number(p.revenue_30d ?? 0), revenue_7d: Number(p.revenue_7d ?? 0), subscribers: Number(p.subscribers ?? 0), followers: Number(p.followers ?? 0), views_7d: Number(p.views_7d ?? 0) },
    calculation: `Live pull from ${p.platform} authenticated API`,
    trend30d: "up" as const, trend60d: "up" as const, trend90d: "up" as const,
    levers: ["Connect more platforms for deeper analysis"],
    relatedDecisions: [],
    relatedOpportunities: [],
  })) : [];

  // User data
  const userName = profile?.name ?? authUser?.email?.split("@")[0] ?? "Joshua";
  const userLevel = { name: userName, level: 12, levelTitle: "Commander", xpCurrent: 2340, xpToNextLevel: 3000, streak: checkedTodos.size > 0 ? 7 : 1, todayXP: checkedTodos.size * 60, contentStreak: 5, loginStreak: 14 };

  const lastSyncTime = platformData.length > 0 ? "just now" : "not connected";

  // ── Navigation handler ────────────────────────────────────────────────────
  const handleNavigation = (item: NavItem) => {
    if (item === "assistant") {
      setShowAssistant(true);
    } else if (item === "tools") {
      setShowQuickTools(true);
    } else {
      setActiveNav(item);
      setShowAssistant(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#07071A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="w-3 h-3 rounded-full bg-[#7C3AED]"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ boxShadow: "0 0 20px #7C3AED" }}
          />
          <span className="text-white/40 text-sm font-medium tracking-widest uppercase">Initializing Scout...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07071A] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0D0D24_0%,_#07071A_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#7C3AED]/15 to-transparent"
            initial={{ top: "-2px" }}
            animate={{ top: "100vh" }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeItem={activeNav}
        onNavigate={handleNavigation}
        user={{ name: userName, level: userLevel.level, levelTitle: userLevel.levelTitle }}
        lastSync={lastSyncTime}
      />

      {/* Main content */}
      <div
        className="relative z-10 transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 60 : 220 }}
      >
        {/* Top bar — dashboard only */}
        {activeNav === "dashboard" && (
          <TopBar
            userName={userName}
            situationReport={situationReport}
            northStarCurrent={northStar.current}
            northStarTarget={northStar.target}
            currency={northStar.currency}
          />
        )}

        <div className="px-6 pb-8">
          <AnimatePresence mode="wait">

            {/* ── Dashboard ── */}
            {activeNav === "dashboard" && (
              <motion.div key="dashboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <div className="flex items-center justify-between mb-6 mt-4">
                  <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold text-white">
                    {getGreeting(userName)}
                  </motion.h1>
                  <MomentumIndicator momentum={momentum} />
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
                  <GamificationBar
                    level={userLevel.level}
                    levelTitle={userLevel.levelTitle}
                    xpCurrent={userLevel.xpCurrent}
                    xpToNextLevel={userLevel.xpToNextLevel}
                    tasksCompleted={checkedTodos.size}
                    ideasCaptured={ideas.length}
                    decisionsMade={ideas.filter(i => i.category === "asymmetric").length}
                    achievements={MOCK_ACHIEVEMENTS}
                    milestones={MOCK_MILESTONES}
                    loginStreak={userLevel.loginStreak}
                    taskStreak={userLevel.streak}
                    contentStreak={userLevel.contentStreak}
                  />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
                  <MetricsGrid metrics={metrics} />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6">
                  <MorningBrief
                    generatedAt={morningBrief.generatedAt}
                    nonNegotiables={morningBrief.nonNegotiables}
                    watchList={morningBrief.watchList}
                    overnight={morningBrief.overnight}
                  />
                </motion.div>

                <div className="grid lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-3 space-y-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                      <NorthStarRing
                        current={northStar.current}
                        target={northStar.target}
                        currency={northStar.currency}
                        secondaryTarget={northStar.secondaryTarget}
                        secondaryLabel={northStar.secondaryLabel}
                        velocityMonths={northStar.velocityMonths}
                      />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                      <IdeaCapture ideas={ideaCapItems} />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                      <DecisionsPanel decisions={[]} />
                    </motion.div>
                  </div>

                  <div className="lg:col-span-6 space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                      <TaskList tasks={tasks.length > 0 ? tasks : [{ id: 0, text: "Generate your today plan — click To-Do in sidebar", kellyScore: 0.8, timeEstimate: "2m", category: "System", done: false, xp: 50, northStarImpact: 0.5, group: "Setup" }]} streak={userLevel.streak} todayXP={userLevel.todayXP} />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                      <OpportunitiesList opportunities={opportunities.length > 0 ? opportunities : [{ id: 1, title: "Add ideas in the Ideas tab to see opportunities ranked here", category: "EASY WIN", probability: 80, upside: 5000, kellyScore: 0.75 }]} />
                    </motion.div>
                  </div>

                  <div className="lg:col-span-3">
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
                      <IntelFeed items={intelItems.length > 0 ? intelItems : [{ id: 1, type: "system", text: "Connect platforms to see live intel here", time: "setup", category: "system" }]} />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Calendar ── */}
            {activeNav === "calendar" && (
              <motion.div key="calendar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="pt-6 h-[calc(100vh-2rem)]">
                <CalendarView events={MOCK_CALENDAR_EVENTS} />
              </motion.div>
            )}

            {/* ── To-Do ── */}
            {activeNav === "todo" && (
              <motion.div key="todo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="pt-6 h-[calc(100vh-2rem)]">
                <TodoView
                  tasks={tasks.length > 0 ? tasks : []}
                  streak={userLevel.streak}
                  contentStreak={userLevel.contentStreak}
                  loginStreak={userLevel.loginStreak}
                  todayXP={userLevel.todayXP}
                />
              </motion.div>
            )}

            {/* ── Ideas ── */}
            {activeNav === "ideas" && (
              <motion.div key="ideas" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="pt-6 h-[calc(100vh-2rem)]">
                <IdeasView ideas={ideaCapItems} />
              </motion.div>
            )}

            {/* ── Decisions ── */}
            {activeNav === "decisions" && (
              <motion.div key="decisions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="pt-6 h-[calc(100vh-2rem)]">
                <DecisionsView decisions={[]} archivedDecisions={[]} />
              </motion.div>
            )}

            {/* ── Deep Analysis ── */}
            {activeNav === "analysis" && (
              <motion.div key="analysis" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="pt-6 h-[calc(100vh-2rem)]">
                <DeepAnalysisView items={deepAnalysisItems} lastSync={lastSyncTime} />
              </motion.div>
            )}

            {/* ── Businesses ── */}
            {activeNav === "businesses" && (
              <motion.div key="businesses" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="pt-6 h-[calc(100vh-2rem)]">
                <BusinessesView businesses={businessesData} />
              </motion.div>
            )}

            {/* ── Settings ── */}
            {activeNav === "settings" && (
              <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="pt-6">
                <SettingsView />
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={async () => { await signOut(); router.push("/login"); }}
                    className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
                  >
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* AI Assistant panel — wired to real streaming API */}
      <AIAssistant
        isOpen={showAssistant}
        onClose={() => setShowAssistant(false)}
        messages={chatMessages}
        input={chatInput}
        setInput={setChatInput}
        isLoading={chatLoading}
        onSend={sendChat}
        lastSync={lastSyncTime}
      />

      {/* Quick Tools */}
      <QuickTools isOpen={showQuickTools} onClose={() => setShowQuickTools(false)} />

      {/* Floating chat button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: "spring" }}
        onClick={() => setShowAssistant(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center text-white z-40"
        style={{ boxShadow: "0 0 30px rgba(124, 58, 237, 0.5)" }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageSquare className="w-6 h-6" />
      </motion.button>

      {/* Hidden ref for chat scroll */}
      <div ref={chatBottomRef} className="hidden" />
    </div>
  );
}
