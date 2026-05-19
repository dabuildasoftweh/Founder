"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BG = "#07071A"; const GLASS = "rgba(255,255,255,0.04)"; const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#F1F0FF"; const DIM = "rgba(255,255,255,0.35)"; const PU = "#7C3AED"; const VI = "#A78BFA";

const inp: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: TEXT, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 };

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);
  const [ready,     setReady]     = useState(false);

  useEffect(() => {
    // Supabase sends access_token + refresh_token as hash params
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.slice(1));
      const access  = params.get("access_token");
      const refresh = params.get("refresh_token");
      if (access && refresh) {
        supabase.auth.setSession({ access_token: access, refresh_token: refresh })
          .then(() => setReady(true));
      }
    } else {
      // No token in hash — might already be logged in from a valid session
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true);
        else setError("Invalid or expired reset link. Request a new one.");
      });
    }
  }, [searchParams]);

  const reset = async () => {
    if (!password.trim()) return;
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setLoading(false); return; }
    setDone(true);
    setTimeout(() => router.push("/app"), 2500);
  };

  return (
    <div style={{ width: "100%", maxWidth: 400 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${PU}, ${VI})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 0 40px ${PU}50` }}>
          <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L13 4.5V9c0 2.5-2 4.5-5 5.5C5 13.5 3 11.5 3 9V4.5L8 2z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M6 8l1.5 1.5L10.5 6" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: TEXT, margin: "0 0 8px" }}>Set new password</h1>
        <p style={{ fontSize: 14, color: DIM, margin: 0 }}>Choose a strong password to secure your account</p>
      </div>

      <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 28, backdropFilter: "blur(20px)" }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Password updated</p>
            <p style={{ fontSize: 13, color: DIM }}>Taking you to the dashboard...</p>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            {error
              ? <p style={{ fontSize: 13, color: "#EF4444" }}>{error}</p>
              : <p style={{ fontSize: 13, color: DIM }}>Verifying reset link...</p>}
            {error && (
              <button onClick={() => router.push("/forgot-password")}
                style={{ marginTop: 16, background: "none", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 20px", color: VI, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                Request new link →
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={lbl}>New password</label>
              <input type="password" style={inp} placeholder="Min 8 characters" value={password}
                onChange={e => setPassword(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Confirm password</label>
              <input type="password" style={inp} placeholder="Same as above" value={confirm}
                onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && reset()} />
            </div>
            {error && (
              <div style={{ fontSize: 13, color: "#EF4444", padding: "10px 14px", background: "rgba(239,68,68,0.1)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>
            )}
            <button onClick={reset} disabled={loading || !password.trim() || !confirm.trim()}
              style={{ width: "100%", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 800, color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading || !password.trim() || !confirm.trim() ? 0.5 : 1, background: `linear-gradient(135deg, ${PU}CC, ${PU})`, boxShadow: `0 4px 20px ${PU}40`, transition: "all 0.15s" }}>
              {loading ? "Updating..." : "Set new password →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-15%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${PU}20 0%, transparent 70%)`, filter: "blur(40px)", pointerEvents: "none" }} />
      <Suspense fallback={<p style={{ color: DIM }}>Loading...</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
