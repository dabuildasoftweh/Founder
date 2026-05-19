"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ── Tokens ────────────────────────────────────────────────────────────────────
const BG = "#07071A";
const GLASS = "rgba(255,255,255,0.05)";
const BORDER = "rgba(255,255,255,0.1)";
const TEXT = "#F1F0FF";
const DIM = "rgba(255,255,255,0.38)";

// ── Animated background orbs ──────────────────────────────────────────────────
function Orbs() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div className="orb1" style={{ position: "absolute", top: "-10%", left: "-5%",  width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="orb2" style={{ position: "absolute", bottom: "-15%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)",  filter: "blur(80px)" }} />
      <div className="orb3" style={{ position: "absolute", top: "40%", right: "15%",   width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)",  filter: "blur(60px)" }} />
      <div className="orb4" style={{ position: "absolute", bottom: "20%", left: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)", filter: "blur(50px)" }} />
    </div>
  );
}

// ── Cinematic loading screen ──────────────────────────────────────────────────
function Cinematic({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1100),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(onDone,           4000),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "#000",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      transition: "opacity 0.8s ease",
      opacity: phase === 4 ? 0 : 1,
    }}>
      {/* Radial glow behind logo */}
      {phase >= 1 && (
        <div style={{
          position: "absolute", width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)",
          filter: "blur(40px)", animation: "orbFloat1 4s ease-in-out infinite",
        }} />
      )}

      {/* Logo */}
      {phase >= 1 && (
        <div className="logo-bloom" style={{ position: "relative", zIndex: 1, marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: "linear-gradient(135deg, #5B21B6, #7C3AED)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 60px rgba(124,58,237,0.8), 0 0 120px rgba(124,58,237,0.4)",
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L33 10.5V22c0 6.5-5 11.5-13 14C7 33.5 2 28.5 2 22V10.5L20 4z"
                stroke="white" strokeWidth="2" strokeLinejoin="round" fill="rgba(255,255,255,0.1)" />
              <path d="M13 20l4 4 10-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}

      {/* Title */}
      {phase >= 2 && (
        <p className="text-reveal" style={{
          fontSize: 48, fontWeight: 900, letterSpacing: "0.08em",
          color: "#fff", margin: "0 0 16px", position: "relative", zIndex: 1,
        }}>FOUNDER</p>
      )}

      {/* Loading bar */}
      {phase >= 2 && (
        <div style={{ width: 280, height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden", position: "relative", zIndex: 1, margin: "0 0 20px" }}>
          <div className="bar-fill" style={{ height: "100%", background: "linear-gradient(90deg, #7C3AED, #06B6D4)", borderRadius: 2, boxShadow: "0 0 12px rgba(124,58,237,0.8)" }} />
        </div>
      )}

      {/* Tagline */}
      {phase >= 3 && (
        <p className="text-reveal" style={{
          fontSize: 14, fontWeight: 500, letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.45)", margin: 0, position: "relative", zIndex: 1,
          textTransform: "uppercase",
        }}>Your asymmetric edge.</p>
      )}
    </div>
  );
}

// ── Step icons ────────────────────────────────────────────────────────────────
function RocketIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ color: "#7C3AED" }} className="icon-glow">
      <circle cx="36" cy="36" r="34" fill="rgba(124,58,237,0.12)" stroke="rgba(124,58,237,0.3)" strokeWidth="1" />
      <path d="M36 14C36 14 50 22 50 38L36 58L22 38C22 22 36 14 36 14Z" fill="rgba(124,58,237,0.25)" stroke="#7C3AED" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="36" cy="35" r="5" fill="#7C3AED" />
      <path d="M28 50L20 60M44 50L52 60" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M29 48L24 60L36 54L48 60L43 48" fill="rgba(124,58,237,0.4)" />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ color: "#06B6D4" }} className="icon-glow">
      <circle cx="36" cy="36" r="34" fill="rgba(6,182,212,0.1)" stroke="rgba(6,182,212,0.3)" strokeWidth="1" />
      <path d="M16 46a22 22 0 1 1 40 0" stroke="rgba(6,182,212,0.25)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M16 46a22 22 0 0 1 30-20" stroke="#06B6D4" strokeWidth="5" strokeLinecap="round" fill="none" />
      <line x1="36" y1="46" x2="28" y2="28" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="36" cy="46" r="4" fill="#06B6D4" />
      <circle cx="36" cy="46" r="2" fill="#0C0C22" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ color: "#FFD700" }} className="icon-glow">
      <circle cx="36" cy="36" r="34" fill="rgba(255,215,0,0.08)" stroke="rgba(255,215,0,0.3)" strokeWidth="1" />
      <path d="M24 18h24v18a12 12 0 01-24 0V18z" fill="rgba(255,215,0,0.2)" stroke="#FFD700" strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 24H16a8 8 0 008 8M48 24h8a8 8 0 01-8 8" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 48v8M28 56h16" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" />
      <circle cx="36" cy="30" r="4" fill="#FFD700" />
    </svg>
  );
}

// ── Choice card ───────────────────────────────────────────────────────────────
function ChoiceCard({ label, sub, selected, onClick, color = "#7C3AED" }: {
  label: string; sub?: string; selected: boolean; onClick: () => void; color?: string;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "18px 22px", borderRadius: 16, cursor: "pointer", textAlign: "left",
      background: selected ? `${color}20` : GLASS,
      border: `1.5px solid ${selected ? color : BORDER}`,
      boxShadow: selected ? `0 0 24px ${color}30` : "none",
      transition: "all 0.2s", outline: "none",
    }}>
      <p style={{ fontSize: 15, fontWeight: 800, color: selected ? color : TEXT, margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 12, color: DIM, margin: "4px 0 0" }}>{sub}</p>}
    </button>
  );
}

// ── Big input ─────────────────────────────────────────────────────────────────
function BigInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", background: GLASS, border: `1.5px solid ${BORDER}`,
        borderRadius: 16, padding: "18px 22px", fontSize: 22, fontWeight: 700,
        color: TEXT, outline: "none", transition: "border-color 0.2s",
        letterSpacing: "-0.02em", boxSizing: "border-box",
      }}
      onFocus={e => { e.target.style.borderColor = "#7C3AED"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.15)"; }}
      onBlur={e  => { e.target.style.borderColor = BORDER;    e.target.style.boxShadow = "none"; }}
    />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const router = useRouter();
  const [step, setStep]       = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [name, setName]         = useState("");
  const [mode, setMode]         = useState<"full-time" | "side-project" | "">("");
  const [revenue, setRevenue]   = useState("");
  const [runway, setRunway]     = useState("");
  const [risk, setRisk]         = useState<"low" | "medium" | "high" | "">("");
  const [goal90, setGoal90]     = useState("");
  const [revenueTarget, setRevenueTarget] = useState("");

  const TOTAL = 3;

  const canNext = [
    name.trim() && mode,
    revenue !== "" && runway !== "" && risk,
    goal90.trim() && revenueTarget !== "",
  ][step];

  const goNext = useCallback(async () => {
    if (step < TOTAL - 1) {
      setLeaving(true);
      setTimeout(() => { setStep(s => s + 1); setLeaving(false); }, 280);
    } else {
      setSaving(true);
      await supabase.from("founder_profile").upsert({
        name,
        situation: `${mode === "full-time" ? "Full-time founder" : "Side project"}. 90-day goal: ${goal90}`,
        current_monthly_revenue: Number(revenue) || 0,
        runway_months: Number(runway) || 0,
        risk_tolerance: risk,
        monthly_revenue_goal: Number(revenueTarget) || 0,
      });
      // Also add the 90-day goal to goals table
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 90);
      await supabase.from("goals").insert({
        title: goal90,
        category: "revenue",
        target_value: Number(revenueTarget) || 0,
        current_value: Number(revenue) || 0,
        unit: "£",
        deadline: deadline.toISOString().split("T")[0],
      });
      setSaving(false);
      setCinematic(true);
    }
  }, [step, name, mode, revenue, runway, risk, goal90, revenueTarget]);

  const STEPS = [
    {
      icon: <RocketIcon />,
      color: "#7C3AED",
      title: "Who's building?",
      subtitle: "Tell us who you are so we can personalise every decision.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <BigInput value={name} onChange={setName} placeholder="Your name" />
          <div style={{ display: "flex", gap: 12 }}>
            <ChoiceCard label="Full-time" sub="All in. No day job."
              selected={mode === "full-time"} onClick={() => setMode("full-time")} color="#7C3AED" />
            <ChoiceCard label="Side project" sub="Building alongside a job."
              selected={mode === "side-project"} onClick={() => setMode("side-project")} color="#7C3AED" />
          </div>
        </div>
      ),
    },
    {
      icon: <GaugeIcon />,
      color: "#06B6D4",
      title: "What's your position?",
      subtitle: "Honest numbers. The Kelly criterion needs this to allocate your time correctly.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>Current monthly revenue (£)</label>
            <BigInput value={revenue} onChange={setRevenue} placeholder="0" type="number" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>Months of runway (savings)</label>
            <BigInput value={runway} onChange={setRunway} placeholder="6" type="number" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>Risk tolerance</label>
            <div style={{ display: "flex", gap: 12 }}>
              {(["low", "medium", "high"] as const).map(r => (
                <ChoiceCard key={r} label={r.charAt(0).toUpperCase() + r.slice(1)}
                  sub={r === "low" ? "Protect downside" : r === "medium" ? "Balanced" : "Swing big"}
                  selected={risk === r} onClick={() => setRisk(r)} color="#06B6D4" />
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <TrophyIcon />,
      color: "#FFD700",
      title: "What does winning look like?",
      subtitle: "Your 90-day target. Make it uncomfortable. The algorithm works harder when the gap is real.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>Your #1 goal in 90 days</label>
            <BigInput value={goal90} onChange={setGoal90} placeholder="e.g. Hit £20k/month revenue" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 10 }}>Revenue target (£)</label>
            <BigInput value={revenueTarget} onChange={setRevenueTarget} placeholder="20000" type="number" />
          </div>
        </div>
      ),
    },
  ];

  const current = STEPS[step];

  return (
    <>
      <Orbs />
      {cinematic && <Cinematic onDone={() => router.push("/app")} />}

      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", zIndex: 1 }}>

        {/* Skip */}
        <button onClick={() => router.push("/app")}
          style={{ position: "fixed", top: 24, right: 24, background: "none", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 18px", color: DIM, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Skip
        </button>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 8, marginBottom: 48 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 4, borderRadius: 4,
              width: i === step ? 32 : 16,
              background: i <= step ? current.color : "rgba(255,255,255,0.12)",
              boxShadow: i === step ? `0 0 10px ${current.color}` : "none",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* Card */}
        <div className={leaving ? "step-out" : "step-in"} style={{
          width: "100%", maxWidth: 560,
          background: GLASS, border: `1px solid ${BORDER}`,
          borderRadius: 28, backdropFilter: "blur(20px)",
          padding: "40px 44px",
          boxShadow: `0 0 60px ${current.color}15, 0 24px 80px rgba(0,0,0,0.5)`,
        }}>
          {/* Icon */}
          <div style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
            {current.icon}
          </div>

          {/* Heading */}
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", color: TEXT, margin: "0 0 10px", textAlign: "center" }}>
            {current.title}
          </h1>
          <p style={{ fontSize: 14, color: DIM, margin: "0 0 32px", textAlign: "center", lineHeight: 1.6 }}>
            {current.subtitle}
          </p>

          {/* Content */}
          {current.content}

          {/* CTA */}
          <button onClick={goNext} disabled={!canNext || saving}
            style={{
              width: "100%", marginTop: 28, border: "none", borderRadius: 16,
              padding: "17px 0", fontSize: 15, fontWeight: 800, color: "#fff",
              cursor: canNext && !saving ? "pointer" : "not-allowed",
              opacity: canNext && !saving ? 1 : 0.35,
              background: `linear-gradient(135deg, ${current.color}CC, ${current.color})`,
              boxShadow: canNext ? `0 4px 28px ${current.color}50` : "none",
              transition: "all 0.2s", letterSpacing: "0.01em",
            }}>
            {saving ? "Saving..." : step < TOTAL - 1 ? "Next →" : "Let's build →"}
          </button>
        </div>

        {/* Step counter */}
        <p style={{ marginTop: 24, fontSize: 12, color: DIM }}>
          {step + 1} of {TOTAL}
        </p>
      </div>
    </>
  );
}
