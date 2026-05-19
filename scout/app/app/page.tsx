"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ScatterChart, Scatter, ZAxis,
} from "recharts";
import { useRouter } from "next/navigation";
import { supabase, categoriseIdea, opportunityScore, kellyHours, portfolioHealth } from "@/lib/supabase";
import { generateTodoFromIdeas, getAdvisorInsight } from "@/lib/advisor";
import { getSession, getOrg, getMembers, getActivity, logActivity, inviteMember, createOrg, signOut } from "@/lib/auth";
import { runReasoningEngine, getMorningQuestions, calculateAsymmetryScore, normalizedAsymmetryScore, signalToNoise, leverageWeight, LEVERAGE_MULTIPLIER } from "@/lib/reasoning";
import type { Signal } from "@/lib/reasoning";
import type { Idea, DailyLog, Goal, FounderProfile, TodoItem } from "@/lib/supabase";
import type { OrgRow, Member } from "@/lib/auth";

// ── Tokens ────────────────────────────────────────────────────────────────────
const BG      = "#07071A";
const SURFACE = "#0C0C20";
const GLASS   = "rgba(255,255,255,0.04)";
const BORDER  = "rgba(255,255,255,0.08)";
const TEXT    = "#F1F0FF";
const DIM     = "rgba(255,255,255,0.35)";

const P = {
  purple:  "#7C3AED", violet: "#A78BFA", cyan: "#06B6D4",
  emerald: "#10B981", orange: "#F59E0B", red: "#EF4444",
  blue: "#3B82F6",   gold: "#FFD700",
};

const TABS = ["Advisor", "Today", "Idea Lab", "Overview", "Daily Log", "Goals", "Team", "Profile"] as const;
type Tab = typeof TABS[number];

const TAB_ICONS: Record<Tab, string> = {
  "Advisor":  "🧠",
  "Today":    "🎯",
  "Idea Lab": "💡",
  "Overview": "📊",
  "Daily Log":"📝",
  "Goals":    "🏁",
  "Team":     "👥",
  "Profile":  "⚙️",
};

const PERSONAL_TABS: Tab[] = ["Advisor", "Today", "Profile"];
const ORG_TABS:      Tab[] = ["Idea Lab", "Overview", "Daily Log", "Goals", "Team"];

const CAT: Record<string, { label: string; color: string; desc: string }> = {
  asymmetric: { label: "Asymmetric", color: P.emerald, desc: "High upside, low risk" },
  easy_win:   { label: "Easy Win",   color: P.cyan,    desc: "Good reward, low effort" },
  grind:      { label: "Grind",      color: P.orange,  desc: "High effort, long game" },
  standard:   { label: "Standard",   color: P.blue,    desc: "Balanced opportunity" },
  trap:       { label: "Trap",       color: P.red,     desc: "Cut it — high effort, low reward" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const TOOLTIP = {
  contentStyle: { background: "#0C0C20", border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT, fontSize: 12 },
  itemStyle: { color: TEXT }, labelStyle: { color: DIM },
};
const AXIS = { fill: DIM, fontSize: 11 };
const GRID = { stroke: "rgba(255,255,255,0.04)", strokeDasharray: "4 4" };

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function calcVelocity(goal: Goal) {
  const now      = new Date();
  const deadline = goal.deadline ? new Date(goal.deadline + "T23:59:59") : null;
  const created  = new Date(goal.created_at ?? now);
  const daysElapsed   = Math.max(1, daysBetween(created, now));
  const daysRemaining = deadline ? Math.max(0, daysBetween(now, deadline)) : null;
  const totalDays     = deadline ? Math.max(1, daysBetween(created, deadline)) : null;
  const current  = goal.current_value ?? 0;
  const target   = Math.max(1, goal.target_value ?? 1);
  const pct      = Math.min(100, (current / target) * 100);
  const expectedPct = totalDays ? Math.min(100, (daysElapsed / totalDays) * 100) : null;
  const delta    = expectedPct !== null ? pct - expectedPct : null;
  const avgPerDay      = current / daysElapsed;
  const requiredPerDay = daysRemaining && daysRemaining > 0 ? (target - current) / daysRemaining : null;
  return { pct, expectedPct, delta, avgPerDay, requiredPerDay, daysRemaining, daysElapsed };
}

// ── Reusable UI ───────────────────────────────────────────────────────────────
function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 20, backdropFilter: "blur(20px)", ...style }}>
      {children}
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ background: `${color}20`, color, border: `1px solid ${color}40`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>;
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 11, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>{children}</label>;
}

const inputSt: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`,
  borderRadius: 12, padding: "10px 14px", fontSize: 14, color: TEXT, outline: "none",
};

function Slider({ label, value, onChange, color, desc }: { label: string; value: number; onChange: (v: number) => void; color: string; desc?: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{value}<span style={{ color: DIM }}>/10</span></span>
      </div>
      {desc && <p style={{ fontSize: 11, color: DIM, marginBottom: 6, margin: "0 0 6px" }}>{desc}</p>}
      <input type="range" min={1} max={10} value={value} onChange={e => onChange(+e.target.value)}
        style={{ width: "100%", accentColor: color, cursor: "pointer" }} />
    </div>
  );
}

function ScoreRing({ score, color, size = 44 }: { score: number; color: string; size?: number }) {
  const r = (size - 8) / 2, c = size / 2, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={BORDER} strokeWidth={4} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={circ - (score / 10) * circ}
        strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`} />
      <text x={c} y={c + 4} textAnchor="middle" fill={color} fontSize={12} fontWeight={800}>{score}</text>
    </svg>
  );
}

function SubmitBtn({ onClick, disabled, loading, label, color = P.purple }: { onClick: () => void; disabled?: boolean; loading: boolean; label: string; color?: string }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{ width: "100%", border: "none", borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 800, color: "#fff", cursor: disabled || loading ? "not-allowed" : "pointer", opacity: disabled || loading ? 0.35 : 1, background: `linear-gradient(135deg, ${color}CC, ${color})`, boxShadow: `0 4px 20px ${color}40`, transition: "all 0.15s" }}>
      {loading ? "Saving..." : label}
    </button>
  );
}

// ── Portfolio grade ring ──────────────────────────────────────────────────────
function GradeRing({ score, grade, size = 38 }: { score: number; grade: string; size?: number }) {
  const color = grade === "A" ? P.gold : grade === "B" ? P.purple : grade === "C" ? P.orange : P.red;
  const r = (size - 6) / 2, c = size / 2, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="ring-pulse">
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
        strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
    </svg>
  );
}

// ── HUD floating rings ────────────────────────────────────────────────────────
function HUD({ todos, checked, goals }: { todos: TodoItem[]; checked: Set<number>; goals: Goal[] }) {
  const [hover, setHover] = useState<"tasks" | "goal" | null>(null);
  const taskPct  = todos.length > 0 ? (checked.size / todos.length) * 100 : 0;
  const primGoal = goals.find(g => g.deadline);
  const goalPct  = primGoal ? calcVelocity(primGoal).pct : 0;
  const taskColor = taskPct >= 100 ? P.gold : taskPct >= 60 ? P.emerald : taskPct >= 30 ? P.cyan : P.purple;
  const goalColor = goalPct >= 100 ? P.gold : goalPct >= 70 ? P.emerald : goalPct >= 40 ? P.cyan : P.orange;

  function MiniRing({ pct, color, label, size = 52 }: { pct: number; color: string; label: string; size?: number }) {
    const r = (size - 8) / 2, c = size / 2, circ = 2 * Math.PI * r;
    return (
      <div style={{ textAlign: "center" }}>
        <svg width={size} height={size}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
          <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={5}
            strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ}
            strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`}
            style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
          <text x={c} y={c + 4} textAnchor="middle" fill={color} fontSize={11} fontWeight={800}>{Math.round(pct)}%</text>
        </svg>
        <p style={{ fontSize: 9, color: DIM, margin: "4px 0 0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 40, display: "flex", gap: 12 }}>
      {/* Tasks ring */}
      <div style={{ position: "relative" }}
        onMouseEnter={() => setHover("tasks")} onMouseLeave={() => setHover(null)}>
        <div style={{ background: "rgba(7,7,26,0.9)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "10px 14px", backdropFilter: "blur(20px)", cursor: "default" }}>
          <MiniRing pct={taskPct} color={taskColor} label="Today" />
        </div>
        {hover === "tasks" && (
          <div style={{ position: "absolute", bottom: "110%", right: 0, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 18px", width: 200, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: TEXT, margin: "0 0 8px" }}>Today&apos;s Tasks</p>
            <p style={{ fontSize: 12, color: taskColor, margin: 0, fontWeight: 700 }}>{checked.size} / {todos.length} complete</p>
            {checked.size === todos.length && todos.length > 0 && <p style={{ fontSize: 11, color: P.gold, marginTop: 4 }}>🏆 Legendary day</p>}
          </div>
        )}
      </div>

      {/* Goal ring */}
      <div style={{ position: "relative" }}
        onMouseEnter={() => setHover("goal")} onMouseLeave={() => setHover(null)}>
        <div style={{ background: "rgba(7,7,26,0.9)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "10px 14px", backdropFilter: "blur(20px)", cursor: "default" }}>
          <MiniRing pct={goalPct} color={goalColor} label="Goal" />
        </div>
        {hover === "goal" && primGoal && (() => {
          const v = calcVelocity(primGoal);
          return (
            <div style={{ position: "absolute", bottom: "110%", right: 0, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 18px", width: 220, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: TEXT, margin: "0 0 8px" }}>{primGoal.title}</p>
              <p style={{ fontSize: 12, color: goalColor, margin: "0 0 4px", fontWeight: 700 }}>£{(primGoal.current_value ?? 0).toLocaleString()} / £{(primGoal.target_value ?? 0).toLocaleString()}</p>
              {v.delta !== null && <p style={{ fontSize: 11, color: v.delta >= 0 ? P.emerald : P.orange, margin: "0 0 2px" }}>{v.delta >= 0 ? "↑ Ahead of pace" : "↓ Behind pace"}</p>}
              {v.daysRemaining !== null && <p style={{ fontSize: 11, color: DIM, margin: 0 }}>{v.daysRemaining} days remaining</p>}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function App() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Advisor");

  // ── Auth & org ──
  const [authUser, setAuthUser] = useState<{ id: string; email?: string } | null>(null);
  const [org,      setOrg]      = useState<OrgRow | null>(null);
  const [members,  setMembers]  = useState<Member[]>([]);
  const [activity, setActivity] = useState<Record<string, unknown>[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteDone, setInviteDone] = useState(false);

  const [ideas,   setIdeas]   = useState<Idea[]>([]);
  const [logs,    setLogs]    = useState<DailyLog[]>([]);
  const [goals,   setGoals]   = useState<Goal[]>([]);
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
  const [todayTodos,     setTodayTodos]     = useState<TodoItem[]>([]);
  const [todoGenerated,  setTodoGenerated]  = useState(false);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [checkedTodos,   setCheckedTodos]   = useState<Set<number>>(new Set());

  // ── Advisor chat ──
  const [advisorView,  setAdvisorView]  = useState<"chat" | "dump" | "library">("chat");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput,    setChatInput]    = useState("");
  const [chatLoading,  setChatLoading]  = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Info dump ──
  const [dumpText,        setDumpText]        = useState("");
  const [dumpEnergy,      setDumpEnergy]      = useState(7);
  const [dumpClarity,     setDumpClarity]     = useState(7);
  const [dumpProcessing,  setDumpProcessing]  = useState(false);
  const [dumpExtractions, setDumpExtractions] = useState<Record<string, unknown>[]>([]);
  const [dumpMeta,        setDumpMeta]        = useState<{ dominant_theme?: string; mental_state_note?: string; do_summary?: string; dont_summary?: string } | null>(null);
  const [savedDumps,      setSavedDumps]      = useState<Record<string, unknown>[]>([]);
  const [worksItems,      setWorksItems]      = useState<Record<string, unknown>[]>([]);
  const [doesntItems,     setDoesntItems]     = useState<Record<string, unknown>[]>([]);
  const [signals,         setSignals]         = useState<Signal[]>([]);
  const [signalForm,      setSignalForm]      = useState({ description: "", strength: 7, source: "market" as Signal["source"], idea_id: "" });
  const [signalSaving,    setSignalSaving]    = useState(false);
  const [platformData,    setPlatformData]    = useState<Record<string, unknown>[]>([]);

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
    if (iR.data)     setIdeas(iR.data);
    if (lR.data)     setLogs(lR.data);
    if (gR.data)     setGoals(gR.data);
    if (pR.data)     { setProfile(pR.data); setProfileForm(pR.data); }
    if (planR.data)  {
      if (planR.data.morning_answers) setMorningAnswers(planR.data.morning_answers);
      if (planR.data.todo_items)      { setTodayTodos(planR.data.todo_items); setTodoGenerated(true); }
    }
    if (dumpR.data)   setSavedDumps(dumpR.data);
    if (worksR.data)  setWorksItems(worksR.data);
    if (doesntR.data) setDoesntItems(doesntR.data);
    if (sigR.data)    setSignals(sigR.data as Signal[]);
    if (platR.data)   setPlatformData(platR.data as Record<string, unknown>[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    getSession().then(async session => {
      if (!session) { router.push("/login"); return; }
      setAuthUser(session.user);
      let currentOrg = await getOrg(session.user.id);
      // If no org yet, create a default one so the app works
      if (!currentOrg) {
        currentOrg = await createOrg("My Workspace", session.user.id);
      }
      if (currentOrg) {
        setOrg(currentOrg);
        const [m, a] = await Promise.all([getMembers(currentOrg.id), getActivity(currentOrg.id)]);
        setMembers(m);
        setActivity(a);
        load(session.user.id, currentOrg.id);
      }
    });
  }, [router, load]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const saveIdea = async () => {
    if (!ideaForm.title.trim() || !authUser || !org) return;
    setIdeaSaving(true);
    const category = categoriseIdea(ideaForm.upside, ideaForm.downside, ideaForm.effort);
    const score    = opportunityScore(ideaForm.upside, ideaForm.downside, ideaForm.effort);
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
      const res  = await fetch("/api/extract-dump", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: dumpText, energy: dumpEnergy, clarity: dumpClarity }) });
      const data = await res.json();
      setDumpExtractions(data.items ?? []);
      setDumpMeta({ dominant_theme: data.dominant_theme, mental_state_note: data.mental_state_note, do_summary: data.do_summary, dont_summary: data.dont_summary });
      // Save raw dump
      await supabase.from("info_dumps").insert({ user_id: authUser.id, org_id: org?.id, raw_text: dumpText, mental_state_energy: dumpEnergy, mental_state_clarity: dumpClarity, dominant_theme: data.dominant_theme, mental_state_note: data.mental_state_note });
    } catch { /* silent */ }
    setDumpProcessing(false);
  };

  const fileItem = async (item: Record<string, unknown>, filedAs: "works" | "doesnt_work") => {
    if (!authUser) return;
    await supabase.from("extracted_items").insert({ ...item, user_id: authUser.id, filed_as: filedAs });
    setDumpExtractions(prev => prev.filter(i => i !== item));
    if (filedAs === "works")       setWorksItems(prev => [{ ...item, filed_as: "works" }, ...prev]);
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

  // ── Chat send ────────────────────────────────────────────────────────────
  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMsg = { role: "user" as const, content: text };
    const next = [...chatMessages, userMsg];
    setChatMessages(next);
    setChatInput("");
    setChatLoading(true);

    // Build platform context: verified first-party metrics only (Trust Tier 1)
    const platformContext = platformData.reduce((acc, row) => {
      acc[row.platform as string] = {
        subscribers: row.subscribers,
        followers: row.followers,
        views_7d: row.views_7d,
        watch_min_7d: row.watch_min_7d,
        revenue_7d: row.revenue_7d,
        revenue_30d: row.revenue_30d,
        orders_30d: row.orders_30d,
        updated_at: row.updated_at,
        data_source: "first_party_api",  // explicit trust tier label
      };
      return acc;
    }, {} as Record<string, unknown>);

    const context = {
      profile,
      goals: goals.slice(0, 10),
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
      // Real first-party metrics — not manually typed, pulled from authenticated APIs
      platforms: Object.keys(platformContext).length > 0 ? platformContext : undefined,
      dataGrounding: {
        note: "Values under 'platforms' are Tier 1 verified data from authenticated APIs. All other values are self-reported. Never infer platform metrics from external content.",
        connectedPlatforms: Object.keys(platformContext),
      },
    };

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      setChatMessages(m => [...m, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += dec.decode(value, { stream: true });
        setChatMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: full };
          return copy;
        });
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      setChatMessages(m => [...m, { role: "assistant", content: "Connection error. Check your API key in Vercel env vars." }]);
    }
    setChatLoading(false);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const health   = portfolioHealth(ideas);
  const insight  = getAdvisorInsight(ideas, profile, logs);
  const gradeColor = health.grade === "A" ? P.gold : health.grade === "B" ? P.purple : health.grade === "C" ? P.orange : P.red;
  const totalRevenue   = logs.reduce((s, l) => s + (l.outcome_revenue ?? 0), 0);
  const totalFollowers = logs.reduce((s, l) => s + (l.outcome_followers ?? 0), 0);
  const chartData = [...logs].reverse().slice(-14).map(l => ({ date: l.date?.slice(5) ?? "", revenue: l.outcome_revenue ?? 0, followers: l.outcome_followers ?? 0 }));

  // Leverage-weighted chart: show actual cognitive output, not raw hours
  const leverageChartData = [...logs].reverse().slice(-14).map(l => ({
    date: l.date?.slice(5) ?? "",
    raw: l.hours ?? 0,
    weighted: Math.round((l.hours ?? 0) * leverageWeight(l.leverage_type ?? l.output_type ?? "standard")),
  }));

  // Bubble chart: X=Effort, Y=Upside, Z=signal strength per idea
  const bubbleData = ideas.map(i => {
    const totalSignal = signals.filter(s => s.idea_id === i.id).reduce((sum, s) => sum + s.strength, 0);
    return { x: i.effort, y: i.upside, z: Math.max(30, totalSignal * 40 + 30), name: i.title, category: i.category ?? "standard", score: opportunityScore(i.upside, i.downside, i.effort), asymScore: calculateAsymmetryScore(i.upside, i.downside, i.effort) };
  });

  // ── Reasoning Engine ─────────────────────────────────────────────────────
  const reasoning = runReasoningEngine(ideas, logs, signals, goals, profile);

  // Dynamic morning questions — Q2 names the top asymmetric idea specifically
  const topIdea = ideas.length > 0
    ? [...ideas].sort((a, b) => calculateAsymmetryScore(b.upside, b.downside, b.effort) - calculateAsymmetryScore(a.upside, a.downside, a.effort))[0]
    : null;
  const MORNING_QS = getMorningQuestions(topIdea?.title);
  const allAnswered = MORNING_QS.every((_, i) => morningAnswers[i]?.trim());

  // Content velocity for goals
  const totalContentUnits = logs.filter(l => ["content","marketing","building"].includes(l.output_type ?? "")).reduce((s, l) => s + (l.output_quantity ?? 0), 0);
  const avgFollowersPerUnit = totalContentUnits > 0 ? totalFollowers / totalContentUnits : 0;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 12px", borderColor: "rgba(255,255,255,0.08)", borderTopColor: P.purple }} />
        <p style={{ fontSize: 13, color: DIM }}>Loading your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: BG, color: TEXT }}>

      {/* ── Sidebar ── */}
      <aside className="desktop-sidebar sidebar-in" style={{
        width: 240, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "rgba(7,7,26,0.92)", borderRight: `1px solid ${BORDER}`,
        backdropFilter: "blur(20px)", position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }}>
        {/* Brand */}
        <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${P.purple}, ${P.violet})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 16px ${P.purple}60` }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L13 4.5V9c0 2.5-2 4.5-5 5.5C5 13.5 3 11.5 3 9V4.5L8 2z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M6 8l1.5 1.5L10.5 6" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.03em" }}>Founder</span>
          </div>

          {/* Profile + grade ring */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", cursor: "default" }} title={`Portfolio Grade: ${health.grade} · ${health.label} · ${health.score}/100`}>
              <GradeRing score={health.score} grade={health.grade} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>{profile?.name ?? "Founder"}</p>
              <p style={{ fontSize: 11, color: gradeColor, margin: 0, fontWeight: 600 }}>Grade {health.grade} · {health.label}</p>
            </div>
          </div>
        </div>

        {/* Nav — split Personal / Org */}
        <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Personal section */}
          <p style={{ fontSize: 9, fontWeight: 800, color: DIM, textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 14px 6px", margin: 0 }}>Personal</p>
          {PERSONAL_TABS.map(t => {
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, border: "none", cursor: "pointer", textAlign: "left", transition: "all 0.15s", background: active ? `${P.purple}20` : "transparent", color: active ? TEXT : DIM, fontWeight: active ? 700 : 500, fontSize: 14, boxShadow: active ? `inset 3px 0 0 ${P.purple}, 0 0 20px ${P.purple}10` : "none" }}>
                <span style={{ fontSize: 15 }}>{TAB_ICONS[t]}</span>
                {t}
                {t === "Today" && todayTodos.length > 0 && <span style={{ marginLeft: "auto", background: checkedTodos.size === todayTodos.length ? P.emerald : P.purple, color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{checkedTodos.size}/{todayTodos.length}</span>}
              </button>
            );
          })}

          {/* Org section */}
          <div style={{ margin: "10px 0 6px", borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px 6px" }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: P.gold, textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>{org?.name ?? "Workspace"}</p>
              {/* Member avatar dots */}
              <div style={{ display: "flex", gap: 3 }}>
                {members.filter(m => m.status === "active").slice(0, 3).map(m => (
                  <div key={m.id} style={{ width: 16, height: 16, borderRadius: "50%", background: m.profile?.avatar_color ?? P.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: "#fff" }}>
                    {(m.profile?.name ?? "?")[0].toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {ORG_TABS.map(t => {
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, border: "none", cursor: "pointer", textAlign: "left", transition: "all 0.15s", background: active ? `${P.gold}15` : "transparent", color: active ? TEXT : DIM, fontWeight: active ? 700 : 500, fontSize: 14, boxShadow: active ? `inset 3px 0 0 ${P.gold}, 0 0 20px ${P.gold}08` : "none" }}>
                <span style={{ fontSize: 15 }}>{TAB_ICONS[t]}</span>
                {t}
                {t === "Idea Lab" && ideas.length > 0 && <span style={{ marginLeft: "auto", background: P.violet + "30", color: P.violet, borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{ideas.length}</span>}
                {t === "Team" && members.length > 0 && <span style={{ marginLeft: "auto", background: `${P.gold}25`, color: P.gold, borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{members.filter(m => m.status === "active").length}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom: integrations link + date */}
        <div style={{ padding: "12px 10px 4px", borderTop: `1px solid ${BORDER}` }}>
          <button
            onClick={() => router.push("/app/integrations")}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 12, border: "none", cursor: "pointer", background: platformData.length > 0 ? `${P.emerald}15` : "rgba(255,255,255,0.03)", color: platformData.length > 0 ? P.emerald : DIM, fontWeight: 600, fontSize: 13, marginBottom: 4 }}
          >
            <span style={{ fontSize: 14 }}>🔌</span>
            Data Connections
            {platformData.length > 0
              ? <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 800, color: P.emerald }}>{platformData.length} LIVE</span>
              : <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: DIM }}>Connect</span>
            }
          </button>
          <div style={{ padding: "8px 14px 12px" }}>
            <p style={{ fontSize: 11, color: DIM, margin: 0 }}>
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
            </p>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(7,7,26,0.95)", borderTop: `1px solid ${BORDER}`,
        backdropFilter: "blur(20px)", padding: "8px 0",
        justifyContent: "space-around", alignItems: "center",
      }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: tab === t ? P.violet : DIM }}>
            <span style={{ fontSize: 20 }}>{TAB_ICONS[t]}</span>
            <span style={{ fontSize: 9, fontWeight: 700 }}>{t}</span>
          </button>
        ))}
        <button onClick={() => router.push("/app/integrations")}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: platformData.length > 0 ? P.emerald : DIM }}>
          <span style={{ fontSize: 20 }}>🔌</span>
          <span style={{ fontSize: 9, fontWeight: 700 }}>Data</span>
        </button>
      </nav>

      {/* ── Main content ── */}
      <main className="main-with-sidebar fade-up" style={{ flex: 1, overflowY: tab === "Advisor" ? "hidden" : "auto", minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* ── Global top bar ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, padding: "10px 20px", borderBottom: `1px solid ${BORDER}`, background: "rgba(7,7,26,0.6)", backdropFilter: "blur(12px)", flexShrink: 0, zIndex: 10 }}>
          {/* Platform live indicators */}
          {platformData.length > 0 && platformData.map((p) => (
            <div key={p.platform as string} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: `${P.emerald}12`, border: `1px solid ${P.emerald}30` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: P.emerald }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: P.emerald, textTransform: "capitalize" }}>{p.platform as string}</span>
              {(p.platform as string) === "shopify" && p.revenue_30d != null && (
                <span style={{ fontSize: 11, color: P.emerald }}>£{Number(p.revenue_30d).toLocaleString()}</span>
              )}
              {(p.platform as string) === "youtube" && p.subscribers != null && (
                <span style={{ fontSize: 11, color: P.emerald }}>{Number(p.subscribers).toLocaleString()} subs</span>
              )}
            </div>
          ))}

          {/* Nav links */}
          {([
            { label: "Advisor",   icon: "🧠", action: () => setTab("Advisor") },
            { label: "Today",     icon: "🎯", action: () => setTab("Today") },
            { label: "Idea Lab",  icon: "💡", action: () => setTab("Idea Lab") },
            { label: "Overview",  icon: "📊", action: () => setTab("Overview") },
            { label: "Goals",     icon: "🏆", action: () => setTab("Goals") },
          ] as { label: Tab; icon: string; action: () => void }[]).map(({ label, icon, action }) => (
            <button key={label} onClick={action}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: tab === label ? `${P.purple}25` : "transparent", color: tab === label ? TEXT : DIM, fontWeight: tab === label ? 700 : 500, fontSize: 12, transition: "all 0.15s" }}>
              <span>{icon}</span>{label}
            </button>
          ))}

          <div style={{ width: 1, height: 18, background: BORDER, margin: "0 4px" }} />

          <button onClick={() => router.push("/app/integrations")}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: `1px solid ${platformData.length > 0 ? P.emerald + "40" : BORDER}`, cursor: "pointer", background: platformData.length > 0 ? `${P.emerald}10` : "transparent", color: platformData.length > 0 ? P.emerald : DIM, fontWeight: 600, fontSize: 12 }}>
            🔌 {platformData.length > 0 ? "Data Live" : "Connect Data"}
          </button>

          <button onClick={async () => { await signOut(); router.push("/login"); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: DIM, fontSize: 12, fontWeight: 500 }}>
            Sign out
          </button>
        </div>

        {/* Tab content — pad non-advisor tabs below the top bar */}
        <div style={{ flex: 1, overflowY: tab === "Advisor" ? "hidden" : "auto", padding: tab === "Advisor" ? 0 : "36px 40px", display: "flex", flexDirection: "column" }}>

        {/* ═══════ ADVISOR ═══════ */}
        {tab === "Advisor" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
            {/* Header + sub-nav */}
            <div style={{ padding: "16px 32px 0", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em", margin: 0 }}>🧠 Founder Advisor</h1>
                  <p style={{ fontSize: 12, color: DIM, margin: "3px 0 0" }}>Asymmetric intelligence · Objective · Knows your full context</p>
                </div>
                {advisorView === "dump" && dumpExtractions.length > 0 && (
                  <span style={{ fontSize: 12, color: P.violet, fontWeight: 700 }}>{dumpExtractions.length} extractions ready</span>
                )}
              </div>
              {/* Sub-nav tabs */}
              <div style={{ display: "flex", gap: 0 }}>
                {(["chat", "dump", "library"] as const).map(v => (
                  <button key={v} onClick={() => setAdvisorView(v)}
                    style={{ padding: "9px 20px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: advisorView === v ? TEXT : DIM, borderBottom: `2px solid ${advisorView === v ? P.purple : "transparent"}`, transition: "all 0.15s", textTransform: "capitalize" }}>
                    {v === "chat" ? "💬 Chat" : v === "dump" ? "📥 Info Dump" : `📚 Library (${worksItems.length + doesntItems.length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* ── CHAT VIEW ── */}
            {advisorView === "chat" && (<>
              <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
                {chatMessages.length === 0 && (
                  <div style={{ margin: "auto", maxWidth: 560, textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
                    <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 10px" }}>What do you want to solve?</h2>
                    <p style={{ fontSize: 14, color: DIM, lineHeight: 1.7, margin: "0 0 28px" }}>I know your ideas, goals, logs, and portfolio. I&apos;ll challenge bad decisions and back asymmetric ones.</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, textAlign: "left" }}>
                      {["What should I focus on today?","Am I on track to hit my goals?","What's the biggest risk in my portfolio?","Where am I wasting the most time?","Which idea has the most asymmetric upside?","What would you cut from my portfolio right now?"].map(q => (
                        <button key={q} onClick={() => setChatInput(q)}
                          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 16px", color: TEXT, fontSize: 13, cursor: "pointer", textAlign: "left", lineHeight: 1.4, transition: "all 0.15s" }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = P.violet + "60")}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 12 }}>
                    {m.role === "assistant" && <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${P.purple}, ${P.violet})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginTop: 2 }}>🧠</div>}
                    <div style={{ maxWidth: "70%", padding: "13px 18px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? `linear-gradient(135deg, ${P.purple}DD, ${P.purple})` : "rgba(255,255,255,0.06)", border: `1px solid ${m.role === "user" ? P.purple + "50" : BORDER}`, fontSize: 14, color: TEXT, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {m.content || <span style={{ color: DIM, fontStyle: "italic" }}>Thinking...</span>}
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>
              <div style={{ padding: "16px 32px 24px", borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end", maxWidth: 900, margin: "0 auto" }}>
                  <textarea rows={2} style={{ ...inputSt, flex: 1, resize: "none", fontFamily: "inherit", fontSize: 14, lineHeight: 1.6, padding: "12px 18px" }} placeholder="Ask anything — strategy, prioritisation, idea validation, goal analysis..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }} />
                  <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ height: 52, width: 52, borderRadius: 14, border: "none", background: chatLoading || !chatInput.trim() ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg, ${P.purple}, ${P.violet})`, color: "#fff", cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer", fontSize: 20, flexShrink: 0, boxShadow: chatInput.trim() ? `0 4px 20px ${P.purple}50` : "none", transition: "all 0.15s" }}>
                    {chatLoading ? "…" : "↑"}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: DIM, margin: "8px 0 0", textAlign: "center" }}>Enter to send · Shift+Enter for new line</p>
              </div>
            </>)}

            {/* ── INFO DUMP VIEW ── */}
            {advisorView === "dump" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Capture */}
                <Card style={{ padding: 28 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 6px" }}>📥 Capture</h3>
                  <p style={{ fontSize: 13, color: DIM, margin: "0 0 16px", lineHeight: 1.6 }}>Dump anything here — thoughts, research, ideas, notes, numbers. No structure needed. The AI will extract, score, and categorise everything.</p>
                  <textarea rows={8} style={{ ...inputSt, resize: "vertical", fontFamily: "inherit", fontSize: 14, lineHeight: 1.7 }} placeholder="e.g. I keep thinking about launching a personal brand. We have 150k followers and cars get insane engagement. I spoke to a guy who does luxury car content and earns £20k/month from brand deals alone. But I'm worried about time — building this app is already taking all my focus. Maybe we should just post 3 videos this week and see what happens..." value={dumpText} onChange={e => setDumpText(e.target.value)} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, margin: "16px 0" }}>
                    {[{ label: "Energy", val: dumpEnergy, set: setDumpEnergy, color: P.emerald }, { label: "Clarity", val: dumpClarity, set: setDumpClarity, color: P.cyan }].map(s => (
                      <div key={s.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label} when writing</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.val}/10</span>
                        </div>
                        <input type="range" min={1} max={10} value={s.val} onChange={e => s.set(+e.target.value)} style={{ width: "100%", accentColor: s.color }} />
                      </div>
                    ))}
                  </div>
                  <button onClick={processDump} disabled={dumpProcessing || !dumpText.trim()}
                    style={{ width: "100%", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 800, color: "#fff", cursor: dumpProcessing || !dumpText.trim() ? "not-allowed" : "pointer", opacity: dumpProcessing || !dumpText.trim() ? 0.5 : 1, background: `linear-gradient(135deg, ${P.purple}CC, ${P.purple})`, boxShadow: `0 4px 20px ${P.purple}40`, transition: "all 0.15s" }}>
                    {dumpProcessing ? "Extracting..." : "Extract & Score →"}
                  </button>
                </Card>

                {/* Meta insight */}
                {dumpMeta && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[{ label: "You're thinking about", val: dumpMeta.dominant_theme, color: P.violet }, { label: "Mental state note", val: dumpMeta.mental_state_note, color: P.cyan }, { label: "Biggest DO", val: dumpMeta.do_summary, color: P.emerald }, { label: "Biggest DON'T", val: dumpMeta.dont_summary, color: P.red }].map(s => s.val && (
                      <div key={s.label} style={{ padding: "14px 18px", borderRadius: 14, background: `${s.color}10`, border: `1px solid ${s.color}30` }}>
                        <p style={{ fontSize: 10, fontWeight: 800, color: s.color, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>{s.label}</p>
                        <p style={{ fontSize: 13, color: TEXT, margin: 0, lineHeight: 1.6 }}>{s.val}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Extractions */}
                {dumpExtractions.length > 0 && (
                  <Card style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 6px" }}>Extractions — file each one</h3>
                    <p style={{ fontSize: 12, color: DIM, margin: "0 0 18px" }}>File to Works/Doesn&apos;t Work to build your knowledge library. Save the best ones to Idea Lab.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {dumpExtractions.map((item, i) => {
                        const cat = item.category as string;
                        const meta = CAT[cat] ?? CAT.standard;
                        const score = item.score as number;
                        return (
                          <div key={i} style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: `1px solid ${item.verdict === "do" ? meta.color + "40" : BORDER}` }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                              <ScoreRing score={score} color={meta.color} size={44} />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                                  <Badge label={meta.label} color={meta.color} />
                                  <Badge label={item.verdict === "do" ? "DO" : "DON'T"} color={item.verdict === "do" ? P.emerald : P.red} />
                                  <span style={{ fontSize: 11, color: DIM, textTransform: "capitalize" }}>{item.type as string}</span>
                                </div>
                                <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>{item.content as string}</p>
                                <p style={{ fontSize: 12, color: DIM, margin: 0, fontStyle: "italic" }}>{item.verdict_reason as string}</p>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button onClick={() => fileItem(item, "works")} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${P.emerald}40`, background: `${P.emerald}10`, color: P.emerald, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Works</button>
                              <button onClick={() => fileItem(item, "doesnt_work")} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${P.red}40`, background: `${P.red}10`, color: P.red, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✗ Doesn&apos;t Work</button>
                              {(item.verdict as string) === "do" && <button onClick={() => saveItemToLab(item)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${P.purple}40`, background: `${P.purple}10`, color: P.violet, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>💡 Save to Idea Lab</button>}
                              <button onClick={() => setDumpExtractions(prev => prev.filter((_, j) => j !== i))} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: DIM, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Discard</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* ── LIBRARY VIEW ── */}
            {advisorView === "library" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  {[{ label: "What Works", items: worksItems, color: P.emerald, icon: "✓" }, { label: "What Doesn't Work", items: doesntItems, color: P.red, icon: "✗" }].map(section => (
                    <div key={section.label}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${section.color}20`, border: `1px solid ${section.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: section.color, fontWeight: 800 }}>{section.icon}</div>
                        <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: section.color }}>{section.label}</h3>
                        <span style={{ fontSize: 11, color: DIM, marginLeft: "auto" }}>{section.items.length} items</span>
                      </div>
                      {section.items.length === 0 ? (
                        <div style={{ padding: 24, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, textAlign: "center" }}>
                          <p style={{ fontSize: 13, color: DIM, margin: 0 }}>File items from Info Dump to build this library.</p>
                          {section.items.length === 0 && worksItems.length + doesntItems.length < 3 && <p style={{ fontSize: 11, color: DIM, margin: "6px 0 0" }}>Patterns unlock after 3+ items. Philosophies after patterns converge.</p>}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {section.items.map((item, i) => (
                            <div key={i} style={{ padding: "12px 16px", borderRadius: 12, background: `${section.color}08`, border: `1px solid ${section.color}25` }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "0 0 4px" }}>{item.content as string}</p>
                              <p style={{ fontSize: 11, color: DIM, margin: 0, fontStyle: "italic" }}>{item.verdict_reason as string}</p>
                            </div>
                          ))}
                          {section.items.length >= 3 && (
                            <div style={{ padding: "12px 16px", borderRadius: 12, background: `${P.gold}10`, border: `1px solid ${P.gold}30`, marginTop: 4 }}>
                              <p style={{ fontSize: 11, fontWeight: 800, color: P.gold, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Pattern emerging</p>
                              <p style={{ fontSize: 12, color: DIM, margin: 0 }}>Add {Math.max(0, 3 - section.items.length)} more items to unlock pattern synthesis · Philosophy generation unlocks at 2+ patterns</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Past dumps */}
                {savedDumps.length > 0 && (
                  <div style={{ marginTop: 32 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 14px", color: DIM }}>Past Dumps ({savedDumps.length})</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {savedDumps.map((d, i) => (
                        <div key={i} style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <p style={{ fontSize: 13, color: TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{(d.raw_text as string).slice(0, 80)}...</p>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: P.emerald }}>⚡{d.mental_state_energy as number}</span>
                            <span style={{ fontSize: 11, color: P.cyan }}>🎯{d.mental_state_clarity as number}</span>
                            <span style={{ fontSize: 11, color: DIM }}>{new Date(d.created_at as string).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════ TODAY ═══════ */}
        {tab === "Today" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
            <div>
              <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>
                {profile?.name ? `Good morning, ${profile.name.split(" ")[0]} 👋` : "Good morning 👋"}
              </h1>
              <p style={{ fontSize: 14, color: DIM, marginTop: 8 }}>{insight}</p>
            </div>

            {/* Runway mode indicator */}
            <div style={{ padding: "10px 18px", borderRadius: 12, background: `${reasoning.runwayLabel.color}15`, border: `1px solid ${reasoning.runwayLabel.color}35`, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: reasoning.runwayLabel.color, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>{reasoning.runwayLabel.label}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{reasoning.runwayLabel.action}</span>
              {reasoning.topRecommendation && <span style={{ marginLeft: "auto", fontSize: 11, color: reasoning.runwayLabel.color, fontWeight: 700, flexShrink: 0 }}>↑ {reasoning.topRecommendation}</span>}
            </div>

            {/* Strategy Alerts (Reasoning Engine) */}
            {reasoning.strategyAlerts.map((a, i) => (
              <div key={i} style={{ padding: "14px 20px", borderRadius: 14, background: a.level === "red" ? `${P.red}15` : `${P.orange}15`, border: `1px solid ${a.level === "red" ? P.red : P.orange}40`, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{a.level === "red" ? "🚨" : "⚠️"}</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: a.level === "red" ? P.red : P.orange, margin: 0, lineHeight: 1.6 }}>{a.msg}</p>
              </div>
            ))}

            {/* Zombie projects */}
            {reasoning.zombies.length > 0 && (
              <div style={{ padding: "18px 20px", borderRadius: 14, background: "rgba(139,92,246,0.08)", border: `1px solid ${P.violet}30` }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: P.violet, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>🧟 Zombie Projects Detected</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {reasoning.zombies.map((z, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>{z.idea.title}</p>
                        <p style={{ fontSize: 11, color: DIM, margin: 0 }}>{z.hoursSpent.toFixed(0)}h logged · 0 market signals · Signal/Noise = 0</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: P.red, background: `${P.red}15`, border: `1px solid ${P.red}30`, borderRadius: 8, padding: "4px 10px" }}>Kill?</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time allocation alert (persistent red if 80%+) */}
            {reasoning.timeAllocation.isAlert && (
              <div style={{ padding: "14px 20px", borderRadius: 14, background: `${P.red}20`, border: `2px solid ${P.red}60`, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 20 }}>⛔</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: P.red, margin: "0 0 3px" }}>80% TIME MISALLOCATION</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: 0 }}>{reasoning.timeAllocation.pct.toFixed(0)}% of your {reasoning.timeAllocation.totalHours}h logged are on low-asymmetry bets (score &lt; 5). You are optimising inside the wrong box.</p>
                </div>
              </div>
            )}

            {/* Insight banner */}
            <Card style={{ padding: "20px 24px", background: `linear-gradient(135deg, #2D0B6B, ${P.purple}CC)`, border: `1px solid ${P.purple}50`, boxShadow: `0 0 40px ${P.purple}20` }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: P.violet, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Today&apos;s Insight</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0, lineHeight: 1.6 }}>{insight}</p>
            </Card>

            {/* Morning check-in */}
            {!todoGenerated ? (
              <Card style={{ padding: 28 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 6px" }}>Morning check-in</h3>
                <p style={{ fontSize: 12, color: DIM, margin: "0 0 24px" }}>Answer honestly — this shapes your ranked to-do list.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {MORNING_QS.map((q, i) => (
                    <div key={i}>
                      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                        <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0, marginTop: 1, background: morningAnswers[i]?.trim() ? P.emerald : P.purple }}>{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, lineHeight: 1.5 }}>{q}</span>
                      </label>
                      <textarea rows={2} style={{ ...inputSt, resize: "none", fontFamily: "inherit" }} placeholder="Be honest..."
                        value={morningAnswers[i] ?? ""} onChange={e => setMorningAnswers(p => ({ ...p, [i]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 24 }}>
                  <SubmitBtn onClick={generateTodo} loading={advisorLoading}
                    disabled={!allAnswered}
                    label={!allAnswered ? "Answer all 5 questions to unlock" : "Generate my plan →"} />
                </div>
              </Card>
            ) : (
              <Card style={{ padding: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Today&apos;s Plan — ranked by opportunity</h3>
                  <button onClick={() => { setTodoGenerated(false); setCheckedTodos(new Set()); }}
                    style={{ background: "none", border: "none", color: DIM, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Redo check-in</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {todayTodos.map((t, i) => {
                    const done = checkedTodos.has(i);
                    const meta = CAT[t.category ?? "standard"];
                    return (
                      <div key={i} className={done ? "celeb" : ""} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 18px", borderRadius: 14, background: done ? "rgba(255,255,255,0.02)" : i === 0 ? `${P.purple}18` : "rgba(255,255,255,0.04)", border: `1px solid ${done ? BORDER : i === 0 ? `${P.purple}45` : BORDER}`, boxShadow: i === 0 && !done ? `0 0 20px ${P.purple}18` : "none", opacity: done ? 0.4 : 1, transition: "all 0.2s" }}>
                        <input type="checkbox" checked={done} onChange={() => setCheckedTodos(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; })} style={{ marginTop: 3, accentColor: P.purple, cursor: "pointer" }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0, textDecoration: done ? "line-through" : "none" }}>{t.task}</p>
                          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                            <Badge label={t.priority} color={t.priority === "high" ? P.purple : t.priority === "medium" ? P.cyan : DIM} />
                            {t.estimated_time && <span style={{ fontSize: 11, color: DIM }}>⏱ {t.estimated_time}</span>}
                            {meta && <Badge label={meta.label} color={meta.color} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: 12, color: DIM, marginTop: 14 }}>
                  {checkedTodos.size}/{todayTodos.length} complete
                  {checkedTodos.size === todayTodos.length && todayTodos.length > 0 ? " · Legendary day. 🏆" : ""}
                </p>
              </Card>
            )}
          </div>
        )}

        {/* ═══════ IDEA LAB ═══════ */}
        {tab === "Idea Lab" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Idea Lab</h1>
              <p style={{ fontSize: 13, color: DIM, marginTop: 8 }}>Score every idea on upside, risk, and effort. The matrix shows where asymmetry lives.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <Card style={{ padding: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 20px" }}>Log a new idea</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div><SLabel>Idea title</SLabel><input style={inputSt} placeholder="e.g. Premium car fragrance brand" value={ideaForm.title} onChange={e => setIdeaForm(f => ({ ...f, title: e.target.value }))} /></div>
                  <div><SLabel>Description (optional)</SLabel><textarea rows={2} style={{ ...inputSt, resize: "none", fontFamily: "inherit" }} placeholder="Brief description..." value={ideaForm.description} onChange={e => setIdeaForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <Slider label="Upside" value={ideaForm.upside} onChange={v => setIdeaForm(f => ({ ...f, upside: v }))} color={P.emerald} desc="How big is the potential reward?" />
                  <Slider label="Downside / Risk" value={ideaForm.downside} onChange={v => setIdeaForm(f => ({ ...f, downside: v }))} color={P.red} desc="How bad if it fails?" />
                  <Slider label="Effort" value={ideaForm.effort} onChange={v => setIdeaForm(f => ({ ...f, effort: v }))} color={P.orange} desc="Time and energy required" />
                  <div>
                    <SLabel>Pre-mortem — how does this fail?</SLabel>
                    <textarea rows={2} style={{ ...inputSt, resize: "none", fontFamily: "inherit", borderColor: `${P.red}40` }} placeholder="Be brutally honest. What's the most likely reason this doesn't work?" value={(ideaForm as { pre_mortem?: string }).pre_mortem ?? ""} onChange={e => setIdeaForm(f => ({ ...f, pre_mortem: e.target.value } as typeof f & { pre_mortem: string }))} />
                  </div>
                  {(() => {
                    const cat = categoriseIdea(ideaForm.upside, ideaForm.downside, ideaForm.effort);
                    const score = opportunityScore(ideaForm.upside, ideaForm.downside, ideaForm.effort);
                    const kelly = kellyHours(ideaForm.upside, ideaForm.downside, ideaForm.effort);
                    const meta = CAT[cat];
                    return (
                      <div style={{ padding: "14px 18px", borderRadius: 14, background: `${meta.color}10`, border: `1px solid ${meta.color}35`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>{meta.label}</p>
                          <p style={{ fontSize: 11, color: DIM, margin: "0 0 4px" }}>{meta.desc}</p>
                          <p style={{ fontSize: 11, color: DIM, margin: 0 }}>Kelly: <span style={{ color: meta.color, fontWeight: 700 }}>{kelly} hrs/week</span></p>
                        </div>
                        <ScoreRing score={score} color={meta.color} size={52} />
                      </div>
                    );
                  })()}
                  <SubmitBtn onClick={saveIdea} loading={ideaSaving} disabled={!ideaForm.title.trim()} label="Log this idea →" />
                </div>
              </Card>

              <Card style={{ padding: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Priority Matrix</h3>
                <p style={{ fontSize: 12, color: DIM, margin: "4px 0 20px" }}>Effort (X) vs Upside (Y) — bubble size = low risk</p>
                {bubbleData.length === 0
                  ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 260, color: DIM, fontSize: 13 }}>Log ideas to see your matrix</div>
                  : <ResponsiveContainer width="100%" height={280}>
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="x" type="number" domain={[0, 11]} tick={AXIS} axisLine={false} tickLine={false} label={{ value: "Effort →", position: "insideBottom", offset: -10, fill: DIM, fontSize: 11 }} />
                        <YAxis dataKey="y" type="number" domain={[0, 11]} tick={AXIS} axisLine={false} tickLine={false} label={{ value: "Upside ↑", angle: -90, position: "insideLeft", fill: DIM, fontSize: 11 }} />
                        <ZAxis dataKey="z" range={[60, 500]} />
                        <Tooltip cursor={false} content={({ payload }) => {
                          if (!payload?.[0]) return null;
                          const d = payload[0].payload;
                          const meta = CAT[d.category];
                          return <div style={{ background: "#0C0C20", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 14px" }}>
                            <p style={{ fontWeight: 800, fontSize: 13, color: TEXT, margin: "0 0 4px" }}>{d.name}</p>
                            <Badge label={meta.label} color={meta.color} />
                            <p style={{ fontSize: 11, color: DIM, marginTop: 6 }}>Score: {d.score}/10</p>
                          </div>;
                        }} />
                        {Object.entries(CAT).map(([cat, meta]) => (
                          <Scatter key={cat} data={bubbleData.filter(d => d.category === cat)} fill={meta.color} fillOpacity={0.8} />
                        ))}
                      </ScatterChart>
                    </ResponsiveContainer>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {Object.entries(CAT).map(([k, m]) => <Badge key={k} label={m.label} color={m.color} />)}
                </div>
              </Card>
            </div>

            {ideas.length > 0 && (
              <Card style={{ padding: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 6px" }}>All Ideas — ranked by asymmetry score</h3>
                <p style={{ fontSize: 12, color: DIM, margin: "0 0 20px" }}>Asymmetry = (Upside×2) − (Downside×1.5) − (Effort×0.5) · Bubble size = signal strength</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...ideas].sort((a, b) => calculateAsymmetryScore(b.upside, b.downside, b.effort) - calculateAsymmetryScore(a.upside, a.downside, a.effort)).map((idea, i) => {
                    const meta = CAT[idea.category ?? "standard"];
                    const score = opportunityScore(idea.upside, idea.downside, idea.effort);
                    const asymScore = calculateAsymmetryScore(idea.upside, idea.downside, idea.effort);
                    const normScore = normalizedAsymmetryScore(idea.upside, idea.downside, idea.effort);
                    const kelly = kellyHours(idea.upside, idea.downside, idea.effort);
                    const ideaSignals = signals.filter(s => s.idea_id === idea.id);
                    const totalSignal = ideaSignals.reduce((s, sig) => s + sig.strength, 0);
                    const snRatio = idea.id ? signalToNoise(idea.id, logs, signals) : 0;
                    const hoursLogged = logs.filter(l => l.related_idea_id === idea.id).reduce((s, l) => s + (l.hours ?? 0), 0);
                    return (
                      <div key={idea.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 14, background: i === 0 ? `${P.purple}12` : "rgba(255,255,255,0.03)", border: `1px solid ${i === 0 ? `${P.purple}40` : BORDER}` }}>
                        <span style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0, marginTop: 2, background: i === 0 ? P.purple : "rgba(255,255,255,0.1)" }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, color: TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{idea.title}</p>
                          <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11, color: DIM, flexWrap: "wrap" }}>
                            <span style={{ color: P.emerald }}>↑{idea.upside}</span>
                            <span style={{ color: P.red }}>↓{idea.downside}</span>
                            <span style={{ color: P.orange }}>⚙{idea.effort}</span>
                            <span style={{ color: P.cyan }}>Kelly: {kelly}h/wk</span>
                            {hoursLogged > 0 && <span style={{ color: DIM }}>⏱ {hoursLogged.toFixed(0)}h logged</span>}
                            {totalSignal > 0 && <span style={{ color: P.emerald }}>📡 S/N: {snRatio.toFixed(2)}</span>}
                            {hoursLogged > 0 && totalSignal === 0 && <span style={{ color: P.red }}>🧟 No signal</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: "center", flexShrink: 0 }}>
                          <div style={{ fontSize: 10, color: DIM, marginBottom: 2 }}>asym</div>
                          <div style={{ fontSize: 14, fontWeight: 900, color: asymScore >= 5 ? P.emerald : asymScore >= 0 ? P.orange : P.red }}>{asymScore.toFixed(1)}</div>
                        </div>
                        <Badge label={meta.label} color={meta.color} />
                        <ScoreRing score={score} color={meta.color} size={40} />
                        <button onClick={() => idea.id && deleteIdea(idea.id)} style={{ background: "none", border: "none", color: DIM, cursor: "pointer", fontSize: 16, marginTop: 2 }}>×</button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
            {/* Signal capture */}
            <Card style={{ padding: 28 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 6px" }}>📡 Market Signal</h3>
              <p style={{ fontSize: 12, color: DIM, margin: "0 0 18px", lineHeight: 1.6 }}>Log a signal from the market — customer feedback, competitor move, or real-world data. Signals feed the Signal/Noise ratio per idea and help identify zombies.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div><SLabel>Signal description</SLabel>
                  <input style={inputSt} placeholder="e.g. 3 DMs asking when the fragrance launches" value={signalForm.description} onChange={e => setSignalForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div><SLabel>Strength (1–10)</SLabel>
                    <input type="number" min={1} max={10} style={inputSt} value={signalForm.strength} onChange={e => setSignalForm(f => ({ ...f, strength: Math.min(10, Math.max(1, +e.target.value)) }))} />
                  </div>
                  <div><SLabel>Source</SLabel>
                    <select style={{ ...inputSt, fontFamily: "inherit" }} value={signalForm.source ?? "market"} onChange={e => setSignalForm(f => ({ ...f, source: e.target.value as Signal["source"] }))}>
                      {["market","customer","competitor","internal"].map(s => <option key={s} style={{ background: SURFACE }}>{s}</option>)}
                    </select>
                  </div>
                  <div><SLabel>Linked idea</SLabel>
                    <select style={{ ...inputSt, fontFamily: "inherit" }} value={signalForm.idea_id} onChange={e => setSignalForm(f => ({ ...f, idea_id: e.target.value }))}>
                      <option value="" style={{ background: SURFACE }}>— General signal —</option>
                      {ideas.map(i => <option key={i.id} value={i.id} style={{ background: SURFACE }}>{i.title}</option>)}
                    </select>
                  </div>
                </div>
                <SubmitBtn onClick={saveSignal} loading={signalSaving} disabled={!signalForm.description.trim()} label="Log signal →" color={P.cyan} />
              </div>
              {signals.length > 0 && (
                <div style={{ marginTop: 20, borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Recent Signals</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {signals.slice(0, 5).map((s, i) => {
                      const linkedIdea = ideas.find(id => id.id === s.idea_id);
                      return (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: s.strength >= 7 ? P.emerald : s.strength >= 4 ? P.cyan : P.orange, background: `${s.strength >= 7 ? P.emerald : s.strength >= 4 ? P.cyan : P.orange}15`, borderRadius: 6, padding: "2px 7px" }}>{s.strength}/10</span>
                          <p style={{ flex: 1, fontSize: 12, color: TEXT, margin: 0 }}>{s.description}</p>
                          {linkedIdea && <span style={{ fontSize: 10, color: DIM, flexShrink: 0 }}>{linkedIdea.title.slice(0, 20)}</span>}
                          <Badge label={s.source ?? "market"} color={P.violet} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ═══════ OVERVIEW ═══════ */}
        {tab === "Overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Overview</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {[
                { label: "Total Ideas", value: ideas.length, sub: `${ideas.filter(i=>i.category==="asymmetric").length} asymmetric`, color: P.violet },
                { label: "Revenue (30d)", value: `£${totalRevenue.toLocaleString()}`, sub: "logged outcomes", color: P.emerald },
                { label: "Followers", value: totalFollowers.toLocaleString(), sub: "last 30 days", color: P.cyan },
                { label: "Portfolio", value: `${health.grade}`, sub: `${health.label} · ${health.score}/100`, color: gradeColor },
              ].map(s => (
                <div key={s.label} style={{ padding: "20px 22px", borderRadius: 20, background: `linear-gradient(135deg, ${s.color}18, ${s.color}06)`, border: `1px solid ${s.color}35`, boxShadow: `0 0 28px ${s.color}12` }}>
                  <p style={{ color: s.color, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px" }}>{s.label}</p>
                  <p style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", margin: 0, background: `linear-gradient(135deg, ${s.color}, ${s.color}AA)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: DIM, marginTop: 6 }}>{s.sub}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <Card style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 20px" }}>Idea Breakdown</h3>
                {Object.entries(CAT).map(([key, meta]) => {
                  const count = ideas.filter(i => i.category === key).length;
                  const pct = ideas.length > 0 ? (count / ideas.length) * 100 : 0;
                  return (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                        <span style={{ fontSize: 12, color: DIM }}>{count}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 6, background: "rgba(255,255,255,0.06)" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: meta.color, borderRadius: 6, boxShadow: `0 0 8px ${meta.color}60`, transition: "width 0.8s" }} />
                      </div>
                    </div>
                  );
                })}
              </Card>
              <Card style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 20px" }}>Revenue + Followers (14d)</h3>
                {chartData.length === 0
                  ? <p style={{ fontSize: 13, color: DIM }}>Log daily output to see data.</p>
                  : <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartData}>
                        <CartesianGrid {...GRID} />
                        <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} />
                        <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                        <Tooltip {...TOOLTIP} />
                        <Line type="monotone" dataKey="revenue" stroke={P.emerald} strokeWidth={2} dot={false} name="Revenue £" />
                        <Line type="monotone" dataKey="followers" stroke={P.violet} strokeWidth={2} dot={false} name="Followers" />
                      </LineChart>
                    </ResponsiveContainer>}
              </Card>
            </div>
          </div>
        )}

        {/* ═══════ DAILY LOG ═══════ */}
        {tab === "Daily Log" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Daily Log</h1>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <Card style={{ padding: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 20px" }}>Log today&apos;s output</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Leverage type — the single most important field */}
                  <div>
                    <SLabel>Leverage type</SLabel>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      {Object.entries(LEVERAGE_MULTIPLIER).map(([type, mult]) => (
                        <button key={type} onClick={() => setLogForm(f => ({ ...f, leverage_type: type, output_type: type }))}
                          style={{ padding: "8px 6px", borderRadius: 10, border: `1px solid ${logForm.leverage_type === type ? (mult >= 2 ? P.emerald : mult >= 1 ? P.cyan : P.red) + "80" : BORDER}`, background: logForm.leverage_type === type ? (mult >= 2 ? P.emerald : mult >= 1 ? P.cyan : P.red) + "18" : "transparent", cursor: "pointer", fontSize: 11, fontWeight: 800, color: logForm.leverage_type === type ? TEXT : DIM, transition: "all 0.1s" }}>
                          <div style={{ fontSize: 9, color: logForm.leverage_type === type ? (mult >= 2 ? P.emerald : mult >= 1 ? P.cyan : P.red) : DIM, marginBottom: 2 }}>{mult}×</div>
                          {type.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                    {logForm.leverage_type && (
                      <p style={{ fontSize: 11, color: DIM, marginTop: 5 }}>
                        Leverage weight: <span style={{ color: LEVERAGE_MULTIPLIER[logForm.leverage_type] >= 2 ? P.emerald : LEVERAGE_MULTIPLIER[logForm.leverage_type] >= 1 ? P.cyan : P.red, fontWeight: 800 }}>{LEVERAGE_MULTIPLIER[logForm.leverage_type]}×</span>
                        {" · "}Effective output: <span style={{ color: TEXT, fontWeight: 700 }}>{(logForm.hours * LEVERAGE_MULTIPLIER[logForm.leverage_type]).toFixed(1)} leverage-hours</span>
                      </p>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><SLabel>Hours spent</SLabel><input type="number" step={0.5} style={inputSt} value={logForm.hours} onChange={e => setLogForm(f => ({ ...f, hours: +e.target.value }))} /></div>
                    <div><SLabel>Output unit</SLabel>
                      <select style={{ ...inputSt, fontFamily: "inherit" }} value={logForm.output_unit} onChange={e => setLogForm(f => ({ ...f, output_unit: e.target.value }))}>
                        {["hours","videos","posts","calls","tasks","pages"].map(u => <option key={u} style={{ background: SURFACE }}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><SLabel>What did you do?</SLabel><input style={inputSt} placeholder="e.g. Filmed 3 TikToks for Brick Whips" value={logForm.output_description} onChange={e => setLogForm(f => ({ ...f, output_description: e.target.value }))} /></div>
                  <div><SLabel>Linked idea (optional)</SLabel>
                    <select style={{ ...inputSt, fontFamily: "inherit" }} value={logForm.related_idea_id} onChange={e => setLogForm(f => ({ ...f, related_idea_id: e.target.value }))}>
                      <option value="" style={{ background: SURFACE }}>— Not linked to an idea —</option>
                      {ideas.map(i => <option key={i.id} value={i.id} style={{ background: SURFACE }}>{i.title}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><SLabel>Revenue (£)</SLabel><input type="number" style={inputSt} value={logForm.outcome_revenue} onChange={e => setLogForm(f => ({ ...f, outcome_revenue: +e.target.value }))} /></div>
                    <div><SLabel>New followers</SLabel><input type="number" style={inputSt} value={logForm.outcome_followers} onChange={e => setLogForm(f => ({ ...f, outcome_followers: +e.target.value }))} /></div>
                  </div>
                  <div><SLabel>Notes</SLabel><textarea rows={2} style={{ ...inputSt, resize: "none", fontFamily: "inherit" }} placeholder="How did it feel? Any signals from the market?" value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <p style={{ fontSize: 11, color: P.emerald, margin: 0 }}>⚡ Revenue + followers auto-update goals · Leverage hours feed the Reasoning Engine</p>
                  <SubmitBtn onClick={saveLog} loading={logSaving} label="Log today →" color={P.emerald} />
                </div>
              </Card>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Card style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 16px" }}>Revenue over time</h3>
                  {chartData.length === 0 ? <p style={{ fontSize: 13, color: DIM }}>No logs yet.</p>
                    : <ResponsiveContainer width="100%" height={150}><BarChart data={chartData}><CartesianGrid {...GRID} /><XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} /><YAxis tick={AXIS} axisLine={false} tickLine={false} /><Tooltip {...TOOLTIP} /><Bar dataKey="revenue" fill={P.emerald} radius={[4,4,0,0]} name="Revenue £" /></BarChart></ResponsiveContainer>}
                </Card>
                <Card style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 16px" }}>Follower growth</h3>
                  {chartData.length === 0 ? <p style={{ fontSize: 13, color: DIM }}>No logs yet.</p>
                    : <ResponsiveContainer width="100%" height={130}><LineChart data={chartData}><CartesianGrid {...GRID} /><XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} /><YAxis tick={AXIS} axisLine={false} tickLine={false} /><Tooltip {...TOOLTIP} /><Line type="monotone" dataKey="followers" stroke={P.violet} strokeWidth={2} dot={{ r: 3, fill: P.violet }} name="Followers" /></LineChart></ResponsiveContainer>}
                </Card>
                <Card style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px" }}>Leverage Output (14d)</h3>
                  <p style={{ fontSize: 11, color: DIM, margin: "0 0 16px" }}>Weighted hours · Deep Work = 3× · Admin = 0.5×</p>
                  {leverageChartData.every(d => d.raw === 0) ? <p style={{ fontSize: 13, color: DIM }}>Log hours to see leverage data.</p>
                    : <ResponsiveContainer width="100%" height={130}>
                        <BarChart data={leverageChartData}>
                          <CartesianGrid {...GRID} />
                          <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} />
                          <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                          <Tooltip {...TOOLTIP} />
                          <Bar dataKey="raw"      fill={DIM}      radius={[3,3,0,0]} name="Raw hours" />
                          <Bar dataKey="weighted" fill={P.emerald} radius={[3,3,0,0]} name="Leverage hours" />
                        </BarChart>
                      </ResponsiveContainer>}
                </Card>
                {logs.length > 0 && (
                  <Card style={{ padding: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 800, margin: "0 0 12px" }}>Recent</h3>
                    {logs.slice(0, 6).map(l => (
                      <div key={l.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${BORDER}` }}>
                        <span style={{ fontSize: 11, color: DIM, width: 36, flexShrink: 0 }}>{l.date?.slice(5)}</span>
                        <Badge label={l.output_type ?? ""} color={P.violet} />
                        <p style={{ flex: 1, fontSize: 12, color: TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.output_description}</p>
                        <span style={{ fontSize: 11, fontWeight: 700, color: P.emerald, flexShrink: 0 }}>£{l.outcome_revenue}</span>
                      </div>
                    ))}
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ GOALS ═══════ */}
        {tab === "Goals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Goals</h1>
            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24 }}>
              <Card style={{ padding: 28, alignSelf: "start" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 20px" }}>Add a goal</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div><SLabel>Goal</SLabel><input style={inputSt} placeholder="e.g. Hit £100k revenue" value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div><SLabel>Category</SLabel>
                      <select style={{ ...inputSt, fontFamily: "inherit" }} value={goalForm.category} onChange={e => setGoalForm(f => ({ ...f, category: e.target.value }))}>
                        {["revenue","audience","product","personal","fitness","learning"].map(c => <option key={c} style={{ background: SURFACE }}>{c}</option>)}
                      </select>
                    </div>
                    <div><SLabel>Unit</SLabel><input style={inputSt} placeholder="£, followers..." value={goalForm.unit} onChange={e => setGoalForm(f => ({ ...f, unit: e.target.value }))} /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div><SLabel>Target</SLabel><input type="number" style={inputSt} value={goalForm.target_value} onChange={e => setGoalForm(f => ({ ...f, target_value: +e.target.value }))} /></div>
                    <div><SLabel>Current</SLabel><input type="number" style={inputSt} value={goalForm.current_value} onChange={e => setGoalForm(f => ({ ...f, current_value: +e.target.value }))} /></div>
                  </div>
                  <div><SLabel>Deadline</SLabel><input type="date" style={{ ...inputSt, colorScheme: "dark" }} value={goalForm.deadline} onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))} /></div>
                  <SubmitBtn onClick={saveGoal} loading={goalSaving} disabled={!goalForm.title.trim()} label="Add goal →" color={P.blue} />
                </div>
              </Card>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {goals.length === 0
                  ? <Card style={{ padding: 40, textAlign: "center" }}><p style={{ color: DIM, fontSize: 13 }}>No goals yet. Add your first one.</p></Card>
                  : goals.map(g => {
                    const v = calcVelocity(g);
                    const catColor = g.category === "revenue" ? P.emerald : g.category === "audience" ? P.violet : P.blue;
                    const remaining = (g.target_value ?? 0) - (g.current_value ?? 0);

                    // Content velocity calculation
                    const contentUnitsNeeded = avgFollowersPerUnit > 0 && g.category === "audience"
                      ? Math.ceil(remaining / avgFollowersPerUnit)
                      : null;

                    return (
                      <Card key={g.id} style={{ padding: 24 }}>
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                          <div>
                            <Badge label={g.category ?? ""} color={catColor} />
                            <h3 style={{ fontWeight: 800, color: TEXT, margin: "8px 0 0", fontSize: 17 }}>{g.title}</h3>
                            {g.deadline && <p style={{ fontSize: 11, color: DIM, marginTop: 3 }}>Due {g.deadline}</p>}
                          </div>
                          <span style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", background: `linear-gradient(135deg, ${v.pct >= 100 ? P.gold : catColor}, white)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            {v.pct.toFixed(1)}%
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div style={{ height: 10, borderRadius: 10, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 10 }}>
                          <div style={{ height: "100%", width: `${v.pct}%`, background: v.pct >= 100 ? P.gold : catColor, borderRadius: 10, boxShadow: `0 0 12px ${catColor}60`, transition: "width 1s cubic-bezier(0.16,1,0.3,1)" }} />
                        </div>

                        {/* Timeline bar (expected vs actual) */}
                        {v.expectedPct !== null && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: DIM }}>Expected pace</span>
                              <span style={{ fontSize: 11, color: v.delta !== null && v.delta >= 0 ? P.emerald : P.orange, fontWeight: 700 }}>
                                {v.delta !== null && v.delta >= 0 ? `↑ ${v.delta.toFixed(1)}% ahead` : `↓ ${Math.abs(v.delta ?? 0).toFixed(1)}% behind`}
                              </span>
                            </div>
                            <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.04)", position: "relative" }}>
                              <div style={{ height: "100%", width: `${v.expectedPct}%`, background: "rgba(255,255,255,0.15)", borderRadius: 4 }} />
                              <div style={{ position: "absolute", top: 0, height: "100%", width: `${v.pct}%`, background: catColor, borderRadius: 4, opacity: 0.7 }} />
                            </div>
                          </div>
                        )}

                        {/* Stats row */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 12px" }}>
                            <p style={{ fontSize: 10, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Logged</p>
                            <p style={{ fontSize: 14, fontWeight: 800, color: TEXT, margin: 0 }}>{g.unit}{(g.current_value ?? 0).toLocaleString()}</p>
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 12px" }}>
                            <p style={{ fontSize: 10, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Remaining</p>
                            <p style={{ fontSize: 14, fontWeight: 800, color: v.pct >= 100 ? P.gold : catColor, margin: 0 }}>{g.unit}{Math.max(0, remaining).toLocaleString()}</p>
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 12px" }}>
                            <p style={{ fontSize: 10, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Needed/day</p>
                            <p style={{ fontSize: 14, fontWeight: 800, color: v.requiredPerDay !== null && v.requiredPerDay > (v.avgPerDay * 1.5) ? P.orange : TEXT, margin: 0 }}>
                              {v.requiredPerDay !== null ? `${g.unit}${Math.ceil(v.requiredPerDay).toLocaleString()}` : "—"}
                            </p>
                          </div>
                        </div>

                        {/* Velocity insight */}
                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                          <p style={{ fontSize: 12, color: DIM, margin: 0, lineHeight: 1.7 }}>
                            At current pace (<span style={{ color: TEXT, fontWeight: 700 }}>{g.unit}{v.avgPerDay.toFixed(0)}/day avg</span>):
                            {v.daysRemaining !== null && v.requiredPerDay !== null
                              ? v.avgPerDay >= v.requiredPerDay
                                ? <span style={{ color: P.emerald }}> On track to hit target. 🚀</span>
                                : <span style={{ color: P.orange }}> Need <strong>{g.unit}{Math.ceil(v.requiredPerDay - v.avgPerDay).toLocaleString()}/day more</strong> to hit target.</span>
                              : <span style={{ color: DIM }}> Add a deadline to see pace analysis.</span>}
                            {contentUnitsNeeded !== null && (
                              <><br /><span style={{ color: P.cyan }}>Requires ~{contentUnitsNeeded.toLocaleString()} more posts at current conversion ({avgFollowersPerUnit.toFixed(1)} followers/post)</span></>
                            )}
                          </p>
                        </div>

                        {/* Update progress */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: DIM }}>
                          <span>Update:</span>
                          <input type="number" defaultValue={g.current_value}
                            onBlur={e => g.id && updateGoalProgress(g.id, +e.target.value)}
                            style={{ width: 100, background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "4px 10px", color: TEXT, fontSize: 13, outline: "none" }} />
                          <span>/ {(g.target_value ?? 0).toLocaleString()} {g.unit}</span>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ TEAM ═══════ */}
        {tab === "Team" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>👥 {org?.name ?? "Team"}</h1>
                <p style={{ fontSize: 14, color: DIM, marginTop: 6 }}>Your workspace — everyone&apos;s activity in one place</p>
              </div>
            </div>

            {/* Invite */}
            <Card style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 12px" }}>Invite your cofounder</h3>
              <div style={{ display: "flex", gap: 10 }}>
                <input style={{ ...inputSt, flex: 1 }} type="email" placeholder="cofounder@email.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && sendInvite()} />
                <button onClick={sendInvite} disabled={inviteSending || !inviteEmail.trim()}
                  style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${P.gold}CC, ${P.gold}AA)`, color: "#1a1200", fontWeight: 800, fontSize: 13, cursor: "pointer", opacity: inviteSending ? 0.6 : 1, whiteSpace: "nowrap" }}>
                  {inviteSending ? "Sending..." : "Send invite"}
                </button>
              </div>
              {inviteDone && <p style={{ fontSize: 13, color: P.emerald, marginTop: 8 }}>✓ Invite saved — share this link: <strong style={{ color: P.violet }}>{typeof window !== "undefined" ? `${window.location.origin}/invite/${org?.id}` : ""}</strong></p>}
              <p style={{ fontSize: 12, color: DIM, marginTop: 8 }}>They&apos;ll join via <code style={{ color: P.violet }}>/invite/{org?.id?.slice(0,8)}...</code> — copy and send it directly.</p>
            </Card>

            {/* Members */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 14px", color: DIM, textTransform: "uppercase", letterSpacing: "0.08em" }}>Members</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                {members.map(m => (
                  <Card key={m.id} style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: m.profile?.avatar_color ?? P.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", boxShadow: `0 0 16px ${m.profile?.avatar_color ?? P.purple}50` }}>
                        {(m.profile?.name ?? m.invited_email ?? "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 800, color: TEXT, margin: 0 }}>{m.profile?.name ?? m.invited_email ?? "Pending"}</p>
                        <p style={{ fontSize: 11, color: m.role === "owner" ? P.gold : DIM, margin: 0, fontWeight: 600, textTransform: "capitalize" }}>{m.role} · {m.status}</p>
                      </div>
                    </div>
                    {m.status === "pending" && <div style={{ padding: "8px 12px", borderRadius: 8, background: `${P.orange}10`, border: `1px solid ${P.orange}30` }}><p style={{ fontSize: 11, color: P.orange, margin: 0 }}>Invite pending — share the invite link</p></div>}
                  </Card>
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 14px", color: DIM, textTransform: "uppercase", letterSpacing: "0.08em" }}>Live Activity</h3>
              <Card style={{ padding: 8 }}>
                {activity.length === 0 ? (
                  <p style={{ fontSize: 13, color: DIM, padding: "20px 16px", textAlign: "center", margin: 0 }}>No activity yet — start logging ideas, revenue, and goals</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {activity.map((a, i) => {
                      const meta = a.metadata as Record<string, unknown>;
                      const profile = a.profiles as Record<string, unknown> | null;
                      const name = (profile?.name as string) ?? "Unknown";
                      const color = (profile?.avatar_color as string) ?? P.purple;
                      const timeAgo = (() => {
                        const diff = Date.now() - new Date(a.created_at as string).getTime();
                        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                        return `${Math.floor(diff / 86400000)}d ago`;
                      })();
                      const label = a.type === "idea_added" ? `Added idea: ${meta?.title ?? ""} (${meta?.score ?? ""}pts)` : a.type === "revenue_logged" ? `Logged £${meta?.amount} revenue` : a.type === "followers_logged" ? `Logged ${meta?.amount} followers` : a.type === "goal_added" ? `Added goal: ${meta?.title}` : a.type as string;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < activity.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{name[0].toUpperCase()}</div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{name} </span>
                            <span style={{ fontSize: 12, color: DIM }}>{label}</span>
                          </div>
                          <span style={{ fontSize: 11, color: DIM, flexShrink: 0 }}>{timeAgo}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ═══════ PROFILE ═══════ */}
        {tab === "Profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 700 }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Profile & Settings</h1>
            <Card style={{ padding: 32 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div><SLabel>Name</SLabel><input style={inputSt} placeholder="Joshua" value={profileForm.name ?? ""} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><SLabel>Risk tolerance</SLabel>
                  <select style={{ ...inputSt, fontFamily: "inherit" }} value={profileForm.risk_tolerance ?? "medium"} onChange={e => setProfileForm(f => ({ ...f, risk_tolerance: e.target.value }))}>
                    {["low","medium","high"].map(r => <option key={r} style={{ background: SURFACE }}>{r}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1/-1" }}><SLabel>Your situation</SLabel><textarea rows={3} style={{ ...inputSt, resize: "none", fontFamily: "inherit" }} placeholder="e.g. 20, running Brick Whips, 150k Instagram, ~£5k/month..." value={profileForm.situation ?? ""} onChange={e => setProfileForm(f => ({ ...f, situation: e.target.value }))} /></div>
                <div><SLabel>Runway (months)</SLabel><input type="number" style={inputSt} value={profileForm.runway_months ?? 6} onChange={e => setProfileForm(f => ({ ...f, runway_months: +e.target.value }))} /></div>
                <div><SLabel>Monthly revenue goal (£)</SLabel><input type="number" style={inputSt} value={profileForm.monthly_revenue_goal ?? 5000} onChange={e => setProfileForm(f => ({ ...f, monthly_revenue_goal: +e.target.value }))} /></div>
                <div><SLabel>Current monthly revenue (£)</SLabel><input type="number" style={inputSt} value={profileForm.current_monthly_revenue ?? 0} onChange={e => setProfileForm(f => ({ ...f, current_monthly_revenue: +e.target.value }))} /></div>
                <div><SLabel>Top skills</SLabel><input style={inputSt} placeholder="social media, sales, content..." value={(profileForm.top_skills ?? []).join(", ")} onChange={e => setProfileForm(f => ({ ...f, top_skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} /></div>
                <div style={{ gridColumn: "1/-1" }}><SLabel>Constraints</SLabel><textarea rows={2} style={{ ...inputSt, resize: "none", fontFamily: "inherit" }} placeholder="No technical co-founder. Evenings only..." value={profileForm.constraints ?? ""} onChange={e => setProfileForm(f => ({ ...f, constraints: e.target.value }))} /></div>
              </div>
              <div style={{ marginTop: 24 }}>
                <SubmitBtn onClick={saveProfile} loading={profileSaving} label={profile?.id ? "Update profile →" : "Save profile →"} />
              </div>
            </Card>

            {/* API connections (Phase 2 placeholder) */}
            <Card style={{ padding: 28 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 6px" }}>API Connections <Badge label="Coming soon" color={P.orange} /></h3>
              <p style={{ fontSize: 13, color: DIM, margin: "0 0 16px" }}>Connect social accounts to auto-pull followers, views, and reach — no manual logging needed.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["TikTok", "Instagram", "YouTube", "Twitter / X"].map(platform => (
                  <div key={platform} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{platform}</span>
                    <span style={{ fontSize: 11, color: DIM, fontWeight: 600 }}>Not connected</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        </div>{/* end tab content wrapper */}
      </main>

      {/* ── HUD floating rings ── */}
      <HUD todos={todayTodos} checked={checkedTodos} goals={goals} />

    </div>
  );
}
