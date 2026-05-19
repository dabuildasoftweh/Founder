"use client";
import { useState } from "react";
import type { Category } from "./CategoryGrid";

type Product = {
  name: string; emoji: string; tagline: string; whyItFits: string;
  opportunity: "Low"|"Medium"|"High"; competition: "Low"|"Medium"|"High";
  margin: string; trend: "Growing"|"Stable"|"Declining"; trendNote: string;
  startupCost: string; timeToFirstSale: string; firstMove: string;
};

const oppBadge  = (v: "Low"|"Medium"|"High") =>
  v === "High" ? "badge-green" : v === "Medium" ? "badge-yellow" : "badge-red";
const compBadge = (v: "Low"|"Medium"|"High") =>
  v === "Low"  ? "badge-green" : v === "Medium" ? "badge-yellow" : "badge-red";
const trendColor = (t: string) =>
  t === "Growing" ? "#16A34A" : t === "Declining" ? "#EF4444" : "#F59E0B";
const trendIcon = (t: string) => t === "Growing" ? "↑" : t === "Declining" ? "↓" : "→";

export default function FindProduct({ category, onBack }: { category: Category; onBack: () => void }) {
  const [form, setForm] = useState({ audience: "", budget: "£500–2k", type: "Either", extra: "" });
  const [results, setResults] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.audience.trim()) return;
    setLoading(true); setError(""); setResults(null);
    try {
      const res = await fetch("/api/founder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "find", category: category.id, data: form }),
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
          style={{ background: "var(--sky-light)", color: "var(--sky-dark)" }}>
          ⚡ Hard Mode · {category.emoji} {category.label}
        </div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: "var(--navy)", letterSpacing: "-0.02em" }}>Find a winning product</h2>
        <p className="text-base" style={{ color: "var(--muted)" }}>Describe your situation and we'll find 5 opportunities ranked for you specifically.</p>
      </div>

      <div className="card p-6 space-y-5 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>Your audience or niche</label>
          <textarea rows={3} className="input resize-none"
            placeholder="e.g. I have 150k car enthusiast followers on Instagram, 15M views/month. I want something with repeat purchase and good margins..."
            value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>Budget</label>
            <select className="input" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}>
              {["Under £500","£500–2k","£2k–10k","£10k+"].map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>Product type</label>
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {["Either","Physical","Digital","SaaS / Subscription"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>
            Extra context <span style={{ color: "var(--subtle)", fontWeight: 400 }}>(optional)</span>
          </label>
          <input type="text" className="input" placeholder="e.g. I can build apps, I want recurring revenue, no services..."
            value={form.extra} onChange={e => setForm(f => ({ ...f, extra: e.target.value }))} />
        </div>
        <button className="btn-primary w-full py-3.5" onClick={submit} disabled={loading || !form.audience.trim()}>
          {loading ? "Researching opportunities..." : "Find winning products →"}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="spinner" />
          <p className="text-sm" style={{ color: "var(--muted)" }}>Researching opportunities for your situation...</p>
        </div>
      )}

      {error && <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>{error}</div>}

      {results && (
        <div className="space-y-4 fade-up">
          <h3 className="text-lg font-bold" style={{ color: "var(--navy)" }}>5 opportunities ranked for you</h3>
          {results.map((p, i) => (
            <div key={i} className="card p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{p.emoji}</span>
                  <div>
                    <h4 className="font-bold text-base" style={{ color: "var(--navy)" }}>{p.name}</h4>
                    <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{p.tagline}</p>
                  </div>
                </div>
                <span className="badge badge-gray shrink-0">#{i + 1}</span>
              </div>

              <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{p.whyItFits}</p>

              <div className="flex flex-wrap gap-2">
                <span className={`badge ${oppBadge(p.opportunity)}`}>{p.opportunity} opportunity</span>
                <span className={`badge ${compBadge(p.competition)}`}>{p.competition} competition</span>
                <span className="badge badge-blue">{p.margin} margin</span>
                <span className="badge badge-gray" style={{ color: trendColor(p.trend) }}>
                  {trendIcon(p.trend)} {p.trend}
                </span>
              </div>

              <p className="text-xs italic" style={{ color: "var(--subtle)" }}>{p.trendNote}</p>

              <hr className="divider" />
              <div className="grid grid-cols-3 gap-3">
                {[["Startup cost", p.startupCost, "var(--navy)"],["First sale", p.timeToFirstSale, "var(--navy)"],["First move", p.firstMove, "var(--sky-dark)"]].map(([label, val, color]) => (
                  <div key={label as string}>
                    <p className="text-xs mb-0.5" style={{ color: "var(--subtle)" }}>{label}</p>
                    <p className="text-sm font-semibold" style={{ color: color as string }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
