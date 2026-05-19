"use client";

export type Category = {
  id: string;
  emoji: string;
  label: string;
  description: string;
};

export const CATEGORIES: Category[] = [
  { id: "dropshipping", emoji: "🛍️", label: "Dropshipping", description: "Find winning products to sell online" },
  { id: "saas", emoji: "💻", label: "SaaS / App", description: "Build software people pay for monthly" },
  { id: "agency", emoji: "📈", label: "Agency / SMMA", description: "Sell marketing or creative services" },
  { id: "brand", emoji: "📦", label: "Physical Product", description: "Source, brand and sell a real product" },
  { id: "content", emoji: "🎥", label: "Content / Creator", description: "Build an audience and monetise it" },
  { id: "digital", emoji: "🎓", label: "Digital Products", description: "Sell courses, templates or communities" },
  { id: "ai", emoji: "🤖", label: "AI Tool", description: "Build an AI-powered subscription product" },
  { id: "unsure", emoji: "✨", label: "Not sure yet", description: "Show me all my options" },
];

export default function CategoryGrid({
  mode,
  onSelect,
  onBack,
}: {
  mode: "easy" | "hard";
  onSelect: (c: Category) => void;
  onBack: () => void;
}) {
  return (
    <div className="fade-up">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-8" style={{ color: "var(--muted)" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
          style={{ background: mode === "easy" ? "#DCFCE7" : "#E0F2FE", color: mode === "easy" ? "#16A34A" : "#0284C7" }}>
          {mode === "easy" ? "🟢 Easy Mode" : "⚡ Hard Mode"}
        </div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: "var(--navy)", letterSpacing: "-0.02em" }}>
          What type of business?
        </h2>
        <p className="text-base" style={{ color: "var(--muted)" }}>
          Pick the closest match — we'll tailor everything to your category.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="card card-hover p-5 text-left"
          >
            <span className="text-2xl block mb-3">{c.emoji}</span>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--navy)" }}>{c.label}</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{c.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
