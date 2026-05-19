"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BG = "#07071A"; const GLASS = "rgba(255,255,255,0.04)"; const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#F1F0FF"; const DIM = "rgba(255,255,255,0.35)"; const PU = "#7C3AED"; const VI = "#A78BFA";

const inp: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: TEXT, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 };

export default function Login() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const login = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push("/app");
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-15%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${PU}25 0%, transparent 70%)`, filter: "blur(40px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-15%", right: "-10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${PU}, ${VI})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 0 40px ${PU}50` }}>
            <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L13 4.5V9c0 2.5-2 4.5-5 5.5C5 13.5 3 11.5 3 9V4.5L8 2z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M6 8l1.5 1.5L10.5 6" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em", color: TEXT, margin: "0 0 8px" }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: DIM, margin: 0 }}>Sign in to your Founder account</p>
        </div>

        <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 28, backdropFilter: "blur(20px)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div><label style={lbl}>Email</label><input type="email" style={inp} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} /></div>
            <div><label style={lbl}>Password</label><input type="password" style={inp} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} /></div>
            {error && <div style={{ fontSize: 13, color: "#EF4444", padding: "10px 14px", background: "rgba(239,68,68,0.1)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
            <button onClick={login} disabled={loading || !email.trim() || !password.trim()}
              style={{ width: "100%", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 800, color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading || !email.trim() || !password.trim() ? 0.5 : 1, background: `linear-gradient(135deg, ${PU}CC, ${PU})`, boxShadow: `0 4px 20px ${PU}40`, transition: "all 0.15s" }}>
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: DIM, marginTop: 20 }}>
          No account?{" "}
          <button onClick={() => router.push("/signup")} style={{ background: "none", border: "none", color: VI, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Create one</button>
        </p>
      </div>
    </div>
  );
}
