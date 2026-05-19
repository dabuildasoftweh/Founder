"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { joinOrgByInvite } from "@/lib/auth";

const BG = "#07071A"; const GLASS = "rgba(255,255,255,0.04)"; const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#F1F0FF"; const DIM = "rgba(255,255,255,0.35)"; const PU = "#7C3AED"; const VI = "#A78BFA";

const inp: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: TEXT, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 };

export default function InvitePage() {
  const router   = useRouter();
  const params   = useParams();
  const orgId    = params.orgId as string;

  const [orgName,  setOrgName]  = useState("");
  const [mode,     setMode]     = useState<"signup" | "login">("signup");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    supabase.from("organisations").select("name").eq("id", orgId).single()
      .then(({ data }) => { if (data) setOrgName(data.name); });
  }, [orgId]);

  const join = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true); setError("");
    let userId = "";

    if (mode === "signup") {
      if (!name.trim()) { setError("Name is required"); setLoading(false); return; }
      const { data, error: err } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (err) { setError(err.message); setLoading(false); return; }
      if (!data.user) { setError("Signup failed"); setLoading(false); return; }
      await supabase.from("profiles").upsert({ id: data.user.id, name });
      userId = data.user.id;
    } else {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      if (!data.user) { setError("Login failed"); setLoading(false); return; }
      userId = data.user.id;
    }

    await joinOrgByInvite(orgId, userId, email);
    router.push("/app");
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-15%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${PU}20 0%, transparent 70%)`, filter: "blur(40px)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${PU}, ${VI})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 0 40px ${PU}50` }}>
            <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L13 4.5V9c0 2.5-2 4.5-5 5.5C5 13.5 3 11.5 3 9V4.5L8 2z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M6 8l1.5 1.5L10.5 6" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: TEXT, margin: "0 0 8px" }}>
            You&apos;ve been invited
          </h1>
          {orgName && <p style={{ fontSize: 14, color: DIM, margin: 0 }}>Join <strong style={{ color: TEXT }}>{orgName}</strong> on Founder</p>}
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4, marginBottom: 20, border: `1px solid ${BORDER}` }}>
          {(["signup", "login"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.15s", background: mode === m ? PU : "transparent", color: mode === m ? "#fff" : DIM, boxShadow: mode === m ? `0 2px 12px ${PU}40` : "none" }}>
              {m === "signup" ? "Create account" : "Sign in"}
            </button>
          ))}
        </div>

        <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 28, backdropFilter: "blur(20px)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && <div><label style={lbl}>Your name</label><input style={inp} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} /></div>}
            <div><label style={lbl}>Email</label><input type="email" style={inp} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><label style={lbl}>Password</label><input type="password" style={inp} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && join()} /></div>
            {error && <div style={{ fontSize: 13, color: "#EF4444", padding: "10px 14px", background: "rgba(239,68,68,0.1)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}
            <button onClick={join} disabled={loading}
              style={{ width: "100%", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 800, color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, background: `linear-gradient(135deg, ${PU}CC, ${PU})`, boxShadow: `0 4px 20px ${PU}40`, transition: "all 0.15s" }}>
              {loading ? "Joining..." : `Join ${orgName || "workspace"} →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
