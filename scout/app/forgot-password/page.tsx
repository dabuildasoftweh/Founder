"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BG = "#07071A"; const GLASS = "rgba(255,255,255,0.04)"; const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#F1F0FF"; const DIM = "rgba(255,255,255,0.35)"; const PU = "#7C3AED"; const VI = "#A78BFA";

const inp: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: TEXT, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 };

export default function ForgotPassword() {
  const router = useRouter();
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [sent,    setSent]    = useState(false);

  const send = async () => {
    if (!email.trim()) return;
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-15%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${PU}20 0%, transparent 70%)`, filter: "blur(40px)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${PU}, ${VI})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 0 40px ${PU}50` }}>
            <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L13 4.5V9c0 2.5-2 4.5-5 5.5C5 13.5 3 11.5 3 9V4.5L8 2z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M6 8l1.5 1.5L10.5 6" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.04em", color: TEXT, margin: "0 0 8px" }}>Reset your password</h1>
          <p style={{ fontSize: 14, color: DIM, margin: 0 }}>Enter your email and we&apos;ll send a reset link</p>
        </div>

        <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 28, backdropFilter: "blur(20px)" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Check your inbox</p>
              <p style={{ fontSize: 13, color: DIM, lineHeight: 1.6 }}>
                We sent a reset link to <strong style={{ color: TEXT }}>{email}</strong>. Click it to set a new password.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl}>Email address</label>
                <input
                  type="email"
                  style={inp}
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && send()}
                />
              </div>
              {error && (
                <div style={{ fontSize: 13, color: "#EF4444", padding: "10px 14px", background: "rgba(239,68,68,0.1)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </div>
              )}
              <button
                onClick={send}
                disabled={loading || !email.trim()}
                style={{ width: "100%", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 800, color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading || !email.trim() ? 0.5 : 1, background: `linear-gradient(135deg, ${PU}CC, ${PU})`, boxShadow: `0 4px 20px ${PU}40`, transition: "all 0.15s" }}
              >
                {loading ? "Sending..." : "Send reset link →"}
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: DIM, marginTop: 20 }}>
          Remember it?{" "}
          <button onClick={() => router.push("/login")} style={{ background: "none", border: "none", color: VI, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
