"use client";
import { useState } from "react";
import type { Category } from "./CategoryGrid";

type Competitor = { name: string; note: string };
type Validation = {
  score: number; verdict: "Strong"|"Promising"|"Risky"|"Avoid"; verdictLine: string;
  strengths: string[]; weaknesses: string[]; competitors: Competitor[];
  marketSize: string; biggestRisk: string; recommendation: string; firstSteps: string[];
};

const verdictConfig = {
  Strong:    { badge: "badge-green",  label: "STRONG"    },
  Promising: { badge: "badge-blue",   label: "PROMISING" },
  Risky:     { badge: "badge-yellow", label: "RISKY"     },
  Avoid:     { badge: "badge-red",    label: "AVOID"     },
};

const scoreColor = (s: number) =>
  s >= 8 ? "#16A34A" : s >= 6 ? "#0EA5E9" : s >= 4 ? "#F59E0B" : "#EF4444";

export default function ValidateIdea({ category, onBack }: { category: Category; onBack: () => void }) {
  const [form, setForm] = useState({ idea: "", customer: "", problem: "", extra: "" });
  const [result, setResult] = useState<Validation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.idea.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/founder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "validate", category: category.id, data: form }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResult(json.result);
    } catch { setError("Something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  const vc = result ? verdictConfig[result.verdict] : null;

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
          style={{ background: "var(--sky-light)", color: "var(--sky-dark)" }}>
          ⚡ Hard Mode · {category.emoji} {category.label}
        </div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: "var(--navy)", letterSpacing: "-0.02em" }}>Validate your idea</h2>
        <p className="text-base" style={{ color: "var(--muted)" }}>Get a brutal, honest score. No cheerleading. Just the truth.</p>
      </div>

      <div className="card p-6 space-y-5 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>Your idea</label>
          <textarea rows={3} className="input resize-none"
            placeholder="e.g. A premium car fragrance brand targeting car enthusiasts aged 18-30, selling DTC via TikTok and Instagram..."
            value={form.idea} onChange={e => setForm(f => ({ ...f, idea: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>Target customer</label>
            <input type="text" className="input" placeholder="e.g. Car enthusiasts aged 18-30"
              value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>Problem it solves</label>
            <input type="text" className="input" placeholder="e.g. No premium lifestyle car fragrance brand exists"
              value={form.problem} onChange={e => setForm(f => ({ ...f, problem: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>
            Extra context <span style={{ color: "var(--subtle)", fontWeight: 400 }}>(optional)</span>
          </label>
          <input type="text" className="input" placeholder="e.g. I already have 150k followers, limited capital..."
            value={form.extra} onChange={e => setForm(f => ({ ...f, extra: e.target.value }))} />
        </div>
        <button className="btn-primary w-full py-3.5" onClick={submit} disabled={loading || !form.idea.trim()}>
          {loading ? "Analysing idea..." : "Stress test this idea →"}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="spinner" />
          <p className="text-sm" style={{ color: "var(--muted)" }}>Running a brutal analysis...</p>
        </div>
      )}

      {error && <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>{error}</div>}

      {result && vc && (
        <div className="space-y-4 fade-up">
          {/* Score */}
          <div className="card p-6 flex items-center gap-6">
            <div className="shrink-0 text-center">
              <div className="text-5xl font-bold" style={{ color: scoreColor(result.score) }}>{result.score}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--subtle)" }}>/10</div>
            </div>
            <div>
              <span className={`badge ${vc.badge} mb-2`}>{vc.label}</span>
              <p className="text-sm leading-relaxed mt-1" style={{ color: "var(--muted)" }}>{result.verdictLine}</p>
            </div>
          </div>

          {/* Strengths + Weaknesses */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Strengths", items: result.strengths, color: "#16A34A", bg: "var(--success-bg)", icon: "✓" },
              { label: "Weaknesses", items: result.weaknesses, color: "var(--danger)", bg: "var(--danger-bg)", icon: "✗" },
            ].map(({ label, items, color, bg, icon }) => (
              <div key={label} className="card p-5">
                <h4 className="text-sm font-bold mb-3 flex items-center gap-1.5">
                  <span style={{ color }}>{icon}</span>
                  <span style={{ color }}>{label}</span>
                </h4>
                <ul className="space-y-2">
                  {items.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs"
                        style={{ background: bg, color }}> • </span>
                      <span style={{ color: "var(--text)" }}>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Market + Risk */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5">
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--subtle)" }}>MARKET SIZE</p>
              <p className="text-sm font-medium" style={{ color: "var(--navy)" }}>{result.marketSize}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--subtle)" }}>BIGGEST RISK</p>
              <p className="text-sm font-medium" style={{ color: "var(--warning)" }}>{result.biggestRisk}</p>
            </div>
          </div>

          {/* Competitors */}
          <div className="card p-5">
            <h4 className="text-sm font-bold mb-3" style={{ color: "var(--navy)" }}>Competitors</h4>
            <div className="space-y-3">
              {result.competitors.map((c, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 badge badge-gray">#{i + 1}</span>
                  <span>
                    <span className="font-semibold" style={{ color: "var(--navy)" }}>{c.name}</span>
                    <span style={{ color: "var(--muted)" }}> — {c.note}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation */}
          <div className="card p-5">
            <h4 className="text-sm font-bold mb-2" style={{ color: "var(--sky-dark)" }}>Recommendation</h4>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{result.recommendation}</p>
          </div>

          {/* First steps */}
          <div className="card p-5">
            <h4 className="text-sm font-bold mb-3" style={{ color: "var(--navy)" }}>First 3 moves</h4>
            <ol className="space-y-2">
              {result.firstSteps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "var(--sky-light)", color: "var(--sky-dark)" }}>{i + 1}</span>
                  <span style={{ color: "var(--text)" }}>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
