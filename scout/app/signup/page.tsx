"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createOrg } from "@/lib/auth";

const BG = "#07071A"; const GLASS = "rgba(255,255,255,0.04)"; const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#F1F0FF"; const DIM = "rgba(255,255,255,0.35)"; const PU = "#7C3AED"; const VI = "#A78BFA";
const EM = "#10B981"; const GO = "#FFD700";

const inp: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: TEXT, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 };

export default function Signup() {
  const router = useRouter();
  const [step,     setStep]     = useState<1 | 2>(1);
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [orgName,  setOrgName]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const createAccount = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    if (!data.user) { setError("Signup failed — try again"); setLoading(false); return; }
    // Update profile name directly in case trigger doesn't fire instantly
    await supabase.from("profiles").upsert({ id: data.user.id, name });
    setLoading(false);
    setStep(2);
  };

  const createWorkspace = async () => {
    if (!orgName.trim()) return;
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session expired — sign in again"); setLoading(false); return; }
    const org = await createOrg(orgName, user.id);
    if (!org) { setError("Failed to create workspace"); setLoading(false); return; }
    setLoading(false);
    router.push("/onboarding");
  };

  const steps = [
    { n: 1, label: "Account" },
    { n: 2, label: "Workspace" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-15%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${PU}25 0%, transparent 70%)`, filter: "blur(40px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-15%", right: "-10%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${EM}15 0%, transparent 70%)`, filter: "blur(40px)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Logo + step indicator */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${PU}, ${VI})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: `0 0 40px ${PU}50` }}>
            <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L13 4.5V9c0 2.5-2 4.5-5 5.5C5 13.5 3 11.5 3 9V4.5L8 2z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M6 8l1.5 1.5L10.5 6" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* Step dots */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
            {steps.map((s, i) => (
              <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: step >= s.n ? `linear-gradient(135deg, ${PU}, ${VI})` : "rgba(255,255,255,0.08)", color: step >= s.n ? "#fff" : DIM, boxShadow: step === s.n ? `0 0 12px ${PU}60` : "none" }}>{step > s.n ? "✓" : s.n}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: step >= s.n ? TEXT : DIM }}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div style={{ width: 24, height: 1, background: step > s.n ? PU : BORDER }} />}
              </div>
            ))}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: TEXT, margin: "0 0 6px" }}>
            {step === 1 ? "Create your account" : "Name your workspace"}
          </h1>
          <p style={{ fontSize: 13, color: DIM, margin: 0 }}>
            {step === 1 ? "Your personal Founder account" : "This is your company — you can invite your cofounder next"}
          </p>
        </div>

        <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 28, backdropFilter: "blur(20px)" }}>
          {step === 1 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div><label style={lbl}>Your name</label><input style={inp} placeholder="Joshua" value={name} onChange={e => setName(e.target.value)} /></div>
              <div><label style={lbl}>Email</label><input type="email" style={inp} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div><label style={lbl}>Password</label><input type="password" style={inp} placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && createAccount()} /></div>
              {error && <div style={{ fontSize: 13, color: "#EF4444", padding: "10px 14px", background: "rgba(239,68,68,0.1)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
              <button onClick={createAccount} disabled={loading || !name.trim() || !email.trim() || !password.trim()}
                style={{ width: "100%", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 800, color: "#fff", cursor: "pointer", opacity: loading || !name.trim() || !email.trim() || !password.trim() ? 0.5 : 1, background: `linear-gradient(135deg, ${PU}CC, ${PU})`, boxShadow: `0 4px 20px ${PU}40`, transition: "all 0.15s" }}>
                {loading ? "Creating account..." : "Continue →"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl}>Workspace / Company name</label>
                <input style={{ ...inp, fontSize: 18, fontWeight: 700, padding: "14px 16px" }} placeholder="e.g. Brick Whips" value={orgName} onChange={e => setOrgName(e.target.value)} onKeyDown={e => e.key === "Enter" && createWorkspace()} />
                <p style={{ fontSize: 12, color: DIM, marginTop: 6 }}>You can rename this later. Your cofounder will join this workspace.</p>
              </div>
              {/* What the workspace is */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { icon: "💡", text: "Shared idea lab, goals & daily logs" },
                  { icon: "👥", text: "Invite your cofounder by email" },
                  { icon: "📊", text: "See everything that happens in one feed" },
                ].map(item => (
                  <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, color: DIM }}>{item.text}</span>
                  </div>
                ))}
              </div>
              {error && <div style={{ fontSize: 13, color: "#EF4444", padding: "10px 14px", background: "rgba(239,68,68,0.1)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
              <button onClick={createWorkspace} disabled={loading || !orgName.trim()}
                style={{ width: "100%", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 800, color: "#1a1200", cursor: "pointer", opacity: loading || !orgName.trim() ? 0.5 : 1, background: `linear-gradient(135deg, ${GO}CC, ${GO}AA)`, boxShadow: `0 4px 20px ${GO}30`, transition: "all 0.15s" }}>
                {loading ? "Creating workspace..." : "Create workspace →"}
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: DIM, marginTop: 20 }}>
          Already have an account?{" "}
          <button onClick={() => router.push("/login")} style={{ background: "none", border: "none", color: VI, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Sign in</button>
        </p>
      </div>
    </div>
  );
}
