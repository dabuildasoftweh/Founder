"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip, CartesianGrid, LineChart, Line, BarChart, Bar,
} from "recharts";
import {
  supabase, categoriseIdea, opportunityScore, kellyHours, portfolioHealth,
} from "@/lib/supabase";
import { MORNING_QUESTIONS, generateTodoFromIdeas, getAdvisorInsight } from "@/lib/advisor";
import type { Idea, DailyLog, Goal, FounderProfile, DailyPlan, TodoItem } from "@/lib/supabase";

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG      = "#07071A";
const SURFACE = "#0C0C22";
const GLASS   = "rgba(255,255,255,0.04)";
const BORDER  = "rgba(255,255,255,0.08)";
const TEXT     = "#F1F0FF";
const TEXT_DIM = "rgba(255,255,255,0.38)";

const P = {
  purple:  "#7C3AED",
  violet:  "#A78BFA",
  cyan:    "#06B6D4",
  emerald: "#10B981",
  orange:  "#F59E0B",
  red:     "#EF4444",
  blue:    "#3B82F6",
};

const CATEGORY_META: Record<string, { label: string; color: string; glow: string; desc: string }> = {
  asymmetric: { label: "Asymmetric",  color: P.emerald, glow: "rgba(16,185,129,0.2)",  desc: "High upside, low risk — your #1 priority" },
  easy_win:   { label: "Easy Win",    color: P.cyan,    glow: "rgba(6,182,212,0.2)",   desc: "Good reward, low effort — build momentum" },
  grind:      { label: "Grind",       color: P.orange,  glow: "rgba(245,158,11,0.2)",  desc: "High effort, worth the long game" },
  standard:   { label: "Standard",    color: P.blue,    glow: "rgba(59,130,246,0.15)", desc: "Balanced opportunity" },
  trap:       { label: "Trap",        color: P.red,     glow: "rgba(239,68,68,0.2)",   desc: "High effort, low reward — cut it" },
};

const TABS = ["Overview", "Idea Lab", "Daily Log", "Goals", "Advisor", "Profile"] as const;
type Tab = typeof TABS[number];

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, color, size = 52 }: { score: number; color: string; size?: number }) {
  const r  = (size - 10) / 2;
  const cx = size / 2;
  const c  = 2 * Math.PI * r;
  const offset = c - (score / 10) * c;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={BORDER} strokeWidth={5} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`} />
      <text x={cx} y={cx + 5} textAnchor="middle"
        fill={color} fontSize={13} fontWeight={800}>{score}</text>
    </svg>
  );
}

// ── Glass card ────────────────────────────────────────────────────────────────
function Card({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={{
      background: GLASS, border: `1px solid ${BORDER}`,
      borderRadius: 20, backdropFilter: "blur(20px)",
      ...style,
    }}>{children}</div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}18, ${color}06)`,
      border: `1px solid ${color}35`,
      boxShadow: `0 0 28px ${color}12`,
      borderRadius: 20, padding: "20px 22px",
    }}>
      <p style={{ color, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
      <p style={{
        fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em",
        background: `linear-gradient(135deg, ${color}, ${color}AA)`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        lineHeight: 1,
      }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: TEXT_DIM, marginTop: 6 }}>{sub}</p>}
    </div>
  );
}

// ── Pill badge ────────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      background: `${color}20`, color, border: `1px solid ${color}40`,
      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

// ── Dark input ────────────────────────────────────────────────────────────────
const inputCls = "w-full rounded-xl px-4 py-2.5 text-sm outline-none transition";
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`,
  color: TEXT, fontSize: 14,
};

// ── Dark slider ───────────────────────────────────────────────────────────────
function Slider({ label, value, onChange, color, desc }: {
  label: string; value: number; onChange: (v: number) => void; color: string; desc?: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{value}<span style={{ color: TEXT_DIM }}>/10</span></span>
      </div>
      {desc && <p style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 8 }}>{desc}</p>}
      <input type="range" min={1} max={10} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color, height: 6, cursor: "pointer" }} />
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: TEXT, margin: 0 }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: TEXT_DIM, marginTop: 6 }}>{sub}</p>}
    </div>
  );
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  contentStyle: { background: "#0D0D24", border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT, fontSize: 12 },
  itemStyle: { color: TEXT },
  labelStyle: { color: TEXT_DIM },
};
const AXIS_STYLE = { fill: TEXT_DIM, fontSize: 11 };
const GRID_STYLE = { stroke: "rgba(255,255,255,0.04)", strokeDasharray: "4 4" };

// ── Submit button ─────────────────────────────────────────────────────────────
function SubmitBtn({ onClick, disabled, loading, label, color = P.purple }: {
  onClick: () => void; disabled?: boolean; loading: boolean; label: string; color?: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{
        width: "100%", border: "none", borderRadius: 14, padding: "13px 0",
        fontSize: 14, fontWeight: 800, color: "#fff", cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.4 : 1,
        background: `linear-gradient(135deg, ${color}CC, ${color})`,
        boxShadow: `0 4px 20px ${color}40`,
        transition: "opacity 0.15s, transform 0.1s",
        letterSpacing: "0.01em",
      }}>
      {loading ? "Saving..." : label}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("Overview");

  const [ideas,   setIdeas]   = useState<Idea[]>([]);
  const [logs,    setLogs]    = useState<DailyLog[]>([]);
  const [goals,   setGoals]   = useState<Goal[]>([]);
  const [profile, setProfile] = useState<FounderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [ideaForm, setIdeaForm] = useState({ title: "", description: "", upside: 5, downside: 5, effort: 5 });
  const [ideaSaving, setIdeaSaving] = useState(false);

  const [logForm, setLogForm] = useState({
    output_type: "content", output_description: "", output_quantity: 1,
    output_unit: "hours", outcome_revenue: 0, outcome_followers: 0, notes: "",
  });
  const [logSaving, setLogSaving] = useState(false);

  const [goalForm, setGoalForm] = useState({ title: "", category: "revenue", target_value: 0, current_value: 0, unit: "£", deadline: "" });
  const [goalSaving, setGoalSaving] = useState(false);

  const [profileForm, setProfileForm] = useState<FounderProfile>({
    name: "", situation: "", runway_months: 6, monthly_revenue_goal: 5000,
    current_monthly_revenue: 0, risk_tolerance: "medium", top_skills: [], constraints: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const [morningAnswers, setMorningAnswers] = useState<Record<string, string>>({});
  const [todayTodos, setTodayTodos]         = useState<TodoItem[]>([]);
  const [todoGenerated, setTodoGenerated]   = useState(false);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [checkedTodos, setCheckedTodos]     = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const [ideasRes, logsRes, goalsRes, profileRes, planRes] = await Promise.all([
      supabase.from("ideas").select("*").order("created_at", { ascending: false }),
      supabase.from("daily_logs").select("*").order("date", { ascending: false }).limit(30),
      supabase.from("goals").select("*").order("created_at", { ascending: false }),
      supabase.from("founder_profile").select("*").limit(1).maybeSingle(),
      supabase.from("daily_plans").select("*").eq("date", new Date().toISOString().split("T")[0]).maybeSingle(),
    ]);
    if (ideasRes.data)   setIdeas(ideasRes.data);
    if (logsRes.data)    setLogs(logsRes.data);
    if (goalsRes.data)   setGoals(goalsRes.data);
    if (profileRes.data) { setProfile(profileRes.data); setProfileForm(profileRes.data); }
    if (planRes.data) {
      if (planRes.data.morning_answers) setMorningAnswers(planRes.data.morning_answers);
      if (planRes.data.todo_items)      { setTodayTodos(planRes.data.todo_items); setTodoGenerated(true); }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveIdea = async () => {
    if (!ideaForm.title.trim()) return;
    setIdeaSaving(true);
    const category = categoriseIdea(ideaForm.upside, ideaForm.downside, ideaForm.effort);
    await supabase.from("ideas").insert({ ...ideaForm, category });
    setIdeaForm({ title: "", description: "", upside: 5, downside: 5, effort: 5 });
    await load();
    setIdeaSaving(false);
  };

  const saveLog = async () => {
    setLogSaving(true);
    await supabase.from("daily_logs").insert({ ...logForm, date: new Date().toISOString().split("T")[0] });
    setLogForm({ output_type: "content", output_description: "", output_quantity: 1, output_unit: "hours", outcome_revenue: 0, outcome_followers: 0, notes: "" });
    await load();
    setLogSaving(false);
  };

  const saveGoal = async () => {
    if (!goalForm.title.trim()) return;
    setGoalSaving(true);
    await supabase.from("goals").insert(goalForm);
    setGoalForm({ title: "", category: "revenue", target_value: 0, current_value: 0, unit: "£", deadline: "" });
    await load();
    setGoalSaving(false);
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
    await load();
    setProfileSaving(false);
  };

  const generateTodo = async () => {
    setAdvisorLoading(true);
    const todos = generateTodoFromIdeas(ideas, profile, morningAnswers);
    const today = new Date().toISOString().split("T")[0];
    const existing = await supabase.from("daily_plans").select("id").eq("date", today).maybeSingle();
    if (existing.data?.id) {
      await supabase.from("daily_plans").update({ morning_answers: morningAnswers, todo_items: todos }).eq("id", existing.data.id);
    } else {
      await supabase.from("daily_plans").insert({ date: today, morning_answers: morningAnswers, todo_items: todos });
    }
    setTodayTodos(todos);
    setTodoGenerated(true);
    setAdvisorLoading(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const bubbleData = ideas.map(i => ({
    x: i.effort, y: i.upside, z: 10 - i.downside,
    name: i.title, category: i.category ?? "standard",
    score: opportunityScore(i.upside, i.downside, i.effort),
  }));

  const chartData = [...logs].reverse().slice(-14).map(l => ({
    date: l.date?.slice(5) ?? "",
    revenue: l.outcome_revenue ?? 0,
    followers: l.outcome_followers ?? 0,
  }));

  const totalRevenue   = logs.reduce((s, l) => s + (l.outcome_revenue ?? 0), 0);
  const totalFollowers = logs.reduce((s, l) => s + (l.outcome_followers ?? 0), 0);
  const health         = portfolioHealth(ideas);
  const insight        = getAdvisorInsight(ideas, profile, logs);
  const allAnswered    = MORNING_QUESTIONS.every((_, i) => morningAnswers[i]?.trim());

  const gradeColor = health.grade === "A" ? P.emerald : health.grade === "B" ? P.cyan : health.grade === "C" ? P.orange : P.red;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 12px", borderColor: "rgba(255,255,255,0.1)", borderTopColor: P.purple }} />
        <p style={{ fontSize: 13, color: TEXT_DIM }}>Loading your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT }}>

      {/* ── Nav ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(7,7,26,0.85)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${P.purple}, ${P.violet})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 16px ${P.purple}60` }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L13 4.5V9c0 2.5-2 4.5-5 5.5C5 13.5 3 11.5 3 9V4.5L8 2z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M6 8l1.5 1.5L10.5 6" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.03em", color: TEXT }}>Founder</span>
          </a>

          <nav style={{ display: "flex", gap: 4 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: "6px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 700, transition: "all 0.2s",
                  background: tab === t ? `linear-gradient(135deg, ${P.purple}CC, ${P.violet}CC)` : "transparent",
                  color: tab === t ? "#fff" : TEXT_DIM,
                  boxShadow: tab === t ? `0 0 16px ${P.purple}40` : "none",
                }}>{t}</button>
            ))}
          </nav>

          <div style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 600 }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 24px" }}>

        {/* ═══════════════════════════════════ OVERVIEW ═══════════════════════════════════ */}
        {tab === "Overview" && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>
                {profile?.name ? `Good morning, ${profile.name.split(" ")[0]} 👋` : "Good morning 👋"}
              </h1>
              <p style={{ fontSize: 14, color: TEXT_DIM, marginTop: 8 }}>{insight}</p>
            </div>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              <StatCard label="Total Ideas"      value={ideas.length}   sub={`${ideas.filter(i => i.category === "asymmetric").length} asymmetric`} color={P.violet} />
              <StatCard label="Revenue (30d)"    value={`£${totalRevenue.toLocaleString()}`} sub="logged outcomes" color={P.emerald} />
              <StatCard label="Followers Gained" value={totalFollowers.toLocaleString()} sub="last 30 days" color={P.cyan} />
              <StatCard label="Portfolio Grade"  value={health.grade}   sub={`${health.label} · ${health.score}/100`} color={gradeColor} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Idea breakdown */}
              <Card style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 20px" }}>Idea Breakdown</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {Object.entries(CATEGORY_META).map(([key, meta]) => {
                    const count = ideas.filter(i => i.category === key).length;
                    const pct   = ideas.length > 0 ? (count / ideas.length) * 100 : 0;
                    return (
                      <div key={key}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                          <span style={{ fontSize: 12, color: TEXT_DIM }}>{count} ideas</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 6, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: meta.color, borderRadius: 6, boxShadow: `0 0 8px ${meta.color}60`, transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Revenue chart */}
              <Card style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 20px" }}>Revenue vs Followers (14d)</h3>
                {chartData.length === 0
                  ? <p style={{ fontSize: 13, color: TEXT_DIM }}>Log your daily output to see the correlation.</p>
                  : (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartData}>
                        <CartesianGrid {...GRID_STYLE} />
                        <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Line type="monotone" dataKey="revenue"   stroke={P.emerald} strokeWidth={2} dot={false} name="Revenue £" />
                        <Line type="monotone" dataKey="followers" stroke={P.violet}  strokeWidth={2} dot={false} name="Followers" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
              </Card>
            </div>

            {/* Goals */}
            {goals.length > 0 && (
              <Card style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 20px" }}>Goals Progress</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {goals.map(g => {
                    const pct = g.target_value ? Math.min(100, ((g.current_value ?? 0) / g.target_value) * 100) : 0;
                    const c   = g.category === "revenue" ? P.emerald : g.category === "audience" ? P.violet : P.cyan;
                    return (
                      <div key={g.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{g.title}</span>
                          <span style={{ fontSize: 12, color: TEXT_DIM }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 8, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 8, boxShadow: `0 0 10px ${c}50`, transition: "width 0.8s" }} />
                        </div>
                        <p style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>{g.current_value} / {g.target_value} {g.unit}{g.deadline ? ` · Due ${g.deadline}` : ""}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Today's plan */}
            {todayTodos.length > 0 && (
              <Card style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 16px" }}>Today&apos;s Plan</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {todayTodos.map((t, i) => {
                    const done = checkedTodos.has(i);
                    const meta = CATEGORY_META[t.category ?? "standard"];
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px",
                        borderRadius: 14, background: done ? "rgba(255,255,255,0.02)" : i === 0 ? `${P.purple}18` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${done ? BORDER : i === 0 ? `${P.purple}40` : BORDER}`,
                        opacity: done ? 0.45 : 1, transition: "all 0.2s",
                      }}>
                        <input type="checkbox" checked={done}
                          onChange={() => setCheckedTodos(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; })}
                          style={{ marginTop: 3, accentColor: P.purple, cursor: "pointer" }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0, textDecoration: done ? "line-through" : "none" }}>{t.task}</p>
                          <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                            <Badge label={t.priority} color={t.priority === "high" ? P.purple : t.priority === "medium" ? P.cyan : TEXT_DIM} />
                            {t.estimated_time && <span style={{ fontSize: 11, color: TEXT_DIM }}>⏱ {t.estimated_time}</span>}
                            <Badge label={meta.label} color={meta.color} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: 11, color: TEXT_DIM, marginTop: 12 }}>
                  {checkedTodos.size}/{todayTodos.length} done
                  {checkedTodos.size === todayTodos.length && todayTodos.length > 0 ? " · Legendary day. 🎉" : ""}
                </p>
              </Card>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════ IDEA LAB ═══════════════════════════════════ */}
        {tab === "Idea Lab" && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <SectionHead title="Idea Lab" sub="Score every idea on upside, risk, and effort. The matrix tells you where to focus." />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Add idea form */}
              <Card style={{ padding: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 20px" }}>Log a new idea</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Idea title</label>
                    <input className={inputCls} style={inputStyle} placeholder="e.g. Premium car fragrance brand"
                      value={ideaForm.title} onChange={e => setIdeaForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Description (optional)</label>
                    <textarea rows={2} className={inputCls} style={{ ...inputStyle, resize: "none" }} placeholder="Brief description..."
                      value={ideaForm.description} onChange={e => setIdeaForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <Slider label="Upside" value={ideaForm.upside} onChange={v => setIdeaForm(f => ({ ...f, upside: v }))} color={P.emerald} desc="How big is the potential reward?" />
                  <Slider label="Downside / Risk" value={ideaForm.downside} onChange={v => setIdeaForm(f => ({ ...f, downside: v }))} color={P.red} desc="How bad if it fails? (10 = catastrophic)" />
                  <Slider label="Effort" value={ideaForm.effort} onChange={v => setIdeaForm(f => ({ ...f, effort: v }))} color={P.orange} desc="Time and energy this requires" />

                  {/* Live preview */}
                  {(() => {
                    const cat   = categoriseIdea(ideaForm.upside, ideaForm.downside, ideaForm.effort);
                    const score = opportunityScore(ideaForm.upside, ideaForm.downside, ideaForm.effort);
                    const kelly = kellyHours(ideaForm.upside, ideaForm.downside, ideaForm.effort);
                    const meta  = CATEGORY_META[cat];
                    return (
                      <div style={{
                        padding: "16px 20px", borderRadius: 14,
                        background: `${meta.color}10`, border: `1px solid ${meta.color}35`,
                        boxShadow: `0 0 20px ${meta.glow}`,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{meta.label}</p>
                          <p style={{ fontSize: 12, color: TEXT_DIM, marginTop: 4 }}>{meta.desc}</p>
                          <p style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>Kelly allocation: <span style={{ color: meta.color, fontWeight: 700 }}>{kelly} hrs/week</span></p>
                        </div>
                        <ScoreRing score={score} color={meta.color} size={56} />
                      </div>
                    );
                  })()}

                  <SubmitBtn onClick={saveIdea} loading={ideaSaving} disabled={!ideaForm.title.trim()} label="Log this idea →" color={P.purple} />
                </div>
              </Card>

              {/* Bubble chart */}
              <Card style={{ padding: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Priority Matrix</h3>
                <p style={{ fontSize: 12, color: TEXT_DIM, marginTop: 4, marginBottom: 20 }}>Effort (X) vs Upside (Y) — bubble size = low risk</p>
                {bubbleData.length === 0
                  ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 260, color: TEXT_DIM, fontSize: 13 }}>Log ideas to see your matrix</div>
                  : (
                    <ResponsiveContainer width="100%" height={280}>
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                        <CartesianGrid {...GRID_STYLE} />
                        <XAxis dataKey="x" type="number" domain={[0, 11]} tick={AXIS_STYLE} axisLine={false} tickLine={false}
                          label={{ value: "Effort →", position: "insideBottom", offset: -10, fill: TEXT_DIM, fontSize: 11 }} />
                        <YAxis dataKey="y" type="number" domain={[0, 11]} tick={AXIS_STYLE} axisLine={false} tickLine={false}
                          label={{ value: "Upside ↑", angle: -90, position: "insideLeft", fill: TEXT_DIM, fontSize: 11 }} />
                        <ZAxis dataKey="z" range={[60, 500]} />
                        <Tooltip cursor={false} content={({ payload }) => {
                          if (!payload?.[0]) return null;
                          const d = payload[0].payload;
                          const meta = CATEGORY_META[d.category];
                          return (
                            <div style={{ background: "#0D0D24", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 14px" }}>
                              <p style={{ fontWeight: 800, fontSize: 13, color: TEXT, margin: "0 0 4px" }}>{d.name}</p>
                              <Badge label={meta.label} color={meta.color} />
                              <p style={{ fontSize: 11, color: TEXT_DIM, marginTop: 6 }}>Score: {d.score}/10</p>
                            </div>
                          );
                        }} />
                        {Object.entries(CATEGORY_META).map(([cat, meta]) => (
                          <Scatter key={cat} data={bubbleData.filter(d => d.category === cat)} fill={meta.color} fillOpacity={0.8} />
                        ))}
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {Object.entries(CATEGORY_META).map(([key, meta]) => <Badge key={key} label={meta.label} color={meta.color} />)}
                </div>
              </Card>
            </div>

            {/* Ideas ranked list */}
            {ideas.length > 0 && (
              <Card style={{ padding: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 6px" }}>All Ideas — ranked by opportunity score</h3>
                <p style={{ fontSize: 12, color: TEXT_DIM, margin: "0 0 20px" }}>Score = (upside×2 − downside − effort×0.5) / 1.75. Kelly = weekly hours to invest.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...ideas]
                    .sort((a, b) => opportunityScore(b.upside, b.downside, b.effort) - opportunityScore(a.upside, a.downside, a.effort))
                    .map((idea, i) => {
                      const meta  = CATEGORY_META[idea.category ?? "standard"];
                      const score = opportunityScore(idea.upside, idea.downside, idea.effort);
                      const kelly = kellyHours(idea.upside, idea.downside, idea.effort);
                      return (
                        <div key={idea.id} style={{
                          display: "flex", alignItems: "center", gap: 14,
                          padding: "14px 18px", borderRadius: 14,
                          background: i === 0 ? `${P.purple}12` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${i === 0 ? `${P.purple}40` : BORDER}`,
                          boxShadow: i === 0 ? `0 0 20px ${P.purple}15` : "none",
                        }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0,
                            background: i === 0 ? P.purple : "rgba(255,255,255,0.1)",
                          }}>{i + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 700, color: TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{idea.title}</p>
                            <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: TEXT_DIM }}>
                              <span style={{ color: P.emerald }}>↑{idea.upside} upside</span>
                              <span style={{ color: P.red }}>↓{idea.downside} risk</span>
                              <span style={{ color: P.orange }}>⚙{idea.effort} effort</span>
                              <span style={{ color: P.cyan }}>Kelly: {kelly} hrs/wk</span>
                            </div>
                          </div>
                          <Badge label={meta.label} color={meta.color} />
                          <ScoreRing score={score} color={meta.color} size={44} />
                          <button onClick={() => idea.id && deleteIdea(idea.id)}
                            style={{ background: "none", border: "none", color: TEXT_DIM, cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }}>×</button>
                        </div>
                      );
                    })}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════ DAILY LOG ═══════════════════════════════════ */}
        {tab === "Daily Log" && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <SectionHead title="Daily Log" sub="Track what you actually did and what it produced. Honesty over positivity." />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <Card style={{ padding: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 20px" }}>Log today&apos;s output</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {([["Output type", "output_type", ["content", "deep_work", "sales", "admin", "learning", "building", "marketing"]], ["Unit", "output_unit", ["hours", "videos", "posts", "calls", "tasks", "pages"]]] as const).map(([lbl, key, opts]) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>{lbl}</label>
                      <select className={inputCls} style={inputStyle} value={(logForm as Record<string, unknown>)[key] as string} onChange={e => setLogForm(f => ({ ...f, [key]: e.target.value }))}>
                        {opts.map((o: string) => <option key={o} style={{ background: SURFACE }}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                  {[["What did you do?", "output_description", "text", "e.g. Filmed 3 TikToks"], ["Quantity", "output_quantity", "number", ""]].map(([lbl, key, type, ph]) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>{lbl}</label>
                      <input type={type} className={inputCls} style={inputStyle} placeholder={ph}
                        value={(logForm as Record<string, unknown>)[key] as string}
                        onChange={e => setLogForm(f => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))} />
                    </div>
                  ))}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[["Revenue (£)", "outcome_revenue"], ["New followers", "outcome_followers"]].map(([lbl, key]) => (
                      <div key={key}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>{lbl}</label>
                        <input type="number" className={inputCls} style={inputStyle}
                          value={(logForm as Record<string, unknown>)[key] as number}
                          onChange={e => setLogForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Notes</label>
                    <textarea rows={2} className={inputCls} style={{ ...inputStyle, resize: "none" }} placeholder="How did today actually feel?"
                      value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <SubmitBtn onClick={saveLog} loading={logSaving} label="Log today →" color={P.emerald} />
                </div>
              </Card>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Card style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 16px" }}>Revenue over time</h3>
                  {chartData.length === 0
                    ? <p style={{ fontSize: 13, color: TEXT_DIM }}>No logs yet.</p>
                    : <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={chartData}>
                          <CartesianGrid {...GRID_STYLE} />
                          <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                          <Tooltip {...TOOLTIP_STYLE} />
                          <Bar dataKey="revenue" fill={P.emerald} radius={[4, 4, 0, 0]} name="Revenue £" />
                        </BarChart>
                      </ResponsiveContainer>}
                </Card>
                <Card style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 16px" }}>Follower growth</h3>
                  {chartData.length === 0
                    ? <p style={{ fontSize: 13, color: TEXT_DIM }}>No logs yet.</p>
                    : <ResponsiveContainer width="100%" height={130}>
                        <LineChart data={chartData}>
                          <CartesianGrid {...GRID_STYLE} />
                          <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                          <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                          <Tooltip {...TOOLTIP_STYLE} />
                          <Line type="monotone" dataKey="followers" stroke={P.violet} strokeWidth={2} dot={{ r: 3, fill: P.violet }} name="Followers" />
                        </LineChart>
                      </ResponsiveContainer>}
                </Card>
              </div>
            </div>

            {logs.length > 0 && (
              <Card style={{ padding: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 16px" }}>Recent logs</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {logs.slice(0, 10).map(l => (
                    <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, width: 40, flexShrink: 0 }}>{l.date?.slice(5)}</span>
                      <Badge label={l.output_type ?? ""} color={P.violet} />
                      <p style={{ flex: 1, fontSize: 13, color: TEXT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.output_description}</p>
                      <span style={{ fontSize: 12, fontWeight: 700, color: P.emerald, flexShrink: 0 }}>£{l.outcome_revenue}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: P.violet, flexShrink: 0 }}>+{l.outcome_followers}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════ GOALS ═══════════════════════════════════ */}
        {tab === "Goals" && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <SectionHead title="Goals" sub="Set targets, track progress, stay honest." />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <Card style={{ padding: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 20px" }}>Add a goal</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Goal</label>
                    <input className={inputCls} style={inputStyle} placeholder="e.g. Hit £10k/month revenue"
                      value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {([["Category", "category", ["revenue", "audience", "product", "personal", "fitness", "learning"]], ["Unit", "unit", []]] as const).map(([lbl, key, opts]) => (
                      <div key={key}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>{lbl}</label>
                        {opts.length > 0
                          ? <select className={inputCls} style={inputStyle} value={(goalForm as Record<string, unknown>)[key] as string} onChange={e => setGoalForm(f => ({ ...f, [key]: e.target.value }))}>
                              {opts.map((o: string) => <option key={o} style={{ background: SURFACE }}>{o}</option>)}
                            </select>
                          : <input className={inputCls} style={inputStyle} placeholder="£, followers, kg..." value={goalForm.unit} onChange={e => setGoalForm(f => ({ ...f, unit: e.target.value }))} />}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[["Target", "target_value"], ["Current", "current_value"]].map(([lbl, key]) => (
                      <div key={key}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>{lbl}</label>
                        <input type="number" className={inputCls} style={inputStyle}
                          value={(goalForm as Record<string, unknown>)[key] as number}
                          onChange={e => setGoalForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Deadline</label>
                    <input type="date" className={inputCls} style={{ ...inputStyle, colorScheme: "dark" }}
                      value={goalForm.deadline} onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))} />
                  </div>
                  <SubmitBtn onClick={saveGoal} loading={goalSaving} disabled={!goalForm.title.trim()} label="Add goal →" color={P.blue} />
                </div>
              </Card>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {goals.length === 0
                  ? <Card style={{ padding: 40, textAlign: "center" }}><p style={{ color: TEXT_DIM, fontSize: 13 }}>No goals yet. Add your first one.</p></Card>
                  : goals.map(g => {
                    const pct = g.target_value ? Math.min(100, ((g.current_value ?? 0) / g.target_value) * 100) : 0;
                    const c   = g.category === "revenue" ? P.emerald : g.category === "audience" ? P.violet : P.blue;
                    return (
                      <Card key={g.id} style={{ padding: 22 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div>
                            <Badge label={g.category ?? ""} color={c} />
                            <p style={{ fontWeight: 800, color: TEXT, margin: "6px 0 0", fontSize: 15 }}>{g.title}</p>
                            {g.deadline && <p style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>Due {g.deadline}</p>}
                          </div>
                          <span style={{
                            fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em",
                            background: `linear-gradient(135deg, ${pct >= 100 ? P.emerald : c}, white)`,
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                          }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 8, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 12 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? P.emerald : c, borderRadius: 8, boxShadow: `0 0 10px ${c}50`, transition: "width 0.8s" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: TEXT_DIM }}>
                          <span>Update:</span>
                          <input type="number" defaultValue={g.current_value}
                            onBlur={e => g.id && updateGoalProgress(g.id, Number(e.target.value))}
                            style={{ width: 80, background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "3px 8px", color: TEXT, fontSize: 12, outline: "none" }} />
                          <span>/ {g.target_value} {g.unit}</span>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════ ADVISOR ═══════════════════════════════════ */}
        {tab === "Advisor" && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <SectionHead title="Asymmetry Advisor" sub="Answer 5 questions honestly. Get your daily plan ranked by opportunity score." />

            {/* Insight banner */}
            <div style={{
              padding: "20px 24px", borderRadius: 18,
              background: `linear-gradient(135deg, #2D0B6B, ${P.purple}CC)`,
              border: `1px solid ${P.purple}50`,
              boxShadow: `0 0 40px ${P.purple}25`,
            }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: P.violet, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>Today&apos;s Insight</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: 0 }}>{insight}</p>
            </div>

            {/* Portfolio health */}
            {ideas.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div style={{
                  padding: "20px 22px", borderRadius: 18,
                  background: `linear-gradient(135deg, ${gradeColor}18, ${gradeColor}06)`,
                  border: `1px solid ${gradeColor}35`,
                  boxShadow: `0 0 24px ${gradeColor}12`,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: gradeColor, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Portfolio Grade</p>
                  <p style={{
                    fontSize: 40, fontWeight: 900, letterSpacing: "-0.05em", margin: 0,
                    background: `linear-gradient(135deg, ${gradeColor}, white)`,
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>{health.grade}</p>
                  <p style={{ fontSize: 12, color: TEXT_DIM, marginTop: 4 }}>{health.label} · {health.score}/100</p>
                </div>
                <Card style={{ padding: "20px 22px" }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px" }}>Breakdown</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: P.emerald }}>Asymmetric</span>
                      <span style={{ color: TEXT, fontWeight: 700 }}>{health.asymmetricPct.toFixed(0)}%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: P.red }}>Traps</span>
                      <span style={{ color: TEXT, fontWeight: 700 }}>{health.trapPct.toFixed(0)}%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: P.cyan }}>Avg Score</span>
                      <span style={{ color: TEXT, fontWeight: 700 }}>{health.avgScore.toFixed(1)}/10</span>
                    </div>
                  </div>
                </Card>
                <Card style={{ padding: "20px 22px" }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px" }}>
                    {health.issues.length > 0 ? "Fix These" : "Strengths"}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(health.issues.length > 0 ? health.issues : health.strengths).slice(0, 3).map((s, i) => (
                      <p key={i} style={{ fontSize: 12, color: health.issues.length > 0 ? P.orange : P.emerald, margin: 0 }}>
                        {health.issues.length > 0 ? "⚠ " : "✓ "}{s}
                      </p>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Morning check-in */}
            {!todoGenerated && (
              <Card style={{ padding: 28 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 6px" }}>Morning check-in</h3>
                <p style={{ fontSize: 12, color: TEXT_DIM, margin: "0 0 24px" }}>Answer honestly. This shapes your to-do list.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {MORNING_QUESTIONS.map((q, i) => (
                    <div key={i}>
                      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0, marginTop: 1,
                          background: morningAnswers[i]?.trim() ? P.emerald : P.purple,
                        }}>{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{q}</span>
                      </label>
                      <textarea rows={2} className={inputCls} style={{ ...inputStyle, resize: "none" }}
                        placeholder="Be honest..."
                        value={morningAnswers[i] ?? ""}
                        onChange={e => setMorningAnswers(prev => ({ ...prev, [i]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 24 }}>
                  <SubmitBtn
                    onClick={generateTodo}
                    loading={advisorLoading}
                    disabled={!allAnswered || ideas.length === 0}
                    label={
                      ideas.length === 0 ? "Add ideas in Idea Lab first" :
                      !allAnswered ? `Answer all ${MORNING_QUESTIONS.length} questions to unlock` :
                      "Generate my daily plan →"
                    }
                  />
                </div>
              </Card>
            )}

            {/* Generated to-do */}
            {todoGenerated && todayTodos.length > 0 && (
              <Card style={{ padding: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Today&apos;s Plan — ranked by opportunity</h3>
                  <button onClick={() => { setTodoGenerated(false); setCheckedTodos(new Set()); }}
                    style={{ background: "none", border: "none", color: TEXT_DIM, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    Redo check-in
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {todayTodos.map((t, i) => {
                    const done = checkedTodos.has(i);
                    const meta = CATEGORY_META[t.category ?? "standard"];
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 18px", borderRadius: 14,
                        background: done ? "rgba(255,255,255,0.02)" : i === 0 ? `${P.purple}15` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${done ? BORDER : i === 0 ? `${P.purple}45` : BORDER}`,
                        boxShadow: i === 0 && !done ? `0 0 20px ${P.purple}18` : "none",
                        opacity: done ? 0.4 : 1, transition: "all 0.2s",
                      }}>
                        <input type="checkbox" checked={done}
                          onChange={() => setCheckedTodos(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; })}
                          style={{ marginTop: 3, accentColor: P.purple, cursor: "pointer" }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0, textDecoration: done ? "line-through" : "none" }}>{t.task}</p>
                          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                            <Badge label={t.priority} color={t.priority === "high" ? P.purple : t.priority === "medium" ? P.cyan : TEXT_DIM} />
                            {t.estimated_time && <span style={{ fontSize: 11, color: TEXT_DIM }}>⏱ {t.estimated_time}</span>}
                            <Badge label={meta.label} color={meta.color} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: 12, color: TEXT_DIM, marginTop: 14 }}>
                  {checkedTodos.size}/{todayTodos.length} complete
                  {checkedTodos.size === todayTodos.length && todayTodos.length > 0 ? " · Legendary day. 🎉" : ""}
                </p>
              </Card>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════ PROFILE ═══════════════════════════════════ */}
        {tab === "Profile" && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <SectionHead title="Founder Profile" sub="The more honest you are here, the better the advisor works." />

            <Card style={{ padding: 32 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {[["Your name", "name", "text", "Joshua"], ["Risk tolerance", "risk_tolerance", "select", ""]].map(([lbl, key, type]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>{lbl}</label>
                    {type === "select"
                      ? <select className={inputCls} style={inputStyle}
                          value={profileForm.risk_tolerance ?? "medium"}
                          onChange={e => setProfileForm(f => ({ ...f, risk_tolerance: e.target.value }))}>
                          {["low", "medium", "high"].map(r => <option key={r} style={{ background: SURFACE }}>{r}</option>)}
                        </select>
                      : <input type="text" className={inputCls} style={inputStyle} placeholder="Joshua"
                          value={(profileForm as Record<string, unknown>)[key] as string ?? ""}
                          onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))} />}
                  </div>
                ))}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Your current situation</label>
                  <textarea rows={3} className={inputCls} style={{ ...inputStyle, resize: "none" }}
                    placeholder="e.g. 20 years old, running Brick Whips, 150k Instagram followers, ~£5k/month. Want to build a SaaS..."
                    value={profileForm.situation ?? ""} onChange={e => setProfileForm(f => ({ ...f, situation: e.target.value }))} />
                </div>
                {[["Runway (months)", "runway_months"], ["Monthly revenue goal (£)", "monthly_revenue_goal"], ["Current monthly revenue (£)", "current_monthly_revenue"]].map(([lbl, key]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>{lbl}</label>
                    <input type="number" className={inputCls} style={inputStyle}
                      value={(profileForm as Record<string, unknown>)[key] as number ?? 0}
                      onChange={e => setProfileForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Top skills</label>
                  <input type="text" className={inputCls} style={inputStyle} placeholder="social media, sales, content creation"
                    value={(profileForm.top_skills ?? []).join(", ")}
                    onChange={e => setProfileForm(f => ({ ...f, top_skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: TEXT_DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Constraints & context</label>
                  <textarea rows={2} className={inputCls} style={{ ...inputStyle, resize: "none" }}
                    placeholder="e.g. No technical co-founder. Limited to evenings..."
                    value={profileForm.constraints ?? ""} onChange={e => setProfileForm(f => ({ ...f, constraints: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: 24 }}>
                <SubmitBtn onClick={saveProfile} loading={profileSaving} label={profile?.id ? "Update profile →" : "Save profile →"} />
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
