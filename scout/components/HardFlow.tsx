"use client";
import { useState } from "react";
import FindProduct from "./FindProduct";
import ValidateIdea from "./ValidateIdea";
import type { Category } from "./CategoryGrid";

type Sub = "find" | "validate";

const subs = [
  { id: "find" as Sub, emoji: "🔍", label: "Find a Product", description: "Tell us your situation — get 5 ranked opportunities" },
  { id: "validate" as Sub, emoji: "⚡", label: "Validate an Idea", description: "Describe your idea — get a brutal honest score" },
];

export default function HardFlow({ category, onBack }: { category: Category; onBack: () => void }) {
  const [sub, setSub] = useState<Sub | null>(null);

  if (sub === "find") return <FindProduct category={category} onBack={() => setSub(null)} />;
  if (sub === "validate") return <ValidateIdea category={category} onBack={() => setSub(null)} />;

  return (
    <div className="fade-up">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-8" style={{ color: "var(--muted)" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-3"
          style={{ background: "var(--sky-light)", color: "var(--sky-dark)" }}>
          ⚡ Hard Mode · {category.emoji} {category.label}
        </div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: "var(--navy)", letterSpacing: "-0.02em" }}>
          What do you need?
        </h2>
        <p style={{ color: "var(--muted)" }}>Pick your weapon.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {subs.map(s => (
          <button key={s.id} onClick={() => setSub(s.id)}
            className="card card-hover p-7 text-left">
            <span className="text-3xl block mb-4">{s.emoji}</span>
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--navy)" }}>{s.label}</h3>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{s.description}</p>
            <div className="mt-5 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--sky)" }}>
              Select
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
