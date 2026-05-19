"use client";
import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip, CartesianGrid, LineChart, Line, Legend, BarChart, Bar,
  RadialBarChart, RadialBar, Cell,
} from "recharts";
import { supabase, categoriseIdea, opportunityScore } from "@/lib/supabase";
import { MORNING_QUESTIONS, generateTodoFromIdeas, getAdvisorInsight } from "@/lib/advisor";
import type { Idea, DailyLog, Goal, FounderProfile, DailyPlan, TodoItem } from "@/lib/supabase";

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  purple: "#7C3AED", purpleLight: "#EDE9FE",
  emerald: "#059669", emeraldLight: "#D1FAE5",
  orange: "#EA580C", orangeLight: "#FFF7ED",
  blue: "#2563EB", blueLight: "#EFF6FF",
  red: "#DC2626", redLight: "#FEF2F2",
  amber: "#D97706", amberLight: "#FFFBEB",
  gray: "#6B7280",
};

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  asymmetric: { label: "Asymmetric",  color: C.emerald, bg: C.emeraldLight, desc: "High upside, low risk — priority" },
  easy_win:   { label: "Easy Win",    color: C.blue,    bg: C.blueLight,    desc: "Good reward, low effort" },
  grind:      { label: "Grind",       color: C.amber,   bg: C.amberLight,   desc: "High effort but worth it" },
  standard:   { label: "Standard",    color: C.gray,    bg: "#F3F4F6",      desc: "Balanced idea" },
  trap:       { label: "The Trap",    color: C.red,     bg: C.redLight,     desc: "High effort, low reward — avoid" },
};

const TABS = ["Overview", "Idea Lab", "Daily Log", "Goals", "Advisor", "Profile"] as const;
type Tab = typeof TABS[number];

const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
const labelCls = "block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5";

// ── Slider ───────────────────────────────────────────────────────────────────
function Slider({ label, value, onChange, color, desc }: {
  label: string; value: number; onChange: (v: number) => void;
  color: string; desc?: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="text-sm font-bold text-gray-700">{label}</label>
        <span className="text-sm font-extrabold" style={{ color }}>{value}/10</span>
      </div>
      {desc && <p className="text-xs text-gray-400 mb-2">{desc}</p>}
      <input type="range" min={1} max={10} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: color }} />
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, bg }: { label: string; value: string | number; sub?: string; color: string; bg: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: bg, border: `1.5px solid ${color}20` }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
      <p className="text-2xl font-extrabold text-gray-900" style={{ letterSpacing: "-0.03em" }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("Overview");

  // Data
  const [ideas,    setIdeas]    = useState<Idea[]>([]);
  const [logs,     setLogs]     = useState<DailyLog[]>([]);
  const [goals,    setGoals]    = useState<Goal[]>([]);
  const [profile,  setProfile]  = useState<FounderProfile | null>(null);
  const [plan,     setPlan]     = useState<DailyPlan | null>(null);
  const [loading,  setLoading]  = useState(true);

  // Idea form
  const [ideaForm, setIdeaForm] = useState({ title: "", description: "", upside: 5, downside: 5, effort: 5 });
  const [ideaSaving, setIdeaSaving] = useState(false);

  // Log form
  const [logForm, setLogForm] = useState({
    output_type: "content", output_description: "", output_quantity: 1,
    output_unit: "hours", outcome_revenue: 0, outcome_followers: 0, notes: "",
  });
  const [logSaving, setLogSaving] = useState(false);

  // Goal form
  const [goalForm, setGoalForm] = useState({ title: "", category: "revenue", target_value: 0, current_value: 0, unit: "£", deadline: "" });
  const [goalSaving, setGoalSaving] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState<FounderProfile>({
    name: "", situation: "", runway_months: 6, monthly_revenue_goal: 5000,
    current_monthly_revenue: 0, risk_tolerance: "medium", top_skills: [], constraints: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Advisor
  const [morningAnswers, setMorningAnswers] = useState<Record<string, string>>({});
  const [todayTodos, setTodayTodos]         = useState<TodoItem[]>([]);
  const [todoGenerated, setTodoGenerated]   = useState(false);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [checkedTodos, setCheckedTodos]     = useState<Set<number>>(new Set());

  // Load all data
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
    if (planRes.data)    {
      setPlan(planRes.data);
      if (planRes.data.morning_answers) setMorningAnswers(planRes.data.morning_answers);
      if (planRes.data.todo_items)      { setTodayTodos(planRes.data.todo_items); setTodoGenerated(true); }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save idea ──────────────────────────────────────────────────────────────
  const saveIdea = async () => {
    if (!ideaForm.title.trim()) return;
    setIdeaSaving(true);
    const category = categoriseIdea(ideaForm.upside, ideaForm.downside, ideaForm.effort);
    await supabase.from("ideas").insert({ ...ideaForm, category });
    setIdeaForm({ title: "", description: "", upside: 5, downside: 5, effort: 5 });
    await load();
    setIdeaSaving(false);
  };

  // ── Save log ───────────────────────────────────────────────────────────────
  const saveLog = async () => {
    setLogSaving(true);
    await supabase.from("daily_logs").insert({ ...logForm, date: new Date().toISOString().split("T")[0] });
    setLogForm({ output_type: "content", output_description: "", output_quantity: 1, output_unit: "hours", outcome_revenue: 0, outcome_followers: 0, notes: "" });
    await load();
    setLogSaving(false);
  };

  // ── Save goal ──────────────────────────────────────────────────────────────
  const saveGoal = async () => {
    if (!goalForm.title.trim()) return;
    setGoalSaving(true);
    await supabase.from("goals").insert(goalForm);
    setGoalForm({ title: "", category: "revenue", target_value: 0, current_value: 0, unit: "£", deadline: "" });
    await load();
    setGoalSaving(false);
  };

  // ── Update goal progress ───────────────────────────────────────────────────
  const updateGoalProgress = async (id: string, value: number) => {
    await supabase.from("goals").update({ current_value: value }).eq("id", id);
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current_value: value } : g));
  };

  // ── Delete idea ────────────────────────────────────────────────────────────
  const deleteIdea = async (id: string) => {
    await supabase.from("ideas").delete().eq("id", id);
    setIdeas(prev => prev.filter(i => i.id !== id));
  };

  // ── Save profile ───────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setProfileSaving(true);
    if (profile?.id) {
      await supabase.from("founder_profile").update({ ...profileForm, updated_at: new Date().toISOString() }).eq("id", profile.id);
    } else {
      const { data } = await supabase.from("founder_profile").insert({ ...profileForm, updated_at: new Date().toISOString() }).select().single();
      if (data) setProfile(data);
    }
    await load();
    setProfileSaving(false);
  };

  // ── Generate to-do ─────────────────────────────────────────────────────────
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

  // ── Derived data ───────────────────────────────────────────────────────────
  const bubbleData = ideas.map(i => ({
    x: i.effort, y: i.upside, z: 10 - i.downside,
    name: i.title, category: i.category ?? "standard",
    score: opportunityScore(i.upside, i.downside, i.effort),
  }));

  const revenueChartData = [...logs].reverse().slice(-14).map(l => ({
    date: l.date?.slice(5) ?? "",
    revenue: l.outcome_revenue ?? 0,
    hours: l.output_quantity ?? 0,
    followers: l.outcome_followers ?? 0,
  }));

  const totalRevenue   = logs.reduce((s, l) => s + (l.outcome_revenue ?? 0), 0);
  const totalFollowers = logs.reduce((s, l) => s + (l.outcome_followers ?? 0), 0);
  const asymmetricCount = ideas.filter(i => i.category === "asymmetric").length;
  const trapCount       = ideas.filter(i => i.category === "trap").length;
  const insight         = getAdvisorInsight(ideas, profile);

  const allAnswered = MORNING_QUESTIONS.every((_, i) => morningAnswers[i]?.trim());

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fafafa" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="spinner" />
        <p className="text-sm text-gray-400">Loading your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#fafafa" }}>
      {/* ── Top nav ── */}
      <header className="sticky top-0 z-50 border-b border-gray-100" style={{ background: "rgba(250,250,250,0.95)", backdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: C.purple }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L13 4.5V9c0 2.5-2 4.5-5 5.5C5 13.5 3 11.5 3 9V4.5L8 2z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M6 8l1.5 1.5L10.5 6" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-base font-extrabold text-gray-900" style={{ letterSpacing: "-0.02em" }}>Founder</span>
            </a>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: C.purpleLight, color: C.purple }}>Dashboard</span>
          </div>

          <nav className="flex items-center gap-1">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition-all"
                style={tab === t
                  ? { background: C.purple, color: "white" }
                  : { color: "#6B7280", background: "transparent" }}>
                {t}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* ── OVERVIEW ── */}
        {tab === "Overview" && (
          <div className="space-y-6 fade-up">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900" style={{ letterSpacing: "-0.03em" }}>
                {profile?.name ? `Good morning, ${profile.name.split(" ")[0]} 👋` : "Good morning 👋"}
              </h1>
              <p className="text-sm text-gray-400 mt-1">{insight}</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Total Ideas"      value={ideas.length}     sub={`${asymmetricCount} asymmetric`} color={C.purple}  bg={C.purpleLight} />
              <StatCard label="Revenue (30d)"    value={`£${totalRevenue.toLocaleString()}`} sub="from logged outcomes" color={C.emerald} bg={C.emeraldLight} />
              <StatCard label="Followers Gained" value={totalFollowers.toLocaleString()} sub="last 30 days"   color={C.blue}    bg={C.blueLight} />
              <StatCard label="Runway"           value={`${profile?.runway_months ?? "?"} mo`} sub={trapCount > 0 ? `${trapCount} traps to drop` : "On track"} color={C.orange} bg={C.orangeLight} />
            </div>

            {/* Idea categories */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                <h3 className="text-sm font-extrabold text-gray-900 mb-4">Idea Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(CATEGORY_META).map(([key, meta]) => {
                    const count = ideas.filter(i => i.category === key).length;
                    const pct   = ideas.length > 0 ? (count / ideas.length) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                          <span className="text-gray-400">{count} ideas</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: meta.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                <h3 className="text-sm font-extrabold text-gray-900 mb-4">Revenue vs Output (14 days)</h3>
                {revenueChartData.length === 0
                  ? <p className="text-sm text-gray-400">Log your daily output to see the correlation.</p>
                  : (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={revenueChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="revenue"   stroke={C.emerald} strokeWidth={2} dot={false} name="Revenue £" />
                        <Line type="monotone" dataKey="followers" stroke={C.purple}  strokeWidth={2} dot={false} name="Followers" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
              </div>
            </div>

            {/* Goals progress */}
            {goals.length > 0 && (
              <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                <h3 className="text-sm font-extrabold text-gray-900 mb-4">Goals Progress</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {goals.map(g => {
                    const pct = g.target_value ? Math.min(100, ((g.current_value ?? 0) / g.target_value) * 100) : 0;
                    return (
                      <div key={g.id}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-bold text-gray-800">{g.title}</span>
                          <span className="text-gray-400">{g.current_value}/{g.target_value} {g.unit}</span>
                        </div>
                        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? C.emerald : C.purple }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{pct.toFixed(0)}% complete{g.deadline ? ` · Due ${g.deadline}` : ""}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Today's plan */}
            {todayTodos.length > 0 && (
              <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                <h3 className="text-sm font-extrabold text-gray-900 mb-4">Today&apos;s Plan</h3>
                <div className="space-y-2">
                  {todayTodos.map((t, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl p-3 transition-all"
                      style={{ background: checkedTodos.has(i) ? "#F9FAFB" : t.priority === "high" ? C.purpleLight : "#F9FAFB", opacity: checkedTodos.has(i) ? 0.5 : 1 }}>
                      <input type="checkbox" checked={checkedTodos.has(i)}
                        onChange={() => setCheckedTodos(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; })}
                        className="mt-0.5 rounded" style={{ accentColor: C.purple }} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900" style={{ textDecoration: checkedTodos.has(i) ? "line-through" : "none" }}>{t.task}</p>
                        <div className="flex gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: t.priority === "high" ? C.purple : C.gray }}>{t.priority} priority</span>
                          {t.estimated_time && <span className="text-xs text-gray-400">· {t.estimated_time}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── IDEA LAB ── */}
        {tab === "Idea Lab" && (
          <div className="space-y-6 fade-up">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900" style={{ letterSpacing: "-0.03em" }}>Idea Lab</h1>
              <p className="text-sm text-gray-400 mt-1">Score every idea on upside, risk, and effort. The matrix tells you what to focus on.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Form */}
              <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                <h3 className="text-sm font-extrabold text-gray-900 mb-4">Log a new idea</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Idea title</label>
                    <input type="text" className={inputCls} placeholder="e.g. Premium car fragrance brand"
                      value={ideaForm.title} onChange={e => setIdeaForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Description (optional)</label>
                    <textarea rows={2} className={inputCls + " resize-none"} placeholder="Brief description..."
                      value={ideaForm.description} onChange={e => setIdeaForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <Slider label="Upside" value={ideaForm.upside} onChange={v => setIdeaForm(f => ({ ...f, upside: v }))}
                    color={C.emerald} desc="How big is the potential reward?" />
                  <Slider label="Downside / Risk" value={ideaForm.downside} onChange={v => setIdeaForm(f => ({ ...f, downside: v }))}
                    color={C.red} desc="How bad if it fails? (10 = catastrophic)" />
                  <Slider label="Effort" value={ideaForm.effort} onChange={v => setIdeaForm(f => ({ ...f, effort: v }))}
                    color={C.orange} desc="How much time/energy does this require?" />

                  {/* Live preview */}
                  {(() => {
                    const cat   = categoriseIdea(ideaForm.upside, ideaForm.downside, ideaForm.effort);
                    const score = opportunityScore(ideaForm.upside, ideaForm.downside, ideaForm.effort);
                    const meta  = CATEGORY_META[cat];
                    return (
                      <div className="rounded-xl p-4 flex items-center justify-between"
                        style={{ background: meta.bg, border: `1.5px solid ${meta.color}30` }}>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{meta.desc}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-extrabold" style={{ color: meta.color }}>{score}</p>
                          <p className="text-xs text-gray-400">score</p>
                        </div>
                      </div>
                    );
                  })()}

                  <button onClick={saveIdea} disabled={ideaSaving || !ideaForm.title.trim()}
                    className="submit-btn"
                    style={{ background: `linear-gradient(135deg, #6D28D9, ${C.purple})`, boxShadow: `0 4px 16px ${C.purple}40` }}>
                    {ideaSaving ? "Saving..." : "Log this idea →"}
                  </button>
                </div>
              </div>

              {/* Bubble chart */}
              <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                <h3 className="text-sm font-extrabold text-gray-900 mb-1">Priority Matrix</h3>
                <p className="text-xs text-gray-400 mb-4">Effort (X) vs Upside (Y) — bubble size = low risk</p>
                {bubbleData.length === 0
                  ? <div className="flex items-center justify-center h-64 text-sm text-gray-400">Log ideas to see your matrix</div>
                  : (
                    <ResponsiveContainer width="100%" height={280}>
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="x" name="Effort"  type="number" domain={[0, 11]} tick={{ fontSize: 11 }} label={{ value: "Effort →", position: "insideBottom", offset: -5, fontSize: 11 }} />
                        <YAxis dataKey="y" name="Upside"  type="number" domain={[0, 11]} tick={{ fontSize: 11 }} label={{ value: "Upside ↑", angle: -90, position: "insideLeft", fontSize: 11 }} />
                        <ZAxis dataKey="z" range={[40, 400]} />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => {
                          if (!payload?.[0]) return null;
                          const d = payload[0].payload;
                          const meta = CATEGORY_META[d.category];
                          return (
                            <div className="rounded-xl bg-white p-3 shadow-lg border border-gray-100 text-xs">
                              <p className="font-bold text-gray-900 mb-1">{d.name}</p>
                              <p style={{ color: meta?.color }}>{meta?.label}</p>
                              <p className="text-gray-400">Score: {d.score}/10</p>
                            </div>
                          );
                        }} />
                        {Object.entries(CATEGORY_META).map(([cat, meta]) => (
                          <Scatter key={cat} name={meta.label}
                            data={bubbleData.filter(d => d.category === cat)}
                            fill={meta.color} fillOpacity={0.75} />
                        ))}
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                {/* Legend */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <span key={key} className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                      style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Idea list */}
            {ideas.length > 0 && (
              <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                <h3 className="text-sm font-extrabold text-gray-900 mb-4">All Ideas — ranked by opportunity score</h3>
                <div className="space-y-2">
                  {[...ideas]
                    .sort((a, b) => opportunityScore(b.upside, b.downside, b.effort) - opportunityScore(a.upside, a.downside, a.effort))
                    .map((idea, i) => {
                      const meta  = CATEGORY_META[idea.category ?? "standard"];
                      const score = opportunityScore(idea.upside, idea.downside, idea.effort);
                      return (
                        <div key={idea.id} className="flex items-center gap-4 rounded-xl p-4"
                          style={{ background: i === 0 ? C.purpleLight : "#F9FAFB", border: `1.5px solid ${i === 0 ? C.purple + "30" : "#F3F4F6"}` }}>
                          <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold text-white"
                            style={{ background: i === 0 ? C.purple : "#D1D5DB" }}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate">{idea.title}</p>
                            <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                              <span>↑{idea.upside} upside</span>
                              <span>↓{idea.downside} risk</span>
                              <span>⚙{idea.effort} effort</span>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                            style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                          <span className="shrink-0 text-lg font-extrabold" style={{ color: meta.color }}>{score}</span>
                          <button onClick={() => idea.id && deleteIdea(idea.id)}
                            className="shrink-0 text-gray-300 hover:text-red-400 transition-colors text-sm">✕</button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DAILY LOG ── */}
        {tab === "Daily Log" && (
          <div className="space-y-6 fade-up">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900" style={{ letterSpacing: "-0.03em" }}>Daily Log</h1>
              <p className="text-sm text-gray-400 mt-1">Track what you actually did and what it produced. Honesty over positivity.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Log form */}
              <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                <h3 className="text-sm font-extrabold text-gray-900 mb-4">Log today&apos;s output</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Output type</label>
                      <select className={inputCls} value={logForm.output_type} onChange={e => setLogForm(f => ({ ...f, output_type: e.target.value }))}>
                        {["content", "deep_work", "sales", "admin", "learning", "building", "marketing"].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Unit</label>
                      <select className={inputCls} value={logForm.output_unit} onChange={e => setLogForm(f => ({ ...f, output_unit: e.target.value }))}>
                        {["hours", "videos", "posts", "calls", "tasks", "pages"].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>What did you do?</label>
                    <input type="text" className={inputCls} placeholder="e.g. Filmed 3 TikToks about car fragrances"
                      value={logForm.output_description} onChange={e => setLogForm(f => ({ ...f, output_description: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Quantity ({logForm.output_unit})</label>
                    <input type="number" className={inputCls} value={logForm.output_quantity}
                      onChange={e => setLogForm(f => ({ ...f, output_quantity: Number(e.target.value) }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Revenue generated (£)</label>
                      <input type="number" className={inputCls} value={logForm.outcome_revenue}
                        onChange={e => setLogForm(f => ({ ...f, outcome_revenue: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className={labelCls}>New followers</label>
                      <input type="number" className={inputCls} value={logForm.outcome_followers}
                        onChange={e => setLogForm(f => ({ ...f, outcome_followers: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Notes (optional)</label>
                    <textarea rows={2} className={inputCls + " resize-none"} placeholder="How did today actually feel?"
                      value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <button onClick={saveLog} disabled={logSaving} className="submit-btn"
                    style={{ background: `linear-gradient(135deg, #059669, #10B981)`, boxShadow: "0 4px 16px rgba(5,150,105,0.3)" }}>
                    {logSaving ? "Saving..." : "Log today →"}
                  </button>
                </div>
              </div>

              {/* Charts */}
              <div className="space-y-4">
                <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                  <h3 className="text-sm font-extrabold text-gray-900 mb-4">Revenue over time</h3>
                  {revenueChartData.length === 0
                    ? <p className="text-sm text-gray-400">No logs yet.</p>
                    : (
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={revenueChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="revenue" fill={C.emerald} radius={[4, 4, 0, 0]} name="Revenue £" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                </div>
                <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                  <h3 className="text-sm font-extrabold text-gray-900 mb-4">Follower growth</h3>
                  {revenueChartData.length === 0
                    ? <p className="text-sm text-gray-400">No logs yet.</p>
                    : (
                      <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={revenueChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="followers" stroke={C.purple} strokeWidth={2} dot={{ r: 3 }} name="Followers" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                </div>
              </div>
            </div>

            {/* Log history */}
            {logs.length > 0 && (
              <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                <h3 className="text-sm font-extrabold text-gray-900 mb-4">Recent logs</h3>
                <div className="space-y-2">
                  {logs.slice(0, 10).map(l => (
                    <div key={l.id} className="flex items-center gap-4 rounded-xl px-4 py-3" style={{ background: "#F9FAFB" }}>
                      <span className="text-xs font-bold text-gray-400 w-16">{l.date?.slice(5)}</span>
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: C.purpleLight, color: C.purple }}>{l.output_type}</span>
                      <p className="flex-1 text-sm text-gray-700 truncate">{l.output_description}</p>
                      <span className="text-xs font-bold text-emerald-600">£{l.outcome_revenue}</span>
                      <span className="text-xs font-bold" style={{ color: C.purple }}>+{l.outcome_followers} followers</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GOALS ── */}
        {tab === "Goals" && (
          <div className="space-y-6 fade-up">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900" style={{ letterSpacing: "-0.03em" }}>Goals</h1>
              <p className="text-sm text-gray-400 mt-1">Set targets, track progress, stay honest.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                <h3 className="text-sm font-extrabold text-gray-900 mb-4">Add a goal</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Goal</label>
                    <input type="text" className={inputCls} placeholder="e.g. Hit £10k/month revenue"
                      value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Category</label>
                      <select className={inputCls} value={goalForm.category} onChange={e => setGoalForm(f => ({ ...f, category: e.target.value }))}>
                        {["revenue", "audience", "product", "personal", "fitness", "learning"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Unit</label>
                      <input type="text" className={inputCls} placeholder="£, followers, kg..."
                        value={goalForm.unit} onChange={e => setGoalForm(f => ({ ...f, unit: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Target</label>
                      <input type="number" className={inputCls} value={goalForm.target_value}
                        onChange={e => setGoalForm(f => ({ ...f, target_value: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className={labelCls}>Current</label>
                      <input type="number" className={inputCls} value={goalForm.current_value}
                        onChange={e => setGoalForm(f => ({ ...f, current_value: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Deadline (optional)</label>
                    <input type="date" className={inputCls} value={goalForm.deadline}
                      onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))} />
                  </div>
                  <button onClick={saveGoal} disabled={goalSaving || !goalForm.title.trim()} className="submit-btn"
                    style={{ background: `linear-gradient(135deg, #1D4ED8, ${C.blue})`, boxShadow: "0 4px 16px rgba(37,99,235,0.3)" }}>
                    {goalSaving ? "Saving..." : "Add goal →"}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {goals.length === 0
                  ? <div className="rounded-2xl bg-white p-8 text-center" style={{ border: "1.5px solid #F3F4F6" }}>
                    <p className="text-sm text-gray-400">No goals yet. Add your first one.</p>
                  </div>
                  : goals.map(g => {
                    const pct = g.target_value ? Math.min(100, ((g.current_value ?? 0) / g.target_value) * 100) : 0;
                    const catColor = g.category === "revenue" ? C.emerald : g.category === "audience" ? C.purple : C.blue;
                    return (
                      <div key={g.id} className="rounded-2xl bg-white p-5" style={{ border: "1.5px solid #F3F4F6" }}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="rounded-full px-2.5 py-0.5 text-xs font-bold mb-1 inline-block"
                              style={{ background: catColor + "20", color: catColor }}>{g.category}</span>
                            <h4 className="font-extrabold text-gray-900">{g.title}</h4>
                            {g.deadline && <p className="text-xs text-gray-400">Due {g.deadline}</p>}
                          </div>
                          <span className="text-2xl font-extrabold" style={{ color: pct >= 100 ? C.emerald : catColor }}>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-gray-100 overflow-hidden mb-3">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? C.emerald : catColor }} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Update progress:</span>
                          <input type="number" className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                            defaultValue={g.current_value}
                            onBlur={e => g.id && updateGoalProgress(g.id, Number(e.target.value))} />
                          <span className="text-xs text-gray-400">/ {g.target_value} {g.unit}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ── ADVISOR ── */}
        {tab === "Advisor" && (
          <div className="space-y-6 fade-up">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900" style={{ letterSpacing: "-0.03em" }}>Asymmetry Advisor</h1>
              <p className="text-sm text-gray-400 mt-1">Answer 5 questions honestly. Get your daily plan ranked by opportunity score.</p>
            </div>

            {/* Insight banner */}
            <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, #3B0764, ${C.purple})` }}>
              <p className="text-xs font-bold uppercase tracking-widest text-purple-300 mb-1">Today&apos;s Insight</p>
              <p className="text-sm font-semibold text-white">{insight}</p>
            </div>

            {/* Morning questions */}
            {!todoGenerated && (
              <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                <h3 className="text-sm font-extrabold text-gray-900 mb-1">Morning check-in</h3>
                <p className="text-xs text-gray-400 mb-5">Answer honestly. This shapes your to-do list.</p>
                <div className="space-y-5">
                  {MORNING_QUESTIONS.map((q, i) => (
                    <div key={i}>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white mr-2"
                          style={{ background: C.purple }}>{i + 1}</span>
                        {q}
                      </label>
                      <textarea rows={2} className={inputCls + " resize-none"}
                        placeholder="Be honest..."
                        value={morningAnswers[i] ?? ""}
                        onChange={e => setMorningAnswers(prev => ({ ...prev, [i]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <button onClick={generateTodo}
                  disabled={advisorLoading || !allAnswered || ideas.length === 0}
                  className="submit-btn mt-5"
                  style={{ background: `linear-gradient(135deg, #6D28D9, ${C.purple})`, boxShadow: `0 4px 16px ${C.purple}40` }}>
                  {advisorLoading ? "Generating plan..." :
                   ideas.length === 0 ? "Add ideas first in Idea Lab" :
                   !allAnswered ? `Answer all ${MORNING_QUESTIONS.length} questions to unlock your plan` :
                   "Generate my daily plan →"}
                </button>
              </div>
            )}

            {/* Generated to-do */}
            {todoGenerated && todayTodos.length > 0 && (
              <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-gray-900">Today&apos;s Plan — ranked by opportunity</h3>
                  <button onClick={() => { setTodoGenerated(false); setCheckedTodos(new Set()); }}
                    className="text-xs font-semibold text-gray-400 hover:text-gray-600">Redo check-in</button>
                </div>
                <div className="space-y-3">
                  {todayTodos.map((t, i) => {
                    const meta = CATEGORY_META[t.category ?? "standard"];
                    return (
                      <div key={i} className="flex items-start gap-3 rounded-xl p-4 transition-all"
                        style={{ background: checkedTodos.has(i) ? "#F9FAFB" : i === 0 ? C.purpleLight : "#F9FAFB", border: `1.5px solid ${i === 0 && !checkedTodos.has(i) ? C.purple + "30" : "#F3F4F6"}`, opacity: checkedTodos.has(i) ? 0.5 : 1 }}>
                        <input type="checkbox" checked={checkedTodos.has(i)}
                          onChange={() => setCheckedTodos(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; })}
                          className="mt-0.5" style={{ accentColor: C.purple }} />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900" style={{ textDecoration: checkedTodos.has(i) ? "line-through" : "none" }}>{t.task}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <span className="rounded-full px-2 py-0.5 text-xs font-bold"
                              style={{ background: t.priority === "high" ? C.purpleLight : "#F3F4F6", color: t.priority === "high" ? C.purple : C.gray }}>
                              {t.priority} priority
                            </span>
                            {t.estimated_time && <span className="text-xs text-gray-400">⏱ {t.estimated_time}</span>}
                            {meta && <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-xl p-3 text-xs text-gray-500" style={{ background: "#F9FAFB" }}>
                  {checkedTodos.size} of {todayTodos.length} tasks done
                  {checkedTodos.size === todayTodos.length && todayTodos.length > 0 && " 🎉 Legendary day."}
                </div>
              </div>
            )}

            {/* Risk/reward analysis */}
            {ideas.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {Object.entries(CATEGORY_META).map(([key, meta]) => {
                  const matching = ideas.filter(i => i.category === key);
                  if (matching.length === 0) return null;
                  return (
                    <div key={key} className="rounded-2xl p-5" style={{ background: meta.bg, border: `1.5px solid ${meta.color}30` }}>
                      <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: meta.color }}>{meta.label}</p>
                      <p className="text-2xl font-extrabold text-gray-900 mb-1">{matching.length}</p>
                      <p className="text-xs text-gray-500 mb-3">{meta.desc}</p>
                      {matching.slice(0, 3).map((idea, i) => (
                        <p key={i} className="text-xs font-semibold text-gray-700 truncate">· {idea.title}</p>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE ── */}
        {tab === "Profile" && (
          <div className="space-y-6 fade-up">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900" style={{ letterSpacing: "-0.03em" }}>Founder Profile</h1>
              <p className="text-sm text-gray-400 mt-1">The more honest you are here, the better the advisor works.</p>
            </div>

            <div className="rounded-2xl bg-white p-6" style={{ border: "1.5px solid #F3F4F6" }}>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Your name</label>
                  <input type="text" className={inputCls} placeholder="Joshua"
                    value={profileForm.name ?? ""} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Risk tolerance</label>
                  <select className={inputCls} value={profileForm.risk_tolerance ?? "medium"}
                    onChange={e => setProfileForm(f => ({ ...f, risk_tolerance: e.target.value }))}>
                    {["low", "medium", "high"].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Your current situation</label>
                  <textarea rows={3} className={inputCls + " resize-none"}
                    placeholder="e.g. 20 years old, running Brick Whips dropshipping brand, 150k Instagram followers, making ~£5k/month. Want to build a SaaS and personal brand..."
                    value={profileForm.situation ?? ""} onChange={e => setProfileForm(f => ({ ...f, situation: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Runway (months of savings)</label>
                  <input type="number" className={inputCls} value={profileForm.runway_months ?? 6}
                    onChange={e => setProfileForm(f => ({ ...f, runway_months: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className={labelCls}>Monthly revenue goal (£)</label>
                  <input type="number" className={inputCls} value={profileForm.monthly_revenue_goal ?? 5000}
                    onChange={e => setProfileForm(f => ({ ...f, monthly_revenue_goal: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className={labelCls}>Current monthly revenue (£)</label>
                  <input type="number" className={inputCls} value={profileForm.current_monthly_revenue ?? 0}
                    onChange={e => setProfileForm(f => ({ ...f, current_monthly_revenue: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className={labelCls}>Top skills (comma separated)</label>
                  <input type="text" className={inputCls} placeholder="e.g. social media, sales, content creation"
                    value={(profileForm.top_skills ?? []).join(", ")}
                    onChange={e => setProfileForm(f => ({ ...f, top_skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Constraints & context</label>
                  <textarea rows={2} className={inputCls + " resize-none"}
                    placeholder="e.g. Can't quit day job yet. Limited to evenings and weekends. No technical co-founder..."
                    value={profileForm.constraints ?? ""} onChange={e => setProfileForm(f => ({ ...f, constraints: e.target.value }))} />
                </div>
              </div>
              <button onClick={saveProfile} disabled={profileSaving} className="submit-btn mt-5"
                style={{ background: `linear-gradient(135deg, #6D28D9, ${C.purple})`, boxShadow: `0 4px 16px ${C.purple}40` }}>
                {profileSaving ? "Saving..." : profile?.id ? "Update profile →" : "Save profile →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
