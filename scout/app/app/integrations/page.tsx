"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const BG = "#07071A";
const GLASS = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#F1F0FF";
const DIM = "rgba(255,255,255,0.35)";
const PU = "#7C3AED";
const VI = "#A78BFA";
const EM = "#10B981";
const RE = "#EF4444";
const GO = "#FFD700";

type PlatformStatus = {
  connected: boolean;
  last_sync_at: string | null;
  sync_error: string | null;
};

type Platforms = {
  youtube: PlatformStatus;
  shopify: PlatformStatus;
};

export default function Integrations() {
  const router = useRouter();
  const params = useSearchParams();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<Platforms>({
    youtube: { connected: false, last_sync_at: null, sync_error: null },
    shopify: { connected: false, last_sync_at: null, sync_error: null },
  });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    // Handle OAuth callbacks: ?shopify=connected, ?integration=youtube&status=connected
    const shopifyStatus = params.get("shopify");
    const integrationParam = params.get("integration");
    const statusParam = params.get("status");

    if (shopifyStatus) {
      setToast({
        msg: shopifyStatus === "connected" ? "Shopify connected — syncing your data now" : `Shopify connection ${shopifyStatus}`,
        ok: shopifyStatus === "connected",
      });
      setTimeout(() => setToast(null), 5000);
    } else if (integrationParam && statusParam) {
      setToast({
        msg: statusParam === "connected" ? `${integrationParam} connected successfully` : `${integrationParam} connection ${statusParam}`,
        ok: statusParam === "connected",
      });
      setTimeout(() => setToast(null), 4000);
    }
  }, [params]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: member } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!member) return;
      setOrgId(member.org_id);

      const { data: tokens } = await supabase
        .from("integration_tokens")
        .select("platform, last_sync_at, sync_error")
        .eq("org_id", member.org_id);

      const updated = { ...platforms };
      for (const t of tokens ?? []) {
        const p = t.platform as keyof Platforms;
        if (updated[p]) {
          updated[p] = { connected: true, last_sync_at: t.last_sync_at, sync_error: t.sync_error };
        }
      }
      setPlatforms(updated);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  function formatSync(ts: string | null) {
    if (!ts) return "Never synced";
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const integrations = [
    {
      key: "youtube" as const,
      name: "YouTube",
      icon: "▶",
      iconBg: "#FF0000",
      description: "Pulls subscribers, views, watch time, and revenue every 6 hours.",
      dataPoints: ["Subscriber count", "Views (7d)", "Watch minutes (7d)", "Estimated revenue (7d)", "Top 5 videos by performance"],
      trustNote: "Metrics only — video content is never read or stored.",
      connectEl: (
        <a
          href={orgId ? `/api/connect/youtube?org_id=${orgId}` : "#"}
          style={{ display: "inline-block", padding: "10px 20px", background: `linear-gradient(135deg, ${PU}, ${VI})`, borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}
        >
          Connect with Google →
        </a>
      ),
    },
    {
      key: "shopify" as const,
      name: "Shopify",
      icon: "🛍",
      iconBg: "#96BF48",
      description: "Receives order webhooks in real time. Revenue updates within seconds of a sale.",
      dataPoints: ["Order revenue (real-time)", "Refunds", "Orders count (30d)", "Revenue (30d)"],
      trustNote: "Order amounts and IDs only — customer data and product descriptions are never stored.",
      connectEl: (
        <a
          href={orgId ? `/api/connect/shopify?org_id=${orgId}` : "#"}
          style={{ display: "inline-block", padding: "10px 20px", background: "linear-gradient(135deg, #96BF48, #5a8a00)", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}
        >
          Connect with Shopify →
        </a>
      ),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "system-ui, sans-serif", padding: "32px 24px" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000, padding: "12px 20px", borderRadius: 12, background: toast.ok ? `rgba(16,185,129,0.15)` : `rgba(239,68,68,0.15)`, border: `1px solid ${toast.ok ? EM : RE}`, color: toast.ok ? EM : RE, fontWeight: 600, fontSize: 14 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button onClick={() => router.push("/app")} style={{ background: "none", border: "none", color: VI, cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 24, padding: 0 }}>
          ← Back to app
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 6px" }}>Data Connections</h1>
        <p style={{ fontSize: 14, color: DIM, margin: "0 0 32px" }}>
          First-party metrics only. Real numbers from your accounts — no content ingestion, no assumptions.
        </p>

        {/* Trust tier legend */}
        <div style={{ background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 20px", marginBottom: 28, display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: EM }} />
            <span style={{ fontSize: 12, color: DIM }}>Tier 1: Your authenticated data (highest trust)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: VI }} />
            <span style={{ fontSize: 12, color: DIM }}>Tier 2: Self-reported (your observations)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: RE }} />
            <span style={{ fontSize: 12, color: DIM }}>External content: never ingested as knowledge</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {integrations.map(({ key, name, icon, iconBg, description, dataPoints, trustNote, connectEl }) => {
            const status = platforms[key];
            return (
              <div key={key} style={{ background: GLASS, border: `1px solid ${status.connected ? EM + "40" : BORDER}`, borderRadius: 16, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{name}</div>
                      <div style={{ fontSize: 12, color: status.connected ? EM : DIM, fontWeight: 600 }}>
                        {status.connected ? `Connected · synced ${formatSync(status.last_sync_at)}` : "Not connected"}
                      </div>
                    </div>
                  </div>
                  {status.connected && (
                    <div style={{ padding: "4px 12px", borderRadius: 20, background: `${EM}15`, border: `1px solid ${EM}40`, color: EM, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      LIVE
                    </div>
                  )}
                </div>

                <p style={{ fontSize: 13, color: DIM, margin: "0 0 14px" }}>{description}</p>

                {/* What data we pull */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Data pulled</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {dataPoints.map(dp => (
                      <span key={dp} style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, fontSize: 12, color: TEXT }}>
                        {dp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Trust note */}
                <div style={{ fontSize: 12, color: GO, padding: "8px 12px", borderRadius: 8, background: `${GO}10`, border: `1px solid ${GO}25`, marginBottom: 16 }}>
                  🔒 {trustNote}
                </div>

                {status.sync_error && (
                  <div style={{ fontSize: 12, color: RE, padding: "8px 12px", borderRadius: 8, background: `${RE}10`, border: `1px solid ${RE}25`, marginBottom: 16 }}>
                    Last sync error: {status.sync_error}
                  </div>
                )}

                {!status.connected && connectEl}
              </div>
            );
          })}
        </div>

        {/* Coming soon */}
        <div style={{ marginTop: 20, background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: DIM, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Coming next</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["Instagram", "TikTok", "Google Analytics", "Stripe"].map(p => (
              <span key={p} style={{ padding: "6px 14px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, fontSize: 13, color: DIM }}>
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
