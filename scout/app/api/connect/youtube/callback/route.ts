import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Google redirects here after user grants permission
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const orgId = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !orgId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app?integration=youtube&status=denied`
    );
  }

  // Exchange authorization code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/youtube/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app?integration=youtube&status=error`
    );
  }

  const tokens = await tokenRes.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase.from("integration_tokens").upsert({
    org_id: orgId,
    platform: "youtube",
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    scopes: tokens.scope?.split(" ") ?? [],
    connected_at: new Date().toISOString(),
  });

  // Trigger an immediate first sync so data appears right away
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/youtube`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/app?integration=youtube&status=connected`
  );
}
