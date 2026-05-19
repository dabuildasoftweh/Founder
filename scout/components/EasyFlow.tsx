"use client";
import { useState } from "react";
import type { Category } from "./CategoryGrid";

type Path = {
  emoji: string;
  title: string;
  tagline: string;
  whyYou: string;
  timeToFirstIncome: string;
  startupCost: string;
  difficulty: "Beginner" | "Intermediate";
  firstStep: string;
  steps: string[];
};

export default function EasyFlow({ category, onBack }: { category: Category; onBack: () => void }) {
  const [form, setForm] = useState({ situation: "", time: "5-10 hrs/week", budget: "Under £500", skills: "" });
  const [results, setResults] = useState<Path[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.situation.trim()) return;
    setLoading(true); setError(""); setResults(null);
    try {
      const res = await fetch("/api/founder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "easy", category: category.id, data: form }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResults(json.result);
    } catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="fade-up">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-8" style={{ color: "var(--muted)" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-3"
          style={{ background: "#DCFCE7", color: "#16A34A" }}>
          🟢 Easy Mode · {category.emoji} {category.label}
        </div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: "var(--navy)", letterSpacing: "-0.02em" }}>
          Tell us about yourself
        </h2>
        <p className="text-base" style={{ color: "var(--muted)" }}>
          We'll find 3 business paths that genuinely fit your situation — no fluff, no generic advice.
        </p>
      </div>

      <div className="card p-6 space-y-5 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>
            Tell us your situation
          </label>
          <textarea rows={4} className="input resize-none"
            placeholder="e.g. I'm 20, working part time, obsessed with fitness. I've got about £300 saved and want to make money online but have no idea where to start. I'm good at talking to people and making videos..."
            value={form.situation}
            onChange={e => setForm(f => ({ ...f, situation: e.target.value }))} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>Time per week</label>
            <select className="input" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}>
              {["Under 5 hrs/week", "5-10 hrs/week", "10-20 hrs/week", "Full time"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>Starting budget</label>
            <select className="input" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}>
              {["Under £500", "£500–2k", "£2k–10k", "£10k+"].map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>
            Any skills? <span style={{ color: "var(--subtle)", fontWeight: 400 }}>(optional)</span>
          </label>
          <input type="text" className="input"
            placeholder="e.g. good with video, can build websites, know social media..."
            value={form.skills}
            onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} />
        </div>

        <button className="btn-primary w-full py-3.5" onClick={submit} disabled={loading || !form.situation.trim()}>
          {loading ? "Finding your paths..." : "Find my business paths →"}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="spinner" />
          <p className="text-sm" style={{ color: "var(--muted)" }}>Analysing your situation...</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>{error}</div>
      )}

      {results && (
        <div className="space-y-5 fade-up">
          <h3 className="text-lg font-bold" style={{ color: "var(--navy)" }}>Your 3 best paths</h3>
          {results.map((p, i) => (
            <div key={i} className="card p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{p.emoji}</span>
                  <div>
                    <h4 className="font-bold text-base" style={{ color: "var(--navy)" }}>{p.title}</h4>
                    <p className="text-sm" style={{ color: "var(--sky-dark)" }}>{p.tagline}</p>
                  </div>
                </div>
                <span className={`badge ${p.difficulty === "Beginner" ? "badge-green" : "badge-blue"} shrink-0`}>
                  {p.difficulty}
                </span>
              </div>

              <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{p.whyYou}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: "var(--bg)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--subtle)" }}>First income</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{p.timeToFirstIncome}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: "var(--bg)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--subtle)" }}>Startup cost</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--navy)" }}>{p.startupCost}</p>
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: "var(--sky-light)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--sky-dark)" }}>Start here</p>
                <p className="text-sm font-medium" style={{ color: "var(--navy)" }}>{p.firstStep}</p>
              </div>

              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted)" }}>FIRST 3 MOVES</p>
                <ol className="space-y-1.5">
                  {p.steps.map((s, j) => (
                    <li key={j} className="flex gap-2.5 text-sm">
                      <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: "var(--sky-light)", color: "var(--sky-dark)" }}>{j + 1}</span>
                      <span style={{ color: "var(--text)" }}>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
