"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ScatterChart, Scatter, ZAxis,
} from "recharts";
import { supabase, categoriseIdea, opportunityScore, kellyHours, portfolioHealth } from "@/lib/supabase";
import { MORNING_QUESTIONS, generateTodoFromIdeas, getAdvisorInsight } from "@/lib/advisor";
import type { Idea, DailyLog, Goal, FounderProfile, TodoItem } from "@/lib/supabase";

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

const TABS = ["Today", "Idea Lab", "Overview", "Daily Log", "Goals", "Profile"] as const;
type Tab = typeof TABS[number];

const TAB_ICONS: Record<Tab, string> = {
  "Today":    "🎯",
  "Idea Lab": "💡",
  "Overview": "📊",
  "Daily Log":"📝",
  "Goals":    "🏁",
  "Profile":  "⚙️",
};

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
  const [tab, setTab] = useState<Tab>("Today");

  const [ideas,   setIdeas]   = useState<Idea[]>([]);
  const [logs,    setLogs]    = useState<DailyLog[]>([]);
  const [goals,   setGoals]   = useState<Goal[]>([]);
  const [profile, setProfile] = useState<FounderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [ideaForm, setIdeaForm] = useState({ title: "", description: "", upside: 5, downside: 5, effort: 5 });
  const [ideaSaving, setIdeaSaving] = useState(false);

  const [logForm, setLogForm] = useState({ output_type: "content", output_description: "", output_quantity: 1, output_unit: "hours", outcome_revenue: 0, outcome_followers: 0, notes: "" });
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

  const load = useCallback(async () => {
    setLoading(true);
    const [iR, lR, gR, pR, planR] = await Promise.all([
      supabase.from("ideas").select("*").order("created_at", { ascending: false }),
      supabase.from("daily_logs").select("*").order("date", { ascending: false }).limit(30),
      supabase.from("goals").select("*").order("created_at", { ascending: false }),
      supabase.from("founder_profile").select("*").limit(1).maybeSingle(),
      supabase.from("daily_plans").select("*").eq("date", new Date().toISOString().split("T")[0]).maybeSingle(),
    ]);
    if (iR.data)    setIdeas(iR.data);
    if (lR.data)    setLogs(lR.data);
    if (gR.data)    setGoals(gR.data);
    if (pR.data)    { setProfile(pR.data); setProfileForm(pR.data); }
    if (planR.data) {
      if (planR.data.morning_answers) setMorningAnswers(planR.data.morning_answers);
      if (planR.data.todo_items)      { setTodayTodos(planR.data.todo_items); setTodoGenerated(true); }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const saveIdea = async () => {
    if (!ideaForm.title.trim()) return;
    setIdeaSaving(true);
    const category = categoriseIdea(ideaForm.upside, ideaForm.downside, ideaForm.effort);
    await supabase.from("ideas").insert({ ...ideaForm, category });
    setIdeaForm({ title: "", description: "", upside: 5, downside: 5, effort: 5 });
    await load(); setIdeaSaving(false);
  };

  const saveLog = async () => {
    setLogSaving(true);
    await supabase.from("daily_logs").insert({ ...logForm, date: new Date().toISOString().split("T")[0] });
    // Auto-update matching goals
    if (logForm.outcome_revenue > 0) {
      const revGoals = goals.filter(g => g.category === "revenue");
      await Promise.all(revGoals.map(g =>
        supabase.from("goals").update({ current_value: (g.current_value ?? 0) + logForm.outcome_revenue }).eq("id", g.id!)
      ));
    }
    if (logForm.outcome_followers > 0) {
      const audGoals = goals.filter(g => g.category === "audience");
      await Promise.all(audGoals.map(g =>
        supabase.from("goals").update({ current_value: (g.current_value ?? 0) + logForm.outcome_followers }).eq("id", g.id!)
      ));
    }
    setLogForm({ output_type: "content", output_description: "", output_quantity: 1, output_unit: "hours", outcome_revenue: 0, outcome_followers: 0, notes: "" });
    await load(); setLogSaving(false);
  };

  const saveGoal = async () => {
    if (!goalForm.title.trim()) return;
    setGoalSaving(true);
    await supabase.from("goals").insert(goalForm);
    setGoalForm({ title: "", category: "revenue", target_value: 0, current_value: 0, unit: "£", deadline: "" });
    await load(); setGoalSaving(false);
  };

  const updateGoalProgress = async (id: string, value: number) => {
    await supabase.from("goals").update({ current_value: value }).eq("id", id);
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current_value: value } : g));
  };

  const deleteIdea = async (id: string) => {
    await supabase.from("ideas").delete().eq("id", id);
    setIdeas(prev => prev.filter(i => i.id !== id));
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    if (profile?.id) {
      await supabase.from("founder_profile").update({ ...profileForm }).eq("id", profile.id);
    } else {
      const { data } = await supabase.from("founder_profile").insert({ ...profileForm }).select().single();
      if (data) setProfile(data);
    }
    await load(); setProfileSaving(false);
  };

  const generateTodo = async () => {
    setAdvisorLoading(true);
    const todos = generateTodoFromIdeas(ideas, profile, morningAnswers);
    const today = new Date().toISOString().split("T")[0];
    const ex = await supabase.from("daily_plans").select("id").eq("date", today).maybeSingle();
    if (ex.data?.id) {
      await supabase.from("daily_plans").update({ morning_answers: morningAnswers, todo_items: todos }).eq("id", ex.data.id);
    } else {
      await supabase.from("daily_plans").insert({ date: today, morning_answers: morningAnswers, todo_items: todos });
    }
    setTodayTodos(todos); setTodoGenerated(true); setAdvisorLoading(false);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const health   = portfolioHealth(ideas);
  const insight  = getAdvisorInsight(ideas, profile, logs);
  const gradeColor = health.grade === "A" ? P.gold : health.grade === "B" ? P.purple : health.grade === "C" ? P.orange : P.red;
  const totalRevenue   = logs.reduce((s, l) => s + (l.outcome_revenue ?? 0), 0);
  const totalFollowers = logs.reduce((s, l) => s + (l.outcome_followers ?? 0), 0);
  const chartData = [...logs].reverse().slice(-14).map(l => ({ date: l.date?.slice(5) ?? "", revenue: l.outcome_revenue ?? 0, followers: l.outcome_followers ?? 0 }));
  const bubbleData = ideas.map(i => ({ x: i.effort, y: i.upside, z: 10 - i.downside, name: i.title, category: i.category ?? "standard", score: opportunityScore(i.upside, i.downside, i.effort) }));
  const allAnswered = MORNING_QUESTIONS.every((_, i) => morningAnswers[i]?.trim());

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

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {TABS.map(t => {
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 14px", borderRadius: 12, border: "none", cursor: "pointer",
                  marginBottom: 2, textAlign: "left", transition: "all 0.15s",
                  background: active ? `${P.purple}20` : "transparent",
                  color: active ? TEXT : DIM, fontWeight: active ? 700 : 500, fontSize: 14,
                  boxShadow: active ? `inset 3px 0 0 ${P.purple}, 0 0 20px ${P.purple}10` : "none",
                }}>
                <span style={{ fontSize: 16 }}>{TAB_ICONS[t]}</span>
                {t}
                {t === "Today" && todayTodos.length > 0 && (
                  <span style={{ marginLeft: "auto", background: checkedTodos.size === todayTodos.length ? P.emerald : P.purple, color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>
                    {checkedTodos.size}/{todayTodos.length}
                  </span>
                )}
                {t === "Idea Lab" && ideas.length > 0 && (
                  <span style={{ marginLeft: "auto", background: P.violet + "30", color: P.violet, borderRadius: 20, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>
                    {ideas.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom date */}
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 11, color: DIM, margin: 0 }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
          </p>
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
      </nav>

      {/* ── Main content ── */}
      <main className="main-with-sidebar fade-up" style={{ flex: 1, overflowY: "auto", padding: "36px 40px", minWidth: 0 }}>

        {/* ═══════ TODAY ═══════ */}
        {tab === "Today" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 800 }}>
            <div>
              <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>
                {profile?.name ? `Good morning, ${profile.name.split(" ")[0]} 👋` : "Good morning 👋"}
              </h1>
              <p style={{ fontSize: 14, color: DIM, marginTop: 8 }}>{insight}</p>
            </div>

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
                  {MORNING_QUESTIONS.map((q, i) => (
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
                    disabled={!allAnswered || ideas.length === 0}
                    label={ideas.length === 0 ? "Add ideas in Idea Lab first" : !allAnswered ? "Answer all 5 questions to unlock" : "Generate my plan →"} />
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
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 6px" }}>All Ideas — ranked by opportunity score</h3>
                <p style={{ fontSize: 12, color: DIM, margin: "0 0 20px" }}>Score = (upside×2 − downside − effort×0.5) / 1.75 · Kelly = hrs/week to invest</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...ideas].sort((a, b) => opportunityScore(b.upside, b.downside, b.effort) - opportunityScore(a.upside, a.downside, a.effort)).map((idea, i) => {
                    const meta = CAT[idea.category ?? "standard"];
                    const score = opportunityScore(idea.upside, idea.downside, idea.effort);
                    const kelly = kellyHours(idea.upside, idea.downside, idea.effort);
                    return (
                      <div key={idea.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 14, background: i === 0 ? `${P.purple}12` : "rgba(255,255,255,0.03)", border: `1px solid ${i === 0 ? `${P.purple}40` : BORDER}` }}>
                        <span style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0, background: i === 0 ? P.purple : "rgba(255,255,255,0.1)" }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, color: TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{idea.title}</p>
                          <div style={{ display: "flex", gap: 10, marginTop: 3, fontSize: 11, color: DIM }}>
                            <span style={{ color: P.emerald }}>↑{idea.upside}</span>
                            <span style={{ color: P.red }}>↓{idea.downside}</span>
                            <span style={{ color: P.orange }}>⚙{idea.effort}</span>
                            <span style={{ color: P.cyan }}>Kelly: {kelly} hrs/wk</span>
                          </div>
                        </div>
                        <Badge label={meta.label} color={meta.color} />
                        <ScoreRing score={score} color={meta.color} size={40} />
                        <button onClick={() => idea.id && deleteIdea(idea.id)} style={{ background: "none", border: "none", color: DIM, cursor: "pointer", fontSize: 16 }}>×</button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><SLabel>Type</SLabel>
                      <select style={{ ...inputSt, fontFamily: "inherit" }} value={logForm.output_type} onChange={e => setLogForm(f => ({ ...f, output_type: e.target.value }))}>
                        {["content","deep_work","sales","admin","learning","building","marketing"].map(t => <option key={t} style={{ background: SURFACE }}>{t}</option>)}
                      </select>
                    </div>
                    <div><SLabel>Unit</SLabel>
                      <select style={{ ...inputSt, fontFamily: "inherit" }} value={logForm.output_unit} onChange={e => setLogForm(f => ({ ...f, output_unit: e.target.value }))}>
                        {["hours","videos","posts","calls","tasks","pages"].map(u => <option key={u} style={{ background: SURFACE }}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><SLabel>What did you do?</SLabel><input style={inputSt} placeholder="e.g. Filmed 3 TikToks" value={logForm.output_description} onChange={e => setLogForm(f => ({ ...f, output_description: e.target.value }))} /></div>
                  <div><SLabel>Quantity</SLabel><input type="number" style={inputSt} value={logForm.output_quantity} onChange={e => setLogForm(f => ({ ...f, output_quantity: +e.target.value }))} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><SLabel>Revenue (£)</SLabel><input type="number" style={inputSt} value={logForm.outcome_revenue} onChange={e => setLogForm(f => ({ ...f, outcome_revenue: +e.target.value }))} /></div>
                    <div><SLabel>New followers</SLabel><input type="number" style={inputSt} value={logForm.outcome_followers} onChange={e => setLogForm(f => ({ ...f, outcome_followers: +e.target.value }))} /></div>
                  </div>
                  <div><SLabel>Notes</SLabel><textarea rows={2} style={{ ...inputSt, resize: "none", fontFamily: "inherit" }} placeholder="How did it feel?" value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <p style={{ fontSize: 11, color: P.emerald, margin: 0 }}>⚡ Revenue + followers automatically update matching goals</p>
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

      </main>

      {/* ── HUD floating rings ── */}
      <HUD todos={todayTodos} checked={checkedTodos} goals={goals} />
    </div>
  );
}
