"use client";

type Mode = "easy" | "hard";

const modes = [
  {
    id: "easy" as Mode,
    emoji: "🟢",
    label: "Easy Mode",
    subtitle: "I don't know where to start",
    description: "Tell us about yourself and we'll find the best business paths for your situation. No jargon, no overwhelm.",
    tag: "Beginner friendly",
    tagColor: "badge-green",
    features: ["Plain English guidance", "3 personalised paths", "Step-by-step first actions", "No experience needed"],
    gradient: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
    accent: "#16A34A",
  },
  {
    id: "hard" as Mode,
    emoji: "⚡",
    label: "Hard Mode",
    subtitle: "I have an idea — stress test it",
    description: "You know what you want to build. We'll find winning opportunities or tear your idea apart with brutal honesty.",
    tag: "For founders",
    tagColor: "badge-blue",
    features: ["Find winning products", "Validate any idea", "Competitor breakdown", "Feasibility scoring"],
    gradient: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
    accent: "#0EA5E9",
  },
];

export default function ModeSelect({ onSelect }: { onSelect: (m: Mode) => void }) {
  return (
    <div className="fade-up">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--navy)", letterSpacing: "-0.02em" }}>
          What are you building?
        </h1>
        <p className="text-lg" style={{ color: "var(--muted)" }}>
          Choose your mode — we'll tailor everything to where you are right now.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className="card card-hover text-left p-7 w-full"
            style={{ background: m.gradient }}
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-3xl">{m.emoji}</span>
              <span className={`badge ${m.tagColor}`}>{m.tag}</span>
            </div>

            <h2 className="text-xl font-bold mb-1" style={{ color: "var(--navy)" }}>{m.label}</h2>
            <p className="text-sm font-medium mb-3" style={{ color: m.accent }}>{m.subtitle}</p>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--muted)" }}>{m.description}</p>

            <ul className="space-y-2">
              {m.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="7" fill={m.accent} opacity="0.15" />
                    <path d="M4 7l2 2 4-4" stroke={m.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center gap-2 text-sm font-semibold" style={{ color: m.accent }}>
              Start {m.label}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke={m.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
