import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Vercel Cron calls this every 6 hours (configured in vercel.json)
// Authorization: Vercel signs cron requests with CRON_SECRET
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pull all orgs with a connected YouTube account
  const { data: tokens } = await supabase
    .from("integration_tokens")
    .select("org_id, access_token, refresh_token, expires_at")
    .eq("platform", "youtube");

  if (!tokens?.length) return NextResponse.json({ ok: true, synced: 0 });

  const results = await Promise.allSettled(tokens.map(syncYouTube));
  const succeeded = results.filter((r) => r.status === "fulfilled").length;

  return NextResponse.json({ ok: true, synced: succeeded, total: tokens.length });
}

type TokenRow = {
  org_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

async function syncYouTube(token: TokenRow) {
  let accessToken = token.access_token;

  // Refresh if expired or expiring within 5 minutes
  if (token.expires_at) {
    const expiresAt = new Date(token.expires_at).getTime();
    const refreshAt = Date.now() + 5 * 60 * 1000;
    if (expiresAt < refreshAt && token.refresh_token) {
      accessToken = await refreshAccessToken(token);
    }
  }

  // Pull channel stats (subscriber count, total views)
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!channelRes.ok) {
    await supabase.from("integration_tokens")
      .update({ sync_error: `Channel API ${channelRes.status}`, last_sync_at: new Date().toISOString() })
      .eq("org_id", token.org_id).eq("platform", "youtube");
    throw new Error(`Channel API failed: ${channelRes.status}`);
  }

  const channelData = await channelRes.json();
  const stats = channelData.items?.[0]?.statistics ?? {};
  const channelId = channelData.items?.[0]?.id;

  const subscriberCount = parseInt(stats.subscriberCount ?? "0", 10);
  const totalViews = parseInt(stats.viewCount ?? "0", 10);

  // Pull 7-day analytics (views + watch time + estimated revenue)
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const analyticsRes = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?` +
    `ids=channel%3D%3D${channelId}` +
    `&startDate=${since.toISOString().split("T")[0]}` +
    `&endDate=${new Date().toISOString().split("T")[0]}` +
    `&metrics=views,estimatedMinutesWatched,estimatedRevenue` +
    `&dimensions=day`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  let views7d = 0;
  let watchMin7d = 0;
  let revenue7d = 0;

  if (analyticsRes.ok) {
    const analyticsData = await analyticsRes.json();
    for (const row of analyticsData.rows ?? []) {
      views7d += Number(row[1] ?? 0);
      watchMin7d += Number(row[2] ?? 0);
      revenue7d += Number(row[3] ?? 0);
    }
  }

  // Pull top 5 videos by views (last 30 days) — only titles + IDs, not content
  const topVideosRes = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?` +
    `ids=channel%3D%3D${channelId}` +
    `&startDate=${new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]}` +
    `&endDate=${new Date().toISOString().split("T")[0]}` +
    `&metrics=views,estimatedRevenue` +
    `&dimensions=video` +
    `&sort=-views&maxResults=5`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  let topContent: Array<{ videoId: string; views: number; revenue: number }> = [];
  if (topVideosRes.ok) {
    const topData = await topVideosRes.json();
    topContent = (topData.rows ?? []).map((row: unknown[]) => ({
      videoId: String(row[0]),
      views: Number(row[1]),
      revenue: Number(row[2]),
    }));
  }

  const now = new Date().toISOString();

  // Write snapshots (Tier 1 — numeric metrics only, no video content)
  await supabase.from("platform_snapshots").insert([
    { org_id: token.org_id, platform: "youtube", metric: "subscribers", value: subscriberCount, trust_tier: 1, snapped_at: now },
    { org_id: token.org_id, platform: "youtube", metric: "total_views", value: totalViews, trust_tier: 1, snapped_at: now },
    { org_id: token.org_id, platform: "youtube", metric: "views_7d", value: views7d, trust_tier: 1, snapped_at: now },
    { org_id: token.org_id, platform: "youtube", metric: "watch_minutes_7d", value: watchMin7d, trust_tier: 1, snapped_at: now },
    { org_id: token.org_id, platform: "youtube", metric: "revenue_7d", value: revenue7d, trust_tier: 1, snapped_at: now },
  ]);

  // Write latest row (fast single-row read for advisor context)
  await supabase.from("platform_latest").upsert({
    org_id: token.org_id,
    platform: "youtube",
    subscribers: subscriberCount,
    views_7d: views7d,
    watch_min_7d: watchMin7d,
    revenue_7d: revenue7d,
    top_content: topContent,
    updated_at: now,
  });

  await supabase.from("integration_tokens")
    .update({ last_sync_at: now, sync_error: null })
    .eq("org_id", token.org_id).eq("platform", "youtube");
}

async function refreshAccessToken(token: TokenRow): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: token.refresh_token!,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await supabase.from("integration_tokens").update({
    access_token: data.access_token,
    expires_at: expiresAt,
  }).eq("org_id", token.org_id).eq("platform", "youtube");

  return data.access_token;
}
